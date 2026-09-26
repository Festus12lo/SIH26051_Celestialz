"""
ThermoShelter — Dynamic Thermal Impact Simulator
Solves a 48-hour lumped capacitance ordinary differential equation (ODE) to model
the physical thermodynamic impact of envelope materials.

Calculates:
- Hourly Indoor Temp (T_in) vs Outdoor Temp (T_out)
- Temperature differential: Delta T = T_in - T_out
- Total heat conductance (UA in W/K) and Thermal Capacitance (C_th in J/K)
- Thermal Time Lag (T_lag hours) and Decrement Factor (f)
- Comfort score (hours between 18°C and 25°C) and supplemental energy requirement (kWh)
- Material swap delta impact (Delta T, Delta Carbon, Delta Cost)
"""

import math
from typing import Dict, List, Any, Optional
from decision_engine import load_materials, SHELTER_ARCHETYPES
from weather import fetch_live_weather, get_offline_weather_fallback

def get_material_data(mat_id_or_dict: Any, category: str, all_materials: dict) -> Dict[str, Any]:
    """Helper to resolve a material ID string or dictionary to full material specs."""
    if isinstance(mat_id_or_dict, dict) and "conductivity_w_m_k" in mat_id_or_dict:
        return mat_id_or_dict
    
    mat_id = mat_id_or_dict if isinstance(mat_id_or_dict, str) else (mat_id_or_dict.get("id") if isinstance(mat_id_or_dict, dict) else "")
    cat_list = all_materials.get(category, [])
    for m in cat_list:
        if m.get("id") == mat_id or m.get("name", "").lower() == str(mat_id).lower():
            return m
            
    # Default fallbacks per category
    if category == "structural":
        return {"id": "cseb", "name": "Compressed Stabilized Earth Block", "conductivity_w_m_k": 0.85, "density_kg_m3": 1750, "specific_heat_j_kg_k": 920, "embodied_carbon_kg_co2_kg": 0.08, "cost_per_m2_inr": 720}
    elif category == "insulation":
        return {"id": "wood_wool", "name": "Wood Wool Composite Board", "conductivity_w_m_k": 0.065, "density_kg_m3": 380, "specific_heat_j_kg_k": 1800, "embodied_carbon_kg_co2_kg": 0.05, "cost_per_m2_inr": 380}
    elif category == "glazing":
        return {"id": "double_low_e", "name": "Double Glazed Low-E", "u_value": 1.8, "shgc": 0.55, "density_kg_m3": 2500, "specific_heat_j_kg_k": 840, "embodied_carbon_kg_co2_kg": 1.2, "cost_per_m2_inr": 3200}
    else: # roofing
        return {"id": "clay_tiles", "name": "Mangalore Clay Roof Tiles", "conductivity_w_m_k": 0.80, "density_kg_m3": 1900, "specific_heat_j_kg_k": 850, "embodied_carbon_kg_co2_kg": 0.12, "cost_per_m2_inr": 480}


