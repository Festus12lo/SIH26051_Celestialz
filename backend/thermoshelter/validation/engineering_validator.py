"""
ThermoShelter — Engineering Validator Module
Evaluates candidate designs against statutory building code rules and engineering constraints.
Follows the project standard: ENGINEERING-INFORMED VALIDATION.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from ..core.design_state import DesignState
from ..core.performance_vector import PerformanceVector
from .structural_validator import StructuralValidator

VENTILATION_ACH_MAP = {
    "sealed": 0.1,
    "low": 0.5,
    "medium": 1.0,
    "high": 2.0
}


@dataclass
class RuleEvaluation:
    """Individual rule evaluation output."""
    rule_id: str
    title: str
    category: str
    severity: str                      # 'MANDATORY_FAIL', 'WARNING', 'RECOMMENDATION'
    passed: bool
    actual_value_str: str
    threshold_condition: str
    source_id: str
    explanation: str


@dataclass
class ValidationReport:
    """Consolidated engineering validation report for a candidate design."""
    is_fully_compliant: bool
    mandatory_failures: List[str]
    warnings: List[str]
    evaluations: List[RuleEvaluation]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_fully_compliant": self.is_fully_compliant,
            "mandatory_failures_count": len(self.mandatory_failures),
            "warnings_count": len(self.warnings),
            "mandatory_failures": self.mandatory_failures,
            "warnings": self.warnings,
            "evaluations": [
                {
                    "rule_id": e.rule_id,
                    "title": e.title,
                    "severity": e.severity,
                    "passed": e.passed,
                    "actual": e.actual_value_str,
                    "condition": e.threshold_condition,
                    "source": e.source_id,
                    "explanation": e.explanation
                }
                for e in self.evaluations
            ]
        }


class EngineeringValidator:
    """
    Evaluates statutory engineering constraints sourced from:
    - Ladakh Standardized Development & Building Regulations 2023
    - National Building Code of India 2016
    - ISO 6946:2017
    """

    def validate(self, design: DesignState, performance: PerformanceVector) -> ValidationReport:
        evaluations = []
        mandatory_failures = []
        warnings = []
        is_cold = "Cold" in design.context.climate_zone

        # -------------------------------------------------------------
        # RULE-ENG-001: Cold Climate Maximum Wall U-Value (0.45 W/m2K)
        # -------------------------------------------------------------
        wall_u = performance.wall_u_value_W_m2K.value
        r1_passed = (wall_u <= 0.45) if is_cold else True
        r1_eval = RuleEvaluation(
            rule_id="RULE-ENG-001",
            title="Extreme Cold Climate Maximum Wall U-Value",
            category="Thermal Insulation",
            severity="MANDATORY_FAIL" if is_cold else "RECOMMENDATION",
            passed=r1_passed,
            actual_value_str=f"{wall_u:.3f} W/(m²·K)",
            threshold_condition="wall_u_value <= 0.45 W/(m²·K)" if is_cold else "N/A (Non-cold climate)",
            source_id="SRC-LADAKH-REGS-2023",
            explanation="Envelope walls in alpine sub-zero climates must achieve U <= 0.45 to prevent extreme hypothermia heat loss."
        )
        evaluations.append(r1_eval)
        if not r1_passed and r1_eval.severity == "MANDATORY_FAIL":
            mandatory_failures.append(f"RULE-ENG-001: Wall U-value ({wall_u:.3f} W/m²K) exceeds maximum allowed 0.45 W/m²K.")

        # -------------------------------------------------------------
        # RULE-ENG-002: Mandatory Roof Thermal Resistance (R >= 2.50)
        # -------------------------------------------------------------
        roof_u = performance.roof_u_value_W_m2K.value
        roof_r = 1.0 / roof_u if roof_u > 0 else 0.0
        r2_passed = (roof_r >= 2.50) if is_cold else True
        r2_eval = RuleEvaluation(
            rule_id="RULE-ENG-002",
            title="Mandatory Roof Thermal Resistance",
            category="Thermal Insulation",
            severity="MANDATORY_FAIL" if is_cold else "RECOMMENDATION",
            passed=r2_passed,
            actual_value_str=f"R={roof_r:.2f} m²·K/W (U={roof_u:.3f})",
            threshold_condition="roof_r_value >= 2.50 m²·K/W" if is_cold else "N/A",
            source_id="SRC-LADAKH-REGS-2023",
            explanation="Roof assembly must feature continuous insulation R >= 2.50 to restrict buoyancy convective ceiling losses."
        )
        evaluations.append(r2_eval)
        if not r2_passed and r2_eval.severity == "MANDATORY_FAIL":
            mandatory_failures.append(f"RULE-ENG-002: Roof R-value ({roof_r:.2f} m²K/W) is below minimum required 2.50 m²K/W.")

        # -------------------------------------------------------------
        # RULE-ENG-003: North Wall Maximum Window-to-Wall Ratio (10%)
        # -------------------------------------------------------------
        north_wwr = design.north_wwr
        r3_passed = (north_wwr <= 0.10) if is_cold else True
        r3_eval = RuleEvaluation(
            rule_id="RULE-ENG-003",
            title="North Wall Maximum Window-to-Wall Ratio",
            category="Fenestration",
            severity="WARNING",
            passed=r3_passed,
            actual_value_str=f"{north_wwr * 100.0:.1f}%",
            threshold_condition="north_wwr <= 0.10 (10%)",
            source_id="SRC-LADAKH-REGS-2023",
            explanation="North-facing glazing must be minimized (<10%) in cold climates due to zero winter solar gain and severe thermal conduction loss."
        )
        evaluations.append(r3_eval)
        if not r3_passed:
            warnings.append(f"RULE-ENG-003: North window-to-wall ratio ({north_wwr * 100:.1f}%) exceeds recommended 10.0%.")

        # -------------------------------------------------------------
        # RULE-ENG-004: Opening Area Geometrical Bound (< Gross Wall)
        # -------------------------------------------------------------
        tot_open = design.total_opening_area_m2
        gross_wall = design.geometry.gross_wall_area_m2
        r4_passed = (tot_open < gross_wall)
        r4_eval = RuleEvaluation(
            rule_id="RULE-ENG-004",
            title="Total Opening Area Geometrical Bound",
            category="Structure & Safety",
            severity="MANDATORY_FAIL",
            passed=r4_passed,
            actual_value_str=f"Openings: {tot_open:.2f} m² / Gross Wall: {gross_wall:.2f} m² ({tot_open/max(gross_wall, 1)*100:.1f}%)",
            threshold_condition="total_opening_area < gross_wall_area",
            source_id="SRC-NBC-INDIA-2016",
            explanation="Total opening penetrations must strictly fit within gross structural wall boundary."
        )
        evaluations.append(r4_eval)
        if not r4_passed:
            mandatory_failures.append("RULE-ENG-004: Opening area exceeds total envelope wall boundary.")

        # -------------------------------------------------------------
        # RULE-ENG-005: Cold-Climate Air Infiltration Limit (ACH <= 0.50)
        # -------------------------------------------------------------
        ach = VENTILATION_ACH_MAP.get(design.requirements.ventilation_level, 0.5)
        r5_passed = (ach <= 0.50) if is_cold else True
        r5_eval = RuleEvaluation(
            rule_id="RULE-ENG-005",
            title="Cold-Climate Air Infiltration Limit",
            category="Ventilation",
            severity="WARNING",
            passed=r5_passed,
            actual_value_str=f"{ach:.2f} ACH",
            threshold_condition="ach <= 0.50 h⁻¹ in cold zones",
            source_id="SRC-NBC-INDIA-2016",
            explanation="Uncontrolled infiltration should not exceed 0.50 ACH in cold alpine zones to prevent draft energy collapse."
        )
        evaluations.append(r5_eval)
        if not r5_passed:
            warnings.append(f"RULE-ENG-005: High ventilation/infiltration ({ach:.2f} ACH) will cause elevated winter heating loss.")

        # -------------------------------------------------------------
        # RULE-ENG-006: Geometric Plausibility
        # -------------------------------------------------------------
        l, w, h = design.geometry.length_m, design.geometry.width_m, design.geometry.height_m
        valid_dims = (l > 0) and (w > 0) and (h > 0)
        aspect_ratio = l / w if w > 0 else 999.0
        valid_aspect = 0.1 <= aspect_ratio <= 10.0
        r6_passed = valid_dims and valid_aspect
        r6_eval = RuleEvaluation(
            rule_id="RULE-ENG-006",
            title="Geometric Plausibility Check",
            category="Structure & Safety",
            severity="MANDATORY_FAIL",
            passed=r6_passed,
            actual_value_str=f"Dims: {l}x{w}x{h}, AR: {aspect_ratio:.2f}",
            threshold_condition="Dims > 0 and 0.1 <= AR <= 10.0",
            source_id="SRC-GEOM-VALIDATION",
            explanation="Shelter geometry must have positive dimensions and physically plausible aspect ratio."
        )
        evaluations.append(r6_eval)
        if not r6_passed:
            mandatory_failures.append("RULE-ENG-006: Invalid geometry (negative dimensions or absurd aspect ratio).")

        # -------------------------------------------------------------
        # RULE-ENG-007: Roof Pitch Constraints
        # -------------------------------------------------------------
        pitch = design.geometry.roof_angle_deg
        r7_passed = 0.0 <= pitch <= 80.0
        r7_eval = RuleEvaluation(
            rule_id="RULE-ENG-007",
            title="Roof Pitch Limits",
            category="Structure & Safety",
            severity="MANDATORY_FAIL",
            passed=r7_passed,
            actual_value_str=f"{pitch}°",
            threshold_condition="0.0 <= pitch <= 80.0",
            source_id="SRC-GEOM-VALIDATION",
            explanation="Extreme roof pitches > 80 degrees are structurally unsound as roofing membranes."
        )
        evaluations.append(r7_eval)
        if not r7_passed:
            mandatory_failures.append(f"RULE-ENG-007: Roof pitch {pitch}° is dangerously steep (>80°).")

        # -------------------------------------------------------------
        # STRUCTURAL VALIDATION (IS 875 / IS 1904)
        # -------------------------------------------------------------
        structural_val = StructuralValidator()
        struct_res = structural_val.validate(design)
        
        r6_passed = struct_res.passed
        r6_eval = RuleEvaluation(
            rule_id="RULE-STRUCT-001",
            title="Structural Load and Foundation Check",
            category="Structural",
            severity="MANDATORY_FAIL",
            passed=r6_passed,
            actual_value_str="Passed" if r6_passed else f"{len(struct_res.violations)} Violations",
            threshold_condition="Must satisfy IS 875 & IS 1904 logic",
            source_id="SRC-IS-875-1904",
            explanation="Checks architectural boundaries against baseline snow load and foundation frost depth."
        )
        evaluations.append(r6_eval)
        
        if not r6_passed:
            mandatory_failures.extend(struct_res.violations)
        warnings.extend(struct_res.warnings)

        return ValidationReport(
            is_fully_compliant=(len(mandatory_failures) == 0),
            mandatory_failures=mandatory_failures,
            warnings=warnings,
            evaluations=evaluations
        )
