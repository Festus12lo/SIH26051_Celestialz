"""
ThermoShelter — Model F: Architectural Alternative & Trade-Off Archetype Generator
Synthesizes 5 distinct, purposefully engineered shelter design archetypes:
1. 🥇 High-Performance Passive Optimal (Max thermal lift & solar capture)
2. 💰 Low-Cost / Material-Efficient (Standardized modular, minimal waste)
3. 🌿 Local-Material Vernacular (Traditional earthen/stone mass & thatch)
4. ⚡ Rapid Emergency Deployment (Lightweight prefabricated timber/SIP dry assembly)
5. ⚖️ Balanced Constructability (Optimal compromise of thermal, cost, and build speed)
"""

from dataclasses import dataclass
from typing import Dict, Any, List, Optional, Tuple
import uuid
from ..core.design_state import (
    DesignState, ClimateContext, SiteState, UserRequirements,
    GeometryState, EnvelopeAssemblies, OpeningItem, RoomItem
)
from ..core.purpose_profiles import get_purpose_profile
from .model_a_envelope import ModelA_EnvelopeSelector, AssemblySpec
from .model_b_geometry import ModelB_GeometryDesigner
from .model_c_passive_solar import ModelC_PassiveSolarDesigner


@dataclass
class AlternativeArchetypeSpec:
    """Definition of an architectural design alternative archetype."""
    archetype_id: str                 # 'OPTIMAL_PASSIVE', 'LOW_COST_MODULAR', 'VERNACULAR_LOCAL', 'RAPID_EMERGENCY', 'BALANCED'
    label: str                        # Display title
    target_aspect_ratio: float
    wall_preference: str              # Preferred material keyword
    roof_preference: str
    solar_feature: str                # 'RABSAL_SUNSPACE', 'DIRECT_GAIN', 'CROSS_VENT'
    primary_design_intent: str
    trade_off_summary: str


