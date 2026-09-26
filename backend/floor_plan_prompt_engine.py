"""
ThermoShelter — Floor Plan Prompt Engine
Constructs calculation-backed, location-aware image prompts from spec_generator output.
Every dimension, room position, and thermal annotation comes from physics — not LLM guesswork.
"""

from geocode_service import lookup_prompt_style, lookup_material_visual


class FloorPlanPromptEngine:
    """
    4-stage pipeline:
      1. Spatial Descriptors  — room positions, proportions, doors/windows
      2. Thermal Descriptors  — wall assembly, R-values, solar geometry, ventilation
      3. Style Resolution     — DB-backed drawing style per climate × shelter type
      4. Prompt Assembly      — combines all into final 2D + 3D prompt strings
    """

    def generate(self, *, floor_plan, wall_assembly, climate, roof, foundation,
                 materials, ventilation, shape_data, building_type, location,
                 lat, resolved_region=None):
        """
        Main entry point. Returns (prompt_2d, prompt_3d).
        All inputs come directly from spec_generator output.
        """
        spatial = self._spatial_descriptors(floor_plan, shape_data, building_type)
        thermal = self._thermal_descriptors(wall_assembly, climate, roof, foundation, materials, ventilation, shape_data)
        style = self._resolve_style(climate, building_type, resolved_region)
        prompt_2d, prompt_3d = self._assemble(spatial, thermal, style, building_type, location, resolved_region)
        return prompt_2d, prompt_3d

    # ─────────────────────────────────────────────────────────────
    # STAGE 1: SPATIAL DESCRIPTORS
    # ─────────────────────────────────────────────────────────────

    def _spatial_descriptors(self, floor_plan, shape_data, building_type):
        L_mm = floor_plan.get("length_mm", 6000)
        W_mm = floor_plan.get("width_mm", 6000)
        L_m = round(L_mm / 1000, 1)
        W_m = round(W_mm / 1000, 1)
        area = floor_plan.get("area_m2", round(L_m * W_m, 1))
        aspect = floor_plan.get("aspect_ratio", round(L_m / W_m, 2) if W_m else 1)

        shape_desc = shape_data.get("shape_description", "rectangular")
        overall = f"{L_m}m × {W_m}m {shape_desc} building, total floor area {area} m², aspect ratio {aspect}:1"

        # Room descriptions from geometry
        geometry = floor_plan.get("geometry", {})
        rooms = geometry.get("rooms", [])
        windows = geometry.get("windows", [])
        doors = geometry.get("doors", [])

        room_list = []
        total_room_area = 0
        for r in rooms:
            rw = r.get("width_m", 0)
            rl = r.get("length_m", 0)
            ra = round(rw * rl, 1)
            total_room_area += ra
            name = r.get("name", r.get("id", "Room"))

            # Determine position description
            y = r.get("y", 0)
            x = r.get("x", 0)
            pos = self._position_label(x, y, L_mm, W_mm)

            # Find windows for this room
            room_windows = self._windows_for_room(r, windows, L_mm, W_mm)
            win_desc = f", {room_windows}" if room_windows else ""

            room_list.append(f"{name} ({rw}m × {rl}m = {ra}m²) in {pos}{win_desc}")

        # Proportions
        proportions = {}
        if total_room_area > 0 and area > 0:
            for r in rooms:
                ra = round(r.get("width_m", 0) * r.get("length_m", 0), 1)
                pct = round(ra / area * 100)
                proportions[r.get("id", "room")] = f"{pct}%"

        # Doors
        main_entrance = ""
        for d in doors:
            if d.get("wall_id", "").startswith("ext_"):
                w = d.get("width", 1000)
                main_entrance = f"Main entrance: {w/1000:.1f}m wide door on {d['wall_id'].replace('ext_', '')} wall"
                break

        # Windows summary
        window_summary = self._window_summary(windows, L_mm, W_mm)

        # Zoning
        zoning = self._zoning_description(rooms, L_mm, W_mm)

        return {
            "overall": overall,
            "zoning": zoning,
            "room_list": room_list,
            "proportions": proportions,
            "door_positions": main_entrance,
            "window_positions": window_summary,
        }

    def _position_label(self, x, y, L, W):
        """Convert x, y coordinates to human-readable position."""
        v = "SOUTH" if y < W * 0.35 else ("CENTER" if y < W * 0.65 else "NORTH")
        h = "WEST" if x < L * 0.35 else ("CENTER" if x < L * 0.65 else "EAST")
        if v == "CENTER" and h == "CENTER":
            return "CENTER"
        elif v == "CENTER":
            return h
        elif h == "CENTER":
            return v
        else:
            return f"{v}-{h}"

    def _windows_for_room(self, room, windows, L, W):
        """Find windows belonging to a room and describe them."""
        rx = room.get("x", 0)
        rw = room.get("width_m", 0) * 1000
        ry = room.get("y", 0)
        rl = room.get("length_m", 0) * 1000

        descs = []
        for win in windows:
            pos = win.get("pos", [0, 0])
            wx, wy = pos[0], pos[1]
            # Check if window is near this room's extent
            if rx - 500 <= wx <= rx + rw + 500 and ry - 500 <= wy <= ry + rl + 500:
                w_m = win.get("width", 1000) / 1000
                wall = win.get("wall_id", "")
                face = wall.replace("ext_", "").upper() if "ext_" in wall else ""
                if face:
                    descs.append(f"{w_m}m window on {face}")

        return ", ".join(descs) if descs else ""

    def _window_summary(self, windows, L, W):
        """Global window summary."""
        by_face = {}
        for win in windows:
            wall = win.get("wall_id", "unknown")
            face = wall.replace("ext_", "").capitalize() if "ext_" in wall else wall
            w_m = win.get("width", 1000) / 1000
            h_m = win.get("height", 1200) / 1000
            if face not in by_face:
                by_face[face] = []
            by_face[face].append(f"{w_m}m×{h_m}m")

        parts = []
        for face, wins in by_face.items():
            parts.append(f"{face}: {', '.join(wins)}")
        return ". ".join(parts) if parts else "Standard window placement"

    def _zoning_description(self, rooms, L, W):
        """Describe the bioclimatic zoning."""
        south = [r["name"] for r in rooms if r.get("y", 0) < W * 0.35]
        north = [r["name"] for r in rooms if r.get("y", 0) >= W * 0.65]
        center = [r["name"] for r in rooms if W * 0.35 <= r.get("y", 0) < W * 0.65]

        parts = []
        if south:
            parts.append(f"South zone (public): {', '.join(south)}")
        parts.append("Central: 1.2m east-west corridor")
        if north:
            parts.append(f"North zone (private/wet): {', '.join(north)}")
        return ". ".join(parts)

    # ─────────────────────────────────────────────────────────────
    # STAGE 2: THERMAL DESCRIPTORS
    # ─────────────────────────────────────────────────────────────

    def _thermal_descriptors(self, wall_assembly, climate, roof, foundation, materials, ventilation, shape_data):
        # Wall visual
        layers = wall_assembly.get("layers", [])
        total_t = wall_assembly.get("total_thickness_mm", 300)
        r_total = wall_assembly.get("r_value_total", 2.0)
        u_total = wall_assembly.get("u_value_total", 0.5)

        layer_descs = []
        for l in layers:
            layer_descs.append(f"{l['thickness_mm']}mm {l['material']}")
        layer_str = " → ".join(layer_descs)
        wall_visual = f"{total_t}mm thick walls: {layer_str}. R-value {r_total} m²·K/W, U-value {u_total} W/m²·K."

        # Roof visual
        roof_slope = roof.get("slope_deg", 15)
        roof_type = roof.get("type", "gable")
        roof_mat = roof.get("material", "corrugated_metal")
        overhang = shape_data.get("solar_geometry", {}).get("recommended_overhang_mm", 500)
        roof_visual = f"{roof_slope}° {roof_type} roof with {overhang}mm overhang. {roof_mat.replace('_', ' ').title()} finish."

        # Foundation visual
        if foundation:
            depth = foundation.get("depth_mm", 600)
            f_type = foundation.get("type", "strip_footing")
            foundation_visual = f"{depth}mm deep {f_type.replace('_', ' ')} foundation."
        else:
            foundation_visual = "No permanent foundation (deployable shelter)."

        # Window thermal
        glazing = materials.get("glazing", {})
        glazing_name = glazing.get("name", "standard glazing") if isinstance(glazing, dict) else "standard glazing"
        u_glazing = glazing.get("u_value", 3.0) if isinstance(glazing, dict) else 3.0
        window_thermal = f"{glazing_name} (U-value {u_glazing}). Larger on south for solar gain, smaller on north to reduce heat loss."

        # Ventilation
        ach = ventilation.get("ach", 0.5) if isinstance(ventilation, dict) else 0.5
        vent_note = f"{ach} ACH construction tightness."

        # Passive solar
        solar = shape_data.get("solar_geometry", {})
        winter_alt = solar.get("winter_solar_altitude_deg", 30)
        summer_alt = solar.get("summer_solar_altitude_deg", 70)
        orientation = shape_data.get("orientation", {})
        facade = orientation.get("primary_facade", "south")
        passive_solar = (
            f"Building oriented with long axis E-W. Primary facade faces {facade}. "
            f"Winter sun altitude {winter_alt}°, summer {summer_alt}°. "
            f"Overhangs block high summer sun, admit low winter sun."
        )

        return {
            "wall_visual": wall_visual,
            "roof_visual": roof_visual,
            "foundation_visual": foundation_visual,
            "window_thermal": window_thermal,
            "ventilation_note": vent_note,
            "passive_solar": passive_solar,
        }

    # ─────────────────────────────────────────────────────────────
    # STAGE 3: STYLE RESOLUTION (DB-backed)
    # ─────────────────────────────────────────────────────────────

    def _resolve_style(self, climate, building_type, resolved_region=None):
        nbc_zone = climate.get("zone", "composite")
        
        # If resolved_region available, use its more accurate NBC zone
        if resolved_region and resolved_region.get("nbc_zone"):
            nbc_zone = resolved_region["nbc_zone"]

        style = lookup_prompt_style(nbc_zone, building_type)

        # Enrich with region-specific details if available
        if resolved_region:
            vernacular = resolved_region.get("vernacular_architecture", "")
            landscape = resolved_region.get("landscape_description", "")
            if vernacular and vernacular not in style.get("style_3d", ""):
                style["style_3d"] = style.get("style_3d", "") + f". {vernacular}"
            if landscape:
                style["environment_desc"] = landscape

        return style

    # ─────────────────────────────────────────────────────────────
    # STAGE 4: PROMPT ASSEMBLY
    # ─────────────────────────────────────────────────────────────

    def _assemble(self, spatial, thermal, style, building_type, location, resolved_region=None):
        city_name = location or "Unknown"
        region_note = ""
        if resolved_region:
            city_name = resolved_region.get("city", location)
            state = resolved_region.get("state", "")
            region_note = f" in {city_name}, {state}" if state else f" in {city_name}"

        bt_label = {
            "emergency": "emergency relief shelter",
            "residential": "residential dwelling",
            "institutional": "community shelter center",
        }.get(building_type, "shelter")

        # ── 2D PROMPT ──
        parts_2d = [
            style.get("style_2d", "Professional architectural blueprint, top-down orthographic"),
            f"A {bt_label}{region_note}.",
            spatial["overall"],
        ]

        # Zoning
        parts_2d.append(f"BIOCLIMATIC ZONING: {spatial['zoning']}")

        # Rooms
        parts_2d.append("EXACT ROOM LAYOUT:")
        for room_desc in spatial["room_list"]:
            parts_2d.append(f"- {room_desc}")

        # Walls
        parts_2d.append(f"WALL CONSTRUCTION: {thermal['wall_visual']}")

        # Windows & Doors
        parts_2d.append(f"WINDOWS: {spatial['window_positions']}")
        if spatial["door_positions"]:
            parts_2d.append(f"DOORS: {spatial['door_positions']}")

        # Roof
        parts_2d.append(f"ROOF: {thermal['roof_visual']}")

        # Foundation (skip for emergency)
        if building_type != "emergency":
            parts_2d.append(f"FOUNDATION: {thermal['foundation_visual']}")

        # Scale
        parts_2d.append("Scale 1:100. North is UP. Dimension lines in meters.")

        prompt_2d = "\n".join(parts_2d)

        # ── 3D PROMPT ──
        parts_3d = [
            f"EXACT 3D architectural visualization of this floor plan:",
            style.get("style_3d", "Isometric cutaway 3D architectural rendering"),
            f"A {bt_label}{region_note}.",
            spatial["overall"],
        ]

        parts_3d.append("EXACT ROOM LAYOUT (must match the 2D plan):")
        for room_desc in spatial["room_list"]:
            parts_3d.append(f"- {room_desc}")

        parts_3d.append(f"WALLS: {thermal['wall_visual']}")
        parts_3d.append(f"ROOF: {thermal['roof_visual']}")
        parts_3d.append(f"THERMAL: {thermal['passive_solar']}")

        env = style.get("environment_desc", "")
        if env:
            parts_3d.append(f"ENVIRONMENT: {env}")

        prompt_3d = "\n".join(parts_3d)

        # Attach negative prompts for downstream use
        neg = style.get("negative_prompt", "")
        if neg:
            prompt_2d += f"\n\nNEGATIVE: {neg}"
            prompt_3d += f"\n\nNEGATIVE: {neg}"

        return prompt_2d, prompt_3d
