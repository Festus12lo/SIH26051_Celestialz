"""
ThermoShelter — Model E: Architectural Design Synthesizer
Coordinates Models A (Envelopes), B (Geometry), and C (Passive Solar) to generate a diverse,
physically consistent candidate pool of 30–50 complete shelter design states.
"""

from typing import List, Dict, Any, Optional
import uuid
from ..core.design_state import (
    DesignState, ClimateContext, SiteState, UserRequirements,
    GeometryState, EnvelopeAssemblies, RoomItem
)
from ..core.purpose_profiles import get_purpose_profile
from .model_a_envelope import ModelA_EnvelopeSelector
from .model_b_geometry import ModelB_GeometryDesigner
from .model_c_passive_solar import ModelC_PassiveSolarDesigner


class ModelE_ArchitecturalSynthesizer:
    """
    Model E: Coordinates specialized domain models into complete, coherent DesignStates.
    """
    MODEL_NAME = "ModelE_ArchitecturalSynthesizer"
    MODEL_VERSION = "2.0.0-coordinated-synthesizer"

    def __init__(self):
        self.model_a = ModelA_EnvelopeSelector()
        self.model_b = ModelB_GeometryDesigner()
        self.model_c = ModelC_PassiveSolarDesigner()

    def generate_candidate_pool(
        self,
        context: ClimateContext,
        site: SiteState,
        requirements: UserRequirements,
        n_max: int = 36
    ) -> List[DesignState]:
        """
        Generate diverse multi-parameter candidate DesignStates.
        Varies:
        - Geometry: Aspect ratios (1.2, 1.5, 1.8, 2.0) and roof pitches (0°, 25°, 35°)
        - Orientation: True South (180°), SSE (135°), SSW (225°)
        - Envelope: CSEB, Rammed Earth, Timber Frame, Strawbale, Stone
        - Openings: Rabsal Sunspace vs Direct Gain Double Glazing
        """
        is_cold = "Cold" in context.climate_zone

        # Resolve purpose profile for room program generation
        purpose_profile = get_purpose_profile(requirements.intended_use)

        # 1. Geometry Variations from Model B
        aspect_ratios = [1.2, 1.5, 1.8, 2.0] if is_cold else [1.0, 1.2, 1.35]
        pitches = [25.0, 32.0] if is_cold else [0.0, 15.0]

        # 2. Orientation Variations from Model C
        orientations = [180.0, 135.0, 225.0] if is_cold else [0.0, 90.0, 270.0]

        # 3. Material Assemblies from Model A
        envelope_data = self.model_a.select_envelope(context)
        wall_options = envelope_data["available_wall_variants"]
        roof_options = envelope_data["available_roof_variants"]
        floor_option = envelope_data["available_floor_variants"][0]

        # 4. Opening Strategies
        solar_modes = ["RABSAL_SUNSPACE", "DIRECT_GAIN"] if is_cold else ["CROSS_VENT"]

        all_candidates: List[DesignState] = []
        idx = 0

        for ar in aspect_ratios:
            geom_plan = self.model_b.design_geometry(
                context=context, site=site, requirements=requirements, preferred_aspect_ratio=ar
            )
            for pitch in pitches:
                geom = GeometryState(
                    geometry_id=f"GEOM-E-{idx:03d}",
                    geometry_type=f"GEOM-TYPE-RECT-{'PITCHED' if pitch > 0 else 'FLAT'}",
                    length_m=geom_plan.length_m,
                    width_m=geom_plan.width_m,
                    height_m=geom_plan.height_m,
                    roof_type="pitched" if pitch > 0 else "flat",
                    roof_angle_deg=pitch
                )

                # Generate purpose-aware room program
                rooms = ModelB_GeometryDesigner.generate_room_program(
                    purpose_profile=purpose_profile,
                    occupants=requirements.occupant_count,
                    gross_floor_area_m2=geom.floor_area_m2
                )

                for wall in wall_options:
                    for roof in roof_options:
                        envelope = self.model_a.build_envelope_assemblies(wall, roof, floor_option)

                        for azimuth in orientations:
                            for solar_mode in solar_modes:
                                solar_strat = self.model_c.design_passive_solar(
                                    context=context, geometry=geom, feature_preference=solar_mode
                                )
                                # Override azimuth
                                solar_strat.azimuth_deg = azimuth

                                design_id = f"DS-SYN-{uuid.uuid4().hex[:8].upper()}"
                                candidate = DesignState(
                                    design_id=design_id,
                                    design_name=f"Candidate {idx+1}: AR={ar:.1f}, {wall.material_id}, {azimuth:.0f} deg",
                                    context=context,
                                    site=site,
                                    requirements=requirements,
                                    geometry=geom,
                                    envelope=envelope,
                                    openings=solar_strat.openings,
                                    rooms=rooms,
                                    orientation_azimuth_deg=azimuth,
                                    shading_strategy_id=None,
                                    passive_strategies=solar_strat.passive_features,
                                    purpose_profile_id=purpose_profile.purpose_id,
                                    iteration_step=0,
                                    modification_rationale=f"SYNTHESIZED: {solar_mode}, AR={ar:.1f}, Azimuth={azimuth:.0f} deg"
                                )
                                all_candidates.append(candidate)
                                idx += 1

        if len(all_candidates) <= n_max:
            return all_candidates

        # Distribute sample evenly across all parameter combinations
        step = len(all_candidates) / float(n_max)
        selected_indices = [int(i * step) for i in range(n_max)]
        return [all_candidates[i] for i in selected_indices]

