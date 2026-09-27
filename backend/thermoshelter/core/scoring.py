"""
ThermoShelter — Design Scoring Module
Implements a transparent, multi-objective scoring layer strictly separating
hard physical/statutory constraints from soft optimization objectives.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional
from .design_state import DesignState
from .performance_vector import PerformanceVector


@dataclass
class HardConstraintResult:
    """Evaluation of a single hard constraint."""
    constraint_name: str
    passed: bool
    actual_value: Any
    threshold_condition: str
    failure_reason: Optional[str] = None


@dataclass
class SoftObjectiveScore:
    """Evaluation of a single soft optimization objective."""
    objective_name: str
    weight: float                     # Weight in total score (0.0 to 1.0)
    raw_value: float
    normalized_score: float           # Sub-score from 0.0 (worst) to 100.0 (best)
    description: str = ""


@dataclass
class DesignScore:
    """Complete transparent score breakdown for a candidate design."""
    total_score: float                # 0.0 to 100.0 (0.0 if any hard constraint fails)
    hard_constraints_passed: bool
    hard_constraints: List[HardConstraintResult]
    soft_objectives: List[SoftObjectiveScore]
    summary_verdict: str              # 'OPTIMAL', 'ACCEPTABLE', 'NON_COMPLIANT', 'PHYSICALLY_INVALID'

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_score": round(self.total_score, 2),
            "hard_constraints_passed": self.hard_constraints_passed,
            "summary_verdict": self.summary_verdict,
            "hard_constraints": [asdict(hc) for hc in self.hard_constraints],
            "soft_objectives": [asdict(so) for so in self.soft_objectives]
        }


class DesignScorer:
    """
    Transparent evaluator that computes hard constraints and soft objectives.
    Prevents invalid designs from winning regardless of high soft scores.
    """

    def __init__(
        self,
        comfort_weight: float = 0.40,
        envelope_weight: float = 0.25,
        mass_inertia_weight: float = 0.15,
        sustainability_weight: float = 0.10,
        compactness_weight: float = 0.10
    ):
        total_w = comfort_weight + envelope_weight + mass_inertia_weight + sustainability_weight + compactness_weight
        self.w_comfort = comfort_weight / total_w
        self.w_envelope = envelope_weight / total_w
        self.w_mass = mass_inertia_weight / total_w
        self.w_sustainability = sustainability_weight / total_w
        self.w_compactness = compactness_weight / total_w

    def evaluate(
        self,
        design: DesignState,
        performance: PerformanceVector,
        engineering_validation_failures: Optional[List[str]] = None
    ) -> DesignScore:
        """
        Evaluate candidate design against hard constraints and soft objectives.
        """
        hard_results = []
        validation_failures = engineering_validation_failures or []

        # 1. Hard Constraint: Physical Geometry Positive Dimensions
        geom_valid = (design.geometry.length_m > 0 and design.geometry.width_m > 0 and design.geometry.height_m > 0)
        hard_results.append(HardConstraintResult(
            constraint_name="PHYSICAL_DIMENSIONS_POSITIVE",
            passed=geom_valid,
            actual_value=f"L={design.geometry.length_m}, W={design.geometry.width_m}, H={design.geometry.height_m}",
            threshold_condition="length, width, height > 0",
            failure_reason="Dimensions must be strictly positive" if not geom_valid else None
        ))

        # 2. Hard Constraint: Openings strictly less than Gross Wall Area
        openings_valid = (design.total_opening_area_m2 < design.geometry.gross_wall_area_m2)
        hard_results.append(HardConstraintResult(
            constraint_name="OPENINGS_WITHIN_WALL_BOUNDS",
            passed=openings_valid,
            actual_value=f"Openings: {design.total_opening_area_m2:.2f} m², Gross Wall: {design.geometry.gross_wall_area_m2:.2f} m²",
            threshold_condition="total_opening_area < gross_wall_area",
            failure_reason="Total openings exceed wall surface area" if not openings_valid else None
        ))

        # 3. Hard Constraint: Simulation Convergence
        sim_converged = (performance.simulation_status == "CONVERGED" and performance.energy_balance_max_error_W < 0.1)
        hard_results.append(HardConstraintResult(
            constraint_name="PHYSICS_SIMULATION_CONVERGENCE",
            passed=sim_converged,
            actual_value=f"Status={performance.simulation_status}, Error={performance.energy_balance_max_error_W:.4f} W",
            threshold_condition="status == 'CONVERGED' and energy_balance_error < 0.1 W",
            failure_reason="Simulation did not numerically converge" if not sim_converged else None
        ))

        # 4. Hard Constraint: Statutory Engineering Rules (Mandatory failures)
        eng_rules_passed = (len(validation_failures) == 0)
        hard_results.append(HardConstraintResult(
            constraint_name="STATUTORY_ENGINEERING_RULES",
            passed=eng_rules_passed,
            actual_value=f"{len(validation_failures)} rule failures: {', '.join(validation_failures) if validation_failures else 'None'}",
            threshold_condition="zero mandatory statutory rule violations",
            failure_reason="Failed mandatory building code regulations" if not eng_rules_passed else None
        ))

        all_hard_passed = all(hc.passed for hc in hard_results)

        # -------------------------------------------------------------
        # SOFT OBJECTIVES (0 to 100 each)
        # -------------------------------------------------------------
        # A. Thermal Protection & Passive Lift Objective:
        # Evaluates passive temperature lift above ambient and freeze protection
        lift = performance.temperature_lift_C.value
        min_in = performance.min_indoor_temp_C.value
        swing = performance.diurnal_temperature_swing_C.value
        
        if "Cold" in design.context.climate_zone:
            # In cold climates, reward positive indoor lift above outdoor ambient (target >= 8°C lift)
            lift_sub = min(100.0, max(0.0, (lift / 8.0) * 80.0))
            # Reward keeping indoor temp above extreme freezing (-5°C)
            freeze_buffer = min(20.0, max(0.0, (min_in + 5.0) * 4.0))
            swing_penalty = max(0.0, (swing - 5.0) * 2.0)
            comfort_sub = max(0.0, min(100.0, lift_sub + freeze_buffer - swing_penalty))
        else:
            # In warm climates, reward keeping indoor temp below peak outdoor ambient
            comfort_sub = max(0.0, min(100.0, 100.0 - max(0.0, performance.max_indoor_temp_C.value - 28.0) * 5.0))

        comfort_obj = SoftObjectiveScore(
            objective_name="THERMAL_PROTECTION_AND_LIFT",
            weight=self.w_comfort,
            raw_value=lift,
            normalized_score=round(comfort_sub, 2),
            description="Measures passive thermal lift above outdoor freezing ambient and freeze buffer"
        )

        # B. Envelope Thermal Efficiency Objective:
        # Lower U-values yield higher score (target U <= 0.35 W/m2K for cold climates)
        wall_u = performance.wall_u_value_W_m2K.value
        roof_u = performance.roof_u_value_W_m2K.value
        avg_u = (wall_u + roof_u) / 2.0
        # U=0.2 -> 100, U=0.45 -> 70, U=1.5 -> 20
        envelope_sub = max(0.0, min(100.0, 100.0 - (avg_u - 0.20) * 60.0))
        envelope_obj = SoftObjectiveScore(
            objective_name="ENVELOPE_THERMAL_RESISTANCE",
            weight=self.w_envelope,
            raw_value=avg_u,
            normalized_score=round(envelope_sub, 2),
            description="Encourages high thermal resistance (low U-values) in envelope"
        )

        # C. Thermal Inertia & Time Constant Objective:
        # High time constant (>40h in alpine climates) protects against night freezing
        tau = performance.thermal_time_constant_hours.value
        # tau >= 60h -> 100, tau=30h -> 70, tau=10h -> 30
        tau_sub = min(100.0, max(0.0, (tau / 60.0) * 100.0))
        mass_obj = SoftObjectiveScore(
            objective_name="THERMAL_MASS_INERTIA",
            weight=self.w_mass,
            raw_value=tau,
            normalized_score=round(tau_sub, 2),
            description="Rewards thermal mass lag and heat storage capacity"
        )

        # D. Local Sourcing & Sustainability Objective:
        # Higher score for local eco-materials (rammed earth, adobe, CSEB, thatch, poplar)
        local_mats = ["MAT-ADOBE", "MAT-RAMMED", "MAT-STONE", "MAT-CSEB", "MAT-THATCH", "MAT-TIMBER"]
        local_count = sum(1 for m in [design.envelope.wall_material_id, design.envelope.roof_material_id, design.envelope.floor_material_id] if m in local_mats)
        sustain_sub = (local_count / 3.0) * 100.0
        sustain_obj = SoftObjectiveScore(
            objective_name="LOCAL_MATERIAL_SUSTAINABILITY",
            weight=self.w_sustainability,
            raw_value=float(local_count),
            normalized_score=round(sustain_sub, 2),
            description="Measures percentage of envelope using locally available circular materials"
        )

        # E. Compactness & Aspect Ratio Objective:
        # Cold climate optimum aspect ratio is 1.3 to 1.6 (elongated for solar aperture)
        # Hot climate optimum aspect ratio is 1.0 to 1.2 (compact for reduced facade exposure)
        aspect = design.geometry.aspect_ratio
        if "Cold" in design.context.climate_zone:
            optimal_aspect = 1.5   # Elongated for passive solar gain maximization
        else:
            optimal_aspect = 1.2   # More square for cross-ventilation / facade minimization
        aspect_penalty = abs(aspect - optimal_aspect) * 30.0
        compact_sub = max(0.0, min(100.0, 100.0 - aspect_penalty))
        compact_obj = SoftObjectiveScore(
            objective_name="GEOMETRIC_COMPACTNESS",
            weight=self.w_compactness,
            raw_value=aspect,
            normalized_score=round(compact_sub, 2),
            description=f"Rewards optimal climate-adapted aspect ratio (target={optimal_aspect:.1f})"
        )

        soft_list = [comfort_obj, envelope_obj, mass_obj, sustain_obj, compact_obj]

        if not all_hard_passed:
            total_score = 0.0
            verdict = "NON_COMPLIANT" if eng_rules_passed is False else "PHYSICALLY_INVALID"
        else:
            total_score = sum(so.weight * so.normalized_score for so in soft_list)
            if total_score >= 80.0:
                verdict = "OPTIMAL"
            elif total_score >= 60.0:
                verdict = "ACCEPTABLE"
            else:
                verdict = "SUB_OPTIMAL"

        return DesignScore(
            total_score=round(total_score, 2),
            hard_constraints_passed=all_hard_passed,
            hard_constraints=hard_results,
            soft_objectives=soft_list,
            summary_verdict=verdict
        )
