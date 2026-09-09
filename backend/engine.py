import sqlite3
import os
from weather import fetch_live_weather

def get_material_from_db(mat_id):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, "thermoshelter.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM materials WHERE id = ?", (mat_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None
async def generate_simulation_input(lat: float, lon: float, selected_material_ids: dict):
    """
    selected_material_ids: e.g. {"insulation": "polyurethane_foam", "structural": "timber_frame", "glazing": "double_glazed"}
    """
    # 1. Fetch live and historical weather + solar data
    weather_data = await fetch_live_weather(lat, lon)
    
    # 2 & 3. Fetch selected materials from SQLite database
    shelter_materials = {}
    for category, mat_id in selected_material_ids.items():
        mat = get_material_from_db(mat_id)
        if mat:
            shelter_materials[category] = mat
    # 4. Return aggregated payload for the simulation engine
    return {
        "location": {"lat": lat, "lon": lon},
        "environmental_data": weather_data,
        "shelter_materials": shelter_materials,
        "metadata": {
            "ready_for_simulation": True
        }
    }

def calculate_budget(shelter_materials: dict, surface_area_m2: float, base_distance_km: float = 0):
    """
    Estimates the cost of the shelter based on materials and transport.
    """
    total_material_cost = 0
    total_weight_kg = 0
    
    # Calculate base material cost and weight
    for category, mat in shelter_materials.items():
        if mat.get("cost_per_m2_inr") is not None:
            cost = mat["cost_per_m2_inr"] * surface_area_m2
            total_material_cost += cost
            
        if mat.get("density_kg_m3") is not None:
            # Assuming average thickness of 0.1m for weight calculation
            volume = surface_area_m2 * 0.1 
            weight = mat["density_kg_m3"] * volume
            total_weight_kg += weight
            
    # Transport cost: e.g., 5 INR per kg per 100km
    transport_multiplier = (base_distance_km / 100.0)
    transport_cost = total_weight_kg * 5 * transport_multiplier
    
    return {
        "material_cost_inr": round(total_material_cost, 2),
        "transport_cost_inr": round(transport_cost, 2),
        "total_estimated_cost_inr": round(total_material_cost + transport_cost, 2)
    }

def run_thermal_simulation(weather_data: dict, shelter_materials: dict, occupants: int = 5,
                           building_dimensions: dict = None) -> dict:
    """
    Simulates a 48-hour indoor temperature curve based on the building physics Lumped Capacitance model.
    Incorporates U-values, Thermal Mass, Solar Heat Gain (SHGC), and internal occupant heat.
    """
    forecast_outdoor = weather_data.get("forecast", [15.0] * 48)
    solar_dni = weather_data.get("solar_forecast_dni", [0.0] * 48)
    
    # Ensure exactly 48 hours for loops
    forecast_outdoor = (forecast_outdoor + [15.0] * 48)[:48]
    solar_dni = (solar_dni + [0.0] * 48)[:48]

    # Use actual calculated dimensions if provided, otherwise use sensible defaults
    if building_dimensions:
        wall_area = building_dimensions.get("wall_area_m2", 50.0)
        roof_area = building_dimensions.get("roof_area_m2", 25.0)
        window_area = building_dimensions.get("window_area_m2", 4.0)
    else:
        # Fallback: assume a modest 5x5m footprint, 2.7m ceiling
        wall_area = 50.0   # m²
        roof_area = 25.0   # m²
        window_area = 4.0  # m²
    
    # 1. Calculate UA (Total Conductive Heat Transfer Coefficient in W/K)
    total_UA = 0.0
    total_thermal_capacitance = 0.0 # J/K
    
    # Process Materials
    for category, mat in shelter_materials.items():
        area = window_area if category == "glazing" else (wall_area if category == "structural" else roof_area + wall_area)
        
        # Calculate R-Value and U-Value
        r_val = mat.get("r_value") or 1.0 # default
        thickness = 0.1 # m (10 cm default)
        
        if category != "glazing":
            # The value in DB for structural/insulation is per-inch, so scale it
            r_val = r_val * (thickness / 0.0254)
            
        u_val = 1.0 / max(r_val, 0.1)
        total_UA += u_val * area
        
        # Calculate Thermal Mass (density * volume * specific_heat)
        density = mat.get("density_kg_m3") or 1000
        c_p = mat.get("specific_heat_j_kg_k") or 1000 # default J/(kg K)
        mass = density * (area * thickness)
        total_thermal_capacitance += mass * c_p

    if total_thermal_capacitance == 0:
        total_thermal_capacitance = 100000 # fallback

    # 2. Internal Heat Gain
    # Sensible heat per person is ~100W
    q_internal = occupants * 100.0 # Watts

    # 3. Solar Heat Gain Coefficient (SHGC)
    shgc = 0.7 
    if "glazing" in shelter_materials:
        shgc = shelter_materials["glazing"].get("shgc") or 0.7

    indoor_temps = []
    current_indoor_temp = 20.0 # Start at comfortable 20C
    comfort_hours = 0
    energy_kwh = 0.0

    # 4. Euler Integration (Hour by Hour)
    dt = 3600 # 1 hour in seconds
    for t in range(48):
        t_out = forecast_outdoor[t]
        i_solar = solar_dni[t]
        
        # Heat transfers (in Watts)
        q_cond = total_UA * (t_out - current_indoor_temp)
        q_solar = window_area * shgc * i_solar
        
        net_q = q_cond + q_solar + q_internal
        
        # Temp change (dT = (Q_net * dt) / C_th)
        delta_t = (net_q * dt) / total_thermal_capacitance
        
        current_indoor_temp += delta_t
        indoor_temps.append(round(current_indoor_temp, 2))

        # Check comfort (18C to 24C)
        if 18.0 <= current_indoor_temp <= 24.0:
            comfort_hours += 1
        else:
            # Energy required to push back to comfort boundary
            target = 18.0 if current_indoor_temp < 18.0 else 24.0
            energy_needed_joules = abs(total_thermal_capacitance * (target - current_indoor_temp))
            energy_kwh += energy_needed_joules / 3600000.0 # Joules to kWh

    comfort_score = round((comfort_hours / 48.0) * 100)
    
    return {
        "indoor_temp_curve": indoor_temps,
        "outdoor_temp_curve": forecast_outdoor,
        "comfort_score": comfort_score,
        "energy_estimate_kwh": round(energy_kwh, 2),
        "total_ua_w_k": round(total_UA, 2)
    }
