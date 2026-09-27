"""
ThermoShelter — Model H: Multi-Objective Design Optimizer & Pareto Ranker
Performs multi-criteria decision analysis (MCDA) and Pareto frontier ranking balancing:
1. Thermal Comfort & Buffer Stability
2. Passive Solar Energy Efficiency
3. Constructability & Economic Cost Index
4. Embodied Carbon & Local Vernacular Material Utilization
5. Civil Engineering Safety Margin
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from ..core.design_state import DesignState
from ..core.performance_vector import PerformanceVector
from ..validation.engineering_validator import ValidationReport
from .model_g_comfort import ComfortReport
from ..procurement.procurement_adapter import ProcurementAdapter


@dataclass
class MultiObjectiveVector:
    """Detailed 5-dimensional evaluation score breakdown."""
    comfort_score: float              # 0 to 100
    solar_efficiency_score: float     # 0 to 100
    economic_cost_score: float        # 0 to 100 (100 = lowest cost / most affordable)
    embodied_carbon_score: float      # 0 to 100 (100 = lowest carbon / highest local material)
    safety_compliance_score: float    # 0 to 100 (100 = highest safety margin)
    composite_utility_score: float    # Weighted total 0 to 100
    is_pareto_optimal: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "comfort_score": round(self.comfort_score, 1),
            "solar_efficiency_score": round(self.solar_efficiency_score, 1),
            "economic_cost_score": round(self.economic_cost_score, 1),
            "embodied_carbon_score": round(self.embodied_carbon_score, 1),
            "safety_compliance_score": round(self.safety_compliance_score, 1),
            "composite_utility_score": round(self.composite_utility_score, 1),
            "is_pareto_optimal": self.is_pareto_optimal,
        }


class ModelH_MultiObjectiveOptimizer:
    """
    Model H: Evaluates trade-offs across thermal comfort, energy, economics,
    sustainability, and code compliance.
    """
    MODEL_NAME = "ModelH_MultiObjectiveOptimizer"
    MODEL_VERSION = "2.0.0-pareto-mcda"
    
    def __init__(self):
        self.procurement = ProcurementAdapter()

    # Default Multi-Objective Preference Weights (Sum = 1.0)
    DEFAULT_WEIGHTS = {
        "winter_warmth": {
            "comfort": 0.35, "solar": 0.25, "cost": 0.15, "carbon": 0.15, "safety": 0.10
        },
        "summer_cooling": {
            "comfort": 0.35, "solar": 0.15, "cost": 0.20, "carbon": 0.15, "safety": 0.15
        },
        "balanced": {
            "comfort": 0.30, "solar": 0.20, "cost": 0.20, "carbon": 0.15, "safety": 0.15
        },
        "low_cost": {
            "comfort": 0.20, "solar": 0.15, "cost": 0.40, "carbon": 0.15, "safety": 0.10
        },
        "sustainable": {
            "comfort": 0.25, "solar": 0.20, "cost": 0.10, "carbon": 0.35, "safety": 0.10
        }
    }

    def evaluate_multi_objective(
        self,
        design: DesignState,
        performance: PerformanceVector,
        validation: ValidationReport,
        comfort: ComfortReport,
        objective_mode: str = "winter_warmth"
    ) -> MultiObjectiveVector:
        """
        Calculates normalized 5-dimensional objective vector and composite utility score.
        """
        # Hard failure penalty
        if not validation.is_fully_compliant:
            return MultiObjectiveVector(
                comfort_score=0.0, solar_efficiency_score=0.0, economic_cost_score=0.0,
                embodied_carbon_score=0.0, safety_compliance_score=0.0,
                composite_utility_score=0.0, is_pareto_optimal=False
            )

        # 1. Thermal Comfort Score (0 to 100)
        # Based on average indoor temp lift, comfort hours %, and thermal buffer index
        temp_lift = performance.temperature_lift_C.value
        lift_score = min(100.0, max(0.0, (temp_lift / 15.0) * 100.0))
        tbi_score = comfort.thermal_buffer_index * 100.0
        freeze_penalty = min(50.0, comfort.hours_below_0C * 2.5)
        s_comfort = max(0.0, min(100.0, 0.5 * lift_score + 0.5 * tbi_score - freeze_penalty))

        # 2. Passive Solar Energy Score (0 to 100)
        # Solar gain normalized by floor area (kWh/m²)
        solar_per_m2 = performance.total_solar_gain_kWh.value / max(1.0, design.geometry.floor_area_m2)
        s_solar = min(100.0, max(0.0, (solar_per_m2 / 18.0) * 100.0))

        # 3. Economic Cost Score (0 to 100)
        # Driven by true market pricing or synthetic fallback via ProcurementAdapter
        wall_mat = design.envelope.wall_material_id
        roof_mat = design.envelope.roof_material_id
        
        # We calculate the core envelope cost
        est_cost = self.procurement.estimate_envelope_cost(
            wall_material_id=wall_mat,
            wall_area_m2=design.geometry.gross_wall_area_m2,
            wall_thickness_m=design.envelope.wall_thickness_mm / 1000.0,
            roof_material_id=roof_mat,
            roof_area_m2=design.geometry.roof_area_m2,
            roof_thickness_m=design.envelope.roof_thickness_mm / 1000.0
        )
        
        # Base normalization: assume 50,000 INR is "perfect" (score 100), 500,000 INR is "terrible" (score 0)
        # (Very simplified heuristic mapping)
        target_cost = 50000.0
        max_cost = 500000.0
        
        if est_cost.total_cost <= target_cost:
            cost_score = 100.0
        elif est_cost.total_cost >= max_cost:
            cost_score = 10.0
        else:
            cost_score = 100.0 - ((est_cost.total_cost - target_cost) / (max_cost - target_cost)) * 90.0

        # Bonus for modular aspect ratio (constructability)
        if design.geometry.aspect_ratio in (1.2, 1.5, 2.0):
            cost_score += 10.0
        s_cost = min(100.0, max(0.0, cost_score))

        # 4. Embodied Carbon & Local Material Score (0 to 100)
        if "RAMMED" in wall_mat or "STRAW" in wall_mat or "THATCH" in design.envelope.roof_material_id:
            s_carbon = 95.0  # Ultra-low carbon biogenic/earthen
        elif "CSEB" in wall_mat:
            s_carbon = 85.0  # Low carbon compressed earth
        elif "STONE" in wall_mat or "TIMBER" in wall_mat:
            s_carbon = 75.0  # Natural local stone/timber
        else:
            s_carbon = 50.0  # Standard concrete/brick

        # 5. Civil Safety & Compliance Margin Score (0 to 100)
        # Based on how far inside the statutory limits the design operates
        wall_u = performance.wall_u_value_W_m2K.value
        u_margin = max(0.0, (0.45 - wall_u) / 0.45) * 100.0  # Margin below 0.45 W/m²K limit
        s_safety = min(100.0, 70.0 + u_margin * 0.3)

        # Composite Weighted Score
        weights = self.DEFAULT_WEIGHTS.get(objective_mode, self.DEFAULT_WEIGHTS["winter_warmth"])
        composite = (
            weights["comfort"] * s_comfort +
            weights["solar"] * s_solar +
            weights["cost"] * s_cost +
            weights["carbon"] * s_carbon +
            weights["safety"] * s_safety
        )

        return MultiObjectiveVector(
            comfort_score=s_comfort,
            solar_efficiency_score=s_solar,
            economic_cost_score=s_cost,
            embodied_carbon_score=s_carbon,
            safety_compliance_score=s_safety,
            composite_utility_score=composite,
            is_pareto_optimal=False
        )

    def identify_pareto_frontier(self, candidates_scores: List[Tuple[Any, MultiObjectiveVector]]) -> List[Tuple[Any, MultiObjectiveVector]]:
        """
        Identify Pareto non-dominated designs across (Comfort, Cost, Carbon, Solar).
        A design is Pareto-optimal if no other design is strictly better in all dimensions.
        """
        pareto_list = []
        n = len(candidates_scores)
        for i in range(n):
            item_i, score_i = candidates_scores[i]
            v_i = np.array([score_i.comfort_score, score_i.economic_cost_score, score_i.embodied_carbon_score, score_i.solar_efficiency_score])
            is_dominated = False
            for j in range(n):
                if i == j:
                    continue
                _, score_j = candidates_scores[j]
                v_j = np.array([score_j.comfort_score, score_j.economic_cost_score, score_j.embodied_carbon_score, score_j.solar_efficiency_score])
                # j dominates i if j is >= i in all and > i in at least one
                if np.all(v_j >= v_i) and np.any(v_j > v_i):
                    is_dominated = True
                    break
            
            score_i.is_pareto_optimal = not is_dominated
            pareto_list.append((item_i, score_i))

        return pareto_list
