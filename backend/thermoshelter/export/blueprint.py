"""
ThermoShelter — Blueprint & Visualization Data Export Module
Converts a validated DesignState and PerformanceVector into structured,
machine-readable engineering blueprints and 3D visualization parameters.
"""

from typing import Dict, Any, List
import json
from ..core.design_state import DesignState
from ..core.performance_vector import PerformanceVector
from ..validation.engineering_validator import ValidationReport


class BlueprintExporter:
    """
    Generates structured blueprint specifications and visualization primitives.
    """

    @classmethod
    def export_blueprint(
        cls,
        design: DesignState,
        performance: PerformanceVector,
        validation: ValidationReport
    ) -> Dict[str, Any]:
        """
        Generate complete machine-readable blueprint data structure.
        """
        geom = design.geometry
        env = design.envelope
        ctx = design.context
        req = design.requirements

        # 1. Bill of Materials Rough Volume & Mass Calculations
        wall_vol_m3 = (geom.gross_wall_area_m2 - design.total_opening_area_m2) * (env.wall_thickness_mm / 1000.0)
        roof_vol_m3 = geom.roof_area_m2 * (env.roof_thickness_mm / 1000.0)
        floor_vol_m3 = geom.floor_area_m2 * (env.floor_thickness_mm / 1000.0)

        bom = [
            {
                "component": "Wall Envelope Core",
                "assembly_id": env.wall_assembly_id,
                "primary_material_id": env.wall_material_id,
                "thickness_mm": env.wall_thickness_mm,
                "net_surface_area_m2": round(design.net_wall_area_m2, 2),
                "estimated_material_volume_m3": round(wall_vol_m3, 2),
                "effective_u_value_W_m2K": env.wall_u_value_W_m2K
            },
            {
                "component": "Roof Assembly",
                "assembly_id": env.roof_assembly_id,
                "primary_material_id": env.roof_material_id,
                "thickness_mm": env.roof_thickness_mm,
                "net_surface_area_m2": round(geom.roof_area_m2, 2),
                "estimated_material_volume_m3": round(roof_vol_m3, 2),
                "effective_u_value_W_m2K": env.roof_u_value_W_m2K
            },
            {
                "component": "Ground Floor Slab",
                "assembly_id": env.floor_assembly_id,
                "primary_material_id": env.floor_material_id,
                "thickness_mm": env.floor_thickness_mm,
                "net_surface_area_m2": round(geom.floor_area_m2, 2),
                "estimated_material_volume_m3": round(floor_vol_m3, 2),
                "effective_u_value_W_m2K": env.floor_u_value_W_m2K
            }
        ]

        # 2. Fenestration Schedule
        fenestration = []
        for op in design.openings:
            fenestration.append({
                "opening_id": op.opening_id,
                "opening_type": op.opening_type,
                "orientation": op.orientation,
                "dimensions_m": f"{op.width_m:.2f} x {op.height_m:.2f}",
                "area_m2": round(op.area_m2, 2),
                "glazing_type": op.glazing_type,
                "u_value_W_m2K": op.u_value_W_m2K,
                "shgc": op.shgc,
                "weather_stripped": op.weather_stripped
            })

        # 3. 3D Bounding Box Primitives for Downstream Visualization Engine
        L, W, H = geom.length_m, geom.width_m, geom.height_m
        visualization_primitives = {
            "bounding_box_dimensions_m": {"length_x": L, "width_y": W, "height_z": H},
            "roof_pitch_deg": geom.roof_angle_deg,
            "roof_type": geom.roof_type,
            "cardinal_rotation_deg": design.orientation_azimuth_deg,
            "wireframe_vertices_local": [
                [0.0, 0.0, 0.0],
                [L, 0.0, 0.0],
                [L, W, 0.0],
                [0.0, W, 0.0],
                [0.0, 0.0, H],
                [L, 0.0, H],
                [L, W, H],
                [0.0, W, H]
            ]
        }

        return {
            "blueprint_version": "1.0.0",
            "project_metadata": {
                "design_id": design.design_id,
                "shelter_name": design.design_name,
                "location": ctx.location_name,
                "climate_zone": ctx.climate_zone,
                "elevation_m": ctx.elevation_m,
                "intended_use": req.intended_use,
                "occupant_count": req.occupant_count
            },
            "architectural_dimensions": {
                "floor_area_m2": geom.floor_area_m2,
                "gross_wall_area_m2": geom.gross_wall_area_m2,
                "net_wall_area_m2": round(design.net_wall_area_m2, 2),
                "roof_area_m2": geom.roof_area_m2,
                "volume_m3": geom.volume_m3,
                "aspect_ratio": geom.aspect_ratio,
                "surface_to_volume_ratio": geom.surface_to_volume_ratio,
                "length_m": geom.length_m,
                "width_m": geom.width_m,
                "height_m": geom.height_m
            },
            "orientation_and_solar": {
                "building_azimuth_deg": design.orientation_azimuth_deg,
                "long_axis_direction": "East-West (True South Glazing Face)",
                "north_wwr": round(design.north_wwr * 100.0, 1),
                "south_wwr": round(design.south_wwr * 100.0, 1),
                "shading_strategy_id": design.shading_strategy_id
            },
            "bill_of_materials": bom,
            "fenestration_schedule": fenestration,
            "passive_strategies": design.passive_strategies,
            "validated_thermal_performance": {
                "avg_indoor_temp_C": round(performance.avg_indoor_temp_C.value, 2),
                "min_indoor_temp_C": round(performance.min_indoor_temp_C.value, 2),
                "max_indoor_temp_C": round(performance.max_indoor_temp_C.value, 2),
                "temperature_lift_C": round(performance.temperature_lift_C.value, 2),
                "hours_below_5C": performance.hours_below_5C.value,
                "thermal_time_constant_hours": round(performance.thermal_time_constant_hours.value, 1)
            },
            "compliance_summary": {
                "is_fully_compliant": validation.is_fully_compliant,
                "mandatory_failures": validation.mandatory_failures,
                "warnings": validation.warnings
            },
            "room_program": {
                "purpose_profile_id": design.purpose_profile_id,
                "total_rooms": len(design.rooms),
                "usable_area_m2": round(design.usable_area_m2, 1),
                "circulation_area_m2": round(design.circulation_area_m2, 1),
                "rooms": [
                    {
                        "room_id": r.room_id,
                        "room_type": r.room_type,
                        "name": r.name,
                        "area_m2": r.area_m2,
                        "requires_window": r.requires_window,
                        "requires_door": r.requires_door,
                        "ventilation": r.ventilation,
                        "privacy": r.privacy,
                    }
                    for r in design.rooms
                ]
            },
            "visualization_3d_data": visualization_primitives
        }

    @classmethod
    def export_floor_plan(cls, design: DesignState) -> Dict[str, Any]:
        """
        Generate architecture-grade 2D floor plan data with zone-based room placement.
        
        Algorithm:
        1. Classify rooms into PUBLIC zone (entry-facing) and PRIVATE zone (rear)
        2. Insert a circulation corridor between zones if total area > 40m²
        3. Within each zone, subdivide rooms proportionally
        4. For DUPLEX: export two floor plans (ground + first floor)
        
        Returns structured geometry data for SVG rendering.
        """
        import math
        geom = design.geometry
        env = design.envelope
        L, W = geom.length_m, geom.width_m
        wall_t = env.wall_thickness_mm / 1000.0

        # Orientation mapping
        azimuth = design.orientation_azimuth_deg
        cardinal_map = {
            0.0: {"south": "bottom", "north": "top", "east": "right", "west": "left"},
            180.0: {"south": "top", "north": "bottom", "east": "right", "west": "left"},
            90.0: {"south": "left", "north": "right", "east": "top", "west": "bottom"},
            270.0: {"south": "right", "north": "left", "east": "top", "west": "bottom"},
        }
        orientation_key = min(cardinal_map.keys(), key=lambda k: abs(k - azimuth))
        wall_directions = cardinal_map.get(orientation_key, cardinal_map[180.0])
        north_arrow_angle_deg = (360.0 - azimuth) % 360.0

        # Check if this is a duplex (multi-floor)
        is_duplex = design.purpose_profile_id in ('DUPLEX_HOUSE', 'duplex_house')

        if is_duplex:
            return cls._export_duplex_floor_plan(design, L, W, wall_t, azimuth, wall_directions, north_arrow_angle_deg)

        # Single-floor plan with zone-based layout
        floor_plan = cls._generate_single_floor(
            design, L, W, wall_t, azimuth, wall_directions, north_arrow_angle_deg,
            design.rooms, design.openings, "Ground Floor"
        )
        return floor_plan

    @classmethod
    def _export_duplex_floor_plan(cls, design, L, W, wall_t, azimuth, wall_directions, north_arrow_angle_deg):
        """Generate duplex floor plan with ground floor and first floor."""
        rooms = list(design.rooms) if design.rooms else []

        # Split rooms into ground floor (public: LIVING, KITCHEN, ENTRY, SHARED) and
        # first floor (private: SLEEPING, SERVICE, STORAGE)
        ground_types = {'LIVING', 'KITCHEN', 'ENTRY', 'SHARED', 'WAITING', 'TREATMENT'}
        first_types = {'SLEEPING', 'SERVICE', 'STORAGE'}

        ground_rooms = [r for r in rooms if r.room_type in ground_types]
        first_rooms = [r for r in rooms if r.room_type in first_types]

        # If split is empty on either side, do a rough 50/50
        if not ground_rooms:
            half = len(rooms) // 2
            ground_rooms = rooms[:max(1, half)]
            first_rooms = rooms[max(1, half):]
        if not first_rooms:
            half = len(rooms) // 2
            ground_rooms = rooms[:max(1, half)]
            first_rooms = rooms[max(1, half):]

        # Split openings: south/entry-facing openings go to ground, rest to first
        ground_openings = [o for o in design.openings if o.orientation.lower() in ('south', 'west')]
        first_openings = [o for o in design.openings if o.orientation.lower() in ('north', 'east')]
        # Ensure at least 1 opening per floor
        if not ground_openings and design.openings:
            ground_openings = [design.openings[0]]
        if not first_openings and len(design.openings) > 1:
            first_openings = [design.openings[-1]]

        ground_plan = cls._generate_single_floor(
            design, L, W, wall_t, azimuth, wall_directions, north_arrow_angle_deg,
            ground_rooms, ground_openings, "Ground Floor"
        )
        first_plan = cls._generate_single_floor(
            design, L, W, wall_t, azimuth, wall_directions, north_arrow_angle_deg,
            first_rooms, first_openings, "First Floor"
        )

        # Add staircase metadata to both floors
        stair_x = L * 0.85
        stair_y = W * 0.5
        stair_w = max(1.0, L * 0.12)
        stair_h = max(2.0, W * 0.30)

        staircase = {
            "x": round(stair_x - stair_w / 2, 3),
            "y": round(stair_y - stair_h / 2, 3),
            "w": round(stair_w, 3),
            "h": round(stair_h, 3),
            "direction": "up",
            "num_treads": 14,
        }
        ground_plan["staircase"] = staircase
        first_plan["staircase"] = {**staircase, "direction": "down"}

        return {
            "is_multi_floor": True,
            "num_floors": 2,
            "floor_plans": [ground_plan, first_plan],
            "title": "Duplex Blueprint — Two-Story Shelter Design",
            "subtitle": f"{design.design_name} - {design.context.location_name}",
            "design_id": design.design_id,
            "floor_area_m2": design.geometry.floor_area_m2 * 2,
            "purpose_profile_id": design.purpose_profile_id,
            "north_arrow_angle_deg": north_arrow_angle_deg,
            "orientation_azimuth_deg": azimuth,
            "note": "Duplex conceptual design. Ground floor: public zones. First floor: private zones."
        }

    @classmethod
    def _generate_single_floor(cls, design, L, W, wall_t, azimuth, wall_directions,
                                north_arrow_angle_deg, rooms, openings, floor_label):
        """
        Generate a single floor plan using zone-based room placement.
        
        Algorithm:
        - Classify rooms as PUBLIC or PRIVATE
        - If corridor needed (>40m² or >3 rooms): insert a horizontal corridor spine
        - Place public rooms in the entry-facing half, private rooms in the rear half
        - Within each zone, subdivide proportionally along the length axis
        """
        import math
        geom = design.geometry
        env = design.envelope

        outer_boundary = [[0.0, 0.0], [L, 0.0], [L, W], [0.0, W], [0.0, 0.0]]
        inner_boundary = [
            [wall_t, wall_t], [L - wall_t, wall_t],
            [L - wall_t, W - wall_t], [wall_t, W - wall_t], [wall_t, wall_t]
        ]

        inner_L = L - 2 * wall_t
        inner_W = W - 2 * wall_t
        gross_area = inner_L * inner_W

        # Classify rooms
        public_types = {'LIVING', 'ENTRY', 'SHARED', 'WAITING', 'KITCHEN'}
        private_types = {'SLEEPING', 'SERVICE', 'STORAGE', 'TREATMENT'}

        public_rooms = [r for r in rooms if r.room_type in public_types]
        private_rooms = [r for r in rooms if r.room_type in private_types]

        # Determine if we need a corridor
        needs_corridor = gross_area > 40.0 or len(rooms) > 3
        corridor_width = 1.2 if needs_corridor else 0.0

        room_layouts = []
        corridor_layout = None

        if needs_corridor and len(public_rooms) > 0 and len(private_rooms) > 0:
            # Split: public zone (bottom/entry side), corridor, private zone (top/rear)
            public_area = sum(r.area_m2 for r in public_rooms)
            private_area = sum(r.area_m2 for r in private_rooms)
            total = public_area + private_area if (public_area + private_area) > 0 else 1.0

            # Public zone gets proportional depth, minimum 40%
            public_depth_frac = max(0.40, min(0.60, public_area / total))
            usable_W = inner_W - corridor_width
            public_depth = usable_W * public_depth_frac
            private_depth = usable_W * (1 - public_depth_frac)

            # Public zone rooms (entry side = bottom)
            pub_y = wall_t
            pub_total_area = sum(r.area_m2 for r in public_rooms) or 1.0
            x_cursor = wall_t
            for room in public_rooms:
                frac = room.area_m2 / pub_total_area
                rw = inner_L * frac
                room_layouts.append({
                    "room_id": room.room_id, "room_type": room.room_type,
                    "name": room.name, "area_m2": round(room.area_m2, 1),
                    "privacy": room.privacy,
                    "x": round(x_cursor, 3), "y": round(pub_y, 3),
                    "w": round(rw, 3), "h": round(public_depth, 3),
                    "requires_window": room.requires_window, "requires_door": room.requires_door,
                    "is_load_bearing": False,
                })
                x_cursor += rw

            # Corridor
            corridor_y = wall_t + public_depth
            corridor_layout = {
                "room_id": "CORRIDOR-001", "room_type": "CIRCULATION",
                "name": "Corridor", "area_m2": round(inner_L * corridor_width, 1),
                "privacy": "public",
                "x": round(wall_t, 3), "y": round(corridor_y, 3),
                "w": round(inner_L, 3), "h": round(corridor_width, 3),
                "requires_window": False, "requires_door": False,
                "is_load_bearing": False,
            }
            room_layouts.append(corridor_layout)

            # Private zone rooms (rear side = top)
            priv_y = corridor_y + corridor_width
            priv_total_area = sum(r.area_m2 for r in private_rooms) or 1.0
            x_cursor = wall_t
            for room in private_rooms:
                frac = room.area_m2 / priv_total_area
                rw = inner_L * frac
                room_layouts.append({
                    "room_id": room.room_id, "room_type": room.room_type,
                    "name": room.name, "area_m2": round(room.area_m2, 1),
                    "privacy": room.privacy,
                    "x": round(x_cursor, 3), "y": round(priv_y, 3),
                    "w": round(rw, 3), "h": round(private_depth, 3),
                    "requires_window": room.requires_window, "requires_door": room.requires_door,
                    "is_load_bearing": False,
                })
                x_cursor += rw
        else:
            # Simple layout: no corridor needed, use improved 2-row grid
            # If ≤3 rooms, place side-by-side. If >3, split into 2 rows.
            if len(rooms) <= 3:
                total_area = sum(r.area_m2 for r in rooms) or 1.0
                x_cursor = wall_t
                for room in rooms:
                    frac = room.area_m2 / total_area
                    rw = inner_L * frac
                    room_layouts.append({
                        "room_id": room.room_id, "room_type": room.room_type,
                        "name": room.name, "area_m2": round(room.area_m2, 1),
                        "privacy": room.privacy,
                        "x": round(x_cursor, 3), "y": round(wall_t, 3),
                        "w": round(rw, 3), "h": round(inner_W, 3),
                        "requires_window": room.requires_window, "requires_door": room.requires_door,
                        "is_load_bearing": False,
                    })
                    x_cursor += rw
            else:
                # 2-row layout: larger rooms on bottom, smaller on top
                sorted_rooms = sorted(rooms, key=lambda r: r.area_m2, reverse=True)
                half = max(1, len(sorted_rooms) // 2)
                bottom_rooms = sorted_rooms[:half]
                top_rooms = sorted_rooms[half:]
                row_h = inner_W / 2.0

                bottom_total = sum(r.area_m2 for r in bottom_rooms) or 1.0
                x_cursor = wall_t
                for room in bottom_rooms:
                    frac = room.area_m2 / bottom_total
                    rw = inner_L * frac
                    room_layouts.append({
                        "room_id": room.room_id, "room_type": room.room_type,
                        "name": room.name, "area_m2": round(room.area_m2, 1),
                        "privacy": room.privacy,
                        "x": round(x_cursor, 3), "y": round(wall_t, 3),
                        "w": round(rw, 3), "h": round(row_h, 3),
                        "requires_window": room.requires_window, "requires_door": room.requires_door,
                        "is_load_bearing": False,
                    })
                    x_cursor += rw

                top_total = sum(r.area_m2 for r in top_rooms) or 1.0
                x_cursor = wall_t
                for room in top_rooms:
                    frac = room.area_m2 / top_total
                    rw = inner_L * frac
                    room_layouts.append({
                        "room_id": room.room_id, "room_type": room.room_type,
                        "name": room.name, "area_m2": round(room.area_m2, 1),
                        "privacy": room.privacy,
                        "x": round(x_cursor, 3), "y": round(wall_t + row_h, 3),
                        "w": round(rw, 3), "h": round(row_h, 3),
                        "requires_window": room.requires_window, "requires_door": room.requires_door,
                        "is_load_bearing": False,
                    })
                    x_cursor += rw

        # Place openings on walls
        opening_placements = []
        orient_counters = {}
        for op in openings:
            direction = op.orientation.lower()
            wall_side = wall_directions.get(direction, "top")
            orient_counters[direction] = orient_counters.get(direction, 0) + 1
            idx = orient_counters[direction]
            total_on_wall = sum(1 for o in openings if o.orientation.lower() == direction)

            if wall_side in ("top", "bottom"):
                cx = L * idx / (total_on_wall + 1)
                cy = W if wall_side == "top" else 0.0
            else:
                cy = W * idx / (total_on_wall + 1)
                cx = L if wall_side == "right" else 0.0

            opening_placements.append({
                "opening_id": op.opening_id,
                "type": op.opening_type,
                "orientation": op.orientation,
                "wall_side": wall_side,
                "center_x": round(cx, 2),
                "center_y": round(cy, 2),
                "width_m": op.width_m,
                "height_m": op.height_m,
                "area_m2": op.area_m2,
                "glazing": op.glazing_type,
            })

        # Dimension annotations
        dimensions = [
            {"type": "horizontal", "value_m": L, "label": f"{L:.2f} m",
             "start": [0.0, -0.5], "end": [L, -0.5]},
            {"type": "vertical", "value_m": W, "label": f"{W:.2f} m",
             "start": [-0.5, 0.0], "end": [-0.5, W]},
        ]

        # Room dimension annotations
        room_dimensions = []
        for rl in room_layouts:
            if rl.get("room_type") != "CIRCULATION":
                room_dimensions.append({
                    "room_id": rl["room_id"],
                    "label": f'{rl["w"]:.1f}×{rl["h"]:.1f}m',
                    "center_x": round(rl["x"] + rl["w"] / 2, 2),
                    "center_y": round(rl["y"] + rl["h"] / 2, 2),
                })

        return {
            "title": f"Conceptual Passive Shelter Design — {floor_label}",
            "subtitle": f"{design.design_name} - {design.context.location_name}",
            "floor_label": floor_label,
            "design_id": design.design_id,
            "is_multi_floor": False,
            "outer_boundary": outer_boundary,
            "inner_boundary": inner_boundary,
            "wall_thickness_m": round(wall_t, 3),
            "openings": opening_placements,
            "room_layouts": room_layouts,
            "room_dimensions": room_dimensions,
            "has_corridor": needs_corridor,
            "dimensions": dimensions,
            "north_arrow_angle_deg": north_arrow_angle_deg,
            "orientation_azimuth_deg": azimuth,
            "floor_area_m2": geom.floor_area_m2,
            "purpose_profile_id": design.purpose_profile_id,
            "note": "This is a conceptual design representation, not a certified architectural drawing."
        }

    @classmethod
    def export_elevation(cls, design: DesignState) -> Dict[str, Any]:
        """
        Generate a simple front elevation/section representation.
        Only produced if geometry model has sufficient information (height, roof pitch).
        """
        import math
        geom = design.geometry
        L, W, H = geom.length_m, geom.width_m, geom.height_m
        pitch = geom.roof_angle_deg

        # Front elevation (looking at the long face)
        elevation_outline = [
            [0.0, 0.0], [L, 0.0],  # Ground line
            [L, H],                  # Right wall top
        ]

        if pitch > 0 and geom.roof_type in ("pitched", "gabled"):
            ridge_height = H + (W / 2.0) * math.tan(math.radians(pitch))
            elevation_outline.append([L / 2.0, ridge_height])  # Ridge
            elevation_outline.append([0.0, H])  # Left wall top
        else:
            elevation_outline.append([0.0, H])  # Flat roof

        elevation_outline.append([0.0, 0.0])  # Close

        # Opening silhouettes on front face
        opening_silhouettes = []
        for op in design.openings:
            if op.orientation.lower() == "south":  # Front face assumed south
                sill_height = max(0.3, (H - op.height_m) / 2.0)
                cx = L / 2.0
                opening_silhouettes.append({
                    "opening_id": op.opening_id,
                    "type": op.opening_type,
                    "x_center": round(cx, 2),
                    "sill_height_m": round(sill_height, 2),
                    "width_m": op.width_m,
                    "height_m": op.height_m,
                })

        return {
            "title": "Front Elevation — Conceptual Passive Shelter Design",
            "design_id": design.design_id,
            "elevation_outline": elevation_outline,
            "wall_height_m": H,
            "ridge_height_m": H + (W / 2.0) * math.tan(math.radians(pitch)) if pitch > 0 else H,
            "roof_pitch_deg": pitch,
            "opening_silhouettes": opening_silhouettes,
            "note": "Conceptual elevation. Not a construction drawing."
        }
