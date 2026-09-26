"""
ThermoShelter — Bioclimatic Material Decision-Making Engine
Selects, scores, and ranks materials based on regional climate, real-time weather,
shelter type archetype, disaster resilience, and life-cycle sustainability.

Shelter Archetypes:
- Emergency: Rapid deployment, lightweight modular, ultra-low cost, high insulative boundary, zero wet curing.
- Transitional: 1-3 years design life, semi-permanent, modular expandability, salvageable/reusable.
- Permanent (Residential): 30+ years, single family, high thermal mass, passive solar heating/cooling, heavy durability.
- Community (Public / Multi-Family): Permanent construction standard, designed for multiple families or public refuge,
  higher occupancy density, higher ventilation requirement, wide spans, and high fire/seismic safety.
"""

import os
import json
import math
from typing import Dict, List, Any, Optional

from weather import fetch_live_weather, get_offline_weather_fallback
from geocode_service import resolve_location, lookup_climate_region

# ─────────────────────────────────────────────────────────────
# SHELTER ARCHETYPE PROFILES
# ─────────────────────────────────────────────────────────────

SHELTER_ARCHETYPES = {
    "emergency": {
        "name": "Emergency Rapid Shelter",
        "description": "Rapid deployment shelter for acute disaster relief. High strength-to-weight ratio, lightweight modular panels, zero wet-masonry curing, high thermal envelope insulation.",
        "lifespan_years": 0.5,
        "default_occupancy": 4,
        "default_area_m2": 24.0,
        "ceiling_height_m": 2.4,
        "ventilation_ach": 1.2,
        "target_r_value_si": 2.2,
        "budget_multiplier": 0.6,
        "preferred_structural": ["eps", "pir", "aerogel", "insulated_canvas", "bamboo_lgsf", "timber_frame"],
        "preferred_insulation": ["wood_wool", "puf_board", "polyurethane_foam", "xps_insulation", "aerogel"],
        "preferred_roofing": ["cool_roof", "corrugated_gi", "galvanized", "low_e_alu", "solar_absorbent"],
        "preferred_glazing": ["polycarbonate_multiwall", "polycarbonate", "single_clear"],
        "weights": {
            "thermal": 0.25,
            "local": 0.15,
            "carbon": 0.10,
            "cost": 0.30,
            "resilience": 0.20
        }
    },
    "transitional": {
        "name": "Transitional / Semi-Permanent Shelter",
        "description": "Semi-permanent shelter bridging relief and long-term reconstruction. Uses modular local earth/timber/bamboo with reusable fasteners and upgradeable thermal insulation.",
        "lifespan_years": 2.5,
        "default_occupancy": 5,
        "default_area_m2": 36.0,
        "ceiling_height_m": 2.6,
        "ventilation_ach": 1.0,
        "target_r_value_si": 2.6,
        "budget_multiplier": 0.85,
        "preferred_structural": ["bamboo_frame", "cseb", "rammed_earth", "dhajji_dewari"],
        "preferred_insulation": ["wood_wool", "rice_husk_board", "mineral_wool"],
        "preferred_roofing": ["corrugated_gi", "clay_tiles", "bamboo_shingles"],
        "preferred_glazing": ["double_clear", "polycarbonate"],
        "weights": {
            "thermal": 0.25,
            "local": 0.25,
            "carbon": 0.20,
            "cost": 0.20,
            "resilience": 0.10
        }
    },
    "residential": {
        "name": "Permanent Residential Shelter",
        "description": "Permanent long-term home for a single family. Maximizes thermal mass, diurnal temperature damping, local indigenous materials, and passive solar capture.",
        "lifespan_years": 40.0,
        "default_occupancy": 4,
        "default_area_m2": 48.0,
        "ceiling_height_m": 2.8,
        "ventilation_ach": 0.6,
        "target_r_value_si": 3.2,
        "budget_multiplier": 1.0,
        "preferred_structural": ["cseb", "cseb_blocks", "rammed_earth", "hempcrete", "aac_blocks", "fly_ash_bricks", "dhajji_dewari"],
        "preferred_insulation": ["wood_wool", "mineral_wool", "expanded_cork"],
        "preferred_roofing": ["clay_tiles", "stone_slate", "cool_roof", "low_e_alu"],
        "preferred_glazing": ["low_e_argon", "double_low_e", "double_clear", "triple_low_e"],
        "weights": {
            "thermal": 0.30,
            "local": 0.25,
            "carbon": 0.20,
            "cost": 0.10,
            "resilience": 0.15
        }
    },
    "permanent": {
        "name": "Permanent Residential Shelter",
        "description": "Permanent long-term home for a single family. Maximizes thermal mass, diurnal temperature damping, local indigenous materials, and passive solar capture.",
        "lifespan_years": 40.0,
        "default_occupancy": 4,
        "default_area_m2": 48.0,
        "ceiling_height_m": 2.8,
        "ventilation_ach": 0.6,
        "target_r_value_si": 3.2,
        "budget_multiplier": 1.0,
        "preferred_structural": ["cseb", "cseb_blocks", "rammed_earth", "hempcrete", "aac_blocks", "fly_ash_bricks", "dhajji_dewari"],
        "preferred_insulation": ["wood_wool", "mineral_wool", "expanded_cork"],
        "preferred_roofing": ["clay_tiles", "stone_slate", "cool_roof", "low_e_alu"],
        "preferred_glazing": ["low_e_argon", "double_low_e", "double_clear", "triple_low_e"],
        "weights": {
            "thermal": 0.30,
            "local": 0.25,
            "carbon": 0.20,
            "cost": 0.10,
            "resilience": 0.15
        }
    },
    "community": {
        "name": "Community Public / Multi-Family Shelter",
        "description": "Permanent-standard construction engineered for multiple families or public emergency refuge. Wide-span structural integrity, high occupancy density, elevated ventilation rates, non-combustible envelope, and robust thermal mass.",
        "lifespan_years": 40.0,
        "default_occupancy": 20,
        "default_area_m2": 160.0,
        "ceiling_height_m": 3.4,
        "ventilation_ach": 2.2,  # Higher natural ventilation required for multi-family CO2 and moisture purge
        "target_r_value_si": 3.0,
        "budget_multiplier": 1.25,
        "preferred_structural": ["cseb", "cseb_blocks", "aac_blocks", "cavity_brick", "rammed_earth", "hollow_polymer", "fly_ash_bricks"],
        "preferred_insulation": ["mineral_wool", "wood_wool", "expanded_cork"],
        "preferred_roofing": ["standing_seam_insulated", "clay_tiles", "cool_roof", "green_roof", "stone_slate"],
        "preferred_glazing": ["solar_control", "solar_control_reflective", "low_e_argon", "double_low_e", "double_clear"],
        "weights": {
            "thermal": 0.25,
            "local": 0.20,
            "carbon": 0.15,
            "cost": 0.15,
            "resilience": 0.25  # Highest resilience weighting for public safety and multi-family egress
        }
    }
}

