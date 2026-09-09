"""
ThermoShelter V1 — Construction-Grade Building Specification Generator

Engineering References:
- NBC 2016 (National Building Code of India)
- IS 875 Parts 1-5 (Design Loads)
- IS 1904 (Foundation Design)
- ASHRAE 55 (Thermal Comfort)
- Standard building physics (R-value, U-value, thermal mass)

Every dimension output by this module has a calculable reason behind it.
"""

import json
import math
import sqlite3
import os

# ─────────────────────────────────────────────────────────────
# CONSTANTS — Engineering Codes & Standards
# ─────────────────────────────────────────────────────────────

# NBC 2016 — Minimum room sizes (m²)
NBC_MIN_BEDROOM_M2 = 9.5
NBC_MIN_KITCHEN_M2 = 5.5
NBC_MIN_BATHROOM_M2 = 2.8
NBC_MIN_LIVING_M2 = 12.0
NBC_MIN_CEILING_HEIGHT_MM = 2700  # 2.7m minimum habitable room
NBC_WINDOW_TO_FLOOR_RATIO = 0.10  # Minimum 1/10th of floor area for daylight
NBC_MIN_DOOR_WIDTH_MM = 900
NBC_MIN_DOOR_HEIGHT_MM = 2100

# IS 875 Part 2 — Live Loads (kN/m²)
IS875_LIVE_LOAD_RESIDENTIAL = 2.0  # kN/m²
IS875_LIVE_LOAD_OFFICE = 2.5
IS875_LIVE_LOAD_HOSPITAL = 3.0

# IS 875 Part 4 — Snow Loads
# Snow load = μ × S₀ where μ = shape coefficient, S₀ = ground snow load
SNOW_LOAD_ZONE_MAP = {
    "zone_v_heavy": 2.5,  # kN/m² (Ladakh, high altitude)
    "zone_iv": 1.5,
    "zone_iii": 1.0,
    "zone_ii": 0.5,
    "zone_i": 0.0,
}

# IS 1904 — Foundation
FROST_LINE_DEPTH_MAP = {
    "extreme_cold": 900,   # mm — Leh, Ladakh
    "cold": 600,           # mm — Shimla, Manali  
    "moderate": 450,       # mm — Delhi winter
    "warm": 300,           # mm — Mumbai
}

# Air Film Resistances (m²·K/W) — standard values
R_SURFACE_INSIDE = 0.13   # still air, interior surface
R_SURFACE_OUTSIDE = 0.04  # 24 km/h wind, exterior surface

# Imperial to SI R-value conversion
# 1 imperial R (ft²·°F·h/BTU) = 0.1761 SI R (m²·K/W)
IMPERIAL_R_TO_SI = 0.1761
R_AIR_GAP = 0.18          # unventilated air gap (20mm+)

# Thermal comfort range (ASHRAE 55)
COMFORT_MIN_C = 18.0
COMFORT_MAX_C = 24.0

# Internal heat gain
HEAT_PER_PERSON_W = 100.0  # Sensible heat, sedentary activity

# Plaster properties
PLASTER_THICKNESS_MM = 12
PLASTER_CONDUCTIVITY = 0.72  # W/(m·K) for cement plaster
PLASTER_DENSITY = 1760       # kg/m³

# ─────────────────────────────────────────────────────────────
# MATERIAL DATABASE LOADER
# ─────────────────────────────────────────────────────────────

