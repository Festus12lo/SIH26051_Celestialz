"""
ThermoShelter — LLM Explanation Engine
Provides human-readable rationale based strictly on validated engineering and physics outputs.
Absolutely prevents the LLM from hallucinating physical properties or procurement data.
"""

from dataclasses import dataclass, asdict
from typing import Dict, Any, List, Optional
from ..core.design_state import DesignState
from ..core.performance_vector import PerformanceVector
from ..validation.engineering_validator import ValidationReport
from ..models.model_g_comfort import ComfortReport
from ..models.model_h_optimizer import MultiObjectiveVector

@dataclass
class ExplanationReport:
    summary: str
    material_rationale: str
    geometry_rationale: str
    orientation_rationale: str
    thermal_rationale: str
    cost_rationale: str
    safety_warnings: List[str]
    traceability_hash: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

class LLMExplanationEngine:
    """
    Consumes structured verified outputs and generates an explanation report.
    In a live environment, this would format a strict prompt to an LLM.
    Here we implement a deterministic rule-based template generator to guarantee zero hallucination.
    """
    
    def __init__(self, use_mock_llm: bool = True):
        self.use_mock_llm = use_mock_llm

    def generate_explanation(
        self,
        design: DesignState,
        performance: PerformanceVector,
        validation: ValidationReport,
        comfort: ComfortReport,
        mcda: MultiObjectiveVector,
        estimated_cost: Optional[Dict[str, Any]] = None
    ) -> ExplanationReport:
        """
        Generates explanation completely derived from the provided verified structs.
        """
        
        # 1. Material Rationale
        mat_rationale = (f"The wall assembly uses {design.envelope.wall_material_id} "
                         f"providing a U-value of {performance.wall_u_value_W_m2K.value:.3f} W/m²K. ")
        if mcda.embodied_carbon_score > 80:
            mat_rationale += "This material was selected for its ultra-low embodied carbon and local suitability."
        else:
            mat_rationale += "This is a standard industrial material."

        # 2. Geometry Rationale
        geom_rationale = (f"The geometry features an aspect ratio of {design.geometry.aspect_ratio:.2f} "
                          f"and a roof pitch of {design.geometry.roof_angle_deg}°. ")
        if design.geometry.aspect_ratio < 1.2:
            geom_rationale += "The compact square shape minimizes surface area to reduce heat loss."
        elif design.geometry.aspect_ratio > 1.8:
            geom_rationale += "The elongated shape maximizes south-facing solar exposure."
            
        # 3. Orientation Rationale
        ori_rationale = (f"The building is oriented at an azimuth of {design.orientation_azimuth_deg}° (where 180° is South). "
                         f"This captures {performance.total_solar_gain_kWh.value:.1f} kWh of passive solar heating over the simulation period.")
        
        # 4. Thermal Rationale
        therm_rationale = (f"The physics engine simulated {performance.temperature_lift_C.value:.1f}°C of natural thermal lift. "
                           f"The design maintains comfortable conditions for {comfort.comfort_hours_percent:.1f}% of the time.")
        
        # 5. Cost Rationale
        cost_rationale = "Cost rationale unavailable."
        if estimated_cost:
            total = estimated_cost.get('total_cost', 0)
            curr = estimated_cost.get('currency', 'INR')
            obs = estimated_cost.get('is_observed_price', False)
            cost_rationale = (f"The estimated envelope cost is {total:.2f} {curr}. "
                              f"This is based on {'OBSERVED MARKET PRICES' if obs else 'SYNTHETIC ESTIMATES'}.")
                              
        # 6. Safety Warnings
        warnings = list(validation.warnings)
        if not validation.is_fully_compliant:
            warnings.extend(validation.mandatory_failures)
            
        summary = (f"This shelter candidate achieved a composite utility score of {mcda.composite_utility_score:.1f}/100. "
                   f"It is {'FULLY COMPLIANT' if validation.is_fully_compliant else 'NON-COMPLIANT'} with engineering regulations.")

        return ExplanationReport(
            summary=summary,
            material_rationale=mat_rationale,
            geometry_rationale=geom_rationale,
            orientation_rationale=ori_rationale,
            thermal_rationale=therm_rationale,
            cost_rationale=cost_rationale,
            safety_warnings=warnings,
            traceability_hash=design.design_id
        )
