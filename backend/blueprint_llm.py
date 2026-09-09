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
# CONFIG
# ─────────────────────────────────────────────────────────────
GEMINI_MODEL = "gemini-3.1-pro"
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

async def enrich_with_gemini(spec_summary: dict) -> dict:
    """Ask LLMPipeline to add furniture, exterior features, material hints, descriptions, narrative."""
    user_prompt = (
        "Here is the validated building specification:\n\n"
        f"```json\n{json.dumps(spec_summary, indent=2)}\n```\n\n"
        "Generate the architectural enrichment JSON as specified in your instructions. "
        "Adapt everything to the location, climate, and regional architecture."
    )
    
    pipeline = LLMPipeline()
    return await pipeline.generate_json(ARCHITECTURAL_ENRICHMENT_PROMPT, user_prompt)

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
                       location: str = "unknown") -> dict:
    """
    Call spec_generator.generate_building_spec() and return its result dict.
    This is the ONLY source of all structural numbers.
    """
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from spec_generator import generate_building_spec

    avg_temp_c = _estimate_avg_temp(climate_concerns)

    result = generate_building_spec(
        occupancy=occupancy,
        location=location,
        lat=lat,
        lon=lon,
        budget_inr=budget,
        building_type=building_type,
        avg_temp_c=avg_temp_c,
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
    building_type: str = "residential"
) -> dict:
    llm_source = "spec_generator_only"
    
    # ── Step 1: Physics Engine ──────────────────────────────────
    try:
        spec = await asyncio.to_thread(
            run_spec_generator,
            occupancy, lat, lon, budget, building_type, climate_concerns, location
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
        "wall_r_value": wall_assembly.get("r_value_total"),
        "wall_materials": [l["material"] for l in wall_assembly.get("layers", [])],
        "roof_type": roof.get("type", "gable"),
        "roof_slope_deg": roof.get("slope_deg"),
        "solar_geometry": shape_data.get("solar_geometry", {}),
    }
    
    enrichment = None
    try:
        enrichment = await enrich_with_gemini(spec_for_gemini)
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
    
    # ── Step 5: Window list for 3D ──────────────────────────────
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
                "shgc": wdata["shgc"],
                "u_value": wdata.get("u_value", 2.8),
            })
    
    # ── Step 6: Convert geometry walls/doors to meters ──────────
    interior_walls = []
    for w in geo_walls:
        if not w.get("is_exterior", True):
            interior_walls.append({
                "id": w["id"],
                "start_x_m": w["start"][0] / 1000,
                "start_y_m": w["start"][1] / 1000,
                "end_x_m": w["end"][0] / 1000,
                "end_y_m": w["end"][1] / 1000,
                "thickness_mm": w.get("thickness", 100),
            })
    
    doors = []
    for d in geo_doors:
        doors.append({
            "wall_id": d["wall_id"],
            "x_m": d["pos"][0] / 1000,
            "y_m": d["pos"][1] / 1000,
            "width_m": d["width"] / 1000,
            "height_m": d["height"] / 1000,
            "rotation_deg": d.get("rot", 0),
            "is_exterior": "ext" in d["wall_id"],
        })
    
    # ── Step 7: Assemble final blueprint ────────────────────────
    blueprint = {
        "meta": {
            "location": location, "lat": lat, "lon": lon,
            "occupancy": occupancy, "building_type": building_type,
            "llm_source": llm_source,
        },
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
        "budget": budget_data,
        "narrative": enrichment.get("narrative", ""),
    }
    
    # ── Step 8: Generate AI Image ───────────────────────────────
    prompt = enrichment.get("image_generation_prompt", "Hyper-realistic architectural exterior photography of a passive solar shelter, cinematic lighting, 8k resolution, photorealistic.")
    blueprint["image_generation_prompt"] = prompt
    
    try:
        blueprint["image_url"] = await generate_image_url(prompt)
    except Exception as e:
        print(f"Image generation failed: {e}")
        blueprint["image_url"] = ""

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
