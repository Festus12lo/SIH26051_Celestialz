"""
ThermoShelter — Design State Module
Machine-readable, immutable/serializable representation of a complete candidate shelter design,
including environmental, site, soil, geometric, fenestration, and envelope specifications.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, Any, Optional, List
import copy
import json
import math
import uuid


@dataclass
class ClimateContext:
    """Geographical and climatic context for the shelter."""
    location_id: str                   # e.g. 'LOC-IN-LEH'
    location_name: str                 # 'Leh'
    climate_zone: str                  # 'Cold-Arid (High Altitude Alpine)'
    latitude_deg: float                # 34.1526 (degrees North)
    longitude_deg: float               # 77.5771 (degrees East)
    elevation_m: float                 # 3500.0
    heating_degree_days_18C: float     # 4850.0
    cooling_degree_days_18C: float     # 45.0
    design_temp_min_C: float           # -17.2
    design_temp_max_C: float           # 27.9
    design_solar_peak_W_m2: float      # 1105.0
    weather_dataset_id: str            # 'WEA-IN-LEH-2026'
    site_condition_id: str             # 'SITE-LEH-HIGH-VALLEY'


@dataclass
class SiteState:
    """Environmental, ground, and geotechnical site conditions."""
    site_condition_id: str
    location_id: str
    terrain_type: str                  # 'High-altitude mountain valley plateau', 'Steep mountain ridge', etc.
    soil_classification: str           # Unified Soil Classification: 'GM-GP', 'CL-ML', 'SP-SM', 'Rock/Shale'
    soil_type: str                     # Descriptive soil category
    moisture_condition: str            # 'DRY', 'MOIST', 'SEASONAL_FROZEN', 'SATURATED'
    density_kg_m3: float               # Soil dry bulk density (e.g. 1800.0 kg/m³)
    thermal_conductivity_W_mK: float   # Soil thermal conductivity (e.g. 1.8 W/m·K)
    ground_temperature_C: float        # Mean annual sub-slab ground temperature (°C)
    ground_frost_depth_m: float        # Winter frost penetration depth (m)
    allowable_bearing_capacity_kPa: float # Presumptive safe bearing capacity (kPa, IS 1904)
    groundwater_depth_m: float         # Depth to water table (m)
    drainage_condition: str            # 'WELL_DRAINED', 'MODERATE', 'POOR'
    frost_risk: str                    # 'HIGH', 'MODERATE', 'LOW', 'NONE'
    slope_percent: float               # Topographic slope inclination (%)
    snow_load_kN_m2: float             # Ground snow load (kN/m², IS 875 Part 4)
    seismic_zone: str                  # 'Zone II', 'Zone IV', 'Zone V'
    source_id: str = "SRC-NBC-INDIA-2016"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SiteState":
        return cls(**data)


@dataclass
class UserRequirements:
    """User and statutory constraints for the shelter."""
    occupant_count: int = 2
    target_floor_area_m2: float = 24.0
    max_budget_tier: str = "STANDARD"  # 'EMERGENCY', 'LOW_COST', 'STANDARD', 'PREMIUM'
    local_material_preference: str = "LOCAL_PRIMARY" # 'LOCAL_PRIMARY', 'HYBRID', 'ANY'
    intended_use: str = "RESIDENTIAL_SHELTER"
    min_indoor_temp_target_C: float = 5.0
    ventilation_level: str = "low"     # 'sealed', 'low', 'medium', 'high'
    shading_level: str = "medium"      # 'none', 'low', 'medium', 'high'
    ground_condition: str = "soil"


@dataclass
class GeometryState:
    """Parametric dimensions and calculated areas."""
    geometry_id: str
    geometry_type: str                 # 'GEOM-TYPE-RECT-PITCHED', 'GEOM-TYPE-RECT-FLAT', etc.
    length_m: float
    width_m: float
    height_m: float
    roof_type: str                     # 'pitched', 'flat', 'gabled', 'skillion'
    roof_angle_deg: float
    
    # Calculated geometric properties
    floor_area_m2: float = field(init=False)
    gross_wall_area_m2: float = field(init=False)
    roof_area_m2: float = field(init=False)
    volume_m3: float = field(init=False)
    aspect_ratio: float = field(init=False)
    surface_to_volume_ratio: float = field(init=False)

    def __post_init__(self):
        if self.length_m <= 0 or self.width_m <= 0 or self.height_m <= 0:
            raise ValueError(f"Dimensions must be positive: L={self.length_m}, W={self.width_m}, H={self.height_m}")
        
        self.floor_area_m2 = round(self.length_m * self.width_m, 2)
        perimeter = 2.0 * (self.length_m + self.width_m)
        self.gross_wall_area_m2 = round(perimeter * self.height_m, 2)
        
        # Roof area calculation considering pitch
        rad = math.radians(self.roof_angle_deg)
        if self.roof_type in ["pitched", "gabled"]:
            self.roof_area_m2 = round(self.floor_area_m2 / math.cos(rad) if math.cos(rad) > 0.1 else self.floor_area_m2, 2)
        else:
            self.roof_area_m2 = round(self.floor_area_m2, 2)
            
        self.volume_m3 = round(self.floor_area_m2 * self.height_m, 2)
        self.aspect_ratio = round(self.length_m / self.width_m, 2) if self.width_m > 0 else 1.0
        
        total_surface = self.gross_wall_area_m2 + self.roof_area_m2 + self.floor_area_m2
        self.surface_to_volume_ratio = round(total_surface / self.volume_m3, 3) if self.volume_m3 > 0 else 0.0


@dataclass
class RoomItem:
    """Individual functional zone / room within the shelter."""
    room_id: str                       # e.g. 'ROOM-001'
    room_type: str                     # 'SLEEPING', 'LIVING', 'KITCHEN', 'STORAGE', 'SERVICE', 'TREATMENT', 'WAITING', 'ENTRY', 'SHARED'
    name: str                          # Display name e.g. 'Sleeping Zone'
    area_m2: float                     # Allocated area
    requires_window: bool = True
    requires_door: bool = True
    ventilation: str = "natural"       # 'natural', 'mechanical', 'cross_ventilation', 'minimal'
    privacy: str = "public"            # 'private', 'semi_private', 'public', 'service'


@dataclass
class OpeningItem:
    """Individual window, door, or ventilation opening."""
    opening_id: str
    opening_type: str                  # 'WINDOW', 'DOOR', 'RABSAL_SUNSPACE', 'VENTILATOR'
    orientation: str                   # 'North', 'South', 'East', 'West', 'Roof'
    width_m: float
    height_m: float
    area_m2: float
    u_value_W_m2K: float
    shgc: float
    glazing_type: str = "double"       # 'single', 'double', 'double_low_e', 'triple', 'solid_wood', 'solid_insulated'
    weather_stripped: bool = True


@dataclass
class EnvelopeAssemblies:
    """Selected composite assemblies for building envelope."""
    wall_assembly_id: str              # e.g. 'ASM-WALL-LADAKH-INS-MOD'
    wall_material_id: str              # e.g. 'MAT-CSEB'
    wall_thickness_mm: float           # e.g. 392.5
    wall_u_value_W_m2K: float          # e.g. 0.314

    roof_assembly_id: str              # e.g. 'ASM-ROOF-LADAKH-INS-MOD'
    roof_material_id: str              # e.g. 'MAT-XPS'
    roof_thickness_mm: float           # e.g. 153.0
    roof_u_value_W_m2K: float          # e.g. 0.250

    floor_assembly_id: str             # e.g. 'ASM-FLOOR-LADAKH-INS-SLAB'
    floor_material_id: str             # e.g. 'MAT-CONCRETE'
    floor_thickness_mm: float          # e.g. 180.0
    floor_u_value_W_m2K: float         # e.g. 0.444


@dataclass
class DesignState:
    """
    Unified, complete candidate shelter representation for simulation and optimization.
    """
    design_id: str
    design_name: str
    context: ClimateContext
    requirements: UserRequirements
    geometry: GeometryState
    envelope: EnvelopeAssemblies
    openings: List[OpeningItem] = field(default_factory=list)
    rooms: List[RoomItem] = field(default_factory=list)
    orientation_azimuth_deg: float = 180.0 # 180.0 = True South Front Facade (0=N, 90=E, 180=S, 270=W)
    shading_strategy_id: Optional[str] = None
    passive_strategies: List[str] = field(default_factory=list)
    site: Optional[SiteState] = None
    purpose_profile_id: str = "RESIDENTIAL_SHELTER"
    
    # Traceability & ML lineage
    iteration_step: int = 0
    parent_design_id: Optional[str] = None
    modification_rationale: str = "INITIAL_BASELINE"

    @property
    def total_opening_area_m2(self) -> float:
        return sum(op.area_m2 for op in self.openings)

    @property
    def usable_area_m2(self) -> float:
        """Sum of all room areas (usable area excluding circulation)."""
        return sum(r.area_m2 for r in self.rooms) if self.rooms else self.geometry.floor_area_m2

    @property
    def circulation_area_m2(self) -> float:
        """Gross floor area minus usable room area."""
        return max(0.0, self.geometry.floor_area_m2 - self.usable_area_m2)

    @property
    def net_wall_area_m2(self) -> float:
        return max(0.0, self.geometry.gross_wall_area_m2 - self.total_opening_area_m2)

    @property
    def south_window_area_m2(self) -> float:
        return sum(op.area_m2 for op in self.openings if op.orientation.lower() == "south")

    @property
    def north_window_area_m2(self) -> float:
        return sum(op.area_m2 for op in self.openings if op.orientation.lower() == "north")

    @property
    def south_wwr(self) -> float:
        south_wall = (self.geometry.length_m if self.orientation_azimuth_deg in [0, 180] else self.geometry.width_m) * self.geometry.height_m
        return self.south_window_area_m2 / south_wall if south_wall > 0 else 0.0

    @property
    def north_wwr(self) -> float:
        north_wall = (self.geometry.length_m if self.orientation_azimuth_deg in [0, 180] else self.geometry.width_m) * self.geometry.height_m
        return self.north_window_area_m2 / north_wall if north_wall > 0 else 0.0

    def to_simulation_config(self) -> Dict[str, Any]:
        """
        Convert DesignState to dictionary compatible with ThermalEngine.simulate_hourly().
        """
        window_area = sum(op.area_m2 for op in self.openings if op.opening_type in ['WINDOW', 'RABSAL_SUNSPACE'])
        door_area = sum(op.area_m2 for op in self.openings if op.opening_type == 'DOOR')
        
        # Weighted average window U-value and SHGC
        w_ops = [op for op in self.openings if op.opening_type in ['WINDOW', 'RABSAL_SUNSPACE']]
        if w_ops:
            avg_win_u = sum(op.u_value_W_m2K * op.area_m2 for op in w_ops) / window_area
            avg_shgc = sum(op.shgc * op.area_m2 for op in w_ops) / window_area
        else:
            avg_win_u = 2.8
            avg_shgc = 0.65

        # Ground thermal conductivity from SiteState if present, else fallback
        ground_k = self.site.thermal_conductivity_W_mK if self.site else 1.5

        return {
            "shelter_id": self.design_id,
            "shelter_name": self.design_name,
            "location": self.context.location_name,
            "latitude_deg": self.context.latitude_deg,
            "longitude_deg": self.context.longitude_deg,
            "shelter_length_m": self.geometry.length_m,
            "shelter_width_m": self.geometry.width_m,
            "shelter_height_m": self.geometry.height_m,
            "wall_material_id": self.envelope.wall_material_id,
            "wall_thickness_mm": self.envelope.wall_thickness_mm,
            "roof_material_id": self.envelope.roof_material_id,
            "roof_thickness_mm": self.envelope.roof_thickness_mm,
            "roof_type": self.geometry.roof_type,
            "roof_angle_deg": self.geometry.roof_angle_deg,
            "floor_material_id": self.envelope.floor_material_id,
            "floor_thickness_mm": self.envelope.floor_thickness_mm,
            "shelter_orientation_deg": self.orientation_azimuth_deg,
            "occupant_count": self.requirements.occupant_count,
            "ventilation_level": self.requirements.ventilation_level,
            "elevation_m": self.context.elevation_m,
            "shading_level": self.requirements.shading_level,
            "ground_condition": self.requirements.ground_condition,
            "design_type": self.requirements.intended_use,
            "window_area_m2": round(window_area, 2),
            "door_area_m2": round(door_area, 2),
            "window_u_value": round(avg_win_u, 2),
            "window_shgc": round(avg_shgc, 2),
            "ground_thermal_conductivity": ground_k
        }

    def copy(self) -> "DesignState":
        """Return a deep copy of this DesignState."""
        return copy.deepcopy(self)

    def with_mutation(
        self,
        rationale: str,
        geometry_changes: Optional[Dict[str, Any]] = None,
        envelope_changes: Optional[Dict[str, Any]] = None,
        openings_changes: Optional[List[OpeningItem]] = None,
        orientation_deg: Optional[float] = None,
        passive_strategies: Optional[List[str]] = None,
        ventilation_level: Optional[str] = None
    ) -> "DesignState":
        """
        Create a new DesignState with targeted mutations and incremented iteration step.
        """
        new_state = self.copy()
        new_state.parent_design_id = self.design_id
        new_state.design_id = f"DS-{uuid.uuid4().hex[:8].upper()}"
        new_state.iteration_step = self.iteration_step + 1
        new_state.modification_rationale = rationale

        if geometry_changes:
            new_geom = copy.copy(new_state.geometry)
            for k, v in geometry_changes.items():
                if hasattr(new_geom, k):
                    setattr(new_geom, k, v)
            new_geom.__post_init__()
            new_state.geometry = new_geom

        if envelope_changes:
            new_env = copy.copy(new_state.envelope)
            for k, v in envelope_changes.items():
                if hasattr(new_env, k):
                    setattr(new_env, k, v)
            new_state.envelope = new_env

        if openings_changes is not None:
            new_state.openings = openings_changes

        if orientation_deg is not None:
            new_state.orientation_azimuth_deg = orientation_deg

        if passive_strategies is not None:
            new_state.passive_strategies = passive_strategies

        if ventilation_level is not None:
            new_state.requirements.ventilation_level = ventilation_level

        return new_state

    def to_dict(self) -> Dict[str, Any]:
        """Serialize state to standard JSON dictionary."""
        d = asdict(self)
        return d

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DesignState":
        """Deserialize state from dictionary."""
        context = ClimateContext(**data["context"])
        requirements = UserRequirements(**data["requirements"])
        
        geom_data = copy.deepcopy(data["geometry"])
        # Remove calculated fields to re-initialize safely
        for key in ["floor_area_m2", "gross_wall_area_m2", "roof_area_m2", "volume_m3", "aspect_ratio", "surface_to_volume_ratio"]:
            geom_data.pop(key, None)
        geometry = GeometryState(**geom_data)
        
        envelope = EnvelopeAssemblies(**data["envelope"])
        openings = [OpeningItem(**op) for op in data.get("openings", [])]
        rooms = [RoomItem(**rm) for rm in data.get("rooms", [])]
        site = SiteState.from_dict(data["site"]) if data.get("site") else None
        
        return cls(
            design_id=data["design_id"],
            design_name=data["design_name"],
            context=context,
            requirements=requirements,
            geometry=geometry,
            envelope=envelope,
            openings=openings,
            rooms=rooms,
            orientation_azimuth_deg=data.get("orientation_azimuth_deg", 0.0),
            shading_strategy_id=data.get("shading_strategy_id"),
            passive_strategies=data.get("passive_strategies", []),
            site=site,
            purpose_profile_id=data.get("purpose_profile_id", "RESIDENTIAL_SHELTER"),
            iteration_step=data.get("iteration_step", 0),
            parent_design_id=data.get("parent_design_id"),
            modification_rationale=data.get("modification_rationale", "INITIAL_BASELINE")
        )
