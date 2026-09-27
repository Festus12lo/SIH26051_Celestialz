"""
ThermoShelter — Controlled Material Comparison Module
Compares material/assembly variants under IDENTICAL conditions:
same geometry, same orientation, same occupancy, same climate, same openings.
Only the envelope assembly changes.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
import copy
from ..core.design_state import DesignState, EnvelopeAssemblies
from ..core.performance_vector import PerformanceVector
from ..core.scoring import DesignScorer, DesignScore
from ..validation.engineering_validator import EngineeringValidator, ValidationReport
from ..simulation.physics_bridge import PhysicsBridge


@dataclass
class MaterialVariantResult:
    """Result for one material variant under controlled comparison."""
    variant_label: str
    envelope: EnvelopeAssemblies
    design: DesignState
    performance: PerformanceVector
    validation: ValidationReport
    score: DesignScore
    hourly_data: List[Dict[str, Any]]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "variant_label": self.variant_label,
            "wall_assembly_id": self.envelope.wall_assembly_id,
            "wall_material_id": self.envelope.wall_material_id,
            "wall_u_value_W_m2K": self.envelope.wall_u_value_W_m2K,
            "roof_assembly_id": self.envelope.roof_assembly_id,
            "roof_material_id": self.envelope.roof_material_id,
            "roof_u_value_W_m2K": self.envelope.roof_u_value_W_m2K,
            "avg_indoor_temp_C": round(self.performance.avg_indoor_temp_C.value, 1),
            "min_indoor_temp_C": round(self.performance.min_indoor_temp_C.value, 1),
            "max_indoor_temp_C": round(self.performance.max_indoor_temp_C.value, 1),
            "solar_gain_kWh": round(self.performance.total_solar_gain_kWh.value, 1),
            "heat_loss_kWh": round(self.performance.total_conductive_heat_loss_kWh.value, 1),
            "is_compliant": self.validation.is_fully_compliant,
            "score": round(self.score.total_score, 1),
            "verdict": self.score.summary_verdict,
        }


@dataclass
class MaterialComparisonResult:
    """Complete controlled material comparison output."""
    base_design_id: str
    location: str
    geometry_description: str
    orientation_deg: float
    occupants: int
    variants: List[MaterialVariantResult]
    controlled_variables: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "base_design_id": self.base_design_id,
            "location": self.location,
            "geometry_description": self.geometry_description,
            "orientation_deg": self.orientation_deg,
            "occupants": self.occupants,
            "controlled_variables": self.controlled_variables,
            "table": self.to_comparison_table(),
            "variants": [v.to_dict() for v in self.variants],
        }

    def to_comparison_table(self) -> List[Dict[str, Any]]:
        """Generate comparison table suitable for display."""
        rows = []
        for v in self.variants:
            rows.append({
                "Material Variant": v.variant_label,
                "Wall Assembly": v.envelope.wall_assembly_id,
                "Wall Material": v.envelope.wall_material_id,
                "Wall U-value": f"{v.envelope.wall_u_value_W_m2K:.3f} W/m2K",
                "Roof Assembly": v.envelope.roof_assembly_id,
                "Roof Material": v.envelope.roof_material_id,
                "Roof U-value": f"{v.envelope.roof_u_value_W_m2K:.3f} W/m2K",
                "Avg Indoor (C)": round(v.performance.avg_indoor_temp_C.value, 1),
                "Min Indoor (C)": round(v.performance.min_indoor_temp_C.value, 1),
                "Max Indoor (C)": round(v.performance.max_indoor_temp_C.value, 1),
                "Solar Gain kWh": round(v.performance.total_solar_gain_kWh.value, 1),
                "Heat Loss kWh": round(v.performance.total_conductive_heat_loss_kWh.value, 1),
                "Compliance": "Compliant" if v.validation.is_fully_compliant else "Non-compliant",
                "Score": round(v.score.total_score, 1),
                "Verdict": v.score.summary_verdict,
            })
        return rows


class MaterialComparator:
    """
    Performs controlled material comparison: identical design geometry/orientation/climate,
    varying only the envelope assembly. Uses physics simulation for each variant.
    """

    def __init__(
        self,
        physics: Optional[PhysicsBridge] = None,
        validator: Optional[EngineeringValidator] = None,
        scorer: Optional[DesignScorer] = None
    ):
        self.physics = physics or PhysicsBridge()
        self.validator = validator or EngineeringValidator()
        self.scorer = scorer or DesignScorer()

    def compare(
        self,
        base_design: DesignState,
        assembly_variants: List[Dict[str, Any]],
        simulation_hours: int = 48
    ) -> MaterialComparisonResult:
        """
        Run controlled material comparison.

        Args:
            base_design: The reference design whose geometry/orientation/climate are held constant.
            assembly_variants: List of dicts, each containing EnvelopeAssemblies fields to override.
            simulation_hours: Simulation period (default 48h).

        Returns:
            MaterialComparisonResult with per-variant physics results.
        """
        results = []

        for i, asm_dict in enumerate(assembly_variants):
            # Create a variant by mutating ONLY the envelope
            variant = base_design.with_mutation(
                rationale=f"MATERIAL_COMPARISON_VARIANT_{i + 1}",
                envelope_changes=asm_dict
            )

            label = asm_dict.get("_label", f"Variant {i + 1}: {asm_dict.get('wall_material_id', '?')}")

            # Physics simulation
            perf, hourly = self.physics.simulate_with_timeseries(variant, hours=simulation_hours)

            # Engineering validation
            val_report = self.validator.validate(variant, perf)

            # Scoring
            score = self.scorer.evaluate(variant, perf, val_report.mandatory_failures)

            results.append(MaterialVariantResult(
                variant_label=label,
                envelope=variant.envelope,
                design=variant,
                performance=perf,
                validation=val_report,
                score=score,
                hourly_data=hourly
            ))

        geom = base_design.geometry
        return MaterialComparisonResult(
            base_design_id=base_design.design_id,
            location=base_design.context.location_name,
            geometry_description=f"{geom.length_m}m x {geom.width_m}m x {geom.height_m}m (AR={geom.aspect_ratio})",
            orientation_deg=base_design.orientation_azimuth_deg,
            occupants=base_design.requirements.occupant_count,
            variants=results,
            controlled_variables={
                "floor_area_m2": geom.floor_area_m2,
                "length_m": geom.length_m,
                "width_m": geom.width_m,
                "height_m": geom.height_m,
                "orientation_deg": base_design.orientation_azimuth_deg,
                "occupant_count": base_design.requirements.occupant_count,
                "openings": [op.opening_id for op in base_design.openings],
                "simulation_hours": simulation_hours,
            }
        )

    @classmethod
    def get_material_variants_for_climate(cls, climate_zone: str) -> List[Dict[str, Any]]:
        """
        Retrieve available material assembly variants for a given climate zone
        from Model A's catalog.
        """
        from ..models.predictors import AssemblyRecommenderModel

        is_cold = "Cold" in climate_zone
        key_wall = "Cold-Arid (High Altitude Alpine)" if ("Alpine" in climate_zone or "Arid" in climate_zone) else (
            "Cold-Humid (Montane Himalayan)" if "Humid" in climate_zone else "Warm"
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

        variants = []
        floor = floor_options[0] if floor_options else None
        if floor is None:
            return []

        for wall in wall_options:
            for roof in roof_options:
                variants.append({
                    "_label": f"{wall['material_id']} wall + {roof['material_id']} roof",
                    "wall_assembly_id": wall["assembly_id"],
                    "wall_material_id": wall["material_id"],
                    "wall_thickness_mm": wall["thickness_mm"],
                    "wall_u_value_W_m2K": wall["u_value"],
                    "roof_assembly_id": roof["assembly_id"],
                    "roof_material_id": roof["material_id"],
                    "roof_thickness_mm": roof["thickness_mm"],
                    "roof_u_value_W_m2K": roof["u_value"],
                    "floor_assembly_id": floor["assembly_id"],
                    "floor_material_id": floor["material_id"],
                    "floor_thickness_mm": floor["thickness_mm"],
                    "floor_u_value_W_m2K": floor["u_value"],
                })

        return variants
