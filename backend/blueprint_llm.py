"""
ThermoShelter — Blueprint LLM Module

Bridges the physics-valid spec_generator.py output with an LLM (Gemini 3.1 Pro)
to produce an enriched, 3D-renderable building blueprint.
"""

import json
import math
import asyncio
import httpx
import os
import sys

# ─────────────────────────────────────────────────────────────
# PHYSICS & ENGINEERING MODULES
# ─────────────────────────────────────────────────────────────
from engine import generate_simulation_input, run_thermal_simulation
from engineering_gates import evaluate_engineering_gates

# ─────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────
GEMINI_MODEL = "gemini-flash-latest"
GEMINI_TIMEOUT = 45.0

# Room color palette by function
ROOM_COLORS = {
    "bedroom":   "#3b82f6",   # cool blue
    "living":    "#f59e0b",   # warm amber
    "kitchen":   "#10b981",   # emerald green
    "bathroom":  "#64748b",   # slate gray
    "corridor":  "#6b7280",   # neutral gray
    "storage":   "#78716c",   # warm stone
    "default":   "#8b5cf6",   # purple fallback
}

THERMAL_ZONE_COLORS = {
    "heated_primary":   "#ef4444",   # red — primary living spaces
    "heated_secondary": "#f97316",   # orange — secondary heated
    "service":          "#64748b",   # gray — bathrooms/storage
    "buffer":           "#22d3ee",   # cyan — transitional
}

# ─────────────────────────────────────────────────────────────
# GEMINI ENRICHMENT
# ─────────────────────────────────────────────────────────────

from llm_client import LLMPipeline
from prompts import ARCHITECTURAL_ENRICHMENT_PROMPT
from image_service import generate_image_url
from floor_plan_prompt_engine import FloorPlanPromptEngine

async def enrich_with_gemini(spec_summary: dict, injected_keys: dict = None) -> dict:
    """Ask LLMPipeline to add furniture, exterior features, material hints, descriptions, narrative."""
    user_prompt = (
        "Here is the validated building specification:\n\n"
        f"```json\n{json.dumps(spec_summary, indent=2)}\n```\n\n"
        "Generate the architectural enrichment JSON as specified in your instructions. "
        "Adapt everything to the location, climate, and regional architecture."
    )
    
    pipeline = LLMPipeline(injected_keys)
    result = await pipeline.generate_json(ARCHITECTURAL_ENRICHMENT_PROMPT, user_prompt)
    return result, pipeline.primary_rate_limit_hit

def default_enrichment(rooms: list, geometry: dict, climate_zone: str, location: str) -> dict:
    """Fallback enrichment — generates furniture and features without LLM."""
    furniture = []
    for room in rooms:
        items = []
        fn = room.get("function", room.get("id", ""))
        w = room.get("width_m", 3.0)
        l = room.get("length_m", 3.0)
        
        if "living" in fn:
            items.append({"type": "sofa", "x": w*0.1, "y": l*0.4, "width_m": min(2.0, w*0.6), "depth_m": 0.8, "height_m": 0.85, "rotation_deg": 0})
            items.append({"type": "coffee_table", "x": w*0.3, "y": l*0.6, "width_m": 1.0, "depth_m": 0.5, "height_m": 0.45, "rotation_deg": 0})
        elif "bedroom" in fn:
            items.append({"type": "bed_double", "x": w*0.15, "y": l*0.3, "width_m": 1.5, "depth_m": 2.0, "height_m": 0.5, "rotation_deg": 0})
            items.append({"type": "wardrobe", "x": w*0.05, "y": l*0.02, "width_m": 1.0, "depth_m": 0.55, "height_m": 2.0, "rotation_deg": 0})
        elif "kitchen" in fn:
            items.append({"type": "counter", "x": 0.0, "y": l*0.05, "width_m": min(2.5, w*0.8), "depth_m": 0.6, "height_m": 0.9, "rotation_deg": 0})
        elif "bathroom" in fn:
            items.append({"type": "toilet", "x": w*0.15, "y": l*0.15, "width_m": 0.4, "depth_m": 0.65, "height_m": 0.4, "rotation_deg": 0})
        
        room_id = room.get("id", fn)
        furniture.append({"room_id": room_id, "items": items})
    
    has_chimney = climate_zone in ("extreme_cold", "cold")
    
    # Color palettes by climate
    colors = {
        "extreme_cold": {"ext": "#9C8B7A", "int": "#F5F0E8", "floor": "#5C534A", "roof": "#6B4423", "style": "Ladakhi stone-timber vernacular"},
        "cold":         {"ext": "#B8A088", "int": "#FFF8F0", "floor": "#8B7355", "roof": "#5C3D2E", "style": "Himalayan timber-stone"},
        "moderate":     {"ext": "#D4A574", "int": "#FFFAF5", "floor": "#C4956A", "roof": "#8B4513", "style": "North Indian brick-plaster"},
        "warm":         {"ext": "#E8D5B7", "int": "#FFFFFF", "floor": "#CDB891", "roof": "#A0522D", "style": "Tropical laterite-tile"},
    }
    c = colors.get(climate_zone, colors["moderate"])
    
    return {
        "furniture": furniture,
        "exterior_features": {
            "porch": {"enabled": True, "face": "south", "width_m": 2.0, "depth_m": 1.2, "offset_along_wall_m": 0.3, "has_roof": True, "columns": 2, "step_count": 2, "step_height_mm": 150},
            "chimney": {"enabled": has_chimney, "attached_to_room": "kitchen", "wall_face": "east", "width_m": 0.5, "depth_m": 0.4, "extends_above_ridge_m": 0.6}
        },
        "material_hints": {
            "exterior_wall_texture": "stone_rubble" if climate_zone in ("extreme_cold", "cold") else "plastered_brick",
            "exterior_wall_color": c["ext"], "interior_wall_color": c["int"],
            "floor_material": "stone_slate" if climate_zone in ("extreme_cold", "cold") else "vitrified_tile",
            "floor_color": c["floor"], "roof_material": "corrugated_metal", "roof_color": c["roof"],
            "window_frame_color": "#2A2A2A", "door_color": "#5C3D2E",
            "regional_style": c["style"]
        },
        "room_descriptions": {r.get("id", ""): f"{r.get('name', '')} — thermal zone room." for r in rooms},
        "narrative": f"This shelter in {location} is designed for {climate_zone} conditions using passive solar principles from NBC 2016."
    }