class ModelF_AlternativeGenerator:
    """
    Model F: Generates purposeful, distinct architectural alternative archetypes
    with explicit design rationales and engineering trade-offs.
    """
    MODEL_NAME = "ModelF_AlternativeGenerator"
    MODEL_VERSION = "2.0.0-archetype-synthesizer"

    # The 5 Core Bioclimatic Archetypes mapped to the 3 Typologies + specialized survival modes
    ARCHETYPES = [
        AlternativeArchetypeSpec(
            archetype_id="RAPID_EMERGENCY_MILITARY",
            label="Rapid Emergency Deployment (Military Grade)",
            target_aspect_ratio=1.35,
            wall_preference="SIP-MILITARY",
            roof_preference="AEROGEL-TEXTILE",
            solar_feature="DIRECT_GAIN",
            primary_design_intent="Emergency Type: Enable ultra-rapid airdrop deployment within 12 hours using prefabricated, extremely insulated lightweight aluminum SIPs and Aerogel textiles.",
            trade_off_summary="Highest upfront material cost but absolutely critical for rapid deployment and extreme cold survival; extremely low weight."
        ),
        AlternativeArchetypeSpec(
            archetype_id="HEAT_WAVE_SURVIVAL",
            label="Extreme Heat Wave Survival (Community/Permanent)",
            target_aspect_ratio=1.50,
            wall_preference="PCM-BOARD",
            roof_preference="RADIANT-FOIL",
            solar_feature="CROSS_VENT",
            primary_design_intent="Community/Permanent Type: Maximize indoor cooling during extreme heat waves using latent heat absorption (PCMs) and solar rejection (Radiant barriers).",
            trade_off_summary="Requires high investment in specialized materials (Phase Change Materials) but prevents lethal indoor overheating during summer extremes."
        ),
        AlternativeArchetypeSpec(
            archetype_id="PERMANENT_PASSIVE",
            label="High-Performance Permanent (Passive Solar)",
            target_aspect_ratio=1.80,
            wall_preference="RAMMED-INSULATED",
            roof_preference="XPS",
            solar_feature="RABSAL_SUNSPACE",
            primary_design_intent="Permanent Type: Maximize winter temperature lift and passive solar collection through high thermal mass placed inside an insulated envelope.",
            trade_off_summary="Highest thermal comfort stability for long-term living; requires heavy machinery and extended construction time."
        ),
        AlternativeArchetypeSpec(
            archetype_id="MODULAR_COMMUNITY",
            label="Large-Span Modular Community Shelter",
            target_aspect_ratio=1.20,
            wall_preference="LGSF-PORTAL",
            roof_preference="PTFE-MEMBRANE",
            solar_feature="CROSS_VENT",
            primary_design_intent="Community Type: Create massive, column-free shaded spans for high-occupancy use using Light Gauge Steel Frames and Tensioned Fabrics.",
            trade_off_summary="Very rapid to deploy large areas; lower internal thermal mass compared to permanent structures."
        ),
        AlternativeArchetypeSpec(
            archetype_id="BALANCED_CONSTRUCTABILITY",
            label="Balanced Thermal & Constructability Hybrid",
            target_aspect_ratio=1.60,
            wall_preference="HEMPCRETE",
            roof_preference="CONCRETE",
            solar_feature="DIRECT_GAIN",
            primary_design_intent="Achieve the optimal balance between high thermal insulation, structural durability, and moisture regulation.",
            trade_off_summary="Robust all-around design with excellent indoor air quality and predictable construction costs."
        )
    ]

    def __init__(self):
        self.model_a = ModelA_EnvelopeSelector()
        self.model_b = ModelB_GeometryDesigner()
        self.model_c = ModelC_PassiveSolarDesigner()

    def generate_archetype_candidates(
        self,
        context: ClimateContext,
        site: SiteState,
        requirements: UserRequirements
    ) -> List[Tuple[DesignState, AlternativeArchetypeSpec]]:
        """
        Synthesizes one complete, physically buildable candidate DesignState for each of the 5 archetypes.
        """
        candidates = []
        is_cold = "Cold" in context.climate_zone

        # Resolve purpose profile for room program generation
        purpose_profile = get_purpose_profile(requirements.intended_use)

        for spec in self.ARCHETYPES:
            # 1. Geometry from Model B
            geom_plan = self.model_b.design_geometry(
                context=context,
                site=site,
                requirements=requirements,
                preferred_aspect_ratio=spec.target_aspect_ratio
            )
            geometry = self.model_b.to_geometry_state(geom_plan, geometry_id=f"GEOM-{spec.archetype_id}")

            # 2. Generate purpose-aware room program
            rooms = ModelB_GeometryDesigner.generate_room_program(
                purpose_profile=purpose_profile,
                occupants=requirements.occupant_count,
                gross_floor_area_m2=geometry.floor_area_m2
            )

            # 3. Envelope Assemblies from Model A matching archetype preference
            envelope_data = self.model_a.select_envelope(context)
            walls = envelope_data["available_wall_variants"]
            roofs = envelope_data["available_roof_variants"]
            floors = envelope_data["available_floor_variants"]

            # Filter preferred wall
            matching_walls = [w for w in walls if spec.wall_preference in w.material_id]
            selected_wall = matching_walls[0] if matching_walls else walls[0]

            # Filter preferred roof
            matching_roofs = [r for r in roofs if spec.roof_preference in r.material_id]
            selected_roof = matching_roofs[0] if matching_roofs else roofs[0]

            selected_floor = floors[0]
            envelope = self.model_a.build_envelope_assemblies(selected_wall, selected_roof, selected_floor)

            # 4. Passive Solar Strategy from Model C
            solar_strat = self.model_c.design_passive_solar(
                context=context,
                geometry=geometry,
                feature_preference=spec.solar_feature
            )

            # 5. Construct DesignState with rooms
            design_id = f"DS-ARCH-{spec.archetype_id}-{uuid.uuid4().hex[:6].upper()}"
            design = DesignState(
                design_id=design_id,
                design_name=f"{spec.label} ({geometry.length_m}x{geometry.width_m}m, {selected_wall.material_id})",
                context=context,
                site=site,
                requirements=requirements,
                geometry=geometry,
                envelope=envelope,
                openings=solar_strat.openings,
                rooms=rooms,
                orientation_azimuth_deg=solar_strat.azimuth_deg,
                shading_strategy_id=None,
                passive_strategies=solar_strat.passive_features,
                purpose_profile_id=purpose_profile.purpose_id,
                iteration_step=0,
                modification_rationale=f"ARCHETYPE: {spec.archetype_id} — {spec.primary_design_intent}"
            )

            candidates.append((design, spec))

        return candidates