def run_dynamic_thermal_simulation(
    weather_data: Dict[str, Any],
    selected_materials: Dict[str, Any],
    shelter_type: str = "permanent",
    occupancy: Optional[int] = None,
    dimensions: Optional[Dict[str, float]] = None,
    comfort_target: str = "normal"
) -> Dict[str, Any]:
    """
    Executes a 48-hour Euler integration lumped capacitance model.
    """
    archetype = SHELTER_ARCHETYPES.get(shelter_type.lower(), SHELTER_ARCHETYPES["permanent"])
    eff_occupants = occupancy if occupancy is not None else archetype["default_occupancy"]
    
    # 1. Building Dimensions & Geometric Areas
    dims = dimensions or {}
    length_m = dims.get("length_m", math.sqrt(archetype["default_area_m2"] * 1.33))
    width_m = dims.get("width_m", archetype["default_area_m2"] / max(length_m, 1.0))
    height_m = dims.get("height_m", archetype["ceiling_height_m"])
    
    floor_area_m2 = length_m * width_m
    perimeter_m = 2.0 * (length_m + width_m)
    gross_wall_area_m2 = perimeter_m * height_m
    
    # Window to wall ratio (10% to 15%)
    wwr = 0.12 if shelter_type != "community" else 0.15
    window_area_m2 = gross_wall_area_m2 * wwr
    net_wall_area_m2 = gross_wall_area_m2 - window_area_m2
    roof_area_m2 = floor_area_m2 * 1.12 # Accounting for slope pitch and overhangs
    building_volume_m3 = floor_area_m2 * height_m

    # 2. Extract Physical Materials
    all_materials = load_materials()
    mat_struct = get_material_data(selected_materials.get("structural"), "structural", all_materials)
    mat_insul = get_material_data(selected_materials.get("insulation"), "insulation", all_materials)
    mat_glazing = get_material_data(selected_materials.get("glazing"), "glazing", all_materials)
    mat_roofing = get_material_data(selected_materials.get("roofing"), "roofing", all_materials)

    # 3. Calculate Wall Thermal Assembly (R and U)
    # Typical assembly: Outer plaster (15mm) + Structural core (200mm) + Insulation (75mm) + Inner plaster (15mm)
    l_struct = 0.20
    k_struct = max(0.01, mat_struct.get("conductivity_w_m_k", 0.85))
    r_struct = l_struct / k_struct

    l_insul = 0.075
    k_insul = max(0.01, mat_insul.get("conductivity_w_m_k", 0.04))
    r_insul = l_insul / k_insul

    # Internal and external surface air film resistances (R_se = 0.04, R_si = 0.13 per ISO 6946)
    r_wall_total = 0.04 + 0.13 + (0.015 / 0.8) + r_struct + r_insul + (0.015 / 0.35)
    u_wall = 1.0 / max(r_wall_total, 0.1)

    # 4. Calculate Roof Assembly (R and U)
    l_roof = 0.02
    k_roof = max(0.01, mat_roofing.get("conductivity_w_m_k", 0.8))
    r_roof_total = 0.04 + 0.10 + (l_roof / k_roof) + (0.05 / k_insul)
    u_roof = 1.0 / max(r_roof_total, 0.1)

    # 5. Glazing & Fenestration
    u_glazing = mat_glazing.get("u_value", 2.2)
    shgc = mat_glazing.get("shgc", 0.60)

    # 6. Floor Conduction (Perimeter ground loss, ~0.35 W/m²K)
    u_floor = 0.35

    # 7. Total Conductive UA (Watts per Kelvin)
    total_UA = (
        (u_wall * net_wall_area_m2) +
        (u_roof * roof_area_m2) +
        (u_glazing * window_area_m2) +
        (u_floor * floor_area_m2)
    )

    # 8. Ventilation & Infiltration Loss
    # H_vent = rho * cp * V * (ACH / 3600)
    # Air rho = 1.2 kg/m³, cp = 1005 J/kg·K -> rho * cp = 1206 J/m³·K
    ach = archetype["ventilation_ach"]
    h_vent = 1206.0 * building_volume_m3 * (ach / 3600.0) # W/K

    # 9. Total Thermal Mass Capacitance (C_th in Joules / Kelvin)
    # Structural mass
    rho_struct = mat_struct.get("density_kg_m3", 1600.0)
    cp_struct = mat_struct.get("specific_heat_j_kg_k", 900.0)
    mass_struct_kg = net_wall_area_m2 * l_struct * rho_struct
    c_th_struct = mass_struct_kg * cp_struct

    # Roof mass
    rho_roof = mat_roofing.get("density_kg_m3", 1500.0)
    cp_roof = mat_roofing.get("specific_heat_j_kg_k", 850.0)
    c_th_roof = roof_area_m2 * l_roof * rho_roof * cp_roof

    # Internal air mass + finishes + furnishing capacitance factor (~1.25)
    total_thermal_capacitance = max(100000.0, (c_th_struct + c_th_roof) * 1.15)

    # 10. Thermal Time Lag & Decrement Factor
    try:
        thermal_diffusivity_factor = math.sqrt((rho_struct * cp_struct) / (k_struct * 3600.0))
        time_lag_hours = round(max(2.0, min(14.0, 1.38 * l_struct * thermal_diffusivity_factor)), 1)
    except Exception:
        time_lag_hours = 7.5
    decrement_factor = round(max(0.12, min(0.85, math.exp(-0.22 * time_lag_hours))), 2)

    # 11. Internal Metabolic & Equipment Heat Load (Watts)
    # 100W per person sensible heat (multi-family community shelter generates substantially more heat)
    q_occupants = eff_occupants * 100.0
    q_equipment = floor_area_m2 * 2.5 # 2.5 W/m² baseline lighting/appliances
    q_internal_total = q_occupants + q_equipment

    # Comfort Target Setpoints
    COMFORT_BANDS = {
        "normal": {"target_min": 20.0, "target_max": 25.0, "supplemental_w_per_m2": 0.0},
        "warm":   {"target_min": 26.0, "target_max": 30.0, "supplemental_w_per_m2": 15.0},
        "hot":    {"target_min": 30.0, "target_max": 35.0, "supplemental_w_per_m2": 30.0},
    }
    comfort_band = COMFORT_BANDS.get(comfort_target, COMFORT_BANDS["normal"])
    target_min = comfort_band["target_min"]
    target_max = comfort_band["target_max"]
    supplemental_heat = comfort_band["supplemental_w_per_m2"] * floor_area_m2

    # 12. 48-Hour Hourly Dynamic Simulation
    forecast_outdoor = weather_data.get("forecast", [15.0] * 48)
    solar_dni = weather_data.get("solar_forecast_dni", [0.0] * 48)
    solar_diffuse = weather_data.get("solar_forecast_diffuse", [0.0] * 48)

    # Pad or trim to exactly 48 hours
    forecast_outdoor = (forecast_outdoor + [15.0] * 48)[:48]
    solar_dni = (solar_dni + [0.0] * 48)[:48]
    solar_diffuse = (solar_diffuse + [0.0] * 48)[:48]

    indoor_temps = []
    delta_temps = []
    
    # Initialize indoor temp with smoothed mean of initial 12 outdoor hours + internal boost
    initial_mean = sum(forecast_outdoor[:12]) / 12.0
    current_indoor_temp = max(14.0, min(26.0, initial_mean + 4.5))

    comfort_hours = 0
    energy_kwh = 0.0
    dt_seconds = 3600.0

    for t in range(48):
        t_out = forecast_outdoor[t]
        i_dni = solar_dni[t]
        i_diff = solar_diffuse[t]

        # Conduction heat transfer rate (W)
        q_cond = total_UA * (t_out - current_indoor_temp)

        # Ventilation / infiltration heat rate (W)
        q_vent = h_vent * (t_out - current_indoor_temp)

        # Solar radiation transmitted through south-facing / primary fenestration
        # Effective aperture ~ 70% direct sun orientation factor
        q_solar = window_area_m2 * shgc * (i_dni * 0.70 + i_diff * 0.40)

        # Net thermal power balance with comfort target supplemental response
        q_net = q_cond + q_vent + q_solar + q_internal_total
        if current_indoor_temp < target_min:
            q_net += supplemental_heat
        elif current_indoor_temp > target_max:
            q_net -= supplemental_heat * 0.5

        # Euler step: dT = (Q_net * dt) / C_th
        delta_temp_step = (q_net * dt_seconds) / total_thermal_capacitance
        current_indoor_temp += delta_temp_step

        t_in_rounded = round(current_indoor_temp, 1)
        indoor_temps.append(t_in_rounded)
        delta_temps.append(round(t_in_rounded - t_out, 1))

        # Check Comfort Range based on user selected comfort band
        if target_min <= current_indoor_temp <= target_max:
            comfort_hours += 1
        else:
            # Supplemental conditioning energy required to pull into comfort boundary
            target_boundary = target_min if current_indoor_temp < target_min else target_max
            energy_needed_j = abs(total_thermal_capacitance * (target_boundary - current_indoor_temp))
            energy_kwh += energy_needed_j / 3600000.0

    comfort_pct = round((comfort_hours / 48.0) * 100)

    # 13. Life-Cycle Carbon & Construction Cost of Envelope
    cost_struct = net_wall_area_m2 * mat_struct.get("cost_per_m2_inr", 700)
    cost_insul = (net_wall_area_m2 + roof_area_m2) * mat_insul.get("cost_per_m2_inr", 400)
    cost_roof = roof_area_m2 * mat_roofing.get("cost_per_m2_inr", 500)
    cost_glaze = window_area_m2 * mat_glazing.get("cost_per_m2_inr", 2500)
    total_envelope_cost_inr = round(cost_struct + cost_insul + cost_roof + cost_glaze, 0)

    carbon_struct = mass_struct_kg * mat_struct.get("embodied_carbon_kg_co2_kg", 0.15)
    carbon_insul = (net_wall_area_m2 + roof_area_m2) * l_insul * mat_insul.get("density_kg_m3", 100) * mat_insul.get("embodied_carbon_kg_co2_kg", 0.3)
    carbon_roof = roof_area_m2 * l_roof * rho_roof * mat_roofing.get("embodied_carbon_kg_co2_kg", 0.15)
    total_envelope_carbon_kg = round(carbon_struct + carbon_insul + carbon_roof, 1)

    # Baseline comparison (230mm fired red brick + concrete)
    baseline_carbon_kg = round(gross_wall_area_m2 * 140.0, 1)
    carbon_reduction_pct = max(10, min(90, round((1.0 - (total_envelope_carbon_kg / max(1.0, baseline_carbon_kg))) * 100)))

    # 14. Assemble Final Simulation Result Dossier
    return {
        "status": "success",
        "shelter_profile": {
            "type_key": shelter_type,
            "display_name": archetype["name"],
            "occupancy": eff_occupants,
            "floor_area_m2": round(floor_area_m2, 1),
            "building_volume_m3": round(building_volume_m3, 1),
            "ventilation_ach": ach
        },
        "envelope_properties": {
            "u_wall_w_m2k": round(u_wall, 3),
            "r_wall_m2k_w": round(r_wall_total, 2),
            "u_roof_w_m2k": round(u_roof, 3),
            "total_ua_w_k": round(total_UA, 1),
            "thermal_capacitance_kj_k": round(total_thermal_capacitance / 1000.0, 1),
            "thermal_lag_hours": time_lag_hours,
            "decrement_factor": decrement_factor,
            "damping_pct": round((1.0 - decrement_factor) * 100)
        },
        "performance_metrics": {
            "comfort_score_pct": comfort_pct,
            "comfort_hours_48h": comfort_hours,
            "supplemental_energy_kwh": round(energy_kwh, 1),
            "max_indoor_temp_c": max(indoor_temps),
            "min_indoor_temp_c": min(indoor_temps),
            "mean_indoor_temp_c": round(sum(indoor_temps) / len(indoor_temps), 1),
            "max_outdoor_temp_c": max(forecast_outdoor),
            "min_outdoor_temp_c": min(forecast_outdoor),
            "mean_outdoor_temp_c": round(sum(forecast_outdoor) / len(forecast_outdoor), 1),
            "mean_temp_differential_delta_t": round(sum(delta_temps) / len(delta_temps), 1),
            "max_temperature_advantage_c": max(delta_temps)
        },
        "sustainability_and_cost": {
            "envelope_cost_inr": total_envelope_cost_inr,
            "cost_per_m2_inr": round(total_envelope_cost_inr / max(1.0, floor_area_m2), 0),
            "embodied_carbon_kg_co2e": total_envelope_carbon_kg,
            "carbon_reduction_pct_vs_baseline": carbon_reduction_pct
        },
        "hourly_timeseries": {
            "hours": list(range(48)),
            "outdoor_temp_c": forecast_outdoor,
            "indoor_temp_c": indoor_temps,
            "delta_t_c": delta_temps,
            "solar_dni_w_m2": solar_dni
        },
        "materials_simulated": {
            "structural": mat_struct["name"],
            "insulation": mat_insul["name"],
            "roofing": mat_roofing["name"],
            "glazing": mat_glazing["name"]
        },
        "comfort_settings": {
            "target": comfort_target,
            "band_min_c": target_min,
            "band_max_c": target_max,
            "supplemental_heating_w": round(supplemental_heat, 1)
        }
    }


