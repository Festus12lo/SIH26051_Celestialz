"""
ThermoShelter — Design Orchestrator
Wires together Model B (Geometry), Model C (Passive Solar), Model A (Envelope)
and the PhysicsBridge to generate a complete DesignState.
"""

from typing import Dict, Any, Optional
import uuid
from ..core.design_state import DesignState, ClimateContext, SiteState, UserRequirements, GeometryState, RoomItem
from ..core.purpose_profiles import get_purpose_profile
from .physics_bridge import PhysicsBridge, SyntheticWeatherProvider
from ..models.model_b_geometry import ModelB_GeometryDesigner
from ..models.model_c_passive_solar import ModelC_PassiveSolarDesigner
from ..models.model_a_envelope import ModelA_EnvelopeSelector

class DesignOrchestrator:
    def __init__(self):
        self.model_b = ModelB_GeometryDesigner()
        self.model_c = ModelC_PassiveSolarDesigner()
        self.model_a = ModelA_EnvelopeSelector()

    def generate_design(
        self,
        climate_context: ClimateContext,
        site_state: SiteState,
        user_reqs: UserRequirements,
        design_name: str = "Optimized Thermo-Shelter"
    ) -> DesignState:
        
        # 1. Geometry (Model B)
        dim_plan = self.model_b.design_geometry(climate_context, site_state, user_reqs)
        geometry_state = self.model_b.to_geometry_state(dim_plan)
        
        # Room Program
        profile = get_purpose_profile(user_reqs.intended_use)
        rooms = self.model_b.generate_room_program(profile, user_reqs.occupant_count, dim_plan.floor_area_m2)
        
        # 2. Passive Solar (Model C)
        solar_strat = self.model_c.design_passive_solar(climate_context, geometry_state)
        
        # 3. Envelope Materials (Model A)
        env_selection = self.model_a.select_envelope(
            climate_context,
            budget_tier=user_reqs.max_budget_tier,
            material_preference=user_reqs.local_material_preference
        )
        envelope_assemblies = self.model_a.build_envelope_assemblies(
            env_selection["wall"], env_selection["roof"], env_selection["floor"]
        )
        
        # Assemble initial Design State
        design = DesignState(
            design_id=f"DS-{uuid.uuid4().hex[:8].upper()}",
            design_name=design_name,
            context=climate_context,
            requirements=user_reqs,
            geometry=geometry_state,
            envelope=envelope_assemblies,
            openings=solar_strat.openings,
            rooms=rooms,
            orientation_azimuth_deg=solar_strat.azimuth_deg,
            shading_strategy_id="OVERHANG",
            passive_strategies=solar_strat.passive_features,
            site=site_state,
            purpose_profile_id=user_reqs.intended_use,
            iteration_step=1,
            modification_rationale="Initial AI generation via Orchestrator."
        )
        
        return design

    def simulate_design(self, design: DesignState) -> Dict[str, Any]:
        """
        Run the PhysicsBridge on the design to generate the PerformanceVector.
        """
        weather_provider = SyntheticWeatherProvider()
        bridge = PhysicsBridge(weather_provider)
        
        # Simulate 1 week
        sim_results, perf_vector = bridge.simulate_with_timeseries(design, duration_days=7)
        return {
            "design": design,
            "performance": perf_vector,
            "timeseries": sim_results
        }
