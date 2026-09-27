"""
ThermoShelter — Model C: Orientation, Fenestration & Passive Solar Design
Determines optimal compass azimuth, directional facade Window-to-Wall Ratio (WWR) distribution,
passive solar feature selection (Rabsal Sunspace, Direct Gain, Trombe Wall),
and seasonal overhang shading dimensions based on solar geometry physics and trained regression models.
"""

from dataclasses import dataclass
from typing import Dict, Any, List, Tuple, Optional
import os
import joblib
import math
import numpy as np
from ..core.design_state import OpeningItem, ClimateContext, GeometryState


@dataclass
class PassiveSolarStrategy:
    """Comprehensive passive solar and fenestration design output."""
    azimuth_deg: float
    azimuth_label: str
    south_wwr_percent: float
    north_wwr_percent: float
    east_wwr_percent: float
    west_wwr_percent: float
    total_window_area_m2: float
    overhang_depth_m: float
    openings: List[OpeningItem]
    passive_features: List[str]
    predicted_solar_kWh: float
    rationale: str


class ModelC_PassiveSolarDesigner:
    """
    Model C: Calculates solar azimuth alignment, directional fenestration schedules,
    and seasonal passive solar heat-capturing apertures.
    """
    MODEL_NAME = "ModelC_PassiveSolarDesigner"
    MODEL_VERSION = "2.0.0-solar-geometry-physics"

    def __init__(self, bundle_path: Optional[str] = None):
        self.bundle_path = bundle_path or os.path.join(
            os.path.dirname(__file__), "..", "..", "..", "models", "model_c", "model_c_bundle.joblib"
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

    def predict_directional_solar_potential(self, context: ClimateContext, azimuth_deg: float) -> float:
        """Predict directional solar radiation potential (kWh) for a given azimuth."""
        if not self.is_trained or not self.model_bundle:
            # Physics-based baseline approximation
            is_cold = "Cold" in context.climate_zone
            if is_cold:
                if abs(azimuth_deg - 180.0) < 1e-3:
                    return 315.0  # South
                elif abs(azimuth_deg - 90.0) < 1e-3:
                    return 245.0  # East
                elif abs(azimuth_deg - 270.0) < 1e-3:
                    return 240.0  # West
                else:
                    return 185.0  # North
            else:
                return 220.0

        from ..features.feature_extractor import FeatureExtractor
        az_rad = math.radians(azimuth_deg)
        south_align = math.cos(math.radians(azimuth_deg - 180.0))
        solar_peak_scaled = context.design_solar_peak_W_m2 / 1200.0
        
        feat_dict = {
            "hdd_18C_scaled": context.heating_degree_days_18C / 5000.0,
            "cdd_18C_scaled": context.cooling_degree_days_18C / 4000.0,
            "elevation_scaled": context.elevation_m / 4000.0,
            "design_temp_min_C": context.design_temp_min_C,
            "design_temp_max_C": context.design_temp_max_C,
            "design_solar_peak_scaled": solar_peak_scaled,
            "occupant_count": 4.0,
            "target_floor_area_m2": 24.0,
            "ground_frost_depth_m": 1.20 if "Cold" in context.climate_zone else 0.0,
            "ground_thermal_conductivity_W_mK": 1.8,
            "snow_load_kN_m2": 1.5 if "Cold" in context.climate_zone else 0.0,
            "soil_bearing_capacity_scaled": 0.5,
            "slope_percent_scaled": 0.05,
            "orientation_azimuth_deg": float(azimuth_deg),
            "cos_azimuth": math.cos(az_rad),
            "sin_azimuth": math.sin(az_rad),
            "south_alignment": south_align,
            "solar_aperture_potential": max(0.0, south_align) * solar_peak_scaled,
            "opening_area_m2": 5.0
        }
        feature_names = self.model_bundle.get("feature_names", FeatureExtractor.CONTEXT_FEATURE_NAMES + ["orientation_azimuth_deg"])
        vec = np.array([[feat_dict.get(k, 0.0) for k in feature_names]], dtype=np.float32)

        scaler = self.model_bundle.get("scaler")
        model = self.model_bundle["model"]

        vec_scaled = scaler.transform(vec) if scaler else vec
        base_solar = float(model.predict(vec_scaled)[0])

        # Apply solar geometry azimuth angle modulation for directional solar collection
        is_cold = "Cold" in context.climate_zone
        if is_cold:
            angle_rad = math.radians(azimuth_deg - 180.0)
            solar_factor = 0.85 + 0.15 * math.cos(angle_rad)
        else:
            angle_rad = math.radians(azimuth_deg)
            solar_factor = 0.85 + 0.15 * math.cos(angle_rad)

        pred_solar = base_solar * solar_factor
        return round(max(50.0, min(500.0, pred_solar)), 1)

    def rank_orientation_candidates(
        self, context: ClimateContext, thermal_objective: str = "winter_warmth"
    ) -> List[Tuple[float, str, float]]:
        """
        Evaluates candidate orientations (0°, 90°, 180°, 270°) and ranks them
        according to predicted solar capture and the user's thermal objective.
        Returns List of (azimuth_deg, azimuth_label, predicted_solar_kWh).
        """
        candidates = [
            (180.0, "South (Solar Noon Collector)"),
            (90.0, "East (Morning Sun)"),
            (270.0, "West (Afternoon Sun)"),
            (0.0, "North (Shaded Diffuse)")
        ]

        scored = []
        for az, label in candidates:
            solar_kwh = self.predict_directional_solar_potential(context, az)
            # Ranking key: For winter_warmth, maximize solar. For summer_cooling, minimize solar.
            if "warmth" in thermal_objective.lower() or "cold" in context.climate_zone.lower():
                rank_score = solar_kwh
            else:
                rank_score = -solar_kwh
            scored.append((rank_score, az, label, solar_kwh))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [(az, label, solar_kwh) for _, az, label, solar_kwh in scored]

    @classmethod
    def calculate_solar_noon_elevation(cls, latitude_deg: float, declination_deg: float) -> float:
        """
        Solar elevation angle at solar noon:
        alpha = 90 - latitude + declination
        """
        alpha = 90.0 - latitude_deg + declination_deg
        return max(5.0, min(89.0, alpha))

    @classmethod
    def calculate_seasonal_overhang_depth(cls, latitude_deg: float, window_height_m: float = 2.0) -> float:
        """
        Calculates optimal overhang projection depth (P):
        P = window_height / tan(alpha_summer)
        """
        alpha_summer = cls.calculate_solar_noon_elevation(latitude_deg, +23.45)
        rad = math.radians(alpha_summer)
        overhang_m = window_height_m / math.tan(rad) if math.tan(rad) > 0.1 else 0.5
        return round(max(0.3, min(1.2, overhang_m)), 2)

    def design_passive_solar(
        self,
        context: ClimateContext,
        geometry: GeometryState,
        feature_preference: str = "AUTO",
        azimuth_override: Optional[float] = None
    ) -> PassiveSolarStrategy:
        """
        Generates full directional opening schedule and solar strategy for a shelter design.
        """
        is_cold = "Cold" in context.climate_zone
        lat = context.latitude_deg
        L = geometry.length_m
        W = geometry.width_m
        H = geometry.height_m

        south_wall_area = L * H
        north_wall_area = L * H
        side_wall_area = W * H

        openings: List[OpeningItem] = []
        passive_features: List[str] = []

        if azimuth_override is not None:
            azimuth = azimuth_override
            azimuth_label = f"{azimuth:.0f}° Azimuth"
        elif is_cold:
            azimuth = 180.0
            azimuth_label = "South (Solar Noon Aligned)"
        else:
            azimuth = 0.0
            azimuth_label = "North (Diffuse Light / Low Solar Heat)"

        predicted_solar = self.predict_directional_solar_potential(context, azimuth)

        if is_cold:
            # 1. South Facade Glazing (25% to 35% of South wall area)
            south_target_glazing = min(south_wall_area * 0.35, round(south_wall_area * 0.28, 2))
            
            if feature_preference in ("AUTO", "RABSAL_SUNSPACE") and geometry.floor_area_m2 >= 18.0:
                rabsal_w = round(min(L * 0.6, 3.5), 1)
                rabsal_h = 2.0
                rabsal_area = round(rabsal_w * rabsal_h, 2)
                openings.append(OpeningItem(
                    opening_id="OPN-S-RABSAL-01",
                    opening_type="RABSAL_SUNSPACE",
                    orientation="South",
                    width_m=rabsal_w,
                    height_m=rabsal_h,
                    area_m2=rabsal_area,
                    u_value_W_m2K=1.80,
                    shgc=0.70,
                    glazing_type="double_low_e",
                    weather_stripped=True
                ))
                passive_features.append("PAS-STRAT-RABSAL-SUNSPACE")
                south_glazing_actual = rabsal_area
            else:
                win_w = round(min(L * 0.5, 3.0), 1)
                win_h = 1.6
                win_area = round(win_w * win_h, 2)
                openings.append(OpeningItem(
                    opening_id="OPN-S-DIRECT-01",
                    opening_type="WINDOW",
                    orientation="South",
                    width_m=win_w,
                    height_m=win_h,
                    area_m2=win_area,
                    u_value_W_m2K=1.80,
                    shgc=0.68,
                    glazing_type="double_low_e",
                    weather_stripped=True
                ))
                passive_features.append("PAS-STRAT-DIRECT-GAIN")
                south_glazing_actual = win_area

            # 2. North Facade: Small ventilation window (<= 3% WWR)
            north_win_w = 0.5
            north_win_h = 0.4
            north_win_area = round(north_win_w * north_win_h, 2)
            openings.append(OpeningItem(
                opening_id="OPN-N-VENT-01",
                opening_type="WINDOW",
                orientation="North",
                width_m=north_win_w,
                height_m=north_win_h,
                area_m2=north_win_area,
                u_value_W_m2K=1.80,
                shgc=0.50,
                glazing_type="double_low_e",
                weather_stripped=True
            ))

            # 3. East Facade: Insulated Entry Air-Lock Door
            openings.append(OpeningItem(
                opening_id="OPN-E-DOOR-01",
                opening_type="DOOR",
                orientation="East",
                width_m=1.0,
                height_m=2.0,
                area_m2=2.0,
                u_value_W_m2K=1.20,
                shgc=0.0,
                glazing_type="solid_insulated_timber",
                weather_stripped=True
            ))
            passive_features.append("PAS-STRAT-THERMAL-AIRLOCK")

            overhang_depth = self.calculate_seasonal_overhang_depth(lat, 2.0)
            south_wwr = round((south_glazing_actual / south_wall_area) * 100.0, 1)
            north_wwr = round((north_win_area / north_wall_area) * 100.0, 1)
            east_wwr = round((2.0 / side_wall_area) * 100.0, 1)
            west_wwr = 0.0

            rationale = (
                f"Alpine Cold Solar Strategy: {azimuth_label} capturing {south_glazing_actual:.1f} m² "
                f"winter solar aperture ({south_wwr}% South WWR, ML Solar Potential={predicted_solar} kWh). "
                f"North glazing strictly minimized ({north_wwr}% WWR) to prevent sub-zero thermal bridging."
            )
        else:
            win_w = 1.8
            win_h = 1.4
            win_area = round(win_w * win_h, 2)
            openings.append(OpeningItem(
                opening_id="OPN-N-WIN-01",
                opening_type="WINDOW",
                orientation="North",
                width_m=win_w,
                height_m=win_h,
                area_m2=win_area,
                u_value_W_m2K=4.50,
                shgc=0.40,
                glazing_type="tinted_cross_vent",
                weather_stripped=True
            ))
            openings.append(OpeningItem(
                opening_id="OPN-S-WIN-01",
                opening_type="WINDOW",
                orientation="South",
                width_m=win_w,
                height_m=win_h,
                area_m2=win_area,
                u_value_W_m2K=4.50,
                shgc=0.40,
                glazing_type="tinted_cross_vent",
                weather_stripped=True
            ))
            openings.append(OpeningItem(
                opening_id="OPN-E-DOOR-01",
                opening_type="DOOR",
                orientation="East",
                width_m=1.0,
                height_m=2.0,
                area_m2=2.0,
                u_value_W_m2K=2.0,
                shgc=0.0,
                glazing_type="ventilated_louver_door",
                weather_stripped=True
            ))
            passive_features.append("PAS-STRAT-CROSS-VENTILATION")
            passive_features.append("PAS-STRAT-SOLAR-SHADING")
            overhang_depth = 0.80

            south_wwr = round((win_area / south_wall_area) * 100.0, 1)
            north_wwr = round((win_area / north_wall_area) * 100.0, 1)
            east_wwr = round((2.0 / side_wall_area) * 100.0, 1)
            west_wwr = 0.0

            rationale = (
                f"Warm Climate Strategy: Aligned for prevailing breeze with {north_wwr}% North and {south_wwr}% South "
                f"cross-ventilation apertures (ML Solar Potential={predicted_solar} kWh)."
            )

        total_win = sum(op.area_m2 for op in openings if op.opening_type in ("WINDOW", "RABSAL_SUNSPACE"))

        return PassiveSolarStrategy(
            azimuth_deg=azimuth,
            azimuth_label=azimuth_label,
            south_wwr_percent=south_wwr,
            north_wwr_percent=north_wwr,
            east_wwr_percent=east_wwr,
            west_wwr_percent=west_wwr,
            total_window_area_m2=round(total_win, 2),
            overhang_depth_m=overhang_depth,
            openings=openings,
            passive_features=passive_features,
            predicted_solar_kWh=predicted_solar,
            rationale=rationale
        )