# ─────────────────────────────────────────────────────────────
# LOAD MATERIALS DATABASE
# ─────────────────────────────────────────────────────────────

def load_materials() -> Dict[str, List[Dict[str, Any]]]:
    """Load the full catalog of materials from backend/materials.json."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(base_dir, "materials.json")
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"structural": [], "insulation": [], "roofing": [], "glazing": []}


# ─────────────────────────────────────────────────────────────
# MULTI-CRITERIA SCORING ENGINE
# ─────────────────────────────────────────────────────────────

def calculate_material_fitness(
    material: Dict[str, Any],
    category: str,
    climate_zone: str,
    shelter_type: str,
    weather_summary: Dict[str, Any],
    seismic_zone: str = "III",
    snow_load_kn: float = 0.0,
    wind_speed_m_s: float = 39.0
) -> Dict[str, Any]:
    """
    Computes normalized scores (0.0 to 1.0) across 5 engineering dimensions:
    1. Thermal Fitness (S_thermal)
    2. Local Regional Availability (S_local)
    3. Embodied Carbon Abatement (S_carbon)
    4. Cost Feasibility (S_cost)
    5. Alternate Withstandability / Disaster Resilience (S_resilience)
    """
    archetype = SHELTER_ARCHETYPES.get(shelter_type.lower(), SHELTER_ARCHETYPES["permanent"])
    weights = archetype["weights"]
    
    mat_id = material.get("id", "")
    mat_regions = material.get("local_regions", "").lower()
    
    # ── 1. Thermal Fitness (S_thermal) ───────────────────────────
    k_val = material.get("conductivity_w_m_k", 0.5)
    r_per_inch = material.get("r_value_per_inch", 1.0)
    density = material.get("density_kg_m3", 1200)
    cp = material.get("specific_heat_j_kg_k", 900)
    volumetric_heat_cap = density * cp  # J / (m³·K)
    
    s_thermal = 0.5
    if category == "insulation":
        # Reward high R-value and low conductivity
        s_thermal = max(0.2, min(1.0, (r_per_inch - 1.0) / 4.0))
    elif category == "structural":
        if "cold" in climate_zone or "hot" in climate_zone:
            # High thermal mass is critical for cold night retention or daytime hot-wave damping
            # Ideal volumetric heat capacity is ~1,500,000 to 2,200,000 J/m³K
            mass_score = min(1.0, volumetric_heat_cap / 2000000.0)
            if shelter_type == "emergency":
                # Emergency shelters penalize heavy thermal mass due to transport burden
                s_thermal = 1.0 - (density / 2200.0) * 0.6
            else:
                s_thermal = 0.4 + 0.6 * mass_score
        else:
            s_thermal = 0.7
    elif category == "glazing":
        shgc = material.get("shgc", 0.6)
        if "cold" in climate_zone:
            # High solar heat gain preferred in cold
            s_thermal = 0.5 + (shgc * 0.5)
        else:
            # Low solar heat gain preferred in hot/composite
            s_thermal = 1.0 - (shgc * 0.6)
    else: # roofing
        albedo = material.get("albedo", 0.3)
        if "hot" in climate_zone:
            s_thermal = 0.4 + albedo * 0.6
        else:
            s_thermal = 0.7

    # ── 2. Local Regional Availability (S_local) ────────────────
    s_local = 0.3
    cz = climate_zone.lower()
    if cz in mat_regions or "composite" in mat_regions:
        s_local = 0.95
    elif any(r in mat_regions for r in cz.split("_")):
        s_local = 0.85
    elif "all" in mat_regions:
        s_local = 0.75
    else:
        s_local = 0.40

    # ── 3. Embodied Carbon Abatement (S_carbon) ──────────────────
    carbon = material.get("embodied_carbon_kg_co2_kg", 0.5)
    # Baseline benchmark is fired clay brick (~0.24 kg/kg) or concrete (~0.18 kg/kg) or EPS (~2.5 kg/kg)
    # Materials with carbon < 0.08 get top scores (Rammed Earth, CSEB, Timber, Wood wool)
    if carbon <= 0.05:
        s_carbon = 1.0
    elif carbon <= 0.15:
        s_carbon = 0.85
    elif carbon <= 0.40:
        s_carbon = 0.65
    elif carbon <= 1.0:
        s_carbon = 0.45
    else:
        s_carbon = max(0.1, 1.0 - (carbon / 3.0))

    # ── 4. Cost Feasibility (S_cost) ─────────────────────────────
    cost_m2 = material.get("cost_per_m2_inr", 500)
    # Scale cost relative to typical thresholds
    # Structural: ₹300 (CSEB) to ₹1500 (Dressed stone/timber)
    # Insulation: ₹250 (Rice husk) to ₹1200 (Cork/PIR)
    s_cost = max(0.1, min(1.0, 1.0 - (cost_m2 / 2000.0)))
    if shelter_type == "emergency" and cost_m2 > 800:
        s_cost *= 0.7

    # ── 5. Alternate Withstandability / Disaster Resilience (S_resilience) ──
    s_resilience = 0.7  # baseline
    
    # Check 1: Seismic ductility vs brittle stone/adobe
    if seismic_zone in ("IV", "V"):
        if mat_id in ("timber_frame", "bamboo_frame", "dhajji_dewari"):
            s_resilience += 0.25  # High ductility / timber shear frame
        elif mat_id in ("rammed_earth", "dressed_stone") and shelter_type != "permanent":
            s_resilience -= 0.20  # Heavy brittle mass without concrete ring beams is dangerous
            
    # Check 2: Snow load resilience on roofing
    if snow_load_kn > 1.5:
        if mat_id in ("stone_slate", "corrugated_gi"):
            s_resilience += 0.20
        elif mat_id in ("thatch", "bamboo_shingles"):
            s_resilience -= 0.30
            
    # Check 3: Gale wind resilience
    if wind_speed_m_s > 44.0:
        if mat_id in ("stone_slate", "cseb", "timber_frame"):
            s_resilience += 0.15
        elif mat_id in ("corrugated_gi"):
            s_resilience -= 0.10  # Risk of uplift without heavy tie-down anchors
            
    # Check 4: Moisture / Waterlogging withstandability
    if "humid" in climate_zone:
        if mat_id in ("dressed_laterite", "clay_tiles"):
            s_resilience += 0.20
        elif mat_id in ("straw_bale", "rice_husk_board"):
            s_resilience -= 0.25  # Fungal rot vulnerability
            
    # Community shelter bonus for non-combustible materials
    if shelter_type == "community":
        if mat_id in ("mineral_wool", "cseb", "stone_slate", "fly_ash_bricks", "double_low_e"):
            s_resilience += 0.15
        elif mat_id in ("puf_board", "eps"):
            s_resilience -= 0.25  # Fire hazard for public gathering

    s_resilience = max(0.1, min(1.0, s_resilience))

    # ── Overall Composite Fitness ────────────────────────────────
    composite_score = (
        weights["thermal"] * s_thermal +
        weights["local"] * s_local +
        weights["carbon"] * s_carbon +
        weights["cost"] * s_cost +
        weights["resilience"] * s_resilience
    )

    return {
        "material_id": mat_id,
        "material_name": material.get("name", mat_id),
        "category": category,
        "composite_score": round(composite_score * 100, 1),
        "breakdown": {
            "thermal_score": round(s_thermal * 100, 1),
            "local_sourcing_score": round(s_local * 100, 1),
            "carbon_abatement_score": round(s_carbon * 100, 1),
            "cost_score": round(s_cost * 100, 1),
            "disaster_resilience_score": round(s_resilience * 100, 1),
        },
        "properties": {
            "conductivity_w_m_k": k_val,
            "density_kg_m3": density,
            "specific_heat_j_kg_k": cp,
            "embodied_carbon_kg_co2_kg": carbon,
            "cost_per_m2_inr": cost_m2,
            "thermal_mass_rating": material.get("thermal_mass_rating", "moderate")
        }
    }


# ─────────────────────────────────────────────────────────────
# CORE DECISION API FUNCTION
# ─────────────────────────────────────────────────────────────

async def evaluate_and_recommend_materials(
    location: str,
    lat: float,
    lon: float,
    shelter_type: str = "permanent",
    occupancy: Optional[int] = None,
    budget_inr: Optional[int] = None,
    state: Optional[str] = None
) -> Dict[str, Any]:
    """
    Coordinates location resolution, live weather fetch, archetype loading,
    and multi-criteria material rankings.
    """
    # Normalize shelter type (community is permanent standard for multiple families)
    st = shelter_type.lower()
    if st not in SHELTER_ARCHETYPES:
        st = "residential" if "res" in st else "emergency" if "emerg" in st else "community" if "commun" in st else "permanent"
        
    archetype = SHELTER_ARCHETYPES[st]
    eff_occupancy = occupancy or archetype["default_occupancy"]

    # 1. Resolve Location & NBC Climate Region
    resolved_region = lookup_climate_region(location, state=state, lat=lat, lon=lon)
    climate_zone = resolved_region.get("nbc_zone", resolved_region.get("zone", "composite"))
    seismic_zone = resolved_region.get("seismic_zone", "III")
    snow_load = resolved_region.get("snow_load_kn_m2", 0.0)
    wind_speed = resolved_region.get("basic_wind_speed_m_s", 39.0)
    altitude_m = resolved_region.get("altitude_m", 200)

    # 2. Fetch Live Real-Time Weather
    try:
        weather_data = await fetch_live_weather(lat, lon)
    except Exception as e:
        print(f"[DecisionEngine] Weather fetch failed, using synthetic fallback: {e}")
        weather_data = get_offline_weather_fallback(lat, lon, resolved_region.get("avg_winter_temp_c", 15.0))

    current_temp = weather_data.get("current", {}).get("temperature", 20.0)
    current_humidity = weather_data.get("current", {}).get("humidity", 50.0)
    current_wind = weather_data.get("current", {}).get("wind_speed", 10.0)

    weather_summary = {
        "current_temperature_c": current_temp,
        "current_humidity_pct": current_humidity,
        "current_wind_speed_kmh": current_wind,
        "nbc_climate_zone": climate_zone,
        "seismic_zone": seismic_zone,
        "altitude_m": altitude_m,
        "snow_load_kn_m2": snow_load,
        "basic_wind_speed_m_s": wind_speed
    }

    # 3. Load Materials and Evaluate All Categories
    all_materials = load_materials()
    evaluated_materials = {}
    recommendations = {}
    alternatives = {}

    for cat in ["structural", "insulation", "roofing", "glazing"]:
        cat_mats = all_materials.get(cat, [])
        scored_mats = []
        for m in cat_mats:
            score_data = calculate_material_fitness(
                material=m,
                category=cat,
                climate_zone=climate_zone,
                shelter_type=st,
                weather_summary=weather_summary,
                seismic_zone=seismic_zone,
                snow_load_kn=snow_load,
                wind_speed_m_s=wind_speed
            )
            scored_mats.append(score_data)

        # Sort descending by composite score
        scored_mats.sort(key=lambda x: x["composite_score"], reverse=True)
        evaluated_materials[cat] = scored_mats

        if scored_mats:
            recommendations[cat] = scored_mats[0]
            # Top 2 alternatives
            alternatives[cat] = scored_mats[1:3]

    # 4. Synthesize Decision Dossier
    decision_summary = {
        "status": "success",
        "location": {
            "query": location,
            "resolved_city": resolved_region.get("city", location),
            "state": resolved_region.get("state", ""),
            "lat": lat,
            "lon": lon,
            "altitude_m": altitude_m
        },
        "shelter_profile": {
            "type_key": st,
            "display_name": archetype["name"],
            "description": archetype["description"],
            "target_occupancy": eff_occupancy,
            "design_lifespan_years": archetype["lifespan_years"],
            "footprint_area_m2": archetype["default_area_m2"],
            "is_multi_family_or_public": (st == "community")
        },
        "environmental_conditions": weather_summary,
        "recommended_assembly": recommendations,
        "alternative_tradeoffs": alternatives,
        "full_catalog_scored": evaluated_materials
    }

    return decision_summary