# ─────────────────────────────────────────────────────────────
# SPEC GENERATOR BRIDGE
# ─────────────────────────────────────────────────────────────

def _estimate_avg_temp(climate_concerns: list) -> float:
    """Estimate avg winter temp from climate concern keywords."""
    if not climate_concerns:
        return 5.0
    text = ' '.join(climate_concerns).lower()
    if 'extreme cold' in text or 'extreme_cold' in text:
        return -10.0
    if 'cold' in text or 'snow' in text or 'frost' in text:
        return 2.0
    if 'hot' in text or 'heat' in text or 'tropical' in text:
        return 28.0
    return 10.0


def run_spec_generator(occupancy: int, lat: float, lon: float, budget: int,
                       building_type: str = "residential", climate_concerns: list = None,
                       location: str = "unknown", resolved_region: dict = None) -> dict:
    """
    Call spec_generator.generate_building_spec() and return its result dict.
    This is the ONLY source of all structural numbers.
    """
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from spec_generator import generate_building_spec

    avg_temp_c = resolved_region.get("avg_winter_temp_c") if resolved_region and resolved_region.get("avg_winter_temp_c") is not None else _estimate_avg_temp(climate_concerns)

    result = generate_building_spec(
        occupancy=occupancy,
        location=location,
        lat=lat,
        lon=lon,
        budget_inr=budget,
        building_type=building_type,
        avg_temp_c=avg_temp_c,
        resolved_region=resolved_region,
    )

    if isinstance(result, str):
        return json.loads(result)
    return result

# ─────────────────────────────────────────────────────────────
# MAIN PUBLIC FUNCTION
# ─────────────────────────────────────────────────────────────

