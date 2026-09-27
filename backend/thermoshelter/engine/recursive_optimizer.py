"""
ThermoShelter — Recursive Iteration Engine Module
Implements the core recursive design loop:
AI proposes -> Physics simulates -> Engineering validates -> Optimizer improves.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional, Set, Tuple
import hashlib
import json

from ..core.design_state import DesignState, OpeningItem
from ..core.performance_vector import PerformanceVector
from ..core.scoring import DesignScorer, DesignScore
from ..validation.engineering_validator import EngineeringValidator, ValidationReport
from ..simulation.physics_bridge import PhysicsBridge
from ..models.predictors import (
    AssemblyRecommenderModel, GeometryRecommenderModel, OrientationRecommenderModel
)


@dataclass
class IterationRecord:
    """Traceable snapshot of a single iteration step in the recursive loop."""
    iteration_index: int
    design_id: str
    modification_rationale: str
    diagnosis: str
    parameter_changed: str
    old_value: Any
    new_value: Any
    total_score: float
    hard_constraints_passed: bool
    wall_u_value: float
    roof_u_value: float
    avg_indoor_temp_C: float
    min_indoor_temp_C: float
    hours_below_5C: float
    mandatory_rule_failures: List[str]
    warnings: List[str]
    applied_changes: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class OptimizationResult:
    """Consolidated output of the recursive design optimization process."""
    best_design: DesignState
    best_performance: PerformanceVector
    best_score: DesignScore
    final_validation: ValidationReport
    iteration_history: List[IterationRecord]
    stopping_reason: str              # 'VALIDATED_OPTIMAL_FOUND', 'CONVERGED', 'MAX_ITERATIONS', 'REPEATED_STATE_DETECTED'
    total_iterations: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "stopping_reason": self.stopping_reason,
            "total_iterations": self.total_iterations,
            "best_design": self.best_design.to_dict(),
            "best_score": self.best_score.to_dict(),
            "best_performance": self.best_performance.to_dict(),
            "final_validation": self.final_validation.to_dict(),
            "iteration_history": [r.to_dict() for r in self.iteration_history]
        }


class RecursiveDesignOptimizer:
    """
    Recursive Design Optimization Engine.
    Executes the loop: ML Proposal -> Physics Simulation -> Code Validation -> Weakness Diagnosis -> Target Mutation.
    """

    def __init__(
        self,
        physics_bridge: Optional[PhysicsBridge] = None,
        engineering_validator: Optional[EngineeringValidator] = None,
        design_scorer: Optional[DesignScorer] = None,
        max_iterations: int = 6,
        target_score: float = 85.0,
        min_improvement_delta: float = 0.5
    ):
        self.physics = physics_bridge or PhysicsBridge()
        self.validator = engineering_validator or EngineeringValidator()
        self.scorer = design_scorer or DesignScorer()
        
        self.max_iterations = max_iterations
        self.target_score = target_score
        self.min_improvement_delta = min_improvement_delta
        
        # Baseline Heuristic Recommenders (Placeholders for trained ML models)
        self.assembly_model = AssemblyRecommenderModel()
        self.geometry_model = GeometryRecommenderModel()
        self.orientation_model = OrientationRecommenderModel()

    def _compute_state_signature(self, design: DesignState) -> str:
        """Create a deterministic hash signature of design parameters to detect state cycles."""
        key_props = {
            "geom": (design.geometry.length_m, design.geometry.width_m, design.geometry.height_m, design.geometry.roof_angle_deg),
            "orient": design.orientation_azimuth_deg,
            "wall_asm": design.envelope.wall_assembly_id,
            "roof_asm": design.envelope.roof_assembly_id,
            "floor_asm": design.envelope.floor_assembly_id,
            "openings": [(op.orientation, op.area_m2, op.glazing_type) for op in design.openings]
        }
        return hashlib.md5(json.dumps(key_props, sort_keys=True).encode()).hexdigest()

    def optimize(
        self,
        initial_design: DesignState,
        simulation_hours: int = 48
    ) -> OptimizationResult:
        """
        Execute recursive design optimization loop.
        """
        current_design = initial_design.copy()
        history: List[IterationRecord] = []
        visited_states: Set[str] = set()

        best_design = current_design
        best_perf: Optional[PerformanceVector] = None
        best_score: Optional[DesignScore] = None
        best_validation: Optional[ValidationReport] = None
        highest_score = -1.0
        stopping_reason = "MAX_ITERATIONS"

        for iteration in range(self.max_iterations):
            # 1. Check Repeated State (Infinite Loop Prevention)
            state_sig = self._compute_state_signature(current_design)
            if state_sig in visited_states:
                stopping_reason = "REPEATED_STATE_DETECTED"
                break
            visited_states.add(state_sig)

            # 2. Physics Simulation (With Robust Error Handling)
            perf = self.physics.simulate(current_design, hours=simulation_hours)

            # 3. Engineering Validation
            val_report = self.validator.validate(current_design, perf)

            # 4. Multi-Objective Scoring (Hard vs Soft Separation)
            score = self.scorer.evaluate(current_design, perf, val_report.mandatory_failures)

            # Extract diagnostic metadata for this step
            mutation_diag = getattr(current_design, "_last_diagnosis", "INITIAL_BASELINE")
            param_changed = getattr(current_design, "_last_param_changed", "NONE")
            old_val = getattr(current_design, "_last_old_value", None)
            new_val = getattr(current_design, "_last_new_value", None)

            # 5. Record Traceable Iteration History
            rec = IterationRecord(
                iteration_index=iteration,
                design_id=current_design.design_id,
                modification_rationale=current_design.modification_rationale,
                diagnosis=mutation_diag,
                parameter_changed=param_changed,
                old_value=old_val,
                new_value=new_val,
                total_score=score.total_score,
                hard_constraints_passed=score.hard_constraints_passed,
                wall_u_value=perf.wall_u_value_W_m2K.value,
                roof_u_value=perf.roof_u_value_W_m2K.value,
                avg_indoor_temp_C=perf.avg_indoor_temp_C.value,
                min_indoor_temp_C=perf.min_indoor_temp_C.value,
                hours_below_5C=perf.hours_below_5C.value,
                mandatory_rule_failures=val_report.mandatory_failures,
                warnings=val_report.warnings
            )
            history.append(rec)

            # 6. Update Best Validated Design (Must Pass Hard Constraints)
            if score.hard_constraints_passed and score.total_score >= highest_score:
                highest_score = score.total_score
                best_design = current_design.copy()
                best_perf = perf
                best_score = score
                best_validation = val_report

            # 7. Check Stopping Conditions
            if score.hard_constraints_passed and score.total_score >= self.target_score:
                stopping_reason = "VALIDATED_OPTIMAL_FOUND"
                break

            if iteration > 0 and len(history) >= 2 and mutation_diag not in ["MAJOR_ORIENTATION_MISALIGNMENT", "STATUTORY_RULE_VIOLATION"]:
                recent_delta = history[-1].total_score - history[-2].total_score
                if 0.0 <= recent_delta < self.min_improvement_delta and score.hard_constraints_passed:
                    stopping_reason = "CONVERGED"
                    break

            # 8. Explainable Weakness Diagnosis & Target Mutation
            current_design = self._diagnose_and_mutate(current_design, perf, val_report, score)

        # Fallback if best was not set (e.g. all failed constraints, keep latest evaluated)
        if best_perf is None:
            best_perf = perf
            best_score = score
            best_validation = val_report

        return OptimizationResult(
            best_design=best_design,
            best_performance=best_perf,
            best_score=best_score,
            final_validation=best_validation,
            iteration_history=history,
            stopping_reason=stopping_reason,
            total_iterations=len(history)
        )

    def _diagnose_and_mutate(
        self,
        design: DesignState,
        performance: PerformanceVector,
        validation: ValidationReport,
        score: DesignScore
    ) -> DesignState:
        """
        Diagnose the primary bottleneck following a structured physical hierarchy:
        1. Hard Simulation / Physical Invalidity Recovery
        2. Statutory Building Code Violations (Mandatory U-value / R-value)
        3. Major Solar Orientation Misalignment (True South Alignment)
        4. Major Geometry / Aspect Ratio Optimization
        5. Envelope Insulation Sub-Optimality
        6. Solar Aperture & Fenestration Glazing Enhancement
        7. Passive Buffering & Thermal Mass
        8. Infiltration Fine-Tuning
        """
        is_cold = "Cold" in design.context.climate_zone

        # -------------------------------------------------------------
        # Hierarchy 1: Physical / Simulation Error Recovery
        # -------------------------------------------------------------
        if performance.simulation_status == "FAILED" or design.total_opening_area_m2 >= design.geometry.gross_wall_area_m2:
            safe_openings = [
                OpeningItem("OPN-RECOV-S-WIN", "WINDOW", "South", 2.0, 1.5, 3.0, 2.0, 0.65, "double"),
                OpeningItem("OPN-RECOV-E-DOOR", "DOOR", "East", 1.0, 2.0, 2.0, 1.2, 0.0, "solid_insulated")
            ]
            mutated = design.with_mutation(
                rationale="PHYSICAL_RECOVERY: Reset opening penetrations to fit within gross wall boundary",
                openings_changes=safe_openings
            )
            mutated._last_diagnosis = "PHYSICAL_INVALIDITY_RECOVERY"
            mutated._last_param_changed = "openings"
            mutated._last_old_value = f"{design.total_opening_area_m2:.2f} m²"
            mutated._last_new_value = "5.00 m²"
            return mutated

        # -------------------------------------------------------------
        # Hierarchy 2: Statutory Mandatory Rule Violations (U/R Bounds)
        # -------------------------------------------------------------
        if "RULE-ENG-001" in " ".join(validation.mandatory_failures) or "RULE-ENG-002" in " ".join(validation.mandatory_failures):
            old_wall_asm = design.envelope.wall_assembly_id
            rec_asm = self.assembly_model.recommend(design)
            mutated = design.with_mutation(
                rationale=f"STATUTORY_CORRECTION: {rec_asm.rationale}",
                envelope_changes=rec_asm.recommended_parameters
            )
            mutated._last_diagnosis = "STATUTORY_RULE_VIOLATION"
            mutated._last_param_changed = "envelope.wall_assembly_id"
            mutated._last_old_value = old_wall_asm
            mutated._last_new_value = rec_asm.recommended_parameters["wall_assembly_id"]
            return mutated

        # -------------------------------------------------------------
        # Hierarchy 3: Major Solar Orientation Misalignment (Azimuth != 180° True South)
        # -------------------------------------------------------------
        if is_cold and abs(design.orientation_azimuth_deg - 180.0) > 1.0:
            old_ori = design.orientation_azimuth_deg
            rec_ori = self.orientation_model.recommend(design)
            new_ori = rec_ori.recommended_parameters["orientation_azimuth_deg"]
            mutated = design.with_mutation(
                rationale=f"SOLAR_ORIENTATION_OPTIMIZATION: {rec_ori.rationale}",
                orientation_deg=new_ori
            )
            mutated._last_diagnosis = "MAJOR_ORIENTATION_MISALIGNMENT"
            mutated._last_param_changed = "orientation_azimuth_deg"
            mutated._last_old_value = old_ori
            mutated._last_new_value = new_ori
            return mutated

        # -------------------------------------------------------------
        # Hierarchy 4: Major Geometry / Aspect Ratio Optimization
        # -------------------------------------------------------------
        if abs(design.geometry.aspect_ratio - 1.50) > 0.15:
            old_aspect = design.geometry.aspect_ratio
            rec_geom = self.geometry_model.recommend(design)
            mutated = design.with_mutation(
                rationale=f"GEOMETRY_OPTIMIZATION: {rec_geom.rationale}",
                geometry_changes=rec_geom.recommended_parameters
            )
            mutated._last_diagnosis = "GEOMETRIC_COMPACTNESS_OPTIMIZATION"
            mutated._last_param_changed = "geometry.aspect_ratio"
            mutated._last_old_value = old_aspect
            mutated._last_new_value = 1.50
            return mutated

        # -------------------------------------------------------------
        # Hierarchy 5: Envelope Insulation Sub-Optimality
        # -------------------------------------------------------------
        if is_cold and design.envelope.wall_u_value_W_m2K > 0.35:
            old_wall_u = design.envelope.wall_u_value_W_m2K
            rec_asm = self.assembly_model.recommend(design)
            mutated = design.with_mutation(
                rationale="ENVELOPE_UPGRADE: Upgrading to high-performance CSEB cavity with Rockwool insulation",
                envelope_changes=rec_asm.recommended_parameters
            )
            mutated._last_diagnosis = "ENVELOPE_THERMAL_UPGRADE"
            mutated._last_param_changed = "envelope.wall_u_value_W_m2K"
            mutated._last_old_value = old_wall_u
            mutated._last_new_value = rec_asm.recommended_parameters["wall_u_value_W_m2K"]
            return mutated

        # -------------------------------------------------------------
        # Hierarchy 6: Solar Aperture & Fenestration Glazing Enhancement
        # -------------------------------------------------------------
        if is_cold and design.south_window_area_m2 < 5.0:
            old_south_area = design.south_window_area_m2
            enhanced_openings = [
                OpeningItem(
                    opening_id="OPN-OPT-SOUTH-RABSAL",
                    opening_type="RABSAL_SUNSPACE",
                    orientation="South",
                    width_m=3.5,
                    height_m=2.0,
                    area_m2=7.0,
                    u_value_W_m2K=1.80,
                    shgc=0.70,
                    glazing_type="double_low_e",
                    weather_stripped=True
                ),
                OpeningItem(
                    opening_id="OPN-OPT-NORTH-VENT",
                    opening_type="WINDOW",
                    orientation="North",
                    width_m=0.6,
                    height_m=0.5,
                    area_m2=0.30,
                    u_value_W_m2K=2.0,
                    shgc=0.50,
                    glazing_type="double",
                    weather_stripped=True
                ),
                OpeningItem(
                    opening_id="OPN-OPT-EAST-DOOR",
                    opening_type="DOOR",
                    orientation="East",
                    width_m=1.0,
                    height_m=2.0,
                    area_m2=2.0,
                    u_value_W_m2K=1.20,
                    shgc=0.0,
                    glazing_type="solid_insulated",
                    weather_stripped=True
                )
            ]
            mutated = design.with_mutation(
                rationale="SOLAR_APERTURE_ENHANCEMENT: Integrated south-facing passive solar rabsal glazing",
                openings_changes=enhanced_openings,
                ventilation_level="low"
            )
            mutated._last_diagnosis = "SOLAR_APERTURE_ENHANCEMENT"
            mutated._last_param_changed = "openings.south_window_area_m2"
            mutated._last_old_value = old_south_area
            mutated._last_new_value = 7.0
            return mutated

        # -------------------------------------------------------------
        # Hierarchy 7: Passive Buffering & Thermal Mass Strategies
        # -------------------------------------------------------------
        if "PAS-STRAT-AIRLOCK-BUFFER" not in design.passive_strategies:
            old_strat = list(design.passive_strategies)
            new_strat = old_strat + ["PAS-STRAT-AIRLOCK-BUFFER", "PAS-STRAT-TROMBE-WALL"]
            mutated = design.with_mutation(
                rationale="PASSIVE_STRATEGY_INTEGRATION: Added entry airlock vestibule buffer and Trombe thermal mass",
                passive_strategies=new_strat
            )
            mutated._last_diagnosis = "PASSIVE_STRATEGY_INTEGRATION"
            mutated._last_param_changed = "passive_strategies"
            mutated._last_old_value = old_strat
            mutated._last_new_value = new_strat
            return mutated

        # -------------------------------------------------------------
        # Hierarchy 8: Infiltration Weather-Stripping Fine-Tuning
        # -------------------------------------------------------------
        old_vent = design.requirements.ventilation_level
        mutated = design.with_mutation(
            rationale="FINE_TUNING: Set air infiltration to weather-stripped low infiltration (0.50 ACH)",
            ventilation_level="low"
        )
        mutated._last_diagnosis = "INFILTRATION_FINE_TUNING"
        mutated._last_param_changed = "requirements.ventilation_level"
        mutated._last_old_value = old_vent
        mutated._last_new_value = "low"
        return mutated
