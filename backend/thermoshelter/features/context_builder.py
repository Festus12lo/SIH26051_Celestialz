"""
ThermoShelter — Context Builder Module
Constructs complete ClimateContext, SiteState, and initial baseline DesignState from canonical datasets.
"""

import os
import pandas as pd
from typing import Dict, Any, Optional
from ..core.design_state import (
    DesignState, ClimateContext, SiteState, UserRequirements, GeometryState, OpeningItem, EnvelopeAssemblies
)

CANONICAL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "canonical"))


class ContextBuilder:
    """
    Constructs rich climate and site contexts by querying canonical datasets.
    """

    # Presumptive soil and geotechnical properties per IS 1904 Table 1 & NBC 2016
    GEOTECHNICAL_PRESETS = {
        "LOC-IN-LEH": {
            "soil_classification": "GM-GP",
            "soil_type": "Gravelly sandy loam / Permafrost risk",
            "moisture_condition": "SEASONAL_FROZEN",
            "density_kg_m3": 1850.0,
            "thermal_conductivity_W_mK": 1.80,
            "ground_temperature_C": 4.5,
            "ground_frost_depth_m": 1.20,
            "allowable_bearing_capacity_kPa": 150.0,
            "groundwater_depth_m": 3.5,
            "drainage_condition": "WELL_DRAINED",
            "frost_risk": "HIGH",
            "slope_percent": 5.0,
            "snow_load_kN_m2": 1.5,
            "seismic_zone": "Zone IV / V"
        },
        "LOC-IN-SHIMLA": {
            "soil_classification": "Rock/Shale",
            "soil_type": "Rocky fractured shale / moist mountain soil",
            "moisture_condition": "MOIST",
            "density_kg_m3": 2100.0,
            "thermal_conductivity_W_mK": 1.50,
            "ground_temperature_C": 12.0,
            "ground_frost_depth_m": 0.40,
            "allowable_bearing_capacity_kPa": 250.0,
            "groundwater_depth_m": 5.0,
            "drainage_condition": "WELL_DRAINED",
            "frost_risk": "MODERATE",
            "slope_percent": 25.0,
            "snow_load_kN_m2": 2.5,
            "seismic_zone": "Zone IV / V"
        },
        "LOC-IN-JAIPUR": {
            "soil_classification": "SP-SM",
            "soil_type": "Dry sandy soil",
            "moisture_condition": "DRY",
            "density_kg_m3": 1650.0,
            "thermal_conductivity_W_mK": 1.20,
            "ground_temperature_C": 24.0,
            "ground_frost_depth_m": 0.0,
            "allowable_bearing_capacity_kPa": 180.0,
            "groundwater_depth_m": 8.0,
            "drainage_condition": "WELL_DRAINED",
            "frost_risk": "NONE",
            "slope_percent": 1.0,
            "snow_load_kN_m2": 0.0,
            "seismic_zone": "Zone II"
        },
        "LOC-IN-KARUR": {
            "soil_classification": "CL-ML",
            "soil_type": "Clay loam / moist topsoil",
            "moisture_condition": "MOIST",
            "density_kg_m3": 1750.0,
            "thermal_conductivity_W_mK": 1.40,
            "ground_temperature_C": 28.0,
            "ground_frost_depth_m": 0.0,
            "allowable_bearing_capacity_kPa": 120.0,
            "groundwater_depth_m": 1.8,
            "drainage_condition": "MODERATE",
            "frost_risk": "NONE",
            "slope_percent": 1.0,
            "snow_load_kN_m2": 0.0,
            "seismic_zone": "Zone II"
        }
    }

    def __init__(self, canonical_dir: str = CANONICAL_DIR):
        self.canonical_dir = canonical_dir
        self.locations_df = pd.read_csv(os.path.join(canonical_dir, "locations", "locations.csv"))
        self.weather_df = pd.read_csv(os.path.join(canonical_dir, "weather", "weather_datasets.csv"))
        self.site_df = pd.read_csv(os.path.join(canonical_dir, "site", "site_conditions.csv"))
        self.requirements_df = pd.read_csv(os.path.join(canonical_dir, "requirements", "shelter_requirements.csv"))

    def build_context(self, location_name_or_id: str) -> ClimateContext:
        """
        Look up location, weather, and site conditions from canonical tables.
        """
        loc_row = self.locations_df[
            (self.locations_df["location_id"].str.upper() == location_name_or_id.upper()) |
            (self.locations_df["name"].str.upper() == location_name_or_id.upper())
        ]
        if loc_row.empty:
            raise ValueError(f"Location '{location_name_or_id}' not found in canonical locations database.")
        
        loc = loc_row.iloc[0]
        loc_id = loc["location_id"]
        
        w_row = self.weather_df[self.weather_df["location_id"] == loc_id]
        weather_id = w_row.iloc[0]["weather_dataset_id"] if not w_row.empty else "WEA-UNKNOWN"
        
        site_row = self.site_df[self.site_df["location_id"] == loc_id]
        site_id = site_row.iloc[0]["site_condition_id"] if not site_row.empty else "SITE-UNKNOWN"

        temp_extremes = {
            "LOC-IN-LEH": (-17.2, 27.9, 1105.0),
            "LOC-IN-SHIMLA": (-7.3, 28.0, 988.0),
            "LOC-IN-JAIPUR": (5.6, 43.7, 946.0),
            "LOC-IN-KARUR": (18.3, 41.1, 1007.0)
        }
        t_min, t_max, sol_peak = temp_extremes.get(loc_id, (0.0, 35.0, 900.0))

        return ClimateContext(
            location_id=loc_id,
            location_name=loc["name"],
            climate_zone=loc["climate_zone"],
            latitude_deg=float(loc["latitude"]),
            longitude_deg=float(loc["longitude"]),
            elevation_m=float(loc["elevation_m"]),
            heating_degree_days_18C=float(loc["heating_degree_days_18C"]),
            cooling_degree_days_18C=float(loc["cooling_degree_days_18C"]),
            design_temp_min_C=t_min,
            design_temp_max_C=t_max,
            design_solar_peak_W_m2=sol_peak,
            weather_dataset_id=weather_id,
            site_condition_id=site_id
        )

    def build_site(self, location_name_or_id: str) -> SiteState:
        """
        Construct structured SiteState containing geotechnical and ground properties.
        """
        loc_row = self.locations_df[
            (self.locations_df["location_id"].str.upper() == location_name_or_id.upper()) |
            (self.locations_df["name"].str.upper() == location_name_or_id.upper())
        ]
        if loc_row.empty:
            raise ValueError(f"Location '{location_name_or_id}' not found in canonical database.")
        
        loc_id = loc_row.iloc[0]["location_id"]
        site_row = self.site_df[self.site_df["location_id"] == loc_id]
        
        if site_row.empty:
            raise ValueError(f"Site condition for '{loc_id}' not found.")
            
        sr = site_row.iloc[0]
        presets = self.GEOTECHNICAL_PRESETS.get(loc_id, self.GEOTECHNICAL_PRESETS["LOC-IN-LEH"])

        return SiteState(
            site_condition_id=sr["site_condition_id"],
            location_id=loc_id,
            terrain_type=sr["terrain_type"],
            soil_classification=presets["soil_classification"],
            soil_type=presets["soil_type"],
            moisture_condition=presets["moisture_condition"],
            density_kg_m3=presets["density_kg_m3"],
            thermal_conductivity_W_mK=float(sr["ground_thermal_conductivity_W_mK"]),
            ground_temperature_C=presets["ground_temperature_C"],
            ground_frost_depth_m=float(sr["ground_frost_depth_m"]),
            allowable_bearing_capacity_kPa=presets["allowable_bearing_capacity_kPa"],
            groundwater_depth_m=presets["groundwater_depth_m"],
            drainage_condition=presets["drainage_condition"],
            frost_risk=presets["frost_risk"],
            slope_percent=presets["slope_percent"],
            snow_load_kN_m2=float(sr["snow_load_kN_m2"]),
            seismic_zone=sr["seismic_zone"],
            source_id=sr["source_id"]
        )

    def create_initial_design(
        self,
        location_name_or_id: str,
        requirements: Optional[UserRequirements] = None
    ) -> DesignState:
        """
        Create a valid, reproducible initial candidate DesignState with climate and site context.
        """
        context = self.build_context(location_name_or_id)
        site = self.build_site(location_name_or_id)
        req = requirements or UserRequirements()
        is_cold = "Cold" in context.climate_zone

        # 1. Initialize Baseline Geometry
        target_area = req.target_floor_area_m2
        aspect = 1.5 if is_cold else 1.2
        width = round((target_area / aspect) ** 0.5, 2)
        length = round(target_area / width, 2)
        height = 2.80
        pitch = 30.0 if is_cold else 0.0
        roof_type = "pitched" if pitch > 0 else "flat"

        geom = GeometryState(
            geometry_id="GEOM-INIT-001",
            geometry_type="GEOM-TYP-RECT-COMPACT",
            length_m=length,
            width_m=width,
            height_m=height,
            roof_type=roof_type,
            roof_angle_deg=pitch
        )

        # 2. Baseline Assemblies
        if is_cold:
            env = EnvelopeAssemblies(
                wall_assembly_id="ASM-WALL-LADAKH-TRAD",
                wall_material_id="MAT-ADOBE",
                wall_thickness_mm=465.0,
                wall_u_value_W_m2K=1.591,
                roof_assembly_id="ASM-ROOF-LADAKH-TRAD",
                roof_material_id="MAT-THATCH",
                roof_thickness_mm=300.0,
                roof_u_value_W_m2K=0.247,
                floor_assembly_id="ASM-FLOOR-LADAKH-INS-SLAB",
                floor_material_id="MAT-CONCRETE",
                floor_thickness_mm=180.0,
                floor_u_value_W_m2K=0.444
            )
        else:
            env = EnvelopeAssemblies(
                wall_assembly_id="ASM-WALL-WARM-COMP",
                wall_material_id="MAT-BRICK",
                wall_thickness_mm=292.5,
                wall_u_value_W_m2K=1.302,
                roof_assembly_id="ASM-ROOF-WARM-SLAB",
                roof_material_id="MAT-CONCRETE",
                roof_thickness_mm=162.5,
                roof_u_value_W_m2K=3.476,
                floor_assembly_id="ASM-FLOOR-WARM-TILED",
                floor_material_id="MAT-BRICK",
                floor_thickness_mm=130.0,
                floor_u_value_W_m2K=3.469
            )

        # 3. Initial Baseline Openings
        openings = [
            OpeningItem(
                opening_id="OPN-INIT-WIN-SOUTH",
                opening_type="WINDOW",
                orientation="South",
                width_m=2.0,
                height_m=1.5,
                area_m2=3.0,
                u_value_W_m2K=2.80 if is_cold else 5.80,
                shgc=0.65,
                glazing_type="double" if is_cold else "single",
                weather_stripped=True
            ),
            OpeningItem(
                opening_id="OPN-INIT-DOOR-EAST",
                opening_type="DOOR",
                orientation="East",
                width_m=1.0,
                height_m=2.0,
                area_m2=2.0,
                u_value_W_m2K=1.80,
                shgc=0.0,
                glazing_type="solid_wood",
                weather_stripped=True
            )
        ]

        design_id = f"DS-INIT-{context.location_id.split('-')[-1]}"

        return DesignState(
            design_id=design_id,
            design_name=f"Baseline Shelter for {context.location_name}",
            context=context,
            site=site,
            requirements=req,
            geometry=geom,
            envelope=env,
            openings=openings,
            orientation_azimuth_deg=180.0,
            shading_strategy_id="SHD-LADAKH-SOUTH-OVERHANG" if is_cold else "SHD-JAIPUR-LOUVER",
            passive_strategies=["PAS-STRAT-DIRECT-GAIN"] if is_cold else ["PAS-STRAT-CROSS-VENT"],
            iteration_step=0,
            modification_rationale="INITIAL_BASELINE_GENERATION"
        )
