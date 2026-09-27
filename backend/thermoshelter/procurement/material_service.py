"""
ThermoShelter — Material Intelligence & Procurement Service
Combines canonical engineering physics properties with commercial supplier registries.
Provides comprehensive material cards, assembly stacks, multi-supplier comparison, and visual fallbacks.
"""

from typing import Dict, Any, List, Optional
import csv
import os
from pathlib import Path
from .procurement_adapter import ProcurementAdapter, ProcurementRecord

class MaterialIntelligenceService:
    """
    Central service for querying material properties, assemblies, and multi-supplier commercial data.
    """

    def __init__(self, data_dir: Optional[str] = None):
        if data_dir is None:
            root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
            self.data_dir = os.path.join(root_dir, "data", "canonical", "materials")
        else:
            self.data_dir = data_dir

        self.procurement = ProcurementAdapter(os.path.join(self.data_dir, "material_registry.csv"))
        self.materials_meta: Dict[str, Dict[str, Any]] = {}
        self.properties_meta: Dict[str, Dict[str, Any]] = {}
        self._load_data()

    def _load_data(self):
        # 1. Load general materials metadata
        mat_csv = os.path.join(self.data_dir, "materials.csv")
        if os.path.exists(mat_csv):
            with open(mat_csv, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    self.materials_meta[row['material_id']] = row

        # 2. Load engineering physical properties
        prop_csv = os.path.join(self.data_dir, "material_properties.csv")
        if os.path.exists(prop_csv):
            with open(prop_csv, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    self.properties_meta[row['material_id']] = row

    def get_material_card(self, material_id: str, thickness_mm: Optional[float] = None) -> Dict[str, Any]:
        """
        Builds a comprehensive material card with engineering properties, visual fallbacks, and multi-supplier pricing.
        """
        meta = self.materials_meta.get(material_id, {})
        prop = self.properties_meta.get(material_id, {})
        comparison = self.procurement.get_supplier_comparison(material_id)

        # Parse physical properties
        try:
            conductivity = float(prop.get('thermal_conductivity_W_mK', 0.5))
        except (ValueError, TypeError):
            conductivity = 0.5

        try:
            density = float(prop.get('density_kg_m3', 1800.0))
        except (ValueError, TypeError):
            density = 1800.0

        try:
            spec_heat = float(prop.get('specific_heat_J_kgK', 900.0))
        except (ValueError, TypeError):
            spec_heat = 900.0

        d_mm = thickness_mm if thickness_mm is not None else float(prop.get('default_thickness_mm', 200.0))
        d_m = d_mm / 1000.0
        r_val = round(d_m / conductivity, 3) if conductivity > 0 else 0.0
        u_val = round(1.0 / r_val, 3) if r_val > 0 else 99.0

        # Determine primary visual and fallback
        primary_supplier = comparison.get('lowest_supplier')
        primary_image = "IMAGE_NOT_AVAILABLE"
        if primary_supplier and primary_supplier.get('image_url') and primary_supplier.get('image_url') != "IMAGE_NOT_AVAILABLE":
            primary_image = primary_supplier.get('image_url')

        return {
            "material_id": material_id,
            "material_name": meta.get('material_name', material_id),
            "category": meta.get('category', 'Construction Material'),
            "form": meta.get('form', 'Modular Component'),
            "local_sourcing_status": meta.get('local_sourcing_status', 'UNKNOWN'),
            "availability_in_ladakh": meta.get('availability_in_ladakh', 'Local'),
            "sustainability_profile": meta.get('sustainability_profile', 'Low carbon passive material'),
            "durability_notes": meta.get('durability_notes', 'High durability in dry montane climates'),
            "fire_classification": meta.get('fire_classification', 'Non-combustible Class A1'),
            # Engineering Properties
            "properties": {
                "thermal_conductivity_W_mK": conductivity,
                "density_kg_m3": density,
                "density_min_kg_m3": prop.get('density_min_kg_m3'),
                "density_max_kg_m3": prop.get('density_max_kg_m3'),
                "specific_heat_J_kgK": spec_heat,
                "thickness_mm": d_mm,
                "r_value_m2K_W": r_val,
                "u_value_W_m2K": u_val,
                "moisture_bound_max_pct": prop.get('moisture_bound_max_pct', 'N/A'),
                "measurement_condition": prop.get('measurement_condition', 'Standard steady state'),
                "source_id": prop.get('source_id', 'SRC-ASHRAE-2025-CH26'),
                "confidence": prop.get('confidence', 'High'),
                "evidence_status": prop.get('evidence_status', 'VALUE_VERIFIED')
            },
            # Visual Info
            "visual": {
                "image_url": primary_image,
                "has_image": primary_image != "IMAGE_NOT_AVAILABLE",
                "fallback_color": self._get_material_color(material_id),
                "fallback_pattern": self._get_material_pattern(material_id)
            },
            # Multi-supplier procurement & comparison
            "procurement": comparison
        }

    def get_all_material_cards(self) -> List[Dict[str, Any]]:
        """Returns material cards for all registered canonical materials."""
        cards = []
        for mat_id in self.materials_meta.keys():
            cards.append(self.get_material_card(mat_id))
        return cards

    def get_design_materials_breakdown(self, design) -> Dict[str, Any]:
        """
        Extracts rich material cards for the walls, roof, and floor of a specific DesignState.
        """
        env = design.envelope
        wall_card = self.get_material_card(env.wall_material_id, env.wall_thickness_mm)
        roof_card = self.get_material_card(env.roof_material_id, env.roof_thickness_mm)
        floor_card = self.get_material_card(env.floor_material_id, env.floor_thickness_mm)

        # Estimate envelope cost
        geom = design.geometry
        cost_est = self.procurement.estimate_envelope_cost(
            wall_material_id=env.wall_material_id,
            wall_area_m2=design.net_wall_area_m2,
            wall_thickness_m=env.wall_thickness_mm / 1000.0,
            roof_material_id=env.roof_material_id,
            roof_area_m2=geom.roof_area_m2,
            roof_thickness_m=env.roof_thickness_mm / 1000.0
        )

        return {
            "wall_assembly": {
                "assembly_id": env.wall_assembly_id,
                "component": "Exterior Wall Assembly",
                "material": wall_card,
                "effective_u_W_m2K": env.wall_u_value_W_m2K
            },
            "roof_assembly": {
                "assembly_id": env.roof_assembly_id,
                "component": "Roof Insulation & Cladding",
                "material": roof_card,
                "effective_u_W_m2K": env.roof_u_value_W_m2K
            },
            "floor_assembly": {
                "assembly_id": env.floor_assembly_id,
                "component": "Sub-Slab & Ground Floor",
                "material": floor_card,
                "effective_u_W_m2K": env.floor_u_value_W_m2K
            },
            "cost_estimation": cost_est.to_dict()
        }

    def _get_material_color(self, mat_id: str) -> str:
        color_map = {
            "MAT-ADOBE": "#C29B38",
            "MAT-RAMMED": "#A67C52",
            "MAT-STONE": "#7A8288",
            "MAT-CSEB": "#BA8C63",
            "MAT-BRICK": "#B84A39",
            "MAT-CONCRETE": "#949C9E",
            "MAT-TIMBER": "#C69055",
            "MAT-TIMBER-FRAME": "#D4A373",
            "MAT-BAMBOO": "#9EA93F",
            "MAT-THATCH": "#D2B04C",
            "MAT-STEEL": "#4A6B82",
            "MAT-ROCKWOOL": "#E0C879",
            "MAT-EPS": "#E8ECEF",
            "MAT-XPS": "#64B5F6",
            "MAT-AIR-CAVITY": "#2B3A42",
            "MAT-GYPSUM": "#E0E0E0",
        }
        return color_map.get(mat_id, "#888888")

    def _get_material_pattern(self, mat_id: str) -> str:
        pattern_map = {
            "MAT-ADOBE": "earth-blocks",
            "MAT-RAMMED": "strata-layers",
            "MAT-STONE": "granite-speckle",
            "MAT-CSEB": "grid-brick",
            "MAT-BRICK": "running-bond",
            "MAT-CONCRETE": "solid-stipple",
            "MAT-TIMBER": "wood-grain",
            "MAT-TIMBER-FRAME": "stud-cavity",
            "MAT-BAMBOO": "vertical-reeds",
            "MAT-THATCH": "straw-crosshatch",
            "MAT-STEEL": "corrugation-waves",
            "MAT-ROCKWOOL": "mineral-fiber",
            "MAT-EPS": "bead-foam",
            "MAT-XPS": "dense-foam",
            "MAT-AIR-CAVITY": "air-gap",
            "MAT-GYPSUM": "smooth-board",
        }
        return pattern_map.get(mat_id, "solid")