async def generate_blueprint(
    occupancy: int,
    location: str,
    budget: int,
    lat: float,
    lon: float,
    climate_concerns: list = None,
    building_type: str = "residential",
    injected_keys: dict = None,
    resolved_region: dict = None
) -> dict:
    llm_source = "spec_generator_only"
    
    # ── Step 1: Physics Engine ──────────────────────────────────
    try:
        spec = await asyncio.to_thread(
            run_spec_generator,
            occupancy, lat, lon, budget, building_type, climate_concerns, location, resolved_region
        )
    except Exception as e:
        raise RuntimeError(f"spec_generator failed: {e}")
    
    # Extract sub-specs
    floor_plan    = spec.get("floor_plan", {})
    wall_assembly = spec.get("wall_assembly", {})
    roof          = spec.get("roof", {})
    windows       = spec.get("windows_summary", {})
    foundation    = spec.get("foundation", {})
    climate       = spec.get("climate", {})
    materials     = spec.get("materials_selected", {})
    budget_data   = spec.get("budget", {})
    shape_data    = spec.get("form", {})
    
    # ── KEY CHANGE: Extract geometry that spec_generator already built ──
    geometry = floor_plan.get("geometry", {})
    geo_rooms = geometry.get("rooms", [])
    geo_walls = geometry.get("walls", [])
    geo_doors = geometry.get("doors", [])
    
    building_length_m = floor_plan.get("length_mm", 8000) / 1000.0
    building_width_m  = floor_plan.get("width_mm", 6000) / 1000.0
    ceiling_height_m  = floor_plan.get("ceiling_height_mm", 2700) / 1000.0
    ridge_height_m    = roof.get("ridge_height_mm", 1500) / 1000.0
    
    # ── SAFEGUARD: Override construction supplements for emergency shelters ──
    if building_type == "emergency" and "breakdown" in budget_data:
        b = budget_data["breakdown"]
        for key in ["foundation_inr", "professional_fees_inr", "plastering_inr", "contingency_buffer_inr", "painting_finishing_inr"]:
            if key in b:
                b[key] = 0
        budget_data["total_estimated_inr"] = sum(v for k, v in b.items() if isinstance(v, (int, float)))
    

    # ── Step 2.5: Physics & Compliance Engine ───────────────────
    physics_and_compliance = {}
    try:
        # Prepare material IDs mapping
        selected_material_ids = {}
        if materials:
            for cat, mat in materials.items():
                if isinstance(mat, dict) and "id" in mat:
                    selected_material_ids[cat] = mat["id"]
        
        # 1. Fetch simulation inputs (live weather and full material data from DB)
        sim_input = await generate_simulation_input(lat, lon, selected_material_ids)
        weather_data = sim_input.get("environmental_data", {})
        shelter_materials = sim_input.get("shelter_materials", {})
        
        # 2. Run Thermal Simulation
        building_dimensions = {
            "wall_area_m2": shape_data.get("wall_area_m2", building_length_m * ceiling_height_m * 2 + building_width_m * ceiling_height_m * 2),
            "roof_area_m2": shape_data.get("roof_area_m2", building_length_m * building_width_m),
            "window_area_m2": windows.get("total_area_m2", 4.0)
        }
        
        # Run simulation in a thread if it's synchronous
        thermal_results = await asyncio.to_thread(
            run_thermal_simulation,
            weather_data, shelter_materials, occupancy, building_dimensions
        )
        
        # 3. Evaluate Engineering Gates
        design_params = {
            "wall_span_m": max(building_length_m, building_width_m),
            "roof_slope_deg": roof.get("slope_deg", 10.0),
            "window_ratio": windows.get("window_to_wall_ratio", 0.1),
            "soil_type": "loam" # We don't have soil type in spec generator right now, use default
        }
        
        gate_results = evaluate_engineering_gates(design_params, weather_data, shelter_materials)
        
        physics_and_compliance = {
            "thermal_simulation": thermal_results,
            "engineering_gates": gate_results,
            "weather_data_used": weather_data.get("current", {})
        }
    except Exception as e:
        print(f"Physics engine skipped or failed: {e}")
        physics_and_compliance = {"error": str(e)}
    
    # ── Step 2: Enrich rooms with function/thermal data ─────────
    enriched_rooms = []
    for gr in geo_rooms:
        rid = gr.get("id", "")
        fn = "living" if "living" in rid else "bedroom" if "bedroom" in rid else "kitchen" if "kitchen" in rid else "bathroom" if "bathroom" in rid else "other"
        tz = "heated_primary" if fn in ("living", "bedroom") else "heated_secondary" if fn == "kitchen" else "service"
        enriched_rooms.append({
            **gr,
            "function": fn,
            "area_m2": round(gr.get("width_m", 3) * gr.get("length_m", 3), 2),
            "orientation": "south" if fn == "living" else "north" if fn == "bedroom" else "east" if fn == "kitchen" else "west",
            "thermal_zone": tz,
            "color_hex": ROOM_COLORS.get(fn, ROOM_COLORS["default"]),
        })
    
    # ── Step 3: Gemini Enrichment ───────────────────────────────
    
    shelter_tier = "Emergency Shelter (temporary, strictly utilitarian, budget-constrained, rugged)"
    if "community" in building_type.lower():
        shelter_tier = "Community Shelter (large open space, cost-effective, public use)"
    elif "permanent" in building_type.lower() or "residential" in building_type.lower():
        if budget > 800000:
            shelter_tier = "Permanent Luxury Shelter (beautiful, aesthetic, permanent)"
        else:
            shelter_tier = "Permanent Shelter (cost-effective, durable, permanent)"
            
    # ── KEY CHANGE: Parse windows, doors, and walls BEFORE LLM enrichment ──
    window_list = []
    walls_data = windows.get("walls", {})
    for face, wdata in walls_data.items():
        if wdata.get("has_window"):
            window_list.append({
                "face": face,
                "width_m": round(wdata["width_mm"] / 1000, 2),
                "height_m": round(wdata["height_mm"] / 1000, 2),
                "sill_height_m": round(wdata["sill_height_mm"] / 1000, 2),
                "count": wdata["num_windows"],
                "area_m2": wdata["area_m2"],
            })
            
    interior_walls = []
    for w in geo_walls:
        if not w.get("is_exterior", True):
            interior_walls.append({
                "id": w["id"],
                "start_x_m": w["start"][0] / 1000,
                "start_y_m": w["start"][1] / 1000,
                "end_x_m": w["end"][0] / 1000,
                "end_y_m": w["end"][1] / 1000,
                "thickness_m": w.get("thickness", 100) / 1000,
            })
            
    parsed_doors = []
    for d in geo_doors:
        parsed_doors.append({
            "wall_id": d["wall_id"],
            "x_m": d["pos"][0] / 1000,
            "y_m": d["pos"][1] / 1000,
            "width_m": d["width"] / 1000,
            "is_exterior": "ext" in d["wall_id"],
        })

    spec_for_gemini = {
        "location": location,
        "climate_zone": climate.get("zone", "moderate"),
        "occupancy": occupancy,
        "budget_inr": budget,
        "shelter_tier_directive": shelter_tier,
        "building_length_m": building_length_m,
        "building_width_m": building_width_m,
        "ceiling_height_m": ceiling_height_m,
        "rooms": [{"id": r["id"], "name": r["name"], "function": r["function"],
                   "x_m": r["x"] / 1000 if r["x"] > 100 else r["x"],
                   "y_m": r["y"] / 1000 if r["y"] > 100 else r["y"],
                   "width_m": r["width_m"], "length_m": r["length_m"]}
                  for r in enriched_rooms],
        "interior_walls": interior_walls,
        "doors": parsed_doors,
        "windows": window_list,
        "wall_materials": [l["material"] for l in wall_assembly.get("layers", [])],
        "roof_type": roof.get("type", "gable"),
    }
    
    enrichment = None
    rate_limit_hit = False
    try:
        enrichment, rl_hit = await enrich_with_gemini(spec_for_gemini, injected_keys)
        rate_limit_hit = rl_hit
        llm_source = f"gemini/{GEMINI_MODEL}"
        print(f"Blueprint enriched by Gemini ({GEMINI_MODEL})")
    except Exception as e:
        print(f"Gemini enrichment skipped ({type(e).__name__}): {e}")
        enrichment = default_enrichment(enriched_rooms, geometry, climate.get("zone", "moderate"), location)
        llm_source = "default_fallback"
    
    # ── Step 4: Merge enrichment into rooms ─────────────────────
    room_descriptions = enrichment.get("room_descriptions", {})
    for room in enriched_rooms:
        room["description"] = room_descriptions.get(room["id"], "")
    
    # Step 5 and 6 have been hoisted above to prepare LLM context.
    # We rename parsed_doors back to doors for step 7.
    doors = parsed_doors
    
    # ── Step 7: Assemble final blueprint ────────────────────────
    blueprint = {
        "meta": {
            "location": location, "lat": lat, "lon": lon,
            "altitude_m": spec.get("location", {}).get("altitude_m", 200),
            "state": spec.get("location", {}).get("state", ""),
            "occupancy": occupancy, "building_type": building_type,
            "llm_source": llm_source,
            "rate_limit_hit": rate_limit_hit,
        },
        "building_type": building_type,
        "building": {
            "length_m": building_length_m, "width_m": building_width_m,
            "ceiling_height_m": ceiling_height_m, "ridge_height_m": ridge_height_m,
            "total_height_m": round(ceiling_height_m + ridge_height_m, 2),
            "shape": shape_data.get("shape_id", "elongated_rectangle"),
            "orientation": shape_data.get("orientation", {}),
            "solar_geometry": shape_data.get("solar_geometry", {}),
            "floor_area_m2": floor_plan.get("area_m2", 0),
        },
        "rooms": enriched_rooms,
        "geometry": geometry,
        "interior_walls": interior_walls,
        "doors": doors,
        "furniture": enrichment.get("furniture", []),
        "exterior_features": enrichment.get("exterior_features", {}),
        "material_hints": enrichment.get("material_hints", {}),
        "walls": {
            "assembly": wall_assembly.get("layers", []),
            "total_thickness_m": round(wall_assembly.get("total_thickness_mm", 350) / 1000, 3),
            "r_value_si": wall_assembly.get("r_value_total"),
            "u_value_si": wall_assembly.get("u_value_total"),
        },
        "roof": {
            "type": roof.get("type", "gable"),
            "slope_deg": roof.get("slope_deg", 25),
            "span_m": round(roof.get("span_mm", building_width_m * 1000) / 1000, 2),
            "ridge_height_m": ridge_height_m,
            "beam": roof.get("beam", {}),
            "loads": roof.get("loads", {}),
            "overhang_mm": shape_data.get("solar_geometry", {}).get("recommended_overhang_mm", 500),
        },
        "windows": window_list,
        "foundation": {
            "type": foundation.get("type", "strip_footing"),
            "depth_m": round(foundation.get("depth_mm", 600) / 1000, 2),
            "width_m": round(foundation.get("width_mm", 450) / 1000, 2),
        },
        "climate": climate,
        "materials": materials,
        "materials_selected": materials,
        "budget": budget_data,
        "narrative": enrichment.get("narrative", ""),
        "physics_and_compliance": physics_and_compliance,
        "design_brief": spec.get("design_brief", ""),
        "bioclimatic_strategy": spec.get("bioclimatic_strategy", {}),
        "zoning_rationale": spec.get("zoning_rationale", {}),
        "code_compliance": spec.get("code_compliance", []),
        "material_impact": spec.get("material_impact", {}),
        "heat_balance": spec.get("heat_balance", {}),
    }
    
    # ── Step 8: Generate AI Images (2D & 3D) via Prompt Engine ──────────
    prompt_engine = FloorPlanPromptEngine()
    try:
        prompt_2d, prompt_3d = prompt_engine.generate(
            floor_plan=floor_plan,
            wall_assembly=wall_assembly,
            climate=climate,
            roof=roof,
            foundation=foundation,
            materials=materials,
            ventilation=spec.get("ventilation", {}),
            shape_data=shape_data,
            building_type=building_type,
            location=location,
            lat=lat,
            resolved_region=resolved_region,
        )
    except Exception as e:
        print(f"Prompt engine failed, using fallback: {e}")
        prompt_2d = "Production-level 2D architectural floor plan, professional CAD drawing, top-down orthographic, stark contrasting linework on grid, precise wall thicknesses, top-down spatial accuracy."
        prompt_3d = "Beautiful, highly detailed 3D architectural rendering of a floor plan, isometric perspective cutaway showing interior layout and furniture."
    
    blueprint["floor_plan_2d_prompt"] = prompt_2d
    blueprint["floor_plan_3d_prompt"] = prompt_3d
    
    try:
        blueprint["floor_plan_2d_url"] = await generate_image_url(prompt_2d, injected_keys)
    except Exception as e:
        print(f"2D Image generation failed: {e}")
        blueprint["floor_plan_2d_url"] = ""

    try:
        blueprint["floor_plan_3d_url"] = await generate_image_url(prompt_3d, injected_keys)
    except Exception as e:
        print(f"3D Image generation failed: {e}")
        blueprint["floor_plan_3d_url"] = ""

    # ── Step 9: Generate 3D Geometry GLB ────────────────────────
    import uuid
    from geometry_builder import GeometryBuilder
    
    try:
        builder = GeometryBuilder(blueprint, "../public/models")
        glb_filename = f"model_{uuid.uuid4().hex[:8]}.glb"
        builder.generate_glb(glb_filename)
        blueprint["glb_url"] = f"/models/{glb_filename}"
    except Exception as e:
        print(f"GLB generation failed: {e}")
        blueprint["glb_url"] = ""

    return blueprint

# ─────────────────────────────────────────────────────────────
# CLI TEST
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    async def _test():
        print("Testing blueprint generation for Leh, 4 occupants, Rs 3 lakhs...")
        result = await generate_blueprint(
            occupancy=4,
            location="Leh, Ladakh",
            budget=300000,
            lat=34.1526,
            lon=77.5771,
            climate_concerns=["extreme cold", "sudden heat wave"]
        )
        print(json.dumps(result, indent=2))
    
    asyncio.run(_test())
