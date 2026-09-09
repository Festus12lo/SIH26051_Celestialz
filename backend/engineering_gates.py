def evaluate_engineering_gates(design_params: dict, weather_data: dict, shelter_materials: dict) -> list:
    """
    Evaluates the structural and environmental constraints of the shelter design.
    Returns a list of checks with 'PASS', 'FAIL', or 'WARN' status.
    The 'message' is simple for end-users, while 'internal_reasoning' contains the physics data.
    """
    results = []

    # Extract design params (with defaults)
    wall_span_m = design_params.get("wall_span_m", 5.0)
    roof_slope_deg = design_params.get("roof_slope_deg", 10.0)
    window_ratio = design_params.get("window_ratio", 0.1) # 10% default
    soil_type = design_params.get("soil_type", "loam").lower()
    
    # Calculate Environmental Context from weather
    forecast = weather_data.get("forecast", [15.0] * 48)
    avg_temp = sum(forecast) / len(forecast) if forecast else 15.0
    
    is_snow_zone = avg_temp < 2.0
    is_cold_zone = avg_temp < 5.0

    # 1. Span Check
    # Rule: Wall span > 6m without support = FAIL
    if wall_span_m > 6.0:
        results.append({
            "check": "Span Check",
            "status": "FAIL",
            "message": "Span too long",
            "internal_reasoning": f"Calculated span of {wall_span_m}m exceeds structural safety limits without center supports."
        })
    else:
        results.append({
            "check": "Span Check",
            "status": "PASS",
            "message": "Span is safe",
            "internal_reasoning": f"Span of {wall_span_m}m is within standard load-bearing limits."
        })

    # 2. Roof Slope Check
    # Rule: Slope < 5° in snow zone = FAIL
    if is_snow_zone and roof_slope_deg < 5.0:
        results.append({
            "check": "Roof Slope",
            "status": "FAIL",
            "message": "Snow load risk",
            "internal_reasoning": f"Average temp {avg_temp:.1f}C indicates snow risk. Slope of {roof_slope_deg} deg cannot shed accumulation."
        })
    elif is_snow_zone:
        results.append({
            "check": "Roof Slope",
            "status": "PASS",
            "message": "Safe roof slope",
            "internal_reasoning": f"Slope of {roof_slope_deg} deg is adequate for shedding snow in a snow zone."
        })

    # 3. Window Ratio Check
    # Rule: Window/Wall > 40% in cold zone = FAIL
    if is_cold_zone and window_ratio > 0.40:
        results.append({
            "check": "Window Ratio",
            "status": "FAIL",
            "message": "Excessive heat loss",
            "internal_reasoning": f"Window ratio of {window_ratio*100}% in {avg_temp:.1f}C avg climate creates severe thermal bridging."
        })
    elif is_cold_zone:
        results.append({
            "check": "Window Ratio",
            "status": "PASS",
            "message": "Thermal bridging safe",
            "internal_reasoning": f"Window ratio of {window_ratio*100}% is acceptable for cold climates."
        })

    # 4. Foundation Check
    # Rule: Soil type = rocky + heavy load = WARN
    # Determine if material implies a heavy load (e.g. concrete, earth, heavy timber)
    structural_mat = shelter_materials.get("structural", {})
    density = structural_mat.get("density_kg_m3", 500)
    is_heavy_load = density > 1000 # Concrete/Stone typically > 2000

    if soil_type == "rocky" and is_heavy_load:
        results.append({
            "check": "Foundation",
            "status": "WARN",
            "message": "Verify foundation",
            "internal_reasoning": f"Rocky soil combined with high-density structural mass ({density} kg/m3) risks uneven settling."
        })
    else:
        results.append({
            "check": "Foundation",
            "status": "PASS",
            "message": "Foundation OK",
            "internal_reasoning": "Soil and load combination is within standard geotechnical parameters."
        })

    return results
