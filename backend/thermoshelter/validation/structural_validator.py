"""
ThermoShelter — Structural Engineering Validator
Enforces physical and statutory load constraints (IS 875 / NBC 2016) on proposed architectural geometries.
This acts as a strict gating mechanism ensuring candidates are structurally viable before reaching optimization.
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Tuple
from ..core.design_state import DesignState

@dataclass
class StructuralValidationResult:
    passed: bool
    violations: List[str]
    warnings: List[str]
    structural_metrics: Dict[str, float]


class StructuralValidator:
    """
    Validates architectural geometry against basic structural load constraints.
    Note: This is an architectural gating proxy, NOT a full finite element structural analysis.
    """
    
    # Constants from IS 875 (Part 4): Snow Loads
    SNOW_DENSITY_KG_M3 = 300.0  # Nominal compacted snow density
    GRAVITY = 9.81
    MAX_FLAT_ROOF_SNOW_LOAD_KN_M2 = 1.5  # Max allowable snow on flat roof before demanding pitch
    
    # Constants from IS 1904: Foundations
    MIN_FROST_DEPTH_M = 1.0  # Assumed min foundation depth in frost-susceptible zones

    def validate(self, design: DesignState) -> StructuralValidationResult:
        violations = []
        warnings = []
        metrics = {}

        # 1. Evaluate Snow Load & Roof Pitch (IS 875 Part 4)
        snow_load = design.site.snow_load_kN_m2
        roof_angle = design.geometry.roof_angle_deg
        roof_type = design.geometry.roof_type

        # If snow load is significant (> 1.5 kN/m2), flat roofs are strictly prohibited
        if snow_load > self.MAX_FLAT_ROOF_SNOW_LOAD_KN_M2:
            if roof_angle < 15.0 or roof_type == "flat":
                violations.append(
                    f"STRUCT-IS875-01: Severe snow load ({snow_load} kN/m²) prohibits flat or low-pitch roofs. "
                    f"Current pitch is {roof_angle}°."
                )
            elif roof_angle < 30.0:
                warnings.append(
                    f"STRUCT-IS875-02: Moderate roof pitch ({roof_angle}°) in high snow zone ({snow_load} kN/m²). "
                    f"Pitch ≥ 30° recommended for natural shedding."
                )
        
        # Calculate shape coefficient for snow load (simplified IS 875)
        # mu = 0.8 for alpha <= 30 deg; linearly decreases to 0 at 60 deg
        if roof_angle <= 30.0:
            mu = 0.8
        elif roof_angle < 60.0:
            mu = 0.8 * (60.0 - roof_angle) / 30.0
        else:
            mu = 0.0
            
        design_roof_snow_load_kN = mu * snow_load * design.geometry.floor_area_m2
        metrics["design_roof_snow_load_kN"] = design_roof_snow_load_kN

        # 2. Geotechnical & Foundation Checks (IS 1904)
        frost_depth = design.site.ground_frost_depth_m
        bearing_cap = design.site.allowable_bearing_capacity_kPa
        
        if frost_depth > 0.0:
            # Require minimum footing depth below frost line
            metrics["required_footing_depth_m"] = max(self.MIN_FROST_DEPTH_M, frost_depth + 0.2)
            if design.envelope.floor_thickness_mm / 1000.0 < 0.1:
                warnings.append(
                    f"STRUCT-IS1904-01: Extremely thin floor slab ({design.envelope.floor_thickness_mm}mm) "
                    f"in frost-susceptible soil (frost depth {frost_depth}m)."
                )
            if frost_depth > 1.5 and getattr(design.site, "frost_risk", "LOW") == "HIGH":
                warnings.append(
                    f"STRUCT-IS1904-03: Deep frost penetration ({frost_depth}m) with HIGH frost risk requires perimeter frost-protected shallow foundation (FPSF) or deep grade beams per IS 1904."
                )

        if bearing_cap < 50.0:
            violations.append(f"STRUCT-IS1904-02: Soil bearing capacity ({bearing_cap} kPa) is critically low for standard shallow foundations.")

        # 3. Simple Aspect Ratio Constraints (NBC)
        ar = design.geometry.aspect_ratio
        if ar > 4.0:
            violations.append(f"STRUCT-NBC-01: Aspect ratio {ar} exceeds structural envelope norm (max 4.0) for unreinforced masonry.")
        elif ar < 0.25:
            violations.append(f"STRUCT-NBC-02: Aspect ratio {ar} is dangerously low for stability.")

        return StructuralValidationResult(
            passed=len(violations) == 0,
            violations=violations,
            warnings=warnings,
            structural_metrics=metrics
        )
