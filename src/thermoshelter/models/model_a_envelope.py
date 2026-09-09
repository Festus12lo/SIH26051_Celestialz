"""
ThermoShelter — Model A: Envelope & Material Assembly Selector
Determines optimal wall, roof, and floor assemblies based on climate context,
minimum thermal resistance requirements (R = ΔT / q_max), frost hazard,
embodied carbon, local availability, and cost tiers.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
import os
import joblib
import numpy as np
from ..core.design_state import DesignState, ClimateContext, EnvelopeAssemblies


@dataclass
class AssemblySpec:
    """Detailed specifications for a building envelope assembly."""
    assembly_id: str
    material_id: str
    component_type: str              # 'WALL', 'ROOF', 'FLOOR'
    thickness_mm: float
    u_value: float                   # W/(m²·K)
    r_value: float                   # (m²·K)/W
    embodied_carbon_kgCO2_m2: float  # kg CO2-eq per m²
    cost_index: float                # 1.0 (lowest cost) to 5.0 (premium)
    constructability_speed: str      # 'RAPID', 'STANDARD', 'SPECIALIZED'
    local_availability: str          # 'LOCAL_PRIMARY', 'REGIONAL', 'IMPORTED'
    description: str
    confidence: float = 0.90


class ModelA_EnvelopeSelector:
    """
    Model A: Intelligently selects envelope assemblies based on thermodynamic insulation
    requirements, climate zones, cost constraints, and sustainability metrics.
    """
    MODEL_NAME = "ModelA_EnvelopeSelector"
    MODEL_VERSION = "2.0.0-bioclimatic-multitier"

    # Comprehensive Envelope Assembly Catalog
    CATALOG: Dict[str, Dict[str, List[AssemblySpec]]] = {
        "Cold-Arid (High Altitude Alpine)": {
            "WALL": [
                AssemblySpec(
                    assembly_id="ASM-WALL-CATALOGUE-EPS",
                    material_id="eps",
                    component_type="WALL",
                    thickness_mm=100.0,
                    u_value=0.2,
                    r_value=5.0,
                    embodied_carbon_kgCO2_m2=15.0,
                    cost_index=1.5,
                    constructability_speed="RAPID",
                    local_availability="IMPORTED",
                    description="EPS Insulated Panels (Expanded Polystyrene)",
                    confidence=0.95
                ),
                AssemblySpec(
                    assembly_id="ASM-WALL-CATALOGUE-AEROGEL",
                    material_id="aerogel",
                    component_type="WALL",
                    thickness_mm=50.0,
                    u_value=0.09,
                    r_value=10.3,
                    embodied_carbon_kgCO2_m2=35.0,
                    cost_index=5.0,
                    constructability_speed="SPECIALIZED",
                    local_availability="IMPORTED",
                    description="Advanced Aerogel Composite",
                    confidence=0.90
                ),
                AssemblySpec(
                    assembly_id="ASM-WALL-LADAKH-INS-MOD",
                    material_id="MAT-CSEB",
                    component_type="WALL",
                    thickness_mm=392.5,
                    u_value=0.314,
                    r_value=3.18,
                    embodied_carbon_kgCO2_m2=22.5,
                    cost_index=2.2,
                    constructability_speed="STANDARD",
                    local_availability="LOCAL_PRIMARY",
                    description="230mm Compressed Stabilized Earth Block + 100mm Mineral Wool + 50mm Air Gap",
                    confidence=0.96
                ),
                AssemblySpec(
                    assembly_id="ASM-WALL-LADAKH-IMP-TRAD",
                    material_id="MAT-RAMMED",
                    component_type="WALL",
                    thickness_mm=400.0,
                    u_value=0.417,
                    r_value=2.40,
                    embodied_carbon_kgCO2_m2=12.0,
                    cost_index=1.8,
                    constructability_speed="STANDARD",
                    local_availability="LOCAL_PRIMARY",
                    description="300mm Monolithic Rammed Earth + 80mm Rockwool Insulation + Mud Render",
                    confidence=0.93
                ),
                AssemblySpec(
                    assembly_id="ASM-WALL-LADAKH-LIGHT-INS",
                    material_id="MAT-TIMBER-FRAME",
                    component_type="WALL",
                    thickness_mm=213.0,
                    u_value=0.257,
                    r_value=3.89,
                    embodied_carbon_kgCO2_m2=18.0,
                    cost_index=2.8,
                    constructability_speed="RAPID",
                    local_availability="REGIONAL",
                    description="Lightweight Timber Stud + 100mm Extruded Polystyrene (XPS) + Metal Cladding",
                    confidence=0.91
                ),
                AssemblySpec(
                    assembly_id="ASM-WALL-LADAKH-SUPER-INS",
                    material_id="MAT-STRAWBALE",
                    component_type="WALL",
                    thickness_mm=480.0,
                    u_value=0.185,
                    r_value=5.41,
                    embodied_carbon_kgCO2_m2=8.5,
                    cost_index=1.5,
                    constructability_speed="STANDARD",
                    local_availability="LOCAL_PRIMARY",
                    description="400mm Strawbale / Agricultural Waste Block + Lime/Mud Plaster (Super-Insulated)",
                    confidence=0.88
                ),
                AssemblySpec(
                    assembly_id="ASM-WALL-LADAKH-MILITARY-SIP",
                    material_id="MAT-SIP-MILITARY",
                    component_type="WALL",
                    thickness_mm=100.0,
                    u_value=0.18,
                    r_value=5.55,
                    embodied_carbon_kgCO2_m2=65.0,
                    cost_index=4.8,
                    constructability_speed="RAPID",
                    local_availability="IMPORTED",
                    description="100mm Structural Insulated Panel (PIR Core + Aluminum Skin) - Military Grade Rapid Deployment",
                    confidence=0.98
                )
            ],
            "ROOF": [
                AssemblySpec(
                    assembly_id="ASM-ROOF-LADAKH-INS-MOD",
                    material_id="MAT-XPS",
                    component_type="ROOF",
                    thickness_mm=153.0,
                    u_value=0.250,
                    r_value=4.00,
                    embodied_carbon_kgCO2_m2=28.0,
                    cost_index=2.5,
                    constructability_speed="RAPID",
                    local_availability="REGIONAL",
                    description="120mm XPS + Weatherproof Corrugated Metal + Timber Decking",
                    confidence=0.96
                ),
                AssemblySpec(
                    assembly_id="ASM-ROOF-LADAKH-TRAD",
                    material_id="MAT-THATCH",
                    component_type="ROOF",
                    thickness_mm=300.0,
                    u_value=0.247,
                    r_value=4.05,
                    embodied_carbon_kgCO2_m2=6.0,
                    cost_index=1.2,
                    constructability_speed="STANDARD",
                    local_availability="LOCAL_PRIMARY",
                    description="200mm Compacted Poplar / Willow Thatch + 80mm Mud/Straw Thermal Cap",
                    confidence=0.94
                ),
                AssemblySpec(
                    assembly_id="ASM-ROOF-LADAKH-AEROGEL",
                    material_id="MAT-AEROGEL-TEXTILE",
                    component_type="ROOF",
                    thickness_mm=20.0,
                    u_value=0.15,
                    r_value=6.66,
                    embodied_carbon_kgCO2_m2=55.0,
                    cost_index=5.0,
                    constructability_speed="RAPID",
                    local_availability="IMPORTED",
                    description="20mm NASA-Grade Aerogel Polymer Textile Membrane (Extreme Cold Expeditionary Tent)",
                    confidence=0.92
                )
            ],
            "FLOOR": [
                AssemblySpec(
                    assembly_id="ASM-FLOOR-LADAKH-INS-SLAB",
                    material_id="MAT-CONCRETE",
                    component_type="FLOOR",
                    thickness_mm=180.0,
                    u_value=0.444,
                    r_value=2.25,
                    embodied_carbon_kgCO2_m2=35.0,
                    cost_index=2.4,
                    constructability_speed="STANDARD",
                    local_availability="REGIONAL",
                    description="60mm Sub-Slab XPS Frost Barrier + 100mm Concrete Slab + Timber Finish",
                    confidence=0.95
                ),
                AssemblySpec(
                    assembly_id="ASM-FLOOR-LADAKH-MILITARY-SIP",
                    material_id="MAT-SIP-MILITARY",
                    component_type="FLOOR",
                    thickness_mm=120.0,
                    u_value=0.22,
                    r_value=4.54,
                    embodied_carbon_kgCO2_m2=45.0,
                    cost_index=4.5,
                    constructability_speed="RAPID",
                    local_availability="IMPORTED",
                    description="120mm Structural Insulated Panel (Aluminum Skin + PIR Foam Core) Interlocking Floor",
                    confidence=0.96
                )
            ]
        },
        "Cold-Humid (Montane Himalayan)": {
            "WALL": [
                AssemblySpec(
                    assembly_id="ASM-WALL-SHIMLA-COLD",
                    material_id="MAT-STONE",
                    component_type="WALL",
                    thickness_mm=432.5,
                    u_value=0.282,
                    r_value=3.55,
                    embodied_carbon_kgCO2_m2=15.0,
                    cost_index=2.1,
                    constructability_speed="STANDARD",
                    local_availability="LOCAL_PRIMARY",
                    description="250mm Dressed Mountain Stone + 120mm Rockwool + 50mm Air Cavity",
                    confidence=0.94
                ),
                AssemblySpec(
                    assembly_id="ASM-WALL-SHIMLA-TIMBER",
                    material_id="MAT-TIMBER-FRAME",
                    component_type="WALL",
                    thickness_mm=220.0,
                    u_value=0.260,
                    r_value=3.85,
                    embodied_carbon_kgCO2_m2=14.0,
                    cost_index=2.6,
                    constructability_speed="RAPID",
                    local_availability="LOCAL_PRIMARY",
                    description="Traditional Dhajji-Dewari Timber Frame + Light Earth/Straw Infill + Weatherboards",
                    confidence=0.91
                )
            ],
            "ROOF": [
                AssemblySpec(
                    assembly_id="ASM-ROOF-SHIMLA-PITCHED",
                    material_id="MAT-XPS",
                    component_type="ROOF",
                    thickness_mm=160.0,
                    u_value=0.240,
                    r_value=4.17,
                    embodied_carbon_kgCO2_m2=26.0,
                    cost_index=2.4,
                    constructability_speed="STANDARD",
                    local_availability="REGIONAL",
                    description="Pitched Slate/Metal Roof + 120mm Mineral Wool + Vapor Barrier",
                    confidence=0.95
                )
            ],
            "FLOOR": [
                AssemblySpec(
                    assembly_id="ASM-FLOOR-SHIMLA-RAISED",
                    material_id="MAT-TIMBER-FRAME",
                    component_type="FLOOR",
                    thickness_mm=170.0,
                    u_value=0.380,
                    r_value=2.63,
                    embodied_carbon_kgCO2_m2=16.0,
                    cost_index=2.0,
                    constructability_speed="RAPID",
                    local_availability="LOCAL_PRIMARY",
                    description="Raised Timber Floor with 80mm Under-Floor Rockwool Moisture Barrier",
                    confidence=0.92
                )
            ]
        },
        "Hot-Dry (Semi-Arid Desert)": {
            "WALL": [
                AssemblySpec(
                    assembly_id="ASM-WALL-JAIPUR-MASS",
                    material_id="MAT-STONE",
                    component_type="WALL",
                    thickness_mm=350.0,
                    u_value=0.750,
                    r_value=1.33,
                    embodied_carbon_kgCO2_m2=18.0,
                    cost_index=1.8,
                    constructability_speed="STANDARD",
                    local_availability="LOCAL_PRIMARY",
                    description="300mm Sandstone High Thermal Mass Wall with Light Exterior Reflective Lime Wash",
                    confidence=0.92
                ),
                AssemblySpec(
                    assembly_id="ASM-WALL-JAIPUR-AAC",
                    material_id="MAT-CSEB",
                    component_type="WALL",
                    thickness_mm=250.0,
                    u_value=0.480,
                    r_value=2.08,
                    embodied_carbon_kgCO2_m2=24.0,
                    cost_index=2.2,
                    constructability_speed="RAPID",
                    local_availability="REGIONAL",
                    description="200mm Autoclaved Aerated Block + White Radiant Barrier Render",
                    confidence=0.90
                ),
                AssemblySpec(
                    assembly_id="ASM-WALL-HOT-PCM-DRYWALL",
                    material_id="MAT-PCM-BOARD",
                    component_type="WALL",
                    thickness_mm=180.0,
                    u_value=0.35,
                    r_value=2.85,
                    embodied_carbon_kgCO2_m2=35.0,
                    cost_index=3.8,
                    constructability_speed="RAPID",
                    local_availability="IMPORTED",
                    description="150mm Light Steel Frame + 30mm Phase Change Material (PCM) Latent Heat Absorbing Drywall",
                    confidence=0.95
                ),
                AssemblySpec(
                    assembly_id="ASM-WALL-HOT-RAMMED-INS",
                    material_id="MAT-RAMMED-INSULATED",
                    component_type="WALL",
                    thickness_mm=400.0,
                    u_value=0.28,
                    r_value=3.57,
                    embodied_carbon_kgCO2_m2=15.0,
                    cost_index=2.8,
                    constructability_speed="SPECIALIZED",
                    local_availability="LOCAL_PRIMARY",
                    description="300mm Rammed Earth Core + 100mm Exterior XPS Insulation (Extreme Thermal Mass Battery)",
                    confidence=0.96
                ),
                AssemblySpec(
                    assembly_id="ASM-WALL-HOT-REV-BRICK",
                    material_id="MAT-REVERSE-BRICK",
                    component_type="WALL",
                    thickness_mm=250.0,
                    u_value=0.45,
                    r_value=2.22,
                    embodied_carbon_kgCO2_m2=26.0,
                    cost_index=2.4,
                    constructability_speed="STANDARD",
                    local_availability="LOCAL_PRIMARY",
                    description="110mm Internal Brick (Thermal Mass) + 90mm EPS Insulation + Lightweight Cladding (Reverse Brick Veneer)",
                    confidence=0.94
                )
            ],
            "ROOF": [
                AssemblySpec(
                    assembly_id="ASM-ROOF-JAIPUR-COOL",
                    material_id="MAT-CONCRETE",
                    component_type="ROOF",
                    thickness_mm=200.0,
                    u_value=0.550,
                    r_value=1.82,
                    embodied_carbon_kgCO2_m2=32.0,
                    cost_index=2.0,
                    constructability_speed="STANDARD",
                    local_availability="LOCAL_PRIMARY",
                    description="150mm Concrete Slab + Inverted 50mm Foam + High-Albedo White Broken China Mosaic (Cool Roof)",
                    confidence=0.95
                ),
                AssemblySpec(
                    assembly_id="ASM-ROOF-HOT-RADIANT-FOIL",
                    material_id="MAT-RADIANT-FOIL",
                    component_type="ROOF",
                    thickness_mm=160.0,
                    u_value=0.30,
                    r_value=3.33,
                    embodied_carbon_kgCO2_m2=18.0,
                    cost_index=2.8,
                    constructability_speed="RAPID",
                    local_availability="REGIONAL",
                    description="100mm SIP Panel + Double-Sided Reflective Radiant Aluminum Foil Barrier under Metal Decking",
                    confidence=0.97
                )
            ],
            "FLOOR": [
                AssemblySpec(
                    assembly_id="ASM-FLOOR-JAIPUR-SLAB",
                    material_id="MAT-CONCRETE",
                    component_type="FLOOR",
                    thickness_mm=150.0,
                    u_value=1.800,
                    r_value=0.56,
                    embodied_carbon_kgCO2_m2=28.0,
                    cost_index=1.5,
                    constructability_speed="STANDARD",
                    local_availability="LOCAL_PRIMARY",
                    description="Uninsulated Ground-Coupled Thermal Sink Slab (Dissipates Daytime Heat into Deep Soil)",
                    confidence=0.94
                )
            ]
        },
        "Warm-Humid (Peninsular Plateau)": {
            "WALL": [
                AssemblySpec(
                    assembly_id="ASM-WALL-WARM-COMP",
                    material_id="MAT-BRICK",
                    component_type="WALL",
                    thickness_mm=292.5,
                    u_value=1.302,
                    r_value=0.77,
                    embodied_carbon_kgCO2_m2=30.0,
                    cost_index=1.6,
                    constructability_speed="STANDARD",
                    local_availability="LOCAL_PRIMARY",
                    description="Double Clay Brick with 50mm Ventilated Air Cavity Buffer",
                    confidence=0.88
                ),
                AssemblySpec(
                    assembly_id="ASM-WALL-WARM-HEMPCRETE",
                    material_id="MAT-HEMPCRETE",
                    component_type="WALL",
                    thickness_mm=300.0,
                    u_value=0.65,
                    r_value=1.53,
                    embodied_carbon_kgCO2_m2=-15.0,
                    cost_index=2.5,
                    constructability_speed="STANDARD",
                    local_availability="REGIONAL",
                    description="300mm Cast Hempcrete (Carbon Negative) - Excellent moisture regulation for humid climates",
                    confidence=0.93
                ),
                AssemblySpec(
                    assembly_id="ASM-WALL-WARM-LGSF",
                    material_id="MAT-LGSF-PORTAL",
                    component_type="WALL",
                    thickness_mm=150.0,
                    u_value=0.45,
                    r_value=2.22,
                    embodied_carbon_kgCO2_m2=40.0,
                    cost_index=3.0,
                    constructability_speed="RAPID",
                    local_availability="IMPORTED",
                    description="Light Gauge Steel Frame with PUF Insulated Panels (Large Span Community)",
                    confidence=0.96
                )
            ],
            "ROOF": [
                AssemblySpec(
                    assembly_id="ASM-ROOF-WARM-VENT",
                    material_id="MAT-CONCRETE",
                    component_type="ROOF",
                    thickness_mm=180.0,
                    u_value=0.850,
                    r_value=1.18,
                    embodied_carbon_kgCO2_m2=30.0,
                    cost_index=1.8,
                    constructability_speed="STANDARD",
                    local_availability="LOCAL_PRIMARY",
                    description="Ventilated Double-Skin Roof with Radiant Foil Barrier",
                    confidence=0.90
                ),
                AssemblySpec(
                    assembly_id="ASM-ROOF-WARM-PTFE",
                    material_id="MAT-PTFE-MEMBRANE",
                    component_type="ROOF",
                    thickness_mm=2.0,
                    u_value=1.5,
                    r_value=0.66,
                    embodied_carbon_kgCO2_m2=22.0,
                    cost_index=3.5,
                    constructability_speed="RAPID",
                    local_availability="IMPORTED",
                    description="Tensioned PTFE Fiberglass Membrane Roof (Large Span Shade for Community Shelters)",
                    confidence=0.95
                )
            ],
            "FLOOR": [
                AssemblySpec(
                    assembly_id="ASM-FLOOR-WARM-TILED",
                    material_id="MAT-BRICK",
                    component_type="FLOOR",
                    thickness_mm=130.0,
                    u_value=3.469,
                    r_value=0.29,
                    embodied_carbon_kgCO2_m2=20.0,
                    cost_index=1.4,
                    constructability_speed="RAPID",
                    local_availability="LOCAL_PRIMARY",
                    description="Tiled Ground Heat Dissipating Slab",
                    confidence=0.88
                )
            ]
        }
    }

    @classmethod
    def calculate_required_thermal_resistance(
        cls,
        design_temp_min_C: float,
        target_indoor_temp_C: float = 12.0,
        max_allowable_heat_flux_W_m2: float = 15.0
    ) -> float:
        """
        Deterministic physics calculation of minimum required envelope R-value:
        R_req = (T_target - T_design,min) / q_max_allowable
        """
        delta_T = max(5.0, target_indoor_temp_C - design_temp_min_C)
        r_req = delta_T / max(5.0, max_allowable_heat_flux_W_m2)
        return round(r_req, 2)

    def __init__(self, bundle_path: Optional[str] = None):
        self.bundle_path = bundle_path or os.path.join(os.path.dirname(__file__), "..", "..", "..", "models", "model_a", "model_a_bundle.joblib")
        self.model_bundle = None
        self.is_trained = False
        self._load_bundle()

    def _load_bundle(self):
        """Attempt to load trained model bundle if present."""
        if os.path.exists(self.bundle_path):
            try:
                self.model_bundle = joblib.load(self.bundle_path)
                self.is_trained = True
            except Exception as e:
                self.is_trained = False

    def predict_envelope_heat_loss(self, context: ClimateContext, wall_u: float, roof_u: float = 0.25, floor_u: float = 0.44) -> float:
        """Predict total conductive heat loss (kWh) for a given envelope configuration."""
        if not self.is_trained or not self.model_bundle:
            is_cold = "Cold" in context.climate_zone
            hdd = context.heating_degree_days_18C if is_cold else 500.0
            return (wall_u * 60.0 + roof_u * 25.0 + floor_u * 24.0) * (hdd / 5000.0) * 1.5

        from ..features.feature_extractor import FeatureExtractor
        feat_dict = {
            "hdd_18C_scaled": context.heating_degree_days_18C / 5000.0,
            "cdd_18C_scaled": context.cooling_degree_days_18C / 4000.0,
            "elevation_scaled": context.elevation_m / 4000.0,
            "design_temp_min_C": context.design_temp_min_C,
            "design_temp_max_C": context.design_temp_max_C,
            "design_solar_peak_scaled": context.design_solar_peak_W_m2 / 1200.0,
            "occupant_count": 4.0,
            "target_floor_area_m2": 24.0,
            "ground_frost_depth_m": 1.20 if "Cold" in context.climate_zone else 0.0,
            "ground_thermal_conductivity_W_mK": 1.8,
            "snow_load_kN_m2": 1.5 if "Cold" in context.climate_zone else 0.0,
            "soil_bearing_capacity_scaled": 0.5,
            "slope_percent_scaled": 0.05,
            "wall_u_value_W_m2K": float(wall_u),
            "roof_u_value_W_m2K": float(roof_u),
            "floor_u_value_W_m2K": float(floor_u)
        }
        feature_names = self.model_bundle.get("feature_names", FeatureExtractor.CONTEXT_FEATURE_NAMES + ["wall_u_value_W_m2K", "roof_u_value_W_m2K", "floor_u_value_W_m2K"])
        vec = np.array([[feat_dict.get(k, 0.0) for k in feature_names]], dtype=np.float32)

        scaler = self.model_bundle.get("scaler")
        model = self.model_bundle["model"]

        vec_scaled = scaler.transform(vec) if scaler else vec
        return float(model.predict(vec_scaled)[0])

    def predict_wall_probabilities(self, context: ClimateContext) -> Dict[str, float]:
        """Predict class probabilities or suitability scores across envelope wall assemblies using trained ML model."""
        if not self.is_trained or not self.model_bundle:
            return {
                "ASM-WALL-LADAKH-INS-MOD": 0.35,
                "ASM-WALL-LADAKH-LIGHT-INS": 0.30,
                "ASM-WALL-SHIMLA-COLD": 0.20,
                "ASM-WALL-LADAKH-IMP-TRAD": 0.15
            }

        # If classification bundle exists
        if "classes" in self.model_bundle:
            from ..features.feature_extractor import FeatureExtractor
            feat_dict = {
                "hdd_18C_scaled": context.heating_degree_days_18C / 5000.0,
                "cdd_18C_scaled": context.cooling_degree_days_18C / 4000.0,
                "elevation_scaled": context.elevation_m / 4000.0,
                "design_temp_min_C": context.design_temp_min_C,
                "design_temp_max_C": context.design_temp_max_C,
                "design_solar_peak_scaled": context.design_solar_peak_W_m2 / 1200.0,
                "occupant_count": 4.0,
                "target_floor_area_m2": 24.0,
                "ground_frost_depth_m": 1.20 if "Cold" in context.climate_zone else 0.0,
                "ground_thermal_conductivity_W_mK": 1.8,
                "snow_load_kN_m2": 1.5 if "Cold" in context.climate_zone else 0.0,
                "soil_bearing_capacity_scaled": 0.5,
                "slope_percent_scaled": 0.05
            }
            vec = np.array([[feat_dict[k] for k in FeatureExtractor.CONTEXT_FEATURE_NAMES]], dtype=np.float32)
            model = self.model_bundle["model"]
            classes = self.model_bundle["classes"]
            if hasattr(model, "predict_proba"):
                probs = model.predict_proba(vec)[0]
                return {cls_name: float(p) for cls_name, p in zip(classes, probs)}
            else:
                pred = model.predict(vec)[0]
                return {cls_name: (1.0 if cls_name == pred else 0.0) for cls_name in classes}

        # If regression performance bundle: evaluate each assembly variant
        climate = context.climate_zone
        if "Alpine" in climate or "Arid" in climate:
            key = "Cold-Arid (High Altitude Alpine)"
        elif "Humid" in climate or "Montane" in climate:
            key = "Cold-Humid (Montane Himalayan)"
        elif "Hot-Dry" in climate or "Desert" in climate:
            key = "Hot-Dry (Semi-Arid Desert)"
        else:
            key = "Warm-Humid (Peninsular Plateau)"

        walls = self.CATALOG.get(key, self.CATALOG["Cold-Arid (High Altitude Alpine)"])["WALL"]
        heat_losses = {}
        for w in walls:
            loss = self.predict_envelope_heat_loss(context, w.u_value, 0.25, 0.44)
            heat_losses[w.assembly_id] = max(1.0, loss)

        inv_losses = {k: 1.0 / v for k, v in heat_losses.items()}
        total_inv = sum(inv_losses.values())
        return {k: round(v / total_inv, 3) for k, v in inv_losses.items()}

    def select_envelope(
        self,
        context: ClimateContext,
        budget_tier: str = "STANDARD",
        material_preference: str = "LOCAL_PRIMARY"
    ) -> Dict[str, Any]:
        """
        Select recommended and alternative envelope assemblies combining trained ML probabilities
        and deterministic thermodynamic physics resistance requirements.
        """
        climate = context.climate_zone
        is_cold = "Cold" in climate
        
        if "Alpine" in climate or "Arid" in climate:
            key = "Cold-Arid (High Altitude Alpine)"
        elif "Humid" in climate or "Montane" in climate:
            key = "Cold-Humid (Montane Himalayan)"
        elif "Hot-Dry" in climate or "Desert" in climate:
            key = "Hot-Dry (Semi-Arid Desert)"
        else:
            key = "Warm-Humid (Peninsular Plateau)"

        climate_catalog = self.CATALOG.get(key, self.CATALOG["Cold-Arid (High Altitude Alpine)"])
        walls = climate_catalog["WALL"]
        roofs = climate_catalog["ROOF"]
        floors = climate_catalog["FLOOR"]

        # Calculate minimum physics R-value
        r_req = self.calculate_required_thermal_resistance(context.design_temp_min_C)

        # Get ML probabilities
        ml_probs = self.predict_wall_probabilities(context)

        # Sort walls using composite of ML probability, compliance, and material preference
        def wall_rank_key(w: AssemblySpec):
            p = ml_probs.get(w.assembly_id, 0.20)
            is_compliant = (w.u_value <= 0.45) if is_cold else True
            pref_match = 1.0 if (material_preference == "LOCAL_PRIMARY" and w.local_availability == "LOCAL_PRIMARY") else 0.8
            cost_penalty = 1.0 / max(1.0, w.cost_index) if budget_tier in ("EMERGENCY", "LOW_COST") else 1.0
            return (is_compliant, p * pref_match * cost_penalty * w.r_value)

        sorted_walls = sorted(walls, key=wall_rank_key, reverse=True)

        top_wall = sorted_walls[0]
        top_roof = roofs[0]
        top_floor = floors[0]

        return {
            "wall": top_wall,
            "roof": top_roof,
            "floor": top_floor,
            "required_r_value": r_req,
            "meets_r_req": top_wall.r_value >= r_req,
            "ml_probabilities": ml_probs,
            "available_wall_variants": sorted_walls,
            "available_roof_variants": roofs,
            "available_floor_variants": floors,
        }

    def build_envelope_assemblies(self, wall: AssemblySpec, roof: AssemblySpec, floor: AssemblySpec) -> EnvelopeAssemblies:
        """Construct immutable EnvelopeAssemblies data structure."""
        return EnvelopeAssemblies(
            wall_assembly_id=wall.assembly_id,
            wall_material_id=wall.material_id,
            wall_thickness_mm=wall.thickness_mm,
            wall_u_value_W_m2K=wall.u_value,
            roof_assembly_id=roof.assembly_id,
            roof_material_id=roof.material_id,
            roof_thickness_mm=roof.thickness_mm,
            roof_u_value_W_m2K=roof.u_value,
            floor_assembly_id=floor.assembly_id,
            floor_material_id=floor.material_id,
            floor_thickness_mm=floor.thickness_mm,
            floor_u_value_W_m2K=floor.u_value
        )
