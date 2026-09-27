"""
ThermoShelter — Model B: Geometry & Bioclimatic Dimensioning Engine
Determines optimal shelter dimensions, aspect ratios, surface-to-volume compactness,
room heights, and snow-shedding roof pitches based on occupancy standards (NBC 2016 / SPHERE),
trained regression predictors, and bioclimatic solar collection geometry.
"""

from dataclasses import dataclass
from typing import Dict, Any, List, Tuple, Optional
import os
import joblib
import math
import numpy as np
from ..core.design_state import GeometryState, ClimateContext, UserRequirements, SiteState, RoomItem
from ..core.purpose_profiles import get_purpose_profile, PurposeProfile


@dataclass
class DimensionalPlan:
    """Bioclimatically optimized dimensional plan."""
    length_m: float
    width_m: float
    height_m: float
    floor_area_m2: float
    aspect_ratio: float
    roof_pitch_deg: float
    roof_type: str
    surface_to_volume_ratio: float
    predicted_optimal_ar: float
    predicted_optimal_pitch: float
    rationale: str


class ModelB_GeometryDesigner:
    """
    Model B: Formulates shelter dimensions and volumetric envelope geometries
    balancing solar aperture, spatial comfort standards, and thermal compactness.
    """
    MODEL_NAME = "ModelB_GeometryDesigner"
    MODEL_VERSION = "2.0.0-bioclimatic-dimensioning"

    def __init__(self, bundle_path: Optional[str] = None):
        self.bundle_path = bundle_path or os.path.join(
            os.path.dirname(__file__), "..", "..", "..", "models", "model_b", "model_b_bundle.joblib"
        )
        self.model_bundle = None
        self.is_trained = False
        self._load_bundle()

    def _load_bundle(self):
        """Attempt to load trained model bundle if present."""
        if os.path.exists(self.bundle_path):
            try:
                self.model_bundle = joblib.load(self.bundle_path)
                self.is_trained = True
            except Exception:
                self.is_trained = False

    @classmethod
    def calculate_space_requirements(cls, occupants: int, intended_use: str = "RESIDENTIAL_SHELTER") -> float:
        """
        Calculates minimum mandated floor area per NBC 2016 and SPHERE Humanitarian Standards:
        - Emergency Shelter: >= 3.5 m² per person (minimum 14.0 m² for small units)
        - Residential Shelter: >= 5.0 m² per person (minimum 18.0 m²)
        - Community/Classroom: >= 2.5 m² per person (minimum 25.0 m²)
        """
        use_upper = intended_use.upper()
        if "EMERGENCY" in use_upper or "DISASTER" in use_upper:
            base_area = max(14.0, occupants * 3.5)
        elif "COMMUNITY" in use_upper or "SCHOOL" in use_upper:
            base_area = max(25.0, occupants * 2.5)
        else:  # Residential
            base_area = max(18.0, occupants * 5.0)

        return round(base_area, 1)

    def predict_optimal_geometry_parameters(self, context: ClimateContext, requirements: UserRequirements) -> Tuple[float, float]:
        """Predict optimal aspect ratio and roof pitch using trained Model B."""
        if not self.is_trained or not self.model_bundle:
            is_cold = "Cold" in context.climate_zone
            return (1.80 if is_cold else 1.20), (30.0 if is_cold else 0.0)

        from ..features.feature_extractor import FeatureExtractor
        feat_dict = {
            "hdd_18C_scaled": context.heating_degree_days_18C / 5000.0,
            "cdd_18C_scaled": context.cooling_degree_days_18C / 4000.0,
            "elevation_scaled": context.elevation_m / 4000.0,
            "design_temp_min_C": context.design_temp_min_C,
            "design_temp_max_C": context.design_temp_max_C,
            "design_solar_peak_scaled": context.design_solar_peak_W_m2 / 1200.0,
            "occupant_count": float(requirements.occupant_count),
            "target_floor_area_m2": float(requirements.target_floor_area_m2),
            "ground_frost_depth_m": 1.20 if "Cold" in context.climate_zone else 0.0,
            "ground_thermal_conductivity_W_mK": 1.8,
            "snow_load_kN_m2": 1.5 if "Cold" in context.climate_zone else 0.0,
            "soil_bearing_capacity_scaled": 0.5,
            "slope_percent_scaled": 0.05
        }
        vec = np.array([[feat_dict[k] for k in FeatureExtractor.CONTEXT_FEATURE_NAMES]], dtype=np.float32)

        scaler = self.model_bundle.get("scaler")
        ar_model = self.model_bundle["models"]["aspect_ratio"]
        pt_model = self.model_bundle["models"]["roof_pitch"]

        vec_scaled = scaler.transform(vec) if scaler else vec

        pred_ar = float(ar_model.predict(vec_scaled)[0])
        pred_pt = float(pt_model.predict(vec_scaled)[0])

        # Clamp to realistic physical boundaries
        clamped_ar = max(1.0, min(2.2, pred_ar))
        clamped_pt = max(0.0, min(45.0, pred_pt))

        return round(clamped_ar, 2), round(clamped_pt, 1)

    def design_geometry(
        self,
        context: ClimateContext,
        site: SiteState,
        requirements: UserRequirements,
        preferred_aspect_ratio: Optional[float] = None
    ) -> DimensionalPlan:
        """
        Generates complete bioclimatically optimized geometry plan combining ML predictions & code standards.
        """
        # 1. Determine Floor Area
        target_area = requirements.target_floor_area_m2
        min_required_area = self.calculate_space_requirements(requirements.occupant_count, requirements.intended_use)
        actual_area = max(min_required_area, target_area)

        # 2. Predict Optimal Parameters via ML
        pred_ar, pred_pt = self.predict_optimal_geometry_parameters(context, requirements)

        # 3. Determine Aspect Ratio (Length / Width)
        aspect = preferred_aspect_ratio or pred_ar

        # 4. Calculate Plan Dimensions
        width_m = round((actual_area / aspect) ** 0.5, 2)
        length_m = round(math.ceil((actual_area / width_m) * 100.0) / 100.0, 2)
        actual_floor_area = round(length_m * width_m, 2)

        # 5. Determine Room Height (2.8m standard residential, 3.2m in hot-dry)
        is_hot = "Hot" in context.climate_zone
        height_m = 3.20 if is_hot else 2.80

        # 6. Determine Roof Pitch (Enforce IS 875 snow clearance >= 25 deg if snow load > 1.0)
        pitch_deg = max(25.0, pred_pt) if site.snow_load_kN_m2 >= 1.0 else pred_pt
        roof_type = "pitched" if pitch_deg > 5.0 else "flat"

        # 7. Calculate Compactness Ratio (S/V)
        perimeter = 2.0 * (length_m + width_m)
        gross_wall = perimeter * height_m
        vol = actual_floor_area * height_m
        sv_ratio = round((gross_wall + actual_floor_area * 2) / vol, 3)

        rationale = (
            f"Bioclimatic spatial dimensioning for {requirements.occupant_count} occupants in {context.location_name}: "
            f"{length_m}m x {width_m}m (AR={aspect:.2f}, {actual_floor_area} m²), {pitch_deg}° {roof_type} roof "
            f"engineered for {site.snow_load_kN_m2} kN/m² snow shedding (ML Predicted AR={pred_ar}, Pitch={pred_pt}°)."
        )

        return DimensionalPlan(
            length_m=length_m,
            width_m=width_m,
            height_m=height_m,
            floor_area_m2=actual_floor_area,
            aspect_ratio=round(aspect, 2),
            roof_pitch_deg=pitch_deg,
            roof_type=roof_type,
            surface_to_volume_ratio=sv_ratio,
            predicted_optimal_ar=pred_ar,
            predicted_optimal_pitch=pred_pt,
            rationale=rationale
        )

    def to_geometry_state(self, plan: DimensionalPlan, geometry_id: str = "GEOM-OPTIMAL") -> GeometryState:
        """Construct immutable GeometryState instance."""
        return GeometryState(
            geometry_id=geometry_id,
            geometry_type=f"GEOM-TYPE-RECT-{'PITCHED' if plan.roof_pitch_deg > 0 else 'FLAT'}",
            length_m=plan.length_m,
            width_m=plan.width_m,
            height_m=plan.height_m,
            roof_type=plan.roof_type,
            roof_angle_deg=plan.roof_pitch_deg
        )

    @staticmethod
    def generate_room_program(
        purpose_profile: PurposeProfile,
        occupants: int,
        gross_floor_area_m2: float
    ) -> List[RoomItem]:
        """
        Generate a concrete room program from a PurposeProfile.
        Returns List[RoomItem] with computed areas.
        
        The room program physically differentiates shelter types:
        - EMERGENCY: Single open space + service zone
        - RESIDENTIAL: Sleeping + living + kitchen + storage
        - COMMUNITY: Large hall + service + entry
        - MEDICAL: Treatment + waiting + staff + supply
        """
        circulation_area = gross_floor_area_m2 * purpose_profile.circulation_ratio
        usable_area = gross_floor_area_m2 - circulation_area
        
        room_dicts = purpose_profile.get_room_program(occupants, usable_area)
        
        rooms: List[RoomItem] = []
        for rd in room_dicts:
            rooms.append(RoomItem(
                room_id=rd['room_id'],
                room_type=rd['room_type'],
                name=rd['name'],
                area_m2=rd['area_m2'],
                requires_window=rd['requires_window'],
                requires_door=rd['requires_door'],
                ventilation=rd['ventilation'],
                privacy=rd['privacy'],
            ))
        
        return rooms

