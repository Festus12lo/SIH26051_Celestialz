"""
ThermoShelter — Master Shelter Design Orchestrator
Coordinates the complete intelligent design pipeline across Models A through H:

    USER BRIEF (Natural Language / Form)
        ↓
    CLIMATE & SITE CONTEXT BUILDER
        ↓
    MODEL A (Envelope) + MODEL B (Geometry) + MODEL C (Passive Solar)
        ↓
    MODEL E (Architectural Synthesizer) & MODEL F (Alternative Archetypes)
        ↓
    MODEL D (Fast GBR ML Surrogate Screening)
        ↓
    PHYSICS SIMULATION (Authoritative 48h Transient ThermalEngine V1)
        ↓
    CIVIL ENGINEERING VALIDATOR (NBC 2016 / IS 1904 / IS 875 Gate)
        ↓
    MODEL G (ASHRAE 55 Adaptive Thermal Comfort Engine)
        ↓
    MODEL H (Multi-Objective Pareto Decision Optimizer)
        ↓
    FINAL RECOMMENDATION + 5 ARCHETYPE ALTERNATIVES + BLUEPRINT + REPORT

AI recommends. Physics proves. Civil engineering validates.
"""

from typing import List, Dict, Any, Optional, Tuple
from ..core.design_state import DesignState, UserRequirements
from ..core.performance_vector import PerformanceVector
from ..core.scoring import DesignScorer, DesignScore
from ..core.user_input import ShelterRequest, RequestInterpreter
from ..core.nlp_interface import NaturalLanguageInterpreter, ArchitecturalExplainer
from ..features.context_builder import ContextBuilder
from ..models.predictors import FastPerformanceSurrogateModel
from ..models.model_a_envelope import ModelA_EnvelopeSelector
from ..models.model_b_geometry import ModelB_GeometryDesigner
from ..models.model_c_passive_solar import ModelC_PassiveSolarDesigner
from ..models.model_e_synthesizer import ModelE_ArchitecturalSynthesizer
from ..models.model_f_alternatives import ModelF_AlternativeGenerator, AlternativeArchetypeSpec
from ..models.model_g_comfort import ModelG_ThermalComfortPredictor
from ..models.model_h_optimizer import ModelH_MultiObjectiveOptimizer
from ..simulation.physics_bridge import PhysicsBridge
from ..validation.engineering_validator import EngineeringValidator, ValidationReport
from ..engine.material_comparator import MaterialComparator
from ..export.blueprint import BlueprintExporter
from ..export.report import (
    ShelterDesignReport, DesignAlternative, DesignComparisonTable,
    ThermalTimeSeries, HeatFlowAnalysis, SolarAnalysis
)


