"""
ThermoShelter — Training Data Generation & Leakage Prevention Pipeline
Generates structured supervised ML training tuples from physics-validated design runs
and enforces strict group-based train/val/test splitting to prevent data leakage.
"""

from dataclasses import dataclass, asdict
from typing import Dict, Any, List, Optional, Tuple
import json
import uuid
import numpy as np

from ..core.design_state import DesignState
from ..core.performance_vector import PerformanceVector
from ..core.scoring import DesignScore
from ..validation.engineering_validator import ValidationReport
from ..features.feature_extractor import FeatureExtractor


@dataclass
class SupervisedTrainingTuple:
    """Standardized high-dimensional training pair for ML models."""
    example_id: str
    provenance_type: str              # 'PHYSICS_SIMULATION', 'REAL_OBSERVATION', 'EXPERT_LABELED', 'SYNTHETIC'
    generation_method: str            # 'RECURSIVE_OPTIMIZER_CONVERGED', 'BENCHMARK_SIMULATION'
    confidence_score: float
    split_group_id: str               # Group ID (e.g. location/site) to prevent data leakage
    
    # 1. Partitioned Input Feature Spaces
    context_features: Dict[str, float]       # For Recommender Models (A, B, C) - Leakage free
    design_features: Dict[str, float]        # For Surrogate Model (D)
    input_features: Dict[str, float]         # Alias to design_features for backward compatibility
    
    # 2. Recommended Target Outputs
    recommended_outputs: Dict[str, Any]
    
    # 3. Ground Truth Performance Metrics (Sourced from Physics Simulation)
    ground_truth_performance: Dict[str, float]
    
    # 4. Validation Status
    validation_status: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class TrainingDataGenerator:
    """
    Generates high-quality training pairs from validated simulation runs.
    Enforces quality filtering and quarantine policies before admission to training datasets.
    """

    @classmethod
    def generate_training_example(
        cls,
        design: DesignState,
        performance: PerformanceVector,
        score: DesignScore,
        validation: ValidationReport,
        provenance_type: str = "PHYSICS_SIMULATION"
    ) -> Optional[SupervisedTrainingTuple]:
        """
        Create a supervised training record.
        Only admits designs that pass hard engineering constraints.
        """
        # Quality Gate: Reject invalid designs from becoming positive training examples
        if not score.hard_constraints_passed:
            return None

        ctx_feats = FeatureExtractor.extract_context_features(design)
        des_feats = FeatureExtractor.extract_design_features(design)

        targets = {
            "selected_geometry_type": design.geometry.geometry_type,
            "recommended_length_m": design.geometry.length_m,
            "recommended_width_m": design.geometry.width_m,
            "recommended_height_m": design.geometry.height_m,
            "recommended_roof_angle_deg": design.geometry.roof_angle_deg,
            "recommended_aspect_ratio": design.geometry.aspect_ratio,
            "recommended_orientation_deg": design.orientation_azimuth_deg,
            "recommended_wall_assembly_id": design.envelope.wall_assembly_id,
            "recommended_roof_assembly_id": design.envelope.roof_assembly_id,
            "recommended_floor_assembly_id": design.envelope.floor_assembly_id,
            "recommended_wall_u_value": design.envelope.wall_u_value_W_m2K,
            "recommended_passive_strategies": design.passive_strategies
        }

        # Sourced directly from physical simulation results (Ground Truth)
        perf_summary = {
            "avg_indoor_temp_C": performance.avg_indoor_temp_C.value,
            "min_indoor_temp_C": performance.min_indoor_temp_C.value,
            "max_indoor_temp_C": performance.max_indoor_temp_C.value,
            "temperature_lift_C": performance.temperature_lift_C.value,
            "diurnal_swing_C": performance.diurnal_temperature_swing_C.value,
            "hours_below_5C": performance.hours_below_5C.value,
            "time_constant_hours": performance.thermal_time_constant_hours.value,
            "total_score": score.total_score
        }

        val_summary = {
            "is_fully_compliant": validation.is_fully_compliant,
            "mandatory_failures_count": len(validation.mandatory_failures),
            "warnings_count": len(validation.warnings),
            "engine": "ThermoShelter Reduced-Order Engine v1.1.0"
        }

        # Use location ID as split group to ensure zero geographic leakage across folds
        split_group = design.context.location_id

        return SupervisedTrainingTuple(
            example_id=f"TRAIN-GEN-{uuid.uuid4().hex[:8].upper()}",
            provenance_type=provenance_type,
            generation_method="RECURSIVE_OPTIMIZER_CONVERGED",
            confidence_score=round(score.total_score / 100.0, 3),
            split_group_id=split_group,
            context_features=ctx_feats,
            design_features=des_feats,
            input_features=des_feats,
            recommended_outputs=targets,
            ground_truth_performance=perf_summary,
            validation_status=val_summary
        )

    @classmethod
    def split_dataset(
        cls,
        examples: List[SupervisedTrainingTuple],
        test_group_ids: List[str],
        val_group_ids: Optional[List[str]] = None
    ) -> Tuple[List[SupervisedTrainingTuple], List[SupervisedTrainingTuple], List[SupervisedTrainingTuple]]:
        """
        Group-based data splitting to prevent cross-variant leakage.
        Ensures all variants from a location/site remain exclusively in one partition.
        """
        val_groups = val_group_ids or []
        train_set = []
        val_set = []
        test_set = []

        for ex in examples:
            if ex.split_group_id in test_group_ids:
                test_set.append(ex)
            elif ex.split_group_id in val_groups:
                val_set.append(ex)
            else:
                train_set.append(ex)

        return train_set, val_set, test_set