def load_all_materials():
    """Load all materials from SQLite database."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, "thermoshelter.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM materials")
    rows = cursor.fetchall()
    conn.close()
    
    materials = {"insulation": [], "structural": [], "glazing": [], "roofing": []}
    for row in rows:
        mat = dict(row)
        category = mat.get("category", "")
        if category in materials:
            materials[category].append(mat)
    return materials


# ─────────────────────────────────────────────────────────────
# CLIMATE CLASSIFIER
# ─────────────────────────────────────────────────────────────

def classify_climate(avg_temp_c: float, lat: float):
    """Classify climate zone from average temperature and latitude."""
    if avg_temp_c < 0:
        zone = "extreme_cold"
        snow_zone = "zone_v_heavy"
    elif avg_temp_c < 5:
        zone = "cold"
        snow_zone = "zone_iv"
    elif avg_temp_c < 15:
        zone = "moderate"
        snow_zone = "zone_ii"
    else:
        zone = "warm"
        snow_zone = "zone_i"
    
    # Roof slope requirement from IS 875 Part 4
    snow_load = SNOW_LOAD_ZONE_MAP[snow_zone]
    if snow_load >= 2.0:
        min_roof_slope_deg = 25  # steep slope to shed heavy snow
    elif snow_load >= 1.0:
        min_roof_slope_deg = 15
    elif snow_load > 0:
        min_roof_slope_deg = 10
    else:
        min_roof_slope_deg = 5   # minimal slope for drainage
    
    return {
        "zone": zone,
        "snow_zone": snow_zone,
        "snow_load_kn_m2": snow_load,
        "frost_line_mm": FROST_LINE_DEPTH_MAP[zone],
        "min_roof_slope_deg": min_roof_slope_deg,
    }


# ─────────────────────────────────────────────────────────────
# BUILDING SHAPE & ORIENTATION CALCULATOR (V4)
# ─────────────────────────────────────────────────────────────

# Shape definitions with their thermal properties
BUILDING_SHAPES = {
    "compact_square": {
        "description": "Compact square footprint",
        "aspect_ratio": 1.0,
        "form_factor_rating": "excellent",  # lowest surface-area-to-volume
        "best_for": ["extreme_cold", "cold"],
        "building_types": ["emergency", "residential"],
        "reason": "Minimizes surface area exposed to cold. Lowest heat loss per unit volume.",
    },
    "elongated_rectangle": {
        "description": "Rectangle elongated along east-west axis",
        "aspect_ratio": 1.6,
        "form_factor_rating": "good",
        "best_for": ["cold", "moderate"],
        "building_types": ["residential"],
        "reason": "Maximizes south-facing wall area for passive solar gain while keeping reasonable compactness.",
    },
    "L_shape": {
        "description": "L-shaped plan with south-facing courtyard",
        "aspect_ratio": 1.3,  # effective
        "form_factor_rating": "moderate",
        "best_for": ["moderate", "warm"],
        "building_types": ["residential", "institutional"],
        "reason": "Creates sheltered courtyard for outdoor use. South wing captures solar, north wing provides wind buffer.",
    },
    "courtyard": {
        "description": "U-shape or courtyard plan enclosing protected outdoor space",
        "aspect_ratio": 1.2,
        "form_factor_rating": "moderate",
        "best_for": ["warm", "moderate"],
        "building_types": ["institutional"],
        "reason": "Traditional hot-climate form. Courtyard provides shade and stack ventilation. Massive thermal mass on all sides.",
    },
    "linear_bar": {
        "description": "Long narrow bar building (single-loaded corridor)",
        "aspect_ratio": 2.5,
        "form_factor_rating": "poor",
        "best_for": ["warm"],
        "building_types": ["institutional"],
        "reason": "Maximizes cross-ventilation and daylighting for large occupancy. High surface area acceptable in warm climates.",
    },
}

def calculate_shape_and_orientation(climate: dict, building_type: str, lat: float):
    """
    Select optimal building shape and orientation based on climate, building type, and latitude.
    
    Shape Selection Logic:
    - Emergency shelters → always compact_square (fastest to build, least heat loss)
    - Residential in extreme cold → compact_square (minimize exposure)
    - Residential in cold/moderate → elongated_rectangle (balance solar gain + compactness)
    - Institutional in cold → elongated_rectangle (daylighting + solar)
    - Institutional in warm → courtyard or linear_bar (ventilation)
    
    Orientation Logic (Northern Hemisphere, lat > 0):
    - Long axis runs EAST-WEST to maximize south-facing wall
    - Primary facade faces TRUE SOUTH (180 deg azimuth)
    - In warm climates, rotate 15-20 deg for prevailing wind capture
    
    Orientation Logic (Southern Hemisphere, lat < 0):
    - Long axis runs EAST-WEST to maximize NORTH-facing wall  
    - Primary facade faces TRUE NORTH (0 deg azimuth)
    """
    zone = climate["zone"]
    
    # --- Shape Selection ---
    if building_type == "emergency":
        shape_id = "compact_square"
    elif building_type == "residential":
        if zone == "extreme_cold":
            shape_id = "compact_square"
        elif zone in ("cold", "moderate"):
            shape_id = "elongated_rectangle"
        else:
            shape_id = "elongated_rectangle"
    elif building_type == "institutional":
        if zone in ("extreme_cold", "cold"):
            shape_id = "elongated_rectangle"
        elif zone == "moderate":
            shape_id = "L_shape"
        else:
            shape_id = "courtyard"
    else:
        shape_id = "elongated_rectangle"
    
    shape = BUILDING_SHAPES[shape_id]
    
    # --- Orientation Calculation ---
    # In Northern Hemisphere: primary facade faces south (180 deg)
    # In Southern Hemisphere: primary facade faces north (0 deg)
    if lat >= 0:
        primary_facade = "south"
        base_azimuth = 180  # true south
    else:
        primary_facade = "north"
        base_azimuth = 0    # true north
    
    # Solar altitude at winter solstice (worst case for heating)
    # Approximate: solar_altitude = 90 - lat - 23.5 (winter solstice tilt)
    winter_solar_altitude = max(0, 90 - abs(lat) - 23.5)
    
    # Summer solar altitude (worst case for overheating)
    summer_solar_altitude = min(90, 90 - abs(lat) + 23.5)
    
    # In warm climates, slight rotation (15 deg) captures prevailing SW winds
    if zone == "warm":
        azimuth_adjustment = 15  # rotate to catch breeze
    else:
        azimuth_adjustment = 0   # stick to true south for max solar
    
    orientation_deg = base_azimuth + azimuth_adjustment
    
    # --- Form Factor Calculation ---
    # Form factor = surface_area / volume (lower = more thermally efficient)
    # For a cube of side 'a': FF = 6/a
    # For a rectangle of L x W x H: FF = 2(LW + LH + WH) / (LWH)
    # We just provide the comparative rating from the shape definition
    
    # V5 FIX: Improved overhang calculation
    # Overhang should block summer sun but admit winter sun
    # Use the DIFFERENCE between summer and winter angles
    # Overhang = window_top_height × (1/tan(summer) - 1/tan(winter)) / 2
    # Simplified: use mid-season angle (equinox) as the cutoff
    equinox_altitude = 90 - abs(lat)  # sun altitude at equinox
    if equinox_altitude > 10:
        # Overhang blocks sun above equinox angle, admits below
        # depth = lintel_to_sill (1700mm) / tan(equinox_altitude)
        recommended_overhang_mm = round(1700 / math.tan(math.radians(equinox_altitude)))
        recommended_overhang_mm = min(recommended_overhang_mm, 1200)  # max practical
        recommended_overhang_mm = max(recommended_overhang_mm, 300)   # min for rain
    else:
        recommended_overhang_mm = 600  # default for very high latitudes
    
    return {
        "shape_id": shape_id,
        "shape_description": shape["description"],
        "aspect_ratio": shape["aspect_ratio"],
        "form_factor_rating": shape["form_factor_rating"],
        "orientation": {
            "primary_facade": primary_facade,
            "azimuth_deg": orientation_deg,
            "long_axis": "east_west",
            "reason": f"Long axis E-W to maximize {primary_facade}-facing wall. "
                      f"Azimuth {orientation_deg} deg {'(true south)' if azimuth_adjustment == 0 else f'(+{azimuth_adjustment} deg for wind capture)'}."
        },
        "solar_geometry": {
            "winter_solar_altitude_deg": round(winter_solar_altitude, 1),
            "summer_solar_altitude_deg": round(summer_solar_altitude, 1),
            "recommended_overhang_mm": recommended_overhang_mm,
            "overhang_reason": f"Blocks summer sun at {round(summer_solar_altitude)}deg altitude, "
                               f"admits winter sun at {round(winter_solar_altitude)}deg altitude."
        },
        "reason": shape["reason"],
    }


# ─────────────────────────────────────────────────────────────
# FLOOR PLAN CALCULATOR
# ─────────────────────────────────────────────────────────────

def calculate_floor_plan(occupancy: int, building_type: str, shape_data: dict):
    """
    Calculate floor plan dimensions from occupancy and NBC standards.
    Overrides exist for specific hardcoded shelter tiers (Permanent & Community).
    """
    if building_type.lower() == "permanent":
        length_mm = 9000
        width_mm = 7500
        actual_area = (9.0 * 7.5)
        
        rooms = [
            {"id": "bedroom_1", "name": "Bedroom 1", "x": 0, "y": 4500, "width_m": 3.5, "length_m": 3.0, "color_hex": "#f59e0b"},
            {"id": "bedroom_2", "name": "Bedroom 2", "x": 5500, "y": 4500, "width_m": 3.5, "length_m": 3.0, "color_hex": "#f59e0b"},
            {"id": "bathroom", "name": "Bathroom", "x": 3500, "y": 5500, "width_m": 2.0, "length_m": 2.0, "color_hex": "#10b981"},
            {"id": "kitchen", "name": "Kitchen", "x": 0, "y": 0, "width_m": 2.8, "length_m": 3.0, "color_hex": "#3b82f6"},
            {"id": "storage", "name": "Storage / Utility", "x": 7500, "y": 0, "width_m": 1.5, "length_m": 2.0, "color_hex": "#78716c"},
            {"id": "living", "name": "Living & Dining", "x": 2800, "y": 0, "width_m": 4.7, "length_m": 5.5, "color_hex": "#ef4444"},
            {"id": "veranda", "name": "Covered Veranda", "x": 1500, "y": -1800, "width_m": 6.0, "length_m": 1.8, "color_hex": "#22d3ee"}
        ]
        
        rooms_spec = {
            "bedrooms": {"count": 2, "area_each_m2": 3.5*3.0},
            "kitchen": {"count": 1, "area_m2": 2.8*3.0},
            "bathrooms": {"count": 1, "area_each_m2": 2.0*2.0},
            "living": {"count": 1, "area_m2": 4.7*5.5},
        }
        layout = {"rooms": rooms, "walls": [], "doors": []}
        return {
            "length_mm": length_mm,
            "width_mm": width_mm,
            "area_m2": actual_area,
            "ceiling_height_mm": NBC_MIN_CEILING_HEIGHT_MM,
            "rooms_spec": rooms_spec,
            "geometry": layout
        }
        
    elif building_type.lower() == "community":
        length_mm = 24000
        width_mm = 12000
        actual_area = (24.0 * 12.0)
        
        rooms = [
            {"id": "sleeping", "name": "Sleeping Area", "x": 4000, "y": 4000, "width_m": 16.0, "length_m": 8.0, "color_hex": "#f59e0b"},
            {"id": "male_toilets", "name": "Male Toilets", "x": 0, "y": 9000, "width_m": 4.0, "length_m": 3.0, "color_hex": "#10b981"},
            {"id": "female_toilets", "name": "Female Toilets", "x": 0, "y": 6000, "width_m": 4.0, "length_m": 3.0, "color_hex": "#10b981"},
            {"id": "accessible_toilet", "name": "Accessible Toilet", "x": 0, "y": 4500, "width_m": 4.0, "length_m": 1.5, "color_hex": "#10b981"},
            {"id": "laundry", "name": "Laundry & Cleaning", "x": 0, "y": 3000, "width_m": 4.0, "length_m": 1.5, "color_hex": "#64748b"},
            {"id": "storage", "name": "Storage", "x": 0, "y": 0, "width_m": 4.0, "length_m": 3.0, "color_hex": "#78716c"},
            {"id": "kitchen", "name": "Kitchen", "x": 20000, "y": 8000, "width_m": 4.0, "length_m": 4.0, "color_hex": "#3b82f6"},
            {"id": "dining", "name": "Dining Area", "x": 20000, "y": 3000, "width_m": 4.0, "length_m": 5.0, "color_hex": "#ef4444"},
            {"id": "medical", "name": "First Aid / Medical", "x": 17000, "y": 0, "width_m": 3.0, "length_m": 3.0, "color_hex": "#f43f5e"},
            {"id": "admin", "name": "Admin / Staff", "x": 20000, "y": 0, "width_m": 4.0, "length_m": 3.0, "color_hex": "#6366f1"},
            {"id": "lobby", "name": "Entrance Lobby", "x": 4000, "y": 0, "width_m": 13.0, "length_m": 4.0, "color_hex": "#14b8a6"},
            {"id": "veranda", "name": "Veranda (Covered)", "x": 0, "y": -2500, "width_m": 24.0, "length_m": 2.5, "color_hex": "#22d3ee"}
        ]
        
        rooms_spec = {
            "bedrooms": {"count": 1, "area_each_m2": 16.0*8.0},
            "kitchen": {"count": 1, "area_m2": 4.0*4.0},
            "bathrooms": {"count": 4, "area_each_m2": 4.0*3.0},
            "living": {"count": 1, "area_m2": 13.0*4.0},
        }
        layout = {"rooms": rooms, "walls": [], "doors": []}
        return {
            "length_mm": length_mm,
            "width_mm": width_mm,
            "area_m2": actual_area,
            "ceiling_height_mm": 3500,
            "rooms_spec": rooms_spec,
            "geometry": layout
        }
        
    elif building_type.lower() == "emergency":
        length_mm = 3600
        width_mm = 2400
        actual_area = (3.6 * 2.4)
        
        rooms = [
            {"id": "storage", "name": "Storage", "x": 0, "y": 0, "width_m": 1.0, "length_m": 0.6, "color_hex": "#78716c"},
            {"id": "entry", "name": "Main Entry", "x": 1000, "y": 0, "width_m": 1.0, "length_m": 0.8, "color_hex": "#22d3ee"},
            {"id": "toilet", "name": "Toilet / Wash", "x": 2000, "y": 0, "width_m": 1.6, "length_m": 0.6, "color_hex": "#10b981"},
            {"id": "living", "name": "Living / Sleeping Area", "x": 0, "y": 800, "width_m": 3.6, "length_m": 1.6, "color_hex": "#f59e0b"}
        ]
        
        rooms_spec = {
            "bedrooms": {"count": 1, "area_each_m2": 3.6*1.6},
            "kitchen": {"count": 0, "area_m2": 0},
            "bathrooms": {"count": 1, "area_each_m2": 1.6*0.6},
            "living": {"count": 1, "area_m2": 3.6*1.6},
        }
        layout = {"rooms": rooms, "walls": [], "doors": []}
        return {
            "length_mm": length_mm,
            "width_mm": width_mm,
            "area_m2": actual_area,
            "ceiling_height_mm": 2400,
            "rooms_spec": rooms_spec,
            "geometry": layout
        }

    num_bedrooms = max(1, math.ceil(occupancy / 2))
    num_bathrooms = max(1, math.ceil(occupancy / 4))
    
    bedroom_area = num_bedrooms * NBC_MIN_BEDROOM_M2
    kitchen_area = NBC_MIN_KITCHEN_M2
    bathroom_area = num_bathrooms * NBC_MIN_BATHROOM_M2
    living_area = NBC_MIN_LIVING_M2
    
    # V3 FIX: Account for internal partition wall thickness
    # Each partition = 100mm thick (single skin block + plaster)
    # Estimate: (num_rooms - 1) partitions × avg partition length × 0.1m width
    num_rooms = num_bedrooms + 1 + num_bathrooms + 1  # bedrooms + kitchen + bathrooms + living
    num_partitions = num_rooms - 1
    avg_partition_length_m = 3.5  # average internal wall length
    internal_wall_area_m2 = num_partitions * avg_partition_length_m * 0.1  # 100mm thick
    
    # Circulation area (corridors, walls) — typically 15-20% of usable area
    usable_area = bedroom_area + kitchen_area + bathroom_area + living_area
    circulation_factor = 1.18  # 18% for circulation
    total_area = (usable_area * circulation_factor) + internal_wall_area_m2
    
    # Round up to nearest 0.5 m²
    total_area = math.ceil(total_area * 2) / 2
    
    # V4: Use aspect ratio from shape calculator instead of hardcoded value
    aspect_ratio = shape_data["aspect_ratio"]
    width_m = math.sqrt(total_area / aspect_ratio)
    length_m = total_area / width_m
    
    # Convert to mm, round to nearest 100mm (construction standard)
    width_mm = round(width_m * 1000 / 100) * 100
    length_mm = round(length_m * 1000 / 100) * 100
    
    # Recalculate actual area
    actual_area = (width_mm / 1000) * (length_mm / 1000)
    
    rooms_spec = {
        "bedrooms": {"count": num_bedrooms, "area_each_m2": NBC_MIN_BEDROOM_M2},
        "kitchen": {"count": 1, "area_m2": kitchen_area},
        "bathrooms": {"count": num_bathrooms, "area_each_m2": NBC_MIN_BATHROOM_M2},
        "living": {"count": 1, "area_m2": living_area},
    }
    
    # Generate geometric layout for 3D modeling
    def generate_layout():
        rooms = []
        walls = []
        doors = []
        
        wt = 300 # exterior wall thickness approx
        it = 100 # interior wall thickness approx
        
        L = length_mm
        W = width_mm
        
        walls.append({"id": "ext_north", "start": [0, 0], "end": [L, 0], "thickness": wt, "is_exterior": True})
        walls.append({"id": "ext_south", "start": [0, W], "end": [L, W], "thickness": wt, "is_exterior": True})
        walls.append({"id": "ext_west", "start": [0, 0], "end": [0, W], "thickness": wt, "is_exterior": True})
        walls.append({"id": "ext_east", "start": [L, 0], "end": [L, W], "thickness": wt, "is_exterior": True})
        
        half_y = W / 2
        walls.append({"id": "int_horiz", "start": [0, half_y], "end": [L, half_y], "thickness": it, "is_exterior": False})
        
        south_rooms_count = 1 + num_bedrooms
        south_room_width = L / south_rooms_count
        
        for i in range(south_rooms_count):
            if i > 0:
                x_pos = i * south_room_width
                walls.append({"id": f"int_south_vert_{i}", "start": [x_pos, half_y], "end": [x_pos, W], "thickness": it, "is_exterior": False})
                doors.append({"wall_id": "int_horiz", "pos": [x_pos - 500, half_y], "width": 900, "height": 2100, "rot": 0})
                
            name = "Living Room" if i == 0 else f"Bedroom {i}"
            rooms.append({
                "id": name.lower().replace(" ", "_"),
                "name": name,
                "x": i * south_room_width,
                "y": half_y,
                "width_m": south_room_width / 1000,
                "length_m": half_y / 1000,
                "color_hex": "#ef4444" if i == 0 else "#f59e0b"
            })
            
        north_rooms_count = 1 + num_bathrooms
        north_room_width = L / north_rooms_count
        
        for i in range(north_rooms_count):
            if i > 0:
                x_pos = i * north_room_width
                walls.append({"id": f"int_north_vert_{i}", "start": [x_pos, 0], "end": [x_pos, half_y], "thickness": it, "is_exterior": False})
                doors.append({"wall_id": f"int_north_vert_{i}", "pos": [x_pos, half_y/2], "width": 800, "height": 2100, "rot": 90})
                
            name = "Kitchen" if i == 0 else f"Bathroom {i}"
            rooms.append({
                "id": name.lower().replace(" ", "_"),
                "name": name,
                "x": i * north_room_width,
                "y": 0,
                "width_m": north_room_width / 1000,
                "length_m": half_y / 1000,
                "color_hex": "#3b82f6" if i==0 else "#10b981"
            })
            
        # Add a main entrance door
        doors.append({"wall_id": "ext_south", "pos": [south_room_width / 2, W], "width": 1000, "height": 2100, "rot": 0})
        
        return {"rooms": rooms, "walls": walls, "doors": doors}
    
    layout = generate_layout()
    
    return {
        "length_mm": length_mm,
        "width_mm": width_mm,
        "area_m2": round(actual_area, 2),
        "ceiling_height_mm": NBC_MIN_CEILING_HEIGHT_MM,
        "rooms": rooms_spec,
        "geometry": layout,
        "internal_walls": {
            "count": num_partitions,
            "thickness_mm": 100,
            "area_consumed_m2": round(internal_wall_area_m2, 2),
        },
        "usable_area_m2": round(usable_area, 2),
        "circulation_percent": 18,
        "aspect_ratio": round(length_mm / width_mm, 2),
        "reason": f"NBC 2016: {NBC_MIN_BEDROOM_M2}m²/bedroom, 1.4:1 aspect ratio elongated E-W for max south exposure"
    }


# ─────────────────────────────────────────────────────────────
# WALL LAYER CALCULATOR
# ─────────────────────────────────────────────────────────────

def calculate_wall_assembly(structural_mat: dict, insulation_mat: dict, climate: dict):
    """
    Calculate multi-layer wall assembly with total R-value.
    
    Wall assembly (outside to inside):
      1. External plaster (12mm cement)
      2. Structural layer (varies by material)
      3. Insulation layer (varies by material)  
      4. Air gap (20mm) — optional, improves R-value
      5. Internal plaster (12mm cement)
    
    R_total = R_surface_out + R_plaster + R_structural + R_insulation + R_air_gap + R_plaster + R_surface_in
    """
    # Determine insulation thickness based on climate severity
    if climate["zone"] == "extreme_cold":
        insulation_thickness_mm = 150
    elif climate["zone"] == "cold":
        insulation_thickness_mm = 100
    elif climate["zone"] == "moderate":
        insulation_thickness_mm = 75
    else:
        insulation_thickness_mm = 50
    
    # Structural thickness based on material
    struct_density = structural_mat.get("density_kg_m3") or 1000
    if struct_density > 1500:  # Heavy materials (mud brick, rammed earth, concrete)
        structural_thickness_mm = 200
    elif struct_density > 500:  # Medium (timber, AAC)
        structural_thickness_mm = 150
    else:
        structural_thickness_mm = 100  # Light (steel frame with infill)
    
    # Calculate R-value for each layer (all values in SI: m²·K/W)
    # DB stores r_value_per_inch in IMPERIAL units → must convert to SI
    # Conversion: R_SI = R_imperial_per_inch × thickness_inches × 0.1761
    
    struct_r_per_inch_imperial = structural_mat.get("r_value") or 0.5
    insul_r_per_inch_imperial = insulation_mat.get("r_value") or 3.0
    
    struct_thickness_inches = structural_thickness_mm / 25.4
    insul_thickness_inches = insulation_thickness_mm / 25.4
    plaster_r = (PLASTER_THICKNESS_MM / 1000) / PLASTER_CONDUCTIVITY  # R = d/k (already SI)
    
    # Convert imperial R to SI R
    r_structural = struct_r_per_inch_imperial * struct_thickness_inches * IMPERIAL_R_TO_SI
    r_insulation = insul_r_per_inch_imperial * insul_thickness_inches * IMPERIAL_R_TO_SI
    
    # Include air gap for cold climates
    include_air_gap = climate["zone"] in ("extreme_cold", "cold")
    air_gap_mm = 20 if include_air_gap else 0
    r_air_gap = R_AIR_GAP if include_air_gap else 0
    
    # Total R-value (SI: m²·K/W)
    r_total = (R_SURFACE_OUTSIDE + plaster_r + r_structural + r_insulation +
               r_air_gap + plaster_r + R_SURFACE_INSIDE)
    
    # Total U-value (W/m²·K)
    u_total = 1.0 / r_total
    
    # Total thickness
    total_thickness_mm = (PLASTER_THICKNESS_MM + structural_thickness_mm +
                          insulation_thickness_mm + air_gap_mm + PLASTER_THICKNESS_MM)
    
    layers = [
        {"material": "cement_plaster", "thickness_mm": PLASTER_THICKNESS_MM,
         "r_value_si": round(plaster_r, 4), "purpose": "Weather protection"},
        {"material": structural_mat["name"], "thickness_mm": structural_thickness_mm,
         "r_value_si": round(r_structural, 4), "purpose": "Load bearing"},
        {"material": insulation_mat["name"], "thickness_mm": insulation_thickness_mm,
         "r_value_si": round(r_insulation, 4), "purpose": "Thermal insulation"},
    ]
    
    if include_air_gap:
        layers.append({"material": "air_gap", "thickness_mm": air_gap_mm,
                       "r_value_si": round(r_air_gap, 4), "purpose": "Additional insulation"})
    
    layers.append({"material": "cement_plaster", "thickness_mm": PLASTER_THICKNESS_MM,
                   "r_value_si": round(plaster_r, 4), "purpose": "Interior finish"})
    
    return {
        "layers": layers,
        "total_thickness_mm": total_thickness_mm,
        "r_value_total": round(r_total, 3),
        "u_value_total": round(u_total, 4),
    }


# ─────────────────────────────────────────────────────────────
# WINDOW CALCULATOR
# ─────────────────────────────────────────────────────────────

def calculate_windows(floor_plan: dict, climate: dict, glazing_mat: dict, lat: float):
    """
    Calculate window sizes and placement based on:
    - NBC daylight requirement (min 1/10 of floor area)
    - Thermal performance (limit window area in cold climates)
    - Solar orientation (maximize south, minimize north)
    
    Sun path logic (Northern Hemisphere, India):
    - South wall: maximum glazing — captures winter sun (low angle)
    - North wall: no/minimal glazing — no direct sun, only heat loss
    - East wall: small window — morning sun (useful in cold climates)
    - West wall: small/no window — harsh afternoon sun (overheating risk)
    """
    floor_area = floor_plan["area_m2"]
    length_mm = floor_plan["length_mm"]
    width_mm = floor_plan["width_mm"]
    ceiling_h = floor_plan["ceiling_height_mm"]
    
    # Total minimum window area from NBC
    min_window_area_m2 = floor_area * NBC_WINDOW_TO_FLOOR_RATIO
    
    # Maximum window area based on climate (thermal constraint)
    if climate["zone"] == "extreme_cold":
        max_window_ratio = 0.15  # 15% of wall area max
    elif climate["zone"] == "cold":
        max_window_ratio = 0.20
    elif climate["zone"] == "moderate":
        max_window_ratio = 0.25
    else:
        max_window_ratio = 0.30
    
    # Distribute windows across walls
    # South wall = long side (length_mm), gets most glazing
    south_wall_area = (length_mm / 1000) * (ceiling_h / 1000)
    north_wall_area = south_wall_area
    east_wall_area = (width_mm / 1000) * (ceiling_h / 1000)
    west_wall_area = east_wall_area
    
    # Solar distribution ratios (how to split window area)
    if climate["zone"] == "extreme_cold":
        # Extreme cold: maximize south, small east, tiny north for NBC code compliance only
        # North window placed HIGH (clerestory) to minimize heat loss but meet daylight code
        distribution = {"south": 0.75, "east": 0.15, "west": 0.0, "north": 0.10}
    elif climate["zone"] == "cold":
        # Cold: maximize south, tiny east for morning warmth, minimal north
        distribution = {"south": 0.70, "east": 0.15, "west": 0.0, "north": 0.15}
    else:
        # Warm: more even, but still favor south
        distribution = {"south": 0.50, "east": 0.15, "west": 0.10, "north": 0.25}
    
    # Target total window area
    # V3 FIX: Ensure we ALWAYS meet NBC daylight minimum even after
    # limiting north/west windows. Use 25% margin to absorb clamping losses.
    total_window_area_m2 = max(min_window_area_m2 * 1.25, floor_area * 0.15)
    
    shgc = glazing_mat.get("shgc") or 0.7
    
    walls = {}
    for face, ratio in distribution.items():
        if ratio == 0:
            walls[face] = {
                "has_window": False,
                "reason": f"No window on {face} — {'no solar gain, only heat loss' if face == 'north' else 'harsh afternoon sun causes overheating'}"
            }
            continue
        
        face_window_area = total_window_area_m2 * ratio
        wall_length = length_mm if face in ("south", "north") else width_mm
        
        # V3: North window in extreme cold = small clerestory (high window)
        if face == "north" and climate["zone"] == "extreme_cold":
            win_width_mm = 800
            win_height_mm = 600
            sill_height_mm = 2000  # high clerestory
            num_windows = 1
            single_area = 0.48
        else:
            # Standard window proportions: height = 1.2 x width
            # V5 FIX: For large buildings, use MULTIPLE window bays per wall
            # Max single window width = 2400mm (practical limit)
            # If more area needed, add more windows with 600mm pier between them
            
            sill_height_mm = 900
            max_win_height_mm = ceiling_h - sill_height_mm - 100
            win_height_mm = min(1700, max_win_height_mm)  # standard max 1700mm
            win_height_mm = max(600, win_height_mm)
            
            max_single_width_mm = 2400
            
            # Calculate how many windows we need
            single_win_area = (max_single_width_mm / 1000) * (win_height_mm / 1000)
            num_windows = max(1, math.ceil(face_window_area / single_win_area))
            
            # Limit windows to what fits on wall (window + 600mm pier between each)
            max_windows_on_wall = max(1, int((wall_length - 300) / (max_single_width_mm + 600)))
            num_windows = min(num_windows, max_windows_on_wall)
            
            # Calculate actual window width per bay
            area_per_window = face_window_area / num_windows
            win_width_mm = round((area_per_window / (win_height_mm / 1000)) * 1000 / 100) * 100
            win_width_mm = max(600, min(win_width_mm, max_single_width_mm))
            
            # Clamp to wall space
            if win_width_mm > wall_length - 600:
                win_width_mm = wall_length - 600
            
            single_area = (win_width_mm / 1000) * (win_height_mm / 1000)
        
        total_face_area = round(single_area * num_windows, 2)
        
        wall_data = {
            "has_window": True,
            "width_mm": win_width_mm,
            "height_mm": win_height_mm,
            "sill_height_mm": sill_height_mm,
            "area_per_window_m2": round(single_area, 2),
            "num_windows": num_windows,
            "area_m2": total_face_area,
            "glazing": glazing_mat["name"],
            "glazing_id": glazing_mat["id"],
            "shgc": shgc,
            "u_value": glazing_mat.get("u_value") or 2.8,
            "position": "evenly_spaced" if num_windows > 1 else "center",
        }
        walls[face] = wall_data
    
    # Calculate actual total window area
    actual_total = sum(
        w.get("area_m2", 0) for w in walls.values() if w.get("has_window")
    )
    
    return {
        "walls": walls,
        "total_window_area_m2": round(actual_total, 2),
        "nbc_min_required_m2": round(min_window_area_m2, 2),
        "meets_nbc_daylight": actual_total >= min_window_area_m2,
        "solar_strategy": f"South-facing maximized at {lat}°N latitude for passive winter heating"
    }


# ─────────────────────────────────────────────────────────────
# ROOF CALCULATOR
# ─────────────────────────────────────────────────────────────

def calculate_roof(floor_plan: dict, climate: dict, structural_mat: dict):
    """
    Calculate roof geometry and structural members.
    
    IS 875 Part 4 — Snow load on roof:
      S_roof = μ × S₀
      where μ = 0.8 for slope 0-30°, reduced for steeper
    
    Beam sizing (simplified timber/steel):
      For span L (m), uniform load w (kN/m):
      M = w × L² / 8 (simply supported beam)
      Required section modulus S = M / f_b (allowable bending stress)
    """
    length_mm = floor_plan["length_mm"]
    width_mm = floor_plan["width_mm"]
    
    # Roof spans the shorter dimension (width)
    span_m = width_mm / 1000
    
    slope_deg = climate["min_roof_slope_deg"]
    snow_load = climate["snow_load_kn_m2"]
    
    # Shape coefficient for snow (IS 875 Part 4)
    if slope_deg <= 30:
        mu = 0.8
    elif slope_deg <= 60:
        mu = 0.8 * (60 - slope_deg) / 30
    else:
        mu = 0.0
    
    roof_snow_load = mu * snow_load  # kN/m²
    
    # Dead load of roofing (typical)
    dead_load = 0.5  # kN/m² for lightweight roofing (metal sheet + insulation)
    
    # Total load on roof
    total_roof_load = roof_snow_load + dead_load + IS875_LIVE_LOAD_RESIDENTIAL * 0.5
    
    # Beam sizing (simplified for timber)
    # Assuming timber beams, f_b = 8.5 MPa (IS 883 — Grade II timber)
    f_b = 8.5  # N/mm² allowable bending stress
    beam_spacing_mm = 600  # standard spacing
    
    w_per_beam = total_roof_load * (beam_spacing_mm / 1000)  # kN/m per beam
    
    # Maximum bending moment M = w × L² / 8
    M = (w_per_beam * span_m**2) / 8  # kN·m
    M_nmm = M * 1e6  # Convert to N·mm
    
    # Required section modulus S = M / f_b
    S_required = M_nmm / f_b  # mm³
    
    # FIX V2: Use standard lumber sizes (IS 883 / common Indian market)
    # Standard widths: 50, 75, 100, 150mm
    # Standard depths: 150, 200, 250, 300, 350, 400mm
    # V3 FIX: Start from 75mm minimum width for lateral stability
    # 50mm is too narrow for snow-zone roof beams
    STANDARD_WIDTHS = [75, 100, 150]
    STANDARD_DEPTHS = [150, 200, 250, 300, 350, 400]
    
    # Find the smallest standard section that satisfies S_required
    # Section modulus S = b × d² / 6
    b_mm = None
    d_mm = None
    for b in STANDARD_WIDTHS:
        for d in STANDARD_DEPTHS:
            s_provided = (b * d**2) / 6
            if s_provided >= S_required:
                b_mm = b
                d_mm = d
                break
        if b_mm is not None:
            break
    
    # Fallback if no standard size fits (extremely heavy loads)
    if b_mm is None:
        b_mm = 150
        d_mm = 400
    
    num_beams = math.ceil(length_mm / beam_spacing_mm) + 1
    
    # Ridge height calculation
    ridge_height_mm = round((width_mm / 2) * math.tan(math.radians(slope_deg)))
    
    return {
        "type": "gable",
        "slope_deg": slope_deg,
        "span_mm": width_mm,
        "ridge_height_mm": ridge_height_mm,
        "loads": {
            "dead_load_kn_m2": dead_load,
            "snow_load_kn_m2": round(roof_snow_load, 2),
            "total_kn_m2": round(total_roof_load, 2),
        },
        "beam": {
            "material": "timber",
            "width_mm": b_mm,
            "depth_mm": d_mm,
            "section": f"{b_mm}×{d_mm}",
            "spacing_mm": beam_spacing_mm,
            "count": num_beams,
            "bending_moment_knm": round(M, 3),
            "section_modulus_mm3": round(S_required, 0),
        },
        "reason": f"IS 875 Part 4: {slope_deg}° slope for {snow_load} kN/m² ground snow load, μ={mu}"
    }


# ─────────────────────────────────────────────────────────────
# FOUNDATION CALCULATOR
# ─────────────────────────────────────────────────────────────

def calculate_foundation(floor_plan: dict, wall_assembly: dict, climate: dict,
                         structural_mat: dict, roof: dict):
    """
    Calculate strip footing foundation per IS 1904.
    
    Foundation depth: frost_line + 100mm safety margin
    Foundation width: based on total load and soil bearing capacity
    
    Total load = dead load (walls + roof) + live load
    Width = Total load per meter / soil bearing capacity
    """
    length_m = floor_plan["length_mm"] / 1000
    width_m = floor_plan["width_mm"] / 1000
    ceiling_h_m = floor_plan["ceiling_height_mm"] / 1000
    perimeter_m = 2 * (length_m + width_m)
    
    # Wall dead load per meter of perimeter
    wall_thickness_m = wall_assembly["total_thickness_mm"] / 1000
    struct_density = structural_mat.get("density_kg_m3") or 1000
    wall_weight_per_m = struct_density * wall_thickness_m * ceiling_h_m * 9.81 / 1000  # kN/m
    
    # Roof dead load distributed to walls
    roof_total_load = roof["loads"]["total_kn_m2"]
    roof_area = length_m * width_m
    roof_load_per_m = (roof_total_load * roof_area) / perimeter_m  # kN/m
    
    # Live load
    live_load_per_m = IS875_LIVE_LOAD_RESIDENTIAL * width_m / 2  # kN/m (half width to each wall)
    
    # Total load per meter of foundation
    total_load_per_m = wall_weight_per_m + roof_load_per_m + live_load_per_m
    
    # Soil bearing capacity (conservative estimate for unknown soil)
    # IS 1904 — Safe bearing capacity for medium soil
    soil_bearing_kpa = 100  # kN/m² (conservative for sandy loam)
    
    # Required foundation width
    required_width_m = total_load_per_m / soil_bearing_kpa
    
    # Minimum 450mm, round up to nearest 50mm
    width_mm = max(450, math.ceil(required_width_m * 1000 / 50) * 50)
    
    # Foundation depth
    frost_depth = climate["frost_line_mm"]
    depth_mm = frost_depth + 100  # 100mm below frost line (IS 1904)
    depth_mm = max(depth_mm, 600)  # absolute minimum 600mm
    
    return {
        "type": "strip_footing",
        "depth_mm": depth_mm,
        "width_mm": width_mm,
        "perimeter_m": round(perimeter_m, 2),
        "loads": {
            "wall_dead_kn_m": round(wall_weight_per_m, 2),
            "roof_load_kn_m": round(roof_load_per_m, 2),
            "live_load_kn_m": round(live_load_per_m, 2),
            "total_kn_m": round(total_load_per_m, 2),
        },
        "soil_bearing_capacity_kpa": soil_bearing_kpa,
        "reason": f"IS 1904: {frost_depth}mm frost line + 100mm margin = {depth_mm}mm depth. Width {width_mm}mm from {round(total_load_per_m,1)} kN/m load on {soil_bearing_kpa} kPa soil."
    }


# ─────────────────────────────────────────────────────────────
# BUDGET CALCULATOR
# ─────────────────────────────────────────────────────────────

def calculate_budget(floor_plan: dict, wall_assembly: dict, roof: dict,
                     foundation: dict, structural_mat: dict, insulation_mat: dict,
                     glazing_mat: dict, windows: dict, climate: dict, building_type: str = "residential"):
    """
    Calculate a realistic itemized construction cost estimate in INR using
    an industry-standard Bill of Quantities (BOQ) approach.

    Unit rates are based on:
    - CPWD/PWD Schedule of Rates (India, 2024-2026)
    - Market research for Leh/Ladakh region with high-altitude logistics premium
    - Industry benchmarks (buildcost.in, infralens.in, 99acres.com)

    All 13 construction trades are costed individually.
    """

    length_m = floor_plan["length_mm"] / 1000
    width_m = floor_plan["width_mm"] / 1000
    ceiling_h_m = floor_plan["ceiling_height_mm"] / 1000
    floor_area_m2 = floor_plan["area_m2"]
    perimeter_m = 2 * (length_m + width_m)

    # ── Geometry ──────────────────────────────────────────────────────────────
    gross_wall_area = perimeter_m * ceiling_h_m
    window_area = windows["total_window_area_m2"]
    net_wall_area = gross_wall_area - window_area
    roof_area = length_m * width_m / max(math.cos(math.radians(roof["slope_deg"])), 0.1)
    num_partitions = floor_plan.get("internal_walls", {}).get("count", 0)
    internal_wall_area = num_partitions * 3.5 * ceiling_h_m  # vertical area of partitions

    # ── Location cost multiplier (transport/logistics premium) ─────────────────
    # Extreme cold (Ladakh): +65% — Zojila pass, seasonal cutoff, advance stocking
    # Cold (Himachal/Uttarakhand mountains): +30%
    # Moderate/warm: baseline
    zone = climate.get("zone", "moderate")
    if zone == "extreme_cold":
        location_multiplier = 1.65
    elif zone == "cold":
        location_multiplier = 1.30
    else:
        location_multiplier = 1.0

    # ── TRADE 1: Structural Masonry / Walls ───────────────────────────────────
    struct_layer = next(
        (l for l in wall_assembly["layers"] if l["material"] == structural_mat["name"]), None
    )
    struct_thickness_mm = struct_layer["thickness_mm"] if struct_layer else 100
    thickness_multiplier = struct_thickness_mm / 100.0
    base_struct_rate = structural_mat.get("cost_per_m2_inr") or 500
    structural_cost = (net_wall_area * thickness_multiplier + internal_wall_area) * base_struct_rate

    # ── TRADE 2: RCC Superstructure (columns, beams, slab) ───────────────────
    # Rate: ₹2,200/m² floor area (shuttering + steel + concrete + curing — CPWD 2024)
    RCC_RATE_PER_M2 = 2200
    rcc_cost = floor_area_m2 * RCC_RATE_PER_M2

    # ── TRADE 3: Insulation ──────────────────────────────────────────────────
    insul_layer = next(
        (l for l in wall_assembly["layers"] if l["material"] == insulation_mat["name"]), None
    )
    insul_thickness_mm = insul_layer["thickness_mm"] if insul_layer else 50
    insul_multiplier = insul_thickness_mm / 50.0
    insulation_cost = net_wall_area * insul_multiplier * (insulation_mat.get("cost_per_m2_inr") or 400)
    # Roof insulation (60% of wall rate — continuous blanket, less labor)
    insulation_cost += roof_area * (insulation_mat.get("cost_per_m2_inr") or 400) * 0.6

    # ── TRADE 4: Glazing / Windows ─────────────────────────────────────────
    glazing_cost = window_area * (glazing_mat.get("cost_per_m2_inr") or 1800)

    # ── TRADE 5: Doors (frames + shutters + hardware) ──────────────────────
    num_bedrooms = floor_plan.get("rooms", {}).get("bedrooms", {}).get("count", 1)
    num_bathrooms = floor_plan.get("rooms", {}).get("bathrooms", {}).get("count", 1)
    num_doors = 1 + num_bedrooms + num_bathrooms + 1  # main + bedrooms + bathrooms + kitchen
    DOOR_RATE_INR = 14000  # ₹ per door (solid wood frame + flush shutter + hardware)
    door_cost = num_doors * DOOR_RATE_INR

    # ── TRADE 6: Roofing (timber + metal sheet + ridge + gutters) ──────────
    # Rates: ₹3,800 (extreme cold), ₹3,200 (cold), ₹2,200 (moderate/warm) per m² roof
    if zone == "extreme_cold":
        roof_unit_rate = 3800
    elif zone == "cold":
        roof_unit_rate = 3200
    else:
        roof_unit_rate = 2200
    roof_cost = roof_area * roof_unit_rate

    # ── TRADE 7: Foundation (excavation + PCC + RCC strip + backfill) ──────
    # Rate: ₹10,000/running meter (includes all sub-trades)
    FOUNDATION_RATE_PER_M = 10000
    foundation_cost = foundation["perimeter_m"] * FOUNDATION_RATE_PER_M

    # ── TRADE 8: Flooring & Tiling ─────────────────────────────────────────
    # Rate: ₹1,400/m² (screed + adhesive + tiles/stone + skirting)
    FLOORING_RATE_PER_M2 = 1400
    floor_cost = floor_area_m2 * FLOORING_RATE_PER_M2

    # ── TRADE 9: Plastering ────────────────────────────────────────────────
    # External walls: ₹440/m² (both sides)
    # Internal partitions: ₹380/m² (both sides)
    # Ceiling: ₹180/m²
    plaster_cost = (gross_wall_area * 440) + (internal_wall_area * 380) + (floor_area_m2 * 180)

    # ── TRADE 10: Painting & Finishing ─────────────────────────────────────
    # Rate: ₹180/m² (putty + primer + 2 coats both interior and exterior)
    paint_area = gross_wall_area + internal_wall_area * 2 + floor_area_m2  # walls + ceiling
    paint_cost = paint_area * 180

    # ── TRADE 11: Electrical (wiring, conduit, DBs, MCBs, switches, fixtures) ──
    # Rate: ₹1,500/m² floor area (standard residential)
    electrical_cost = floor_area_m2 * 1500

    # ── TRADE 12: Plumbing & Sanitaryware ──────────────────────────────────
    # Rate: ₹1,200/m² floor area (CPVC, WC, basin, taps, drainage, septic)
    plumbing_cost = floor_area_m2 * 1200

    # ── TRADE 13: Waterproofing (bathrooms + roof) ─────────────────────────
    bathroom_area = num_bathrooms * floor_plan.get("rooms", {}).get(
        "bathrooms", {}).get("area_each_m2", 2.8)
    waterproofing_cost = (bathroom_area * 900) + (roof_area * 700)

    # ── Emergency Shelter Cost Reductions ──────────────────────────────────
    if building_type == "emergency":
        rcc_cost = 0  # No concrete superstructure
        plaster_cost = 0  # No plastering on temp panels
        paint_cost = paint_cost * 0.1  # Minimal finish
        plumbing_cost = plumbing_cost * 0.2  # Basic temporary plumbing
        electrical_cost = electrical_cost * 0.3  # Basic wiring kit
        foundation_cost = foundation["perimeter_m"] * 1500  # Cheap ground anchors instead of strip footing
        door_cost = door_cost * 0.3  # Cheap doors
        floor_cost = floor_cost * 0.2  # Cheap flooring
        waterproofing_cost = waterproofing_cost * 0.1 # Minimal waterproofing

    # ── Apply Location Multiplier ──────────────────────────────────────────
    # Material-heavy trades scale fully with transport premium
    material_trades = (
        structural_cost + rcc_cost + insulation_cost + glazing_cost +
        door_cost + roof_cost + foundation_cost + floor_cost +
        plaster_cost + waterproofing_cost
    )
    # Labor-heavy trades (electrical, plumbing, painting) scale partially
    # (local material bought cheap, but labor is scarce)
    labor_premium_factor = 1 + (location_multiplier - 1) * 0.6
    labor_trades = (electrical_cost + plumbing_cost + paint_cost) * labor_premium_factor

    material_subtotal = material_trades * location_multiplier + labor_trades

    # ── Construction Labor (28% of material subtotal) ─────────────────────
    labor_cost = material_subtotal * 0.28
    if building_type == "emergency":
        labor_cost = material_subtotal * 0.08  # Quick assembly kit

    # ── Professional Fees: Architect + Structural Engineer (7%) ───────────
    professional_fees = (material_subtotal + labor_cost) * 0.07
    if building_type == "emergency":
        professional_fees = 0  # No architect needed for modular kits

    # ── Contingency Buffer ─────────────────────────────────────────────────
    if zone == "extreme_cold":
        contingency_pct = 0.20  # 20% — highly volatile mountain supply chain
    elif zone == "cold":
        contingency_pct = 0.15
    else:
        contingency_pct = 0.10

    pre_contingency = material_subtotal + labor_cost + professional_fees
    contingency = pre_contingency * contingency_pct
    total = pre_contingency + contingency

    return {
        "breakdown": {
            "structural_masonry_inr": round(structural_cost * location_multiplier),
            "rcc_superstructure_inr": round(rcc_cost * location_multiplier),
            "insulation_inr": round(insulation_cost * location_multiplier),
            "glazing_windows_inr": round(glazing_cost * location_multiplier),
            "doors_inr": round(door_cost * location_multiplier),
            "roofing_inr": round(roof_cost * location_multiplier),
            "foundation_inr": round(foundation_cost * location_multiplier),
            "flooring_tiling_inr": round(floor_cost * location_multiplier),
            "plastering_inr": round(plaster_cost * location_multiplier),
            "painting_finishing_inr": round(paint_cost * labor_premium_factor),
            "electrical_inr": round(electrical_cost * labor_premium_factor),
            "plumbing_sanitaryware_inr": round(plumbing_cost * labor_premium_factor),
            "waterproofing_inr": round(waterproofing_cost * location_multiplier),
            "construction_labor_inr": round(labor_cost),
            "professional_fees_inr": round(professional_fees),
            "contingency_buffer_inr": round(contingency),
        },
        "location_premium": {
            "zone": zone,
            "multiplier": location_multiplier,
            "reason": (
                "Ladakh: seasonal road closure (Oct-May), Zojila pass logistics, "
                "skilled labor scarcity, advance winter stocking required."
                if zone == "extreme_cold"
                else "Mountain zone: limited construction season, elevated freight."
                if zone == "cold"
                else "Standard logistics — no remote area premium applied."
            ),
        },
        "material_subtotal_inr": round(material_subtotal),
        "total_estimated_inr": round(total),
    }

# ─────────────────────────────────────────────────────────────
# VENTILATION HEAT LOSS CALCULATOR (V3)
# ─────────────────────────────────────────────────────────────

def calculate_ventilation_loss(floor_plan: dict, climate: dict, occupancy: int):
    """
    Calculate ventilation / infiltration heat loss.
    
    Q_vent = 0.33 × ACH × Volume × ΔT  (W)
    
    Where:
    - ACH = Air Changes per Hour (depends on construction tightness)
    - Volume = floor_area × ceiling_height (m³)
    - ΔT = indoor target (20°C) - outdoor avg temp
    - 0.33 = volumetric heat capacity of air (Wh/m³K)
    
    NBC minimum fresh air: 0.3 ACH or 8 L/s per person (whichever is higher)
    """
    floor_area = floor_plan["area_m2"]
    ceiling_h = floor_plan["ceiling_height_mm"] / 1000
    volume = floor_area * ceiling_h
    
    # Construction tightness determines ACH
    if climate["zone"] == "extreme_cold":
        # Tight construction assumed for extreme cold (vapour barriers, sealing)
        ach = 0.5
    elif climate["zone"] == "cold":
        ach = 0.7
    else:
        # Standard construction
        ach = 1.0
    
    # NBC minimum: 8 L/s per person = 28.8 m³/h per person
    nbc_min_ach = (occupancy * 28.8) / volume
    ach = max(ach, nbc_min_ach)  # must meet NBC minimum
    
    # Heat loss calculation
    indoor_target = 20.0  # °C
    # Use worst case: coldest expected temp (avg - 10°C for night)
    outdoor_design_temp = -15.0 if climate["zone"] == "extreme_cold" else 0.0
    delta_t = indoor_target - outdoor_design_temp
    
    # Q = 0.33 × ACH × V × ΔT (Watts)
    q_vent_watts = 0.33 * ach * volume * delta_t
    
    # Annual heating energy from ventilation (rough estimate)
    # Heating degree days for extreme cold ≈ 5000, cold ≈ 3000
    hdd = 5000 if climate["zone"] == "extreme_cold" else 3000
    annual_vent_kwh = 0.33 * ach * volume * hdd * 24 / 1000  # kWh/year
    
    return {
        "ach": round(ach, 2),
        "volume_m3": round(volume, 2),
        "design_delta_t": delta_t,
        "peak_heat_loss_watts": round(q_vent_watts, 1),
        "annual_vent_kwh": round(annual_vent_kwh, 1),
        "nbc_min_fresh_air_l_s": occupancy * 8,
        "reason": f"ACH={ach} for {climate['zone']} construction. "
                  f"NBC min {occupancy * 8} L/s fresh air. "
                  f"Peak loss {round(q_vent_watts)}W at ΔT={delta_t}°C."
    }


# ─────────────────────────────────────────────────────────────
# MAIN SPEC GENERATOR
# ─────────────────────────────────────────────────────────────

def generate_building_spec(
    occupancy: int,
    location: str,
    lat: float,
    lon: float,
    budget_inr: int,
    building_type: str = "residential",
    avg_temp_c: float = -5.0,
    structural_id: str = "eps",
    insulation_id: str = "eps",
    glazing_id: str = "low_e_double_glazed",
):
    """
    Generate a complete, construction-grade building specification.
    
    Every dimension is backed by NBC 2016, IS 875, IS 1904, or standard building physics.
    
    Args:
        occupancy: Number of people the building must accommodate.
        location: Name of the city or region (e.g., "Leh, Ladakh").
        lat: Latitude of the location (e.g., 34.15).
        lon: Longitude of the location (e.g., 77.58).
        budget_inr: Target budget in Indian Rupees (INR) (e.g., 500000).
        building_type: The type of building. Must be one of: "residential", "emergency", "institutional".
        avg_temp_c: The average winter temperature in Celsius for the location (e.g., -5.0).
        structural_id: ID of the primary wall material. Options: "aac_blocks", "cse_blocks", "timber_frame".
        insulation_id: ID of the primary insulation. Options: "xps_insulation", "mineral_wool", "hempcrete".
        glazing_id: ID of the window type. Options: "single_clear", "double_clear", "low_e_double_glazed".
    """
    
    # 1. Load materials
    all_materials = load_all_materials()
    
    # V5 FIX: Emergency shelters auto-select budget-friendly materials
    # Override user selection with cheapest effective options
    if building_type == "emergency":
        # Find cheapest in each category
        cheapest_structural = min(
            all_materials["structural"],
            key=lambda m: m.get("cost_per_m2_inr") or 9999
        )
        cheapest_insulation = min(
            all_materials["insulation"],
            key=lambda m: m.get("cost_per_m2_inr") or 9999
        )
        cheapest_glazing = min(
            all_materials["glazing"],
            key=lambda m: m.get("cost_per_m2_inr") or 9999
        )
        structural_id = cheapest_structural["id"]
        insulation_id = cheapest_insulation["id"]
        glazing_id = cheapest_glazing["id"]
    
    # Material lookup (after potential emergency override)
    structural_mat = next((m for m in all_materials["structural"] if m["id"] == structural_id), all_materials["structural"][0])
    insulation_mat = next((m for m in all_materials["insulation"] if m["id"] == insulation_id), all_materials["insulation"][0])
    glazing_mat = next((m for m in all_materials["glazing"] if m["id"] == glazing_id), all_materials["glazing"][0])
    
    # 2. Classify climate
    climate = classify_climate(avg_temp_c, lat)
    
    # 3. V4: Calculate optimal shape and orientation
    shape_data = calculate_shape_and_orientation(climate, building_type, lat)
    
    # 4. Calculate floor plan (uses shape's aspect ratio)
    floor_plan = calculate_floor_plan(occupancy, building_type, shape_data)
    
    # 4. Calculate wall assembly
    wall_assembly = calculate_wall_assembly(structural_mat, insulation_mat, climate)
    
    # 5. Calculate windows
    windows = calculate_windows(floor_plan, climate, glazing_mat, lat)
    
    # 6. Calculate roof
    roof = calculate_roof(floor_plan, climate, structural_mat)
    
    # 7. Calculate foundation
    foundation = calculate_foundation(floor_plan, wall_assembly, climate, structural_mat, roof)
    
    # 8. Calculate budget
    budget = calculate_budget(floor_plan, wall_assembly, roof, foundation,
                              structural_mat, insulation_mat, glazing_mat, windows, climate, building_type)
    
    # 9. Assemble final spec
    spec = {
        "version": "V5",
        "building_type": building_type,
        "occupancy": occupancy,
        "location": {
            "name": location,
            "lat": lat,
            "lon": lon,
        },
        "climate": climate,
        "form": shape_data,
        "floor_plan": floor_plan,
        "wall_assembly": wall_assembly,
        "walls": {
            face: {
                "face": face,
                "length_mm": floor_plan["length_mm"] if face in ("south", "north") else floor_plan["width_mm"],
                "height_mm": floor_plan["ceiling_height_mm"],
                "assembly": wall_assembly,
                "window": win_data,
            }
            for face, win_data in windows["walls"].items()
        },
        "windows_summary": windows,
        "roof": roof,
        "foundation": foundation,
        "materials_selected": {
            "structural": {"id": structural_mat["id"], "name": structural_mat["name"]},
            "insulation": {"id": insulation_mat["id"], "name": insulation_mat["name"]},
            "glazing": {"id": glazing_mat["id"], "name": glazing_mat["name"]},
        },
        "budget": {
            **budget,
            "user_budget_inr": budget_inr,
            "within_budget": budget["total_estimated_inr"] <= budget_inr,
        },
        "ventilation": calculate_ventilation_loss(floor_plan, climate, occupancy),
    }
    
    return spec


# ─────────────────────────────────────────────────────────────
# CLI TEST
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    spec = generate_building_spec(
        occupancy=4,
        location="Leh, Ladakh",
        lat=34.15,
        lon=77.58,
        budget_inr=500000,
        building_type="emergency",
        avg_temp_c=-5.0,
        structural_id="eps",
        insulation_id="eps",
        glazing_id="low_e_double_glazed",
    )
    
    print(json.dumps(spec, indent=2))
