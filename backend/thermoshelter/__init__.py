"""
ThermoShelter — Intelligent Passive Shelter Design & Thermal Physics System

AI recommends. Physics proves. Civil engineering validates.
"""

from .core.design_state import (
    DesignState, ClimateContext, SiteState, UserRequirements, GeometryState, EnvelopeAssemblies, OpeningItem, RoomItem
)
from .core.performance_vector import PerformanceVector, MetricValue
from .core.scoring import DesignScorer, DesignScore
from .core.user_input import ShelterRequest, RequestInterpreter
from .core.nlp_interface import NaturalLanguageInterpreter, ArchitecturalExplainer
from .core.purpose_profiles import PurposeProfile, get_purpose_profile, PURPOSE_REGISTRY
from .features.context_builder import ContextBuilder
from .features.feature_extractor import FeatureExtractor
from .simulation.physics_bridge import PhysicsBridge
from .validation.engineering_validator import EngineeringValidator, ValidationReport
from .engine.recursive_optimizer import RecursiveDesignOptimizer, OptimizationResult
from .engine.design_generator import DesignGenerator
from .engine.material_comparator import MaterialComparator, MaterialComparisonResult
from .engine.orchestrator import ShelterDesignOrchestrator
from .pipeline.training_generator import TrainingDataGenerator, SupervisedTrainingTuple
from .export.blueprint import BlueprintExporter
from .export.report import (
    ShelterDesignReport, DesignAlternative, DesignComparisonTable,
    ThermalTimeSeries, HeatFlowAnalysis, SolarAnalysis
)
from .models.predictors import (
    AssemblyRecommenderModel, GeometryRecommenderModel,
    OrientationRecommenderModel, FastPerformanceSurrogateModel
)
from .models.model_a_envelope import ModelA_EnvelopeSelector, AssemblySpec
from .models.model_b_geometry import ModelB_GeometryDesigner, DimensionalPlan
from .models.model_c_passive_solar import ModelC_PassiveSolarDesigner, PassiveSolarStrategy
from .models.model_e_synthesizer import ModelE_ArchitecturalSynthesizer
from .models.model_f_alternatives import ModelF_AlternativeGenerator, AlternativeArchetypeSpec
from .models.model_g_comfort import ModelG_ThermalComfortPredictor, ComfortReport
from .models.model_h_optimizer import ModelH_MultiObjectiveOptimizer, MultiObjectiveVector
from .procurement.procurement_adapter import ProcurementAdapter, ProcurementRecord, EstimatedCost
from .procurement.material_service import MaterialIntelligenceService
from .llm.explanation_engine import LLMExplanationEngine, ExplanationReport

__all__ = [
    # Core data structures
    "DesignState", "ClimateContext", "SiteState", "UserRequirements", "GeometryState",
    "EnvelopeAssemblies", "OpeningItem", "RoomItem",
    "PerformanceVector", "MetricValue",
    "DesignScorer", "DesignScore",
    # Purpose profiles
    "PurposeProfile", "get_purpose_profile", "PURPOSE_REGISTRY",
    # User input & NLP
    "ShelterRequest", "RequestInterpreter",
    "NaturalLanguageInterpreter", "ArchitecturalExplainer",
    # Context & features
    "ContextBuilder", "FeatureExtractor",
    # Simulation & validation
    "PhysicsBridge",
    "EngineeringValidator", "ValidationReport",
    # Intelligent Models (A through H)
    "ModelA_EnvelopeSelector", "AssemblySpec",
    "ModelB_GeometryDesigner", "DimensionalPlan",
    "ModelC_PassiveSolarDesigner", "PassiveSolarStrategy",
    "FastPerformanceSurrogateModel",
    "ModelE_ArchitecturalSynthesizer",
    "ModelF_AlternativeGenerator", "AlternativeArchetypeSpec",
    "ModelG_ThermalComfortPredictor", "ComfortReport",
    "ModelH_MultiObjectiveOptimizer", "MultiObjectiveVector",
    # Legacy Predictor interfaces
    "AssemblyRecommenderModel", "GeometryRecommenderModel", "OrientationRecommenderModel",
    # Engine & Optimization
    "RecursiveDesignOptimizer", "OptimizationResult",
    "DesignGenerator",
    "MaterialComparator", "MaterialComparisonResult",
    "ShelterDesignOrchestrator",
    # Pipeline
    "TrainingDataGenerator", "SupervisedTrainingTuple",
    # Export & reporting
    "BlueprintExporter",
    "ShelterDesignReport", "DesignAlternative", "DesignComparisonTable",
    "ThermalTimeSeries", "HeatFlowAnalysis", "SolarAnalysis",
]