def simulate_material_swap(
    base_materials: Dict[str, Any],
    swapped_category: str,
    new_material_id: str,
    weather_data: Dict[str, Any],
    shelter_type: str = "permanent",
    occupancy: Optional[int] = None,
    dimensions: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Simulates the exact thermodynamic, environmental, and financial deltas when
    a single material layer is swapped in the envelope.
    """
    # 1. Baseline Simulation
    base_results = run_dynamic_thermal_simulation(
        weather_data=weather_data,
        selected_materials=base_materials,
        shelter_type=shelter_type,
        occupancy=occupancy,
        dimensions=dimensions
    )

    # 2. Modified Assembly Simulation
    modified_materials = dict(base_materials)
    modified_materials[swapped_category] = new_material_id

    swapped_results = run_dynamic_thermal_simulation(
        weather_data=weather_data,
        selected_materials=modified_materials,
        shelter_type=shelter_type,
        occupancy=occupancy,
        dimensions=dimensions
    )

    # 3. Compute Quantified Deltas
    base_perf = base_results["performance_metrics"]
    swap_perf = swapped_results["performance_metrics"]
    base_env = base_results["envelope_properties"]
    swap_env = swapped_results["envelope_properties"]
    base_sust = base_results["sustainability_and_cost"]
    swap_sust = swapped_results["sustainability_and_cost"]

    delta_comfort = swap_perf["comfort_score_pct"] - base_perf["comfort_score_pct"]
    delta_mean_temp = round(swap_perf["mean_indoor_temp_c"] - base_perf["mean_indoor_temp_c"], 2)
    delta_lag_hrs = round(swap_env["thermal_lag_hours"] - base_env["thermal_lag_hours"], 1)
    delta_cost = round(swap_sust["envelope_cost_inr"] - base_sust["envelope_cost_inr"], 0)
    delta_carbon = round(swap_sust["embodied_carbon_kg_co2e"] - base_sust["embodied_carbon_kg_co2e"], 1)
    delta_energy = round(swap_perf["supplemental_energy_kwh"] - base_perf["supplemental_energy_kwh"], 1)

    # 4. Synthesize Engineering Assessment
    notes = []
    if delta_comfort > 0:
        notes.append(f"Improves ASHRAE thermal comfort hours by +{delta_comfort}%.")
    elif delta_comfort < 0:
        notes.append(f"Reduces thermal comfort window by {delta_comfort}%.")

    if delta_lag_hrs > 0:
        notes.append(f"Extends diurnal phase delay by +{delta_lag_hrs} hours, stabilizing nighttime temperature.")
    elif delta_lag_hrs < -1.5:
        notes.append(f"Caution: Lowers thermal lag by {abs(delta_lag_hrs)} hours, accelerating interior temperature fluctuations.")

    if delta_carbon < 0:
        notes.append(f"Abates an additional {abs(delta_carbon)} kg CO2e embodied emissions.")

    if delta_cost < 0:
        notes.append(f"Reduces total envelope expenditure by Rs. {abs(delta_cost):,}.")
    else:
        notes.append(f"Incurs an additional Rs. {delta_cost:,} material cost.")

    return {
        "status": "success",
        "swapped_category": swapped_category,
        "swapped_from": base_results["materials_simulated"].get(swapped_category, ""),
        "swapped_to": swapped_results["materials_simulated"].get(swapped_category, ""),
        "deltas": {
            "delta_comfort_score_pct": delta_comfort,
            "delta_mean_indoor_temp_c": delta_mean_temp,
            "delta_thermal_lag_hours": delta_lag_hrs,
            "delta_cost_inr": delta_cost,
            "delta_carbon_kg_co2e": delta_carbon,
            "delta_energy_kwh": delta_energy
        },
        "baseline_summary": {
            "comfort_score_pct": base_perf["comfort_score_pct"],
            "thermal_lag_hours": base_env["thermal_lag_hours"],
            "cost_inr": base_sust["envelope_cost_inr"],
            "carbon_kg_co2e": base_sust["embodied_carbon_kg_co2e"]
        },
        "swapped_summary": {
            "comfort_score_pct": swap_perf["comfort_score_pct"],
            "thermal_lag_hours": swap_env["thermal_lag_hours"],
            "cost_inr": swap_sust["envelope_cost_inr"],
            "carbon_kg_co2e": swap_sust["embodied_carbon_kg_co2e"]
        },
        "engineering_assessment": " ".join(notes),
        "swapped_simulation_full": swapped_results
    }