class ShelterDesignOrchestrator:
    """
    Master orchestrator driving the complete multi-model passive shelter design engine.
    """

    def __init__(
        self,
        context_builder: Optional[ContextBuilder] = None,
        physics: Optional[PhysicsBridge] = None,
        validator: Optional[EngineeringValidator] = None,
        scorer: Optional[DesignScorer] = None,
        model_d: Optional[FastPerformanceSurrogateModel] = None,
        model_a: Optional[ModelA_EnvelopeSelector] = None,
        model_b: Optional[ModelB_GeometryDesigner] = None,
        model_c: Optional[ModelC_PassiveSolarDesigner] = None,
        model_e: Optional[ModelE_ArchitecturalSynthesizer] = None,
        model_f: Optional[ModelF_AlternativeGenerator] = None,
        model_g: Optional[ModelG_ThermalComfortPredictor] = None,
        model_h: Optional[ModelH_MultiObjectiveOptimizer] = None,
        comparator: Optional[MaterialComparator] = None,
        n_candidates: int = 36,
        n_finalists: int = 6,
        simulation_hours: int = 48,
    ):
        self.ctx_builder = context_builder or ContextBuilder()
        self.physics = physics or PhysicsBridge()
        self.validator = validator or EngineeringValidator()
        self.scorer = scorer or DesignScorer()
        self.model_d = model_d or FastPerformanceSurrogateModel()
        self.model_a = model_a or ModelA_EnvelopeSelector()
        self.model_b = model_b or ModelB_GeometryDesigner()
        self.model_c = model_c or ModelC_PassiveSolarDesigner()
        self.model_e = model_e or ModelE_ArchitecturalSynthesizer()
        self.model_f = model_f or ModelF_AlternativeGenerator()
        self.model_g = model_g or ModelG_ThermalComfortPredictor()
        self.model_h = model_h or ModelH_MultiObjectiveOptimizer()
        self.comparator = comparator or MaterialComparator(
            physics=self.physics, validator=self.validator, scorer=self.scorer
        )
        self.n_candidates = n_candidates
        self.n_finalists = n_finalists
        self.simulation_hours = simulation_hours

    def design_shelter(self, request: ShelterRequest) -> ShelterDesignReport:
        """
        Execute the complete multi-model design and simulation pipeline.
        """
        # ── Step 1: Context & Requirements Interpretation ──
        context = self.ctx_builder.build_context(request.location)
        site = self.ctx_builder.build_site(request.location)
        is_cold = "Cold" in context.climate_zone

        req_params = RequestInterpreter.interpret(request, is_cold)
        requirements = UserRequirements(**req_params)

        # ── Step 2: Model E Synthesizer & Model F Archetypes ──
        # Generate broad exploration pool
        synthesized_pool = self.model_e.generate_candidate_pool(
            context=context, site=site, requirements=requirements, n_max=self.n_candidates
        )

        # Generate the 5 distinct purposeful archetypes
        archetype_candidates = self.model_f.generate_archetype_candidates(
            context=context, site=site, requirements=requirements
        )

        # Combine candidates (ensuring all 5 archetypes are evaluated)
        archetype_designs = [des for des, _ in archetype_candidates]
        all_candidates = archetype_designs + synthesized_pool
        total_generated = len(all_candidates)

        # ── Step 3: Model D Fast ML Surrogate Screening ──
        ml_predictions = self.model_d.predict_batch(all_candidates)

        # ── Step 4: Rank Candidates by ML Screening ──
        scored_candidates = self._rank_by_ml_screening(
            all_candidates, ml_predictions, request.thermal_objective, is_cold
        )

        # Select top finalists (plus ensure archetype representatives are simulated)
        top_screened = [des for des, _ in scored_candidates[:self.n_finalists]]
        finalist_pool = list({d.design_id: d for d in (archetype_designs + top_screened)}.values())
        n_after_screening = len(finalist_pool)

        # ── Step 5: Authoritative Physics Simulation (ThermalEngine V1) ──
        simulated_results = []
        for design in finalist_pool:
            perf, hourly = self.physics.simulate_with_timeseries(
                design, hours=self.simulation_hours
            )
            if perf.simulation_status != "CONVERGED":
                continue

            # Step 6: Civil Engineering Statutory Code Validation Gate
            val_report = self.validator.validate(design, perf)

            # Step 7: Model G Thermal Comfort Evaluation
            in_temps = [r.get("indoor_temperature_C", 0.0) for r in hourly]
            out_temps = [r.get("outdoor_temperature_C", 0.0) for r in hourly]
            comfort_report = self.model_g.evaluate_comfort(
                indoor_temps=in_temps, outdoor_temps=out_temps, climate_zone=context.climate_zone
            )

            # Step 8: Model H Multi-Objective Optimization & Utility Scoring
            multi_obj_vector = self.model_h.evaluate_multi_objective(
                design=design, performance=perf, validation=val_report,
                comfort=comfort_report, objective_mode=request.thermal_objective
            )

            # Standard transparent score
            base_score = self.scorer.evaluate(design, perf, val_report.mandatory_failures)

            simulated_results.append((design, perf, val_report, base_score, hourly, comfort_report, multi_obj_vector))

        if not simulated_results:
            raise RuntimeError("No candidate designs survived physical simulation convergence.")

        # Identify Pareto non-dominated designs
        pareto_eval_pairs = [(res, res[6]) for res in simulated_results]
        self.model_h.identify_pareto_frontier(pareto_eval_pairs)

        # ── Step 9: Rank Finalists by Multi-Objective Composite Score ──
        simulated_results.sort(key=lambda x: (x[2].is_fully_compliant, x[6].composite_utility_score), reverse=True)

        # ── Step 10: Build First-Class Alternative Objects ──
        # Archetype lookup mapping
        archetype_map = {des.design_id: spec for des, spec in archetype_candidates}

        alternatives: List[DesignAlternative] = []
        for rank_idx, (design, perf, val, base_score, hourly, comfort_rep, multi_obj) in enumerate(simulated_results):
            ts = ThermalTimeSeries.from_hourly_results(hourly)
            hf = HeatFlowAnalysis.from_hourly_results(hourly, perf.total_solar_gain_kWh.value)
            sa = SolarAnalysis.from_design_and_performance(design, perf)
            geom = design.geometry

            # Determine Archetype and Label
            arch_spec = archetype_map.get(design.design_id)
            arch_id = arch_spec.archetype_id if arch_spec else "OPTIMAL_PASSIVE"
            arch_title = arch_spec.label if arch_spec else design.design_name

            label = "[Recommended]" if rank_idx == 0 else f"Alternative {rank_idx}: {arch_title}"

            # Evidence-based architectural explanation
            explanation = ArchitecturalExplainer.explain_design_decision(
                design=design, performance=perf, comfort=comfort_rep, multi_obj=multi_obj
            )

            alternatives.append(DesignAlternative(
                rank=rank_idx + 1,
                label=label,
                archetype_id=arch_id,
                design_id=design.design_id,
                geometry_summary=f"{geom.floor_area_m2:.0f} m2 ({geom.length_m:.1f}x{geom.width_m:.1f}x{geom.height_m:.1f}m, AR={geom.aspect_ratio})",
                orientation_deg=design.orientation_azimuth_deg,
                wall_material=design.envelope.wall_material_id,
                roof_material=design.envelope.roof_material_id,
                avg_indoor_temp_C=round(perf.avg_indoor_temp_C.value, 1),
                min_indoor_temp_C=round(perf.min_indoor_temp_C.value, 1),
                max_indoor_temp_C=round(perf.max_indoor_temp_C.value, 1),
                solar_gain_kWh=round(perf.total_solar_gain_kWh.value, 1),
                heat_loss_kWh=round(perf.total_conductive_heat_loss_kWh.value, 1),
                score=round(multi_obj.composite_utility_score, 1),
                verdict=base_score.summary_verdict,
                is_compliant=val.is_fully_compliant,
                explanation=explanation,
                design=design,
                performance=perf,
                validation=val,
                time_series=ts,
                heat_flow=hf,
                solar_analysis=sa,
                comfort_report=comfort_rep,
                multi_objective=multi_obj
            ))

        recommended = alternatives[0]

        # ── Step 11: Controlled Material Comparison ──
        material_variants = MaterialComparator.get_material_variants_for_climate(context.climate_zone)
        material_comparison = None
        if material_variants:
            material_comparison = self.comparator.compare(
                recommended.design, material_variants, simulation_hours=self.simulation_hours
            )

        # ── Step 12: Blueprint & 2D Floor Plan Data ──
        blueprint = BlueprintExporter.export_blueprint(
            recommended.design, recommended.performance, recommended.validation
        )
        floor_plan = BlueprintExporter.export_floor_plan(recommended.design)

        # ── Step 13: Recommendation Explanation ──
        rec_explanation = (
            f"  The recommended design was selected because it achieved the highest "
            f"physics-validated multi-objective score ({recommended.score:.1f}/100) across "
            f"thermal comfort, solar efficiency, constructability, and statutory safety.\n"
            f"  Adaptive comfort hours: {recommended.comfort_report.comfort_hours_percent:.0f}%, "
            f"Thermal buffer index: {recommended.comfort_report.thermal_buffer_index:.2f}, "
            f"Temperature lift: +{recommended.performance.temperature_lift_C.value:.1f} C.\n"
            f"  Civil engineering status: {'Fully Compliant with NBC 2016 & IS Standards' if recommended.is_compliant else 'Non-compliant'}."
        )

        return ShelterDesignReport(
            location=request.location,
            occupants=request.occupants,
            purpose=request.purpose,
            thermal_objective=request.thermal_objective,
            recommended=recommended,
            alternatives=alternatives,
            comparison_table=DesignComparisonTable(alternatives=alternatives),
            material_comparison=material_comparison,
            blueprint=blueprint,
            floor_plan=floor_plan,
            total_candidates_generated=total_generated,
            candidates_after_screening=n_after_screening,
            candidates_after_physics=len(simulated_results),
            recommendation_explanation=rec_explanation
        )

    def _rank_by_ml_screening(
        self,
        candidates: List[DesignState],
        predictions: List[Dict[str, Any]],
        thermal_objective: str,
        is_cold: bool
    ) -> List[Tuple[DesignState, float]]:
        """
        Rank candidates using Model D predictions according to user's thermal objective.
        Returns list of (DesignState, ml_score) sorted best-first.
        """
        scored = []
        for design, pred in zip(candidates, predictions):
            temp = pred["predicted_avg_indoor_temp_C"]
            solar = pred.get("predicted_total_solar_kWh", 0.0)
            loss = pred.get("predicted_total_loss_kWh", 0.0)

            if thermal_objective == "winter_warmth":
                score = temp * 3.0 + solar * 0.01 - loss * 0.02
            elif thermal_objective == "summer_cooling":
                score = -temp * 3.0 - solar * 0.01
            else:
                comfort_score = -abs(temp - 18.0)
                score = comfort_score * 2.0 + solar * 0.005 - loss * 0.01

            scored.append((design, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored
