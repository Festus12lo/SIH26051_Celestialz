"""
ThermoShelter — ML Predictor Interfaces & Baseline Heuristics Module
Contains standardized predictive model interfaces and rule-based baseline heuristics
for Envelope Assemblies, Geometry, Orientation, and Fast Performance Surrogates.

STATUS NOTE:
The models in this module currently operate as rule-based heuristic baselines
and analytical physical placeholders. They define the standard prediction interface
(fit, predict, predict_proba) ready to receive statistical ML weights (e.g. RandomForest,
XGBoost) once the batch simulation training pipeline is executed.
Performance will be evaluated after training using an isolated validation/test dataset.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from ..core.design_state import DesignState
from ..features.feature_extractor import FeatureExtractor


@dataclass
class PredictionOutput:
    """Standard container for prediction outputs with uncertainty and metadata."""
    model_name: str
    model_version: str
    prediction_type: str              # 'ASSEMBLY_RECOMMENDATION', 'GEOMETRY_OPTIMIZATION', 'ORIENTATION_SELECTION', 'PERFORMANCE_SURROGATE'
    recommended_parameters: Dict[str, Any]
    confidence_score: float           # 0.0 to 1.0
    rationale: str
    alternatives: List[Dict[str, Any]] = field(default_factory=list)


class AssemblyRecommenderModel:
    """
    Model A: Material and Envelope Assembly Recommender.
    Current implementation: Expert rule-based heuristic baseline.
    Ready for statistical multi-class classifier replacement.
    """
    MODEL_VERSION = "1.0.0-heuristic-baseline"

    WALL_CATALOG = {
        "Cold-Arid (High Altitude Alpine)": [
            {
                "assembly_id": "ASM-WALL-LADAKH-INS-MOD",
                "material_id": "MAT-CSEB",
                "thickness_mm": 392.5,
                "u_value": 0.314,
                "description": "230mm CSEB + 100mm Rockwool + 50mm Air Cavity (U=0.314 W/m²K)",
                "confidence": 0.95
            },
            {
                "assembly_id": "ASM-WALL-LADAKH-IMP-TRAD",
                "material_id": "MAT-RAMMED",
                "thickness_mm": 400.0,
                "u_value": 0.417,
                "description": "300mm Rammed Earth + 80mm Rockwool + Mud Render (U=0.417 W/m²K)",
                "confidence": 0.90
            },
            {
                "assembly_id": "ASM-WALL-LADAKH-LIGHT-INS",
                "material_id": "MAT-TIMBER-FRAME",
                "thickness_mm": 213.0,
                "u_value": 0.257,
                "description": "Lightweight timber stud + 100mm XPS + steel cladding (U=0.257 W/m²K)",
                "confidence": 0.85
            }
        ],
        "Cold-Humid (Montane Himalayan)": [
            {
                "assembly_id": "ASM-WALL-SHIMLA-COLD",
                "material_id": "MAT-STONE",
                "thickness_mm": 432.5,
                "u_value": 0.282,
                "description": "250mm Granite + 120mm Rockwool + Cavity (U=0.282 W/m²K)",
                "confidence": 0.92
            }
        ],
        "Warm": [
            {
                "assembly_id": "ASM-WALL-WARM-COMP",
                "material_id": "MAT-BRICK",
                "thickness_mm": 292.5,
                "u_value": 1.302,
                "description": "Double clay brick with 50mm air cavity buffer (U=1.302 W/m²K)",
                "confidence": 0.88
            }
        ]
    }

    ROOF_CATALOG = {
        "Cold-Arid (High Altitude Alpine)": [
            {
                "assembly_id": "ASM-ROOF-LADAKH-INS-MOD",
                "material_id": "MAT-XPS",
                "thickness_mm": 153.0,
                "u_value": 0.250,
                "description": "120mm XPS + Steel sheet + Timber deck (U=0.250 W/m²K, R=4.00)",
                "confidence": 0.96
            },
            {
                "assembly_id": "ASM-ROOF-LADAKH-TRAD",
                "material_id": "MAT-THATCH",
                "thickness_mm": 300.0,
                "u_value": 0.247,
                "description": "150mm Compacted Thatch + 50mm Mud seal (U=0.247 W/m²K, R=4.05)",
                "confidence": 0.92
            }
        ],
        "Warm": [
            {
                "assembly_id": "ASM-ROOF-WARM-SLAB",
                "material_id": "MAT-CONCRETE",
                "thickness_mm": 162.5,
                "u_value": 3.476,
                "description": "150mm Concrete Roof Slab",
                "confidence": 0.85
            }
        ]
    }

    FLOOR_CATALOG = {
        "Cold-Arid (High Altitude Alpine)": [
            {
                "assembly_id": "ASM-FLOOR-LADAKH-INS-SLAB",
                "material_id": "MAT-CONCRETE",
                "thickness_mm": 180.0,
                "u_value": 0.444,
                "description": "60mm Sub-Slab XPS Frost Barrier + 100mm Concrete Slab (U=0.444 W/m²K)",
                "confidence": 0.95
            }
        ],
        "Warm": [
            {
                "assembly_id": "ASM-FLOOR-WARM-TILED",
                "material_id": "MAT-BRICK",
                "thickness_mm": 130.0,
                "u_value": 3.469,
                "description": "Tiled Ground Heat Dissipating Slab",
                "confidence": 0.88
            }
        ]
    }

    def fit(self, X: np.ndarray, y: List[str]) -> "AssemblyRecommenderModel":
        """Placeholder interface for statistical model training on batch simulation datasets."""
        return self

    def recommend(self, design: DesignState) -> PredictionOutput:
        """Recommend envelope assembly upgrade based on context features."""
        climate = design.context.climate_zone
        is_cold = "Cold" in climate
        key_wall = "Cold-Arid (High Altitude Alpine)" if ("Alpine" in climate or "Arid" in climate) else ("Cold-Humid (Montane Himalayan)" if "Humid" in climate else "Warm")
        
        candidates_wall = self.WALL_CATALOG.get(key_wall, self.WALL_CATALOG["Warm"])
        candidates_roof = self.ROOF_CATALOG["Cold-Arid (High Altitude Alpine)"] if is_cold else self.ROOF_CATALOG["Warm"]
        candidates_floor = self.FLOOR_CATALOG["Cold-Arid (High Altitude Alpine)"] if is_cold else self.FLOOR_CATALOG["Warm"]

        top_wall = candidates_wall[0]
        top_roof = candidates_roof[0]
        top_floor = candidates_floor[0]

        rationale = f"Heuristic baseline selection for {climate}: U_wall={top_wall['u_value']} W/m²K, U_roof={top_roof['u_value']} W/m²K."

        return PredictionOutput(
            model_name="AssemblyRecommenderModel",
            model_version=self.MODEL_VERSION,
            prediction_type="ASSEMBLY_RECOMMENDATION",
            recommended_parameters={
                "wall_assembly_id": top_wall["assembly_id"],
                "wall_material_id": top_wall["material_id"],
                "wall_thickness_mm": top_wall["thickness_mm"],
                "wall_u_value_W_m2K": top_wall["u_value"],
                "roof_assembly_id": top_roof["assembly_id"],
                "roof_material_id": top_roof["material_id"],
                "roof_thickness_mm": top_roof["thickness_mm"],
                "roof_u_value_W_m2K": top_roof["u_value"],
                "floor_assembly_id": top_floor["assembly_id"],
                "floor_material_id": top_floor["material_id"],
                "floor_thickness_mm": top_floor["thickness_mm"],
                "floor_u_value_W_m2K": top_floor["u_value"]
            },
            confidence_score=min(top_wall["confidence"], top_roof["confidence"]),
            rationale=rationale,
            alternatives=candidates_wall[1:]
        )


class GeometryRecommenderModel:
    """
    Model B: Geometry Parameter Optimizer.
    Current implementation: Analytical geometric formula baseline.
    """
    MODEL_VERSION = "1.0.0-geometry-formula-baseline"

    def fit(self, X: np.ndarray, y: np.ndarray) -> "GeometryRecommenderModel":
        """Placeholder interface for regression model training."""
        return self

    def recommend(self, design: DesignState) -> PredictionOutput:
        """Optimize geometry for solar collection and compact heat retention."""
        target_area = design.requirements.target_floor_area_m2
        is_cold = "Cold" in design.context.climate_zone

        target_aspect = 1.50 if is_cold else 1.20
        target_pitch = 30.0 if is_cold else 0.0

        opt_width = round((target_area / target_aspect) ** 0.5, 2)
        opt_length = round(target_area / opt_width, 2)
        opt_height = 2.80

        rationale = f"Analytical geometric formula: aspect ratio {target_aspect:.2f} (L={opt_length}m, W={opt_width}m) with {target_pitch}° pitch."

        return PredictionOutput(
            model_name="GeometryRecommenderModel",
            model_version=self.MODEL_VERSION,
            prediction_type="GEOMETRY_OPTIMIZATION",
            recommended_parameters={
                "length_m": opt_length,
                "width_m": opt_width,
                "height_m": opt_height,
                "roof_angle_deg": target_pitch,
                "roof_type": "pitched" if target_pitch > 0 else "flat"
            },
            confidence_score=0.94,
            rationale=rationale
        )


class OrientationRecommenderModel:
    """
    Model C: Orientation & Azimuth Recommender.
    Current implementation: Solar building code heuristic baseline.
    """
    MODEL_VERSION = "1.0.0-orientation-heuristic-baseline"

    def fit(self, X: np.ndarray, y: np.ndarray) -> "OrientationRecommenderModel":
        """Placeholder interface for orientation classifier training."""
        return self

    def recommend(self, design: DesignState) -> PredictionOutput:
        is_cold = "Cold" in design.context.climate_zone
        recommended_azimuth = 180.0 if is_cold else 270.0
        rationale = (
            "Statutory heuristic: Primary glazed front facade facing True South (180° azimuth) in cold climates to maximize winter passive solar gain."
            if is_cold else
            "Statutory heuristic: Primary front facade facing 270°/West-shifted to minimize peak equatorial solar overheating in warm/tropical climates."
        )

        return PredictionOutput(
            model_name="OrientationRecommenderModel",
            model_version=self.MODEL_VERSION,
            prediction_type="ORIENTATION_SELECTION",
            recommended_parameters={
                "orientation_azimuth_deg": recommended_azimuth
            },
            confidence_score=0.98,
            rationale=rationale
        )


class FastPerformanceSurrogateModel:
    """
    Model D: Fast Performance Surrogate.
    Primary: Trained Gradient Boosting Regressor loaded from joblib bundle.
    Fallback: Reduced-order analytical approximation formula.

    Predicts 3 targets:
    - avg_indoor_temp_C
    - total_solar_gain_kWh
    - total_conductive_heat_loss_kWh
    """
    MODEL_VERSION = "1.0.0-trained-gbr"
    ANALYTICAL_FALLBACK_VERSION = "1.0.0-analytical-surrogate-baseline"

    def __init__(self, bundle_path: Optional[str] = None):
        self._trained = False
        self._models = {}        # {temp: GBR, solar: GBR, loss: GBR}
        self._scaler = None      # StandardScaler (fit on train) — used only by Ridge, NOT by GBR
        self._feature_names = None

        if bundle_path is None:
            import os
            default_path = os.path.abspath(os.path.join(
                os.path.dirname(__file__), "..", "..", "..", "models", "model_d", "model_d_bundle.joblib"
            ))
            if os.path.exists(default_path):
                bundle_path = default_path

        if bundle_path:
            self._load_bundle(bundle_path)

    def _load_bundle(self, path: str) -> None:
        """Load trained model bundle from disk."""
        try:
            import joblib
            bundle = joblib.load(path)
            self._models = bundle["models"]    # {temp: GBR, solar: GBR, loss: GBR}
            self._scaler = bundle["scaler"]    # StandardScaler
            self._feature_names = bundle["feature_names"]
            self._trained = True
        except Exception as e:
            print(f"Warning: Could not load Model D bundle from {path}: {e}")
            self._trained = False

    @property
    def is_trained(self) -> bool:
        return self._trained

    def fit(self, X: np.ndarray, y: np.ndarray) -> "FastPerformanceSurrogateModel":
        """Placeholder interface for training surrogate regression models."""
        return self

    def predict_performance(self, design: DesignState) -> Dict[str, Any]:
        """Fast prediction of key performance metrics for a single design."""
        if self._trained:
            return self._predict_trained(design)
        return self._predict_analytical(design)

    def predict_batch(self, designs: List[DesignState]) -> List[Dict[str, Any]]:
        """Efficient batch prediction for candidate screening."""
        if not designs:
            return []
        if self._trained:
            return self._predict_batch_trained(designs)
        return [self._predict_analytical(d) for d in designs]

    def _predict_trained(self, design: DesignState) -> Dict[str, Any]:
        """Predict using trained GBR models."""
        feat_vec = FeatureExtractor.extract_design_feature_vector(design).reshape(1, -1)
        # GBR uses RAW features (not scaled) as per training script
        pred_temp = float(self._models["temp"].predict(feat_vec)[0])
        pred_solar = float(self._models["solar"].predict(feat_vec)[0])
        pred_loss = float(self._models["loss"].predict(feat_vec)[0])

        return {
            "predicted_avg_indoor_temp_C": round(pred_temp, 2),
            "predicted_total_solar_kWh": round(max(0.0, pred_solar), 2),
            "predicted_total_loss_kWh": round(max(0.0, pred_loss), 2),
            "predicted_temp_lift_C": round(pred_temp - design.context.design_temp_min_C, 2),
            "estimated_freeze_risk": "LOW" if pred_temp > 5.0 else "HIGH",
            "model_type": "TrainedGradientBoostingRegressor",
            "model_version": self.MODEL_VERSION,
            "status": "TRAINED_SURROGATE"
        }

    def _predict_batch_trained(self, designs: List[DesignState]) -> List[Dict[str, Any]]:
        """Batch prediction using trained GBR — vectorized for speed."""
        feature_matrix = np.array([
            FeatureExtractor.extract_design_feature_vector(d) for d in designs
        ])
        # GBR uses RAW features
        preds_temp = self._models["temp"].predict(feature_matrix)
        preds_solar = self._models["solar"].predict(feature_matrix)
        preds_loss = self._models["loss"].predict(feature_matrix)

        results = []
        for i, d in enumerate(designs):
            t = float(preds_temp[i])
            s = float(preds_solar[i])
            l = float(preds_loss[i])
            results.append({
                "predicted_avg_indoor_temp_C": round(t, 2),
                "predicted_total_solar_kWh": round(max(0.0, s), 2),
                "predicted_total_loss_kWh": round(max(0.0, l), 2),
                "predicted_temp_lift_C": round(t - d.context.design_temp_min_C, 2),
                "estimated_freeze_risk": "LOW" if t > 5.0 else "HIGH",
                "model_type": "TrainedGradientBoostingRegressor",
                "model_version": self.MODEL_VERSION,
                "status": "TRAINED_SURROGATE"
            })
        return results

    def _predict_analytical(self, design: DesignState) -> Dict[str, Any]:
        """Fallback analytical approximation when trained model is unavailable."""
        feat = FeatureExtractor.extract_design_features(design)

        avg_u = (feat["wall_u_value_W_m2K"] + feat["roof_u_value_W_m2K"]) / 2.0
        sol_peak = feat["design_solar_peak_scaled"] * 1200.0
        t_out = feat["design_temp_min_C"]

        approx_lift = (sol_peak * 0.15) / (avg_u * 2.5 + feat["ventilation_ach"] * 0.3)
        predicted_avg_in = t_out + approx_lift

        return {
            "predicted_avg_indoor_temp_C": round(predicted_avg_in, 2),
            "predicted_total_solar_kWh": 0.0,
            "predicted_total_loss_kWh": 0.0,
            "predicted_temp_lift_C": round(approx_lift, 2),
            "estimated_freeze_risk": "LOW" if predicted_avg_in > 5.0 else "HIGH",
            "model_type": "AnalyticalPhysicsSurrogateBaseline",
            "model_version": self.ANALYTICAL_FALLBACK_VERSION,
            "status": "ANALYTICAL_FALLBACK",
            "evaluation_note": "Trained model unavailable; using analytical approximation."
        }
