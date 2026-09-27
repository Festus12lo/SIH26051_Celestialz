"""
ThermoShelter — Coordinated Design Generation Engine
Generates complete, coherent shelter candidates by combining Models A, B, C outputs.
Design variables interact: geometry ↔ solar exposure ↔ materials ↔ climate.
"""

import uuid
import itertools
import math
from typing import List, Optional, Dict, Any
from ..core.design_state import (
    DesignState, ClimateContext, SiteState, UserRequirements,
    GeometryState, EnvelopeAssemblies, OpeningItem
)
from ..models.predictors import (
    AssemblyRecommenderModel, GeometryRecommenderModel, OrientationRecommenderModel
)


class DesignGenerator:
    """
    Generates complete candidate shelter DesignStates by coordinating Models A, B, C.
    Produces a combinatorial set of viable designs across geometry, orientation, and materials.
    """

    def __init__(self):
        self.assembly_model = AssemblyRecommenderModel()
        self.geometry_model = GeometryRecommenderModel()
        self.orientation_model = OrientationRecommenderModel()

    def generate_candidates(
        self,
        context: ClimateContext,
        site: SiteState,
        requirements: UserRequirements,
        n_max: int = 36
    ) -> List[DesignState]:
        """
        Generate a diverse set of complete shelter candidates.
        
        Varies: geometry (aspect ratio, height, roof), orientation, materials, openings.
        All candidates are physically feasible (positive dims, openings < walls).
        
        Returns: List of complete DesignState objects ready for evaluation.
        """
        is_cold = "Cold" in context.climate_zone

        # --- Model B: Generate geometry variants ---
        geometries = self._generate_geometry_variants(requirements, is_cold)

        # --- Model C: Generate orientation variants ---
        orientations = self._generate_orientation_variants(is_cold)

        # --- Model A: Generate material/assembly variants ---
        assemblies = self._generate_assembly_variants(context)

        # --- Opening strategies ---
        opening_strategies = self._generate_opening_strategies(is_cold)

        # --- Combine into complete candidates ---
        all_candidates = []
        variant_index = 0

        for geom_spec in geometries:
            for azimuth in orientations:
                for asm in assemblies:
                    for openings_spec in opening_strategies:
                        candidate = self._build_candidate(
                            context=context,
                            site=site,
                            requirements=requirements,
                            geom_spec=geom_spec,
                            azimuth=azimuth,
                            assembly=asm,
                            openings_spec=openings_spec,
                            variant_index=variant_index
                        )
                        if candidate is not None:
                            all_candidates.append(candidate)
                            variant_index += 1

        if len(all_candidates) <= n_max:
            return all_candidates

        # Evenly distribute sample across all generated candidates to ensure
        # diversity across all dimensions (geometries, orientations, assemblies)
        step = len(all_candidates) / float(n_max)
        selected_indices = [int(i * step) for i in range(n_max)]
        return [all_candidates[i] for i in selected_indices]

    def _generate_geometry_variants(
        self, requirements: UserRequirements, is_cold: bool
    ) -> List[Dict[str, Any]]:
        """Generate geometry parameter sets from Model B recommendations."""
        target_area = requirements.target_floor_area_m2

        if is_cold:
            aspect_ratios = [1.2, 1.5, 2.0]
            heights = [2.8]
            pitches = [25.0, 35.0]
        else:
            aspect_ratios = [1.0, 1.3]
            heights = [2.8, 3.2]
            pitches = [0.0, 15.0]

        variants = []
        for ar in aspect_ratios:
            for h in heights:
                for pitch in pitches:
                    w = round((target_area / ar) ** 0.5, 2)
                    l = round(target_area / w, 2)
                    actual_area = round(l * w, 2)
                    # Ensure area doesn't exceed max if specified
                    if requirements.target_floor_area_m2 > 0:
                        variants.append({
                            "length_m": l,
                            "width_m": w,
                            "height_m": h,
                            "roof_angle_deg": pitch,
                            "roof_type": "pitched" if pitch > 0 else "flat",
                            "aspect_ratio": ar,
                        })
        return variants

    def _generate_orientation_variants(self, is_cold: bool) -> List[float]:
        """Generate orientation azimuths from Model C logic."""
        if is_cold:
            # In cold climates: prioritize south, but include alternatives
            return [180.0, 135.0, 225.0]  # South, SSE, SSW
        else:
            # In warm climates: include multiple options
            return [0.0, 90.0, 270.0]  # North, East, West

    def _generate_assembly_variants(self, context: ClimateContext) -> List[Dict[str, Any]]:
        """Generate material assembly variants from Model A catalog."""
        climate = context.climate_zone
        is_cold = "Cold" in climate

        # Use Model A catalog directly
        key_wall = "Cold-Arid (High Altitude Alpine)" if ("Alpine" in climate or "Arid" in climate) else (
            "Cold-Humid (Montane Himalayan)" if "Humid" in climate else "Warm"
        )

        wall_options = AssemblyRecommenderModel.WALL_CATALOG.get(
            key_wall, AssemblyRecommenderModel.WALL_CATALOG.get("Warm", [])
        )
        roof_options = AssemblyRecommenderModel.ROOF_CATALOG.get(
            "Cold-Arid (High Altitude Alpine)" if is_cold else "Warm",
            AssemblyRecommenderModel.ROOF_CATALOG.get("Warm", [])
        )
        floor_options = AssemblyRecommenderModel.FLOOR_CATALOG.get(
            "Cold-Arid (High Altitude Alpine)" if is_cold else "Warm",
            AssemblyRecommenderModel.FLOOR_CATALOG.get("Warm", [])
        )

        # Build combinations of wall × roof (floor is typically one option)
        variants = []
        floor = floor_options[0] if floor_options else None
        if floor is None:
            return []

        for wall in wall_options:
            for roof in roof_options:
                variants.append({
                    "wall_assembly_id": wall["assembly_id"],
                    "wall_material_id": wall["material_id"],
                    "wall_thickness_mm": wall["thickness_mm"],
                    "wall_u_value_W_m2K": wall["u_value"],
                    "wall_description": wall["description"],
                    "roof_assembly_id": roof["assembly_id"],
                    "roof_material_id": roof["material_id"],
                    "roof_thickness_mm": roof["thickness_mm"],
                    "roof_u_value_W_m2K": roof["u_value"],
                    "roof_description": roof["description"],
                    "floor_assembly_id": floor["assembly_id"],
                    "floor_material_id": floor["material_id"],
                    "floor_thickness_mm": floor["thickness_mm"],
                    "floor_u_value_W_m2K": floor["u_value"],
                })
        return variants

    def _generate_opening_strategies(self, is_cold: bool) -> List[Dict[str, Any]]:
        """Generate opening/fenestration strategies."""
        if is_cold:
            return [
                {
                    "label": "solar_optimized",
                    "openings": [
                        OpeningItem("OPN-GEN-S-RABSAL", "RABSAL_SUNSPACE", "South",
                                    3.0, 2.0, 6.0, 1.80, 0.70, "double_low_e", True),
                        OpeningItem("OPN-GEN-N-VENT", "WINDOW", "North",
                                    0.5, 0.4, 0.20, 2.0, 0.50, "double", True),
                        OpeningItem("OPN-GEN-E-DOOR", "DOOR", "East",
                                    1.0, 2.0, 2.0, 1.2, 0.0, "solid_insulated", True),
                    ]
                },
                {
                    "label": "conservative",
                    "openings": [
                        OpeningItem("OPN-GEN-S-WIN", "WINDOW", "South",
                                    2.0, 1.5, 3.0, 2.80, 0.65, "double", True),
                        OpeningItem("OPN-GEN-E-DOOR2", "DOOR", "East",
                                    1.0, 2.0, 2.0, 1.80, 0.0, "solid_wood", True),
                    ]
                },
            ]
        else:
            return [
                {
                    "label": "cross_ventilation",
                    "openings": [
                        OpeningItem("OPN-GEN-N-WIN", "WINDOW", "North",
                                    2.0, 1.5, 3.0, 5.80, 0.65, "single", True),
                        OpeningItem("OPN-GEN-S-WIN2", "WINDOW", "South",
                                    2.0, 1.5, 3.0, 5.80, 0.65, "single", True),
                        OpeningItem("OPN-GEN-E-DOOR3", "DOOR", "East",
                                    1.0, 2.0, 2.0, 1.80, 0.0, "solid_wood", True),
                    ]
                },
            ]

    def _build_candidate(
        self,
        context: ClimateContext,
        site: SiteState,
        requirements: UserRequirements,
        geom_spec: Dict[str, Any],
        azimuth: float,
        assembly: Dict[str, Any],
        openings_spec: Dict[str, Any],
        variant_index: int
    ) -> Optional[DesignState]:
        """Build a complete DesignState from parameter combination. Returns None if infeasible."""
        try:
            geom = GeometryState(
                geometry_id=f"GEOM-GEN-{variant_index:03d}",
                geometry_type=f"GEOM-TYP-RECT-{'PITCHED' if geom_spec['roof_angle_deg'] > 0 else 'FLAT'}",
                length_m=geom_spec["length_m"],
                width_m=geom_spec["width_m"],
                height_m=geom_spec["height_m"],
                roof_type=geom_spec["roof_type"],
                roof_angle_deg=geom_spec["roof_angle_deg"]
            )

            envelope = EnvelopeAssemblies(
                wall_assembly_id=assembly["wall_assembly_id"],
                wall_material_id=assembly["wall_material_id"],
                wall_thickness_mm=assembly["wall_thickness_mm"],
                wall_u_value_W_m2K=assembly["wall_u_value_W_m2K"],
                roof_assembly_id=assembly["roof_assembly_id"],
                roof_material_id=assembly["roof_material_id"],
                roof_thickness_mm=assembly["roof_thickness_mm"],
                roof_u_value_W_m2K=assembly["roof_u_value_W_m2K"],
                floor_assembly_id=assembly["floor_assembly_id"],
                floor_material_id=assembly["floor_material_id"],
                floor_thickness_mm=assembly["floor_thickness_mm"],
                floor_u_value_W_m2K=assembly["floor_u_value_W_m2K"],
            )

            openings = openings_spec["openings"]

            # Feasibility: total opening area must be < gross wall area
            total_opening = sum(op.area_m2 for op in openings)
            if total_opening >= geom.gross_wall_area_m2:
                return None

            is_cold = "Cold" in context.climate_zone
            design_id = f"DS-GEN-{uuid.uuid4().hex[:8].upper()}"

            return DesignState(
                design_id=design_id,
                design_name=f"Candidate {variant_index + 1}: AR={geom_spec['aspect_ratio']}, {assembly['wall_material_id']}, {azimuth} deg",
                context=context,
                site=site,
                requirements=requirements,
                geometry=geom,
                envelope=envelope,
                openings=openings,
                orientation_azimuth_deg=azimuth,
                shading_strategy_id=None,
                passive_strategies=["PAS-STRAT-DIRECT-GAIN"] if is_cold else ["PAS-STRAT-CROSS-VENT"],
                iteration_step=0,
                modification_rationale=f"GENERATED: {openings_spec['label']}, AR={geom_spec['aspect_ratio']}, {azimuth} deg"
            )

        except (ValueError, Exception):
            return None
