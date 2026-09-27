"""
ThermoShelter — Feature Extractor Module
Extracts normalized tabular feature representations partitioned by prediction task:
1. Context/Recommender Features (Leakage-free, for Models A, B, C, Foundation)
2. Full Design Features (For Surrogate Model D)
"""

from typing import Dict, Any, List
import numpy as np
from ..core.design_state import DesignState


class FeatureExtractor:
    """
    Transforms structured DesignState into normalized numeric feature vectors
    with strict target-leakage isolation and integrated environmental site/soil context.
    """

    # 1. Context / Recommender Feature Set (Zero Target Leakage)
    # Available BEFORE design decisions (assembly/orientation/openings) are made.
    # MUST NOT contain candidate assembly U-values or thicknesses.
    CONTEXT_FEATURE_NAMES = [
        "hdd_18C_scaled",
        "cdd_18C_scaled",
        "elevation_scaled",
        "design_temp_min_C",
        "design_temp_max_C",
        "design_solar_peak_scaled",
        "occupant_count",
        "target_floor_area_m2",
        "ground_frost_depth_m",
        "ground_thermal_conductivity_W_mK",
        "snow_load_kN_m2",
        "soil_bearing_capacity_scaled",
        "slope_percent_scaled"
    ]

    # 2. Full Design Feature Set (For Performance Surrogate Model D)
    # Describes an already-selected candidate design.
    DESIGN_FEATURE_NAMES = [
        "hdd_18C_scaled",
        "cdd_18C_scaled",
        "elevation_scaled",
        "design_temp_min_C",
        "design_temp_max_C",
        "design_solar_peak_scaled",
        "occupant_count",
        "floor_area_m2",
        "length_m",
        "width_m",
        "height_m",
        "aspect_ratio",
        "surface_to_volume_ratio",
        "roof_angle_deg",
        "orientation_azimuth_deg",
        "total_opening_area_m2",
        "north_wwr",
        "south_wwr",
        "wall_thickness_mm",
        "wall_u_value_W_m2K",
        "roof_thickness_mm",
        "roof_u_value_W_m2K",
        "floor_thickness_mm",
        "floor_u_value_W_m2K",
        "ventilation_ach",
        "ground_frost_depth_m",
        "ground_thermal_conductivity_W_mK",
        "snow_load_kN_m2"
    ]

    # Backward compatibility alias
    FEATURE_NAMES = DESIGN_FEATURE_NAMES

    VENTILATION_ACH_MAP = {
        "sealed": 0.1,
        "low": 0.5,
        "medium": 1.0,
        "high": 2.0
    }

    @classmethod
    def extract_context_features(cls, design: DesignState) -> Dict[str, float]:
        """
        Extract leakage-free context features for recommender models (A, B, C, Foundation).
        Does NOT contain candidate assembly U-values.
        """
        ctx = design.context
        req = design.requirements
        site = design.site

        frost_depth = site.ground_frost_depth_m if site else 0.0
        ground_k = site.thermal_conductivity_W_mK if site else 1.5
        snow_load = site.snow_load_kN_m2 if site else 0.0
        bearing_cap = (site.allowable_bearing_capacity_kPa / 300.0) if site else 0.5
        slope = (site.slope_percent / 30.0) if site else 0.0

        return {
            "hdd_18C_scaled": ctx.heating_degree_days_18C / 5000.0,
            "cdd_18C_scaled": ctx.cooling_degree_days_18C / 4000.0,
            "elevation_scaled": ctx.elevation_m / 4000.0,
            "design_temp_min_C": ctx.design_temp_min_C,
            "design_temp_max_C": ctx.design_temp_max_C,
            "design_solar_peak_scaled": ctx.design_solar_peak_W_m2 / 1200.0,
            "occupant_count": float(req.occupant_count),
            "target_floor_area_m2": float(req.target_floor_area_m2),
            "ground_frost_depth_m": frost_depth,
            "ground_thermal_conductivity_W_mK": ground_k,
            "snow_load_kN_m2": snow_load,
            "soil_bearing_capacity_scaled": bearing_cap,
            "slope_percent_scaled": slope
        }

    @classmethod
    def extract_context_feature_vector(cls, design: DesignState) -> np.ndarray:
        """
        Extract numeric numpy vector for context features in fixed order.
        """
        feats = cls.extract_context_features(design)
        return np.array([feats[fn] for fn in cls.CONTEXT_FEATURE_NAMES], dtype=np.float32)

    @classmethod
    def extract_design_features(cls, design: DesignState) -> Dict[str, float]:
        """
        Extract full design features for surrogate performance modeling (Model D).
        Includes envelope U-values, fenestration, and site thermal context.
        """
        ctx = design.context
        geom = design.geometry
        env = design.envelope
        req = design.requirements
        site = design.site

        ach = cls.VENTILATION_ACH_MAP.get(req.ventilation_level, 0.5)
        frost_depth = site.ground_frost_depth_m if site else 0.0
        ground_k = site.thermal_conductivity_W_mK if site else 1.5
        snow_load = site.snow_load_kN_m2 if site else 0.0

        return {
            "hdd_18C_scaled": ctx.heating_degree_days_18C / 5000.0,
            "cdd_18C_scaled": ctx.cooling_degree_days_18C / 4000.0,
            "elevation_scaled": ctx.elevation_m / 4000.0,
            "design_temp_min_C": ctx.design_temp_min_C,
            "design_temp_max_C": ctx.design_temp_max_C,
            "design_solar_peak_scaled": ctx.design_solar_peak_W_m2 / 1200.0,
            "occupant_count": float(req.occupant_count),
            "floor_area_m2": geom.floor_area_m2,
            "length_m": geom.length_m,
            "width_m": geom.width_m,
            "height_m": geom.height_m,
            "aspect_ratio": geom.aspect_ratio,
            "surface_to_volume_ratio": geom.surface_to_volume_ratio,
            "roof_angle_deg": geom.roof_angle_deg,
            "orientation_azimuth_deg": design.orientation_azimuth_deg,
            "total_opening_area_m2": design.total_opening_area_m2,
            "north_wwr": design.north_wwr,
            "south_wwr": design.south_wwr,
            "wall_thickness_mm": env.wall_thickness_mm,
            "wall_u_value_W_m2K": env.wall_u_value_W_m2K,
            "roof_thickness_mm": env.roof_thickness_mm,
            "roof_u_value_W_m2K": env.roof_u_value_W_m2K,
            "floor_thickness_mm": env.floor_thickness_mm,
            "floor_u_value_W_m2K": env.floor_u_value_W_m2K,
            "ventilation_ach": ach,
            "ground_frost_depth_m": frost_depth,
            "ground_thermal_conductivity_W_mK": ground_k,
            "snow_load_kN_m2": snow_load
        }

    @classmethod
    def extract_design_feature_vector(cls, design: DesignState) -> np.ndarray:
        """
        Extract numeric numpy vector for full design features in fixed order.
        """
        feats = cls.extract_design_features(design)
        return np.array([feats[fn] for fn in cls.DESIGN_FEATURE_NAMES], dtype=np.float32)

    # Legacy/convenience methods
    @classmethod
    def extract_features(cls, design: DesignState) -> Dict[str, float]:
        return cls.extract_design_features(design)

    @classmethod
    def extract_feature_vector(cls, design: DesignState) -> np.ndarray:
        return cls.extract_design_feature_vector(design)
