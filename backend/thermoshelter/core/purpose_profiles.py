"""
ThermoShelter — Purpose Profiles Module
Defines structured architectural requirements per shelter purpose type.
Each PurposeProfile specifies room programs, circulation ratios, ventilation,
privacy, and occupancy density requirements that physically influence
the generated architecture.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional


@dataclass
class RoomSpec:
    """Specification for a single functional zone within the shelter."""
    room_type: str          # 'SLEEPING', 'LIVING', 'KITCHEN', 'STORAGE', 'SERVICE', 'TREATMENT', 'WAITING', 'ENTRY', 'SHARED'
    name: str               # Display name
    area_fraction: float    # Fraction of usable area allocated to this zone (0.0–1.0)
    min_area_m2: float      # Absolute minimum area
    requires_window: bool   # Whether this zone requires natural light
    requires_door: bool     # Whether this zone requires a door to exterior or corridor
    ventilation: str        # 'natural', 'mechanical', 'cross_ventilation', 'minimal'
    privacy: str            # 'private', 'semi_private', 'public', 'service'


@dataclass
class PurposeProfile:
    """Architectural program requirements for a shelter purpose type."""
    purpose_id: str
    display_name: str
    description: str
    
    # Spatial standards
    area_per_occupant_m2: float     # NBC / SPHERE standard (m²/person)
    min_total_area_m2: float        # Absolute minimum regardless of occupancy
    circulation_ratio: float         # Fraction of gross area for circulation (0.05–0.25)
    
    # Room program
    room_specs: List[RoomSpec] = field(default_factory=list)
    
    # Architectural requirements
    min_doors_exterior: int = 1
    min_windows: int = 1
    min_ceiling_height_m: float = 2.7
    max_construction_complexity: str = 'STANDARD'  # 'SIMPLE', 'STANDARD', 'COMPLEX'
    modularity: str = 'FIXED'                       # 'FIXED', 'MODULAR', 'DEMOUNTABLE'
    
    # Thermal and ventilation
    ventilation_requirement: str = 'low'  # 'sealed', 'low', 'medium', 'high'
    privacy_level: str = 'standard'       # 'minimal', 'standard', 'high'
    
    # Design intent
    primary_design_intent: str = ''
    
    def get_room_program(self, occupants: int, usable_area_m2: float) -> List[Dict[str, Any]]:
        """
        Generate a concrete room program for the given occupancy and available area.
        Returns list of room dicts with computed areas.
        """
        rooms = []
        remaining_area = usable_area_m2
        
        for i, spec in enumerate(self.room_specs):
            allocated = max(spec.min_area_m2, usable_area_m2 * spec.area_fraction)
            allocated = min(allocated, remaining_area)
            remaining_area -= allocated
            
            rooms.append({
                'room_id': f'ROOM-{i+1:03d}',
                'room_type': spec.room_type,
                'name': spec.name,
                'area_m2': round(allocated, 1),
                'requires_window': spec.requires_window,
                'requires_door': spec.requires_door,
                'ventilation': spec.ventilation,
                'privacy': spec.privacy,
            })
        
        return rooms


# ============================================================
# CANONICAL PURPOSE PROFILES
# ============================================================

EMERGENCY_PROFILE = PurposeProfile(
    purpose_id='EMERGENCY_SHELTER',
    display_name='Emergency Disaster Relief',
    description='Rapid-deployment disaster relief shelter prioritizing speed of construction, modularity, and basic thermal protection.',
    area_per_occupant_m2=3.5,
    min_total_area_m2=14.0,
    circulation_ratio=0.08,
    room_specs=[
        RoomSpec('SHARED', 'Main Shelter Space', 0.75, 10.0, True, True, 'natural', 'public'),
        RoomSpec('SERVICE', 'Service / Storage Zone', 0.15, 2.0, False, False, 'minimal', 'service'),
        RoomSpec('ENTRY', 'Entry Vestibule', 0.10, 1.5, False, True, 'natural', 'public'),
    ],
    min_doors_exterior=1,
    min_windows=2,
    min_ceiling_height_m=2.7,
    max_construction_complexity='SIMPLE',
    modularity='MODULAR',
    ventilation_requirement='low',
    privacy_level='minimal',
    primary_design_intent='Rapid construction, modularity, high usable-area efficiency, robust envelope, emergency access.',
)

RESIDENTIAL_PROFILE = PurposeProfile(
    purpose_id='RESIDENTIAL_SHELTER',
    display_name='Residential Family Dwelling',
    description='Permanent or semi-permanent family residence with sleeping, living, cooking, and storage provisions.',
    area_per_occupant_m2=5.0,
    min_total_area_m2=18.0,
    circulation_ratio=0.12,
    room_specs=[
        RoomSpec('SLEEPING', 'Sleeping Zone', 0.35, 6.0, True, True, 'natural', 'private'),
        RoomSpec('LIVING', 'Living / Common Area', 0.30, 5.0, True, True, 'natural', 'semi_private'),
        RoomSpec('KITCHEN', 'Kitchen / Cooking Zone', 0.15, 3.0, True, False, 'cross_ventilation', 'service'),
        RoomSpec('STORAGE', 'Storage Area', 0.10, 2.0, False, False, 'minimal', 'service'),
        RoomSpec('ENTRY', 'Entry Vestibule', 0.10, 1.5, False, True, 'natural', 'public'),
    ],
    min_doors_exterior=2,
    min_windows=4,
    min_ceiling_height_m=2.8,
    max_construction_complexity='STANDARD',
    modularity='FIXED',
    ventilation_requirement='medium',
    privacy_level='high',
    primary_design_intent='Long-duration thermal comfort with sleeping, living, cooking, storage, privacy, daylight, and ventilation.',
)

COMMUNITY_PROFILE = PurposeProfile(
    purpose_id='COMMUNITY_CENTER',
    display_name='Community Alpine Center',
    description='Shared community space for gatherings, meetings, and shelter with higher occupancy and accessibility.',
    area_per_occupant_m2=2.5,
    min_total_area_m2=25.0,
    circulation_ratio=0.18,
    room_specs=[
        RoomSpec('SHARED', 'Main Community Hall', 0.60, 15.0, True, True, 'cross_ventilation', 'public'),
        RoomSpec('SERVICE', 'Service / Utility Zone', 0.15, 3.0, False, True, 'mechanical', 'service'),
        RoomSpec('STORAGE', 'Storage / Equipment', 0.10, 2.5, False, False, 'minimal', 'service'),
        RoomSpec('ENTRY', 'Entry / Vestibule', 0.15, 3.0, True, True, 'natural', 'public'),
    ],
    min_doors_exterior=2,
    min_windows=6,
    min_ceiling_height_m=3.0,
    max_construction_complexity='STANDARD',
    modularity='FIXED',
    ventilation_requirement='high',
    privacy_level='minimal',
    primary_design_intent='Shared space, circulation, higher occupancy, accessibility, emergency egress.',
)

MEDICAL_PROFILE = PurposeProfile(
    purpose_id='MEDICAL_SHELTER',
    display_name='Medical / First Aid Station',
    description='Clinical or first-aid shelter with treatment zones, hygiene, and staff areas.',
    area_per_occupant_m2=4.0,
    min_total_area_m2=20.0,
    circulation_ratio=0.20,
    room_specs=[
        RoomSpec('TREATMENT', 'Treatment / Examination Zone', 0.40, 8.0, True, True, 'cross_ventilation', 'semi_private'),
        RoomSpec('WAITING', 'Patient Waiting Area', 0.20, 4.0, True, True, 'natural', 'public'),
        RoomSpec('SERVICE', 'Staff / Supply Room', 0.20, 3.0, True, True, 'mechanical', 'private'),
        RoomSpec('STORAGE', 'Medical Supply Storage', 0.10, 2.0, False, False, 'minimal', 'service'),
        RoomSpec('ENTRY', 'Accessible Entry', 0.10, 2.0, True, True, 'natural', 'public'),
    ],
    min_doors_exterior=2,
    min_windows=5,
    min_ceiling_height_m=2.9,
    max_construction_complexity='STANDARD',
    modularity='MODULAR',
    ventilation_requirement='high',
    privacy_level='high',
    primary_design_intent='Treatment zone, circulation, hygiene, ventilation, privacy, staff/service area, accessibility.',
)

TEMPORARY_PROFILE = PurposeProfile(
    purpose_id='TEMPORARY_SHELTER',
    display_name='Temporary / Relief Shelter',
    description='Short-duration transportable shelter with low assembly complexity and rapid deployment.',
    area_per_occupant_m2=3.0,
    min_total_area_m2=12.0,
    circulation_ratio=0.06,
    room_specs=[
        RoomSpec('SHARED', 'Main Shelter Space', 0.80, 9.0, True, True, 'natural', 'public'),
        RoomSpec('STORAGE', 'Kit Storage Zone', 0.20, 2.0, False, False, 'minimal', 'service'),
    ],
    min_doors_exterior=1,
    min_windows=2,
    min_ceiling_height_m=2.5,
    max_construction_complexity='SIMPLE',
    modularity='DEMOUNTABLE',
    ventilation_requirement='low',
    privacy_level='minimal',
    primary_design_intent='Transportability, modular construction, low assembly complexity, rapid deployment, demountability.',
)

EDUCATIONAL_PROFILE = PurposeProfile(
    purpose_id='EDUCATIONAL',
    display_name='Classroom / Educational',
    description='Learning space with natural lighting, ventilation, and adequate area for seated students.',
    area_per_occupant_m2=2.5,
    min_total_area_m2=25.0,
    circulation_ratio=0.15,
    room_specs=[
        RoomSpec('SHARED', 'Classroom / Learning Hall', 0.65, 16.0, True, True, 'cross_ventilation', 'public'),
        RoomSpec('STORAGE', 'Teaching Materials Storage', 0.15, 3.0, False, False, 'minimal', 'service'),
        RoomSpec('ENTRY', 'Entry / Corridor', 0.20, 4.0, True, True, 'natural', 'public'),
    ],
    min_doors_exterior=2,
    min_windows=6,
    min_ceiling_height_m=3.0,
    max_construction_complexity='STANDARD',
    modularity='FIXED',
    ventilation_requirement='high',
    privacy_level='minimal',
    primary_design_intent='Natural daylight, cross-ventilation, acoustic comfort, adequate learning space.',
)

WORKER_ACCOMMODATION_PROFILE = PurposeProfile(
    purpose_id='WORKER_ACCOMMODATION',
    display_name='Worker Accommodation',
    description='Multi-occupant worker housing with sleeping quarters, shared amenities, and storage.',
    area_per_occupant_m2=4.0,
    min_total_area_m2=16.0,
    circulation_ratio=0.10,
    room_specs=[
        RoomSpec('SLEEPING', 'Sleeping Quarters', 0.50, 8.0, True, True, 'natural', 'semi_private'),
        RoomSpec('LIVING', 'Common / Dining Area', 0.25, 4.0, True, True, 'natural', 'public'),
        RoomSpec('STORAGE', 'Personal Storage', 0.15, 2.0, False, False, 'minimal', 'semi_private'),
        RoomSpec('ENTRY', 'Entry', 0.10, 1.5, False, True, 'natural', 'public'),
    ],
    min_doors_exterior=1,
    min_windows=3,
    min_ceiling_height_m=2.7,
    max_construction_complexity='SIMPLE',
    modularity='MODULAR',
    ventilation_requirement='medium',
    privacy_level='standard',
    primary_design_intent='Multi-occupant sleeping quarters with shared amenities, durable construction, reasonable privacy.',
)

STANDARD_HOUSE_PROFILE = PurposeProfile(
    purpose_id='STANDARD_HOUSE',
    display_name='Standard House (Hall & Kitchen)',
    description='A standard independent house featuring a dedicated hall, kitchen, and sleeping quarters.',
    area_per_occupant_m2=6.0,
    min_total_area_m2=30.0,
    circulation_ratio=0.15,
    room_specs=[
        RoomSpec('LIVING', 'Hall / Living', 0.40, 10.0, True, True, 'natural', 'public'),
        RoomSpec('SLEEPING', 'Master Bedroom', 0.30, 9.0, True, True, 'natural', 'private'),
        RoomSpec('KITCHEN', 'Kitchen', 0.15, 5.0, True, False, 'cross_ventilation', 'service'),
        RoomSpec('SERVICE', 'Bathroom', 0.05, 3.0, False, True, 'mechanical', 'private'),
        RoomSpec('ENTRY', 'Foyer', 0.10, 2.0, False, True, 'natural', 'public'),
    ],
    min_doors_exterior=2,
    min_windows=5,
    min_ceiling_height_m=2.8,
    max_construction_complexity='STANDARD',
    modularity='FIXED',
    ventilation_requirement='medium',
    privacy_level='high',
    primary_design_intent='Standard single-family independent house layout.',
)

DUPLEX_PROFILE = PurposeProfile(
    purpose_id='DUPLEX_HOUSE',
    display_name='Duplex Blueprint',
    description='A two-story connected dwelling unit with separated public and private zones.',
    area_per_occupant_m2=8.0,
    min_total_area_m2=50.0,
    circulation_ratio=0.20,
    room_specs=[
        RoomSpec('LIVING', 'Main Hall', 0.30, 15.0, True, True, 'natural', 'public'),
        RoomSpec('KITCHEN', 'Kitchen & Dining', 0.20, 10.0, True, False, 'cross_ventilation', 'service'),
        RoomSpec('SLEEPING', 'Master Suite', 0.25, 12.0, True, True, 'natural', 'private'),
        RoomSpec('SLEEPING', 'Guest Room', 0.15, 8.0, True, True, 'natural', 'private'),
        RoomSpec('SERVICE', 'Bathrooms', 0.10, 5.0, False, True, 'mechanical', 'private'),
    ],
    min_doors_exterior=2,
    min_windows=8,
    min_ceiling_height_m=3.0,
    max_construction_complexity='COMPLEX',
    modularity='FIXED',
    ventilation_requirement='medium',
    privacy_level='high',
    primary_design_intent='Two-story family duplex with connected zones.',
)

APARTMENT_PROFILE = PurposeProfile(
    purpose_id='APARTMENT_COMPLEX',
    display_name='Apartment Unit',
    description='A standardized flat within a multi-story apartment block.',
    area_per_occupant_m2=5.0,
    min_total_area_m2=40.0,
    circulation_ratio=0.15,
    room_specs=[
        RoomSpec('LIVING', 'Living & Dining', 0.35, 12.0, True, True, 'natural', 'public'),
        RoomSpec('SLEEPING', 'Primary Bedroom', 0.25, 10.0, True, True, 'natural', 'private'),
        RoomSpec('SLEEPING', 'Secondary Bedroom', 0.15, 8.0, True, True, 'natural', 'private'),
        RoomSpec('KITCHEN', 'Kitchenette', 0.15, 6.0, True, False, 'mechanical', 'service'),
        RoomSpec('SERVICE', 'Washroom', 0.10, 4.0, False, True, 'mechanical', 'private'),
    ],
    min_doors_exterior=1,
    min_windows=4,
    min_ceiling_height_m=2.8,
    max_construction_complexity='COMPLEX',
    modularity='FIXED',
    ventilation_requirement='medium',
    privacy_level='high',
    primary_design_intent='Standard apartment block flat.',
)

# ============================================================
# REGISTRY
# ============================================================

PURPOSE_REGISTRY: Dict[str, PurposeProfile] = {
    'EMERGENCY_SHELTER': EMERGENCY_PROFILE,
    'RESIDENTIAL_SHELTER': RESIDENTIAL_PROFILE,
    'COMMUNITY_CENTER': COMMUNITY_PROFILE,
    'MEDICAL_SHELTER': MEDICAL_PROFILE,
    'TEMPORARY_SHELTER': TEMPORARY_PROFILE,
    'EDUCATIONAL': EDUCATIONAL_PROFILE,
    'WORKER_ACCOMMODATION': WORKER_ACCOMMODATION_PROFILE,
    'STANDARD_HOUSE': STANDARD_HOUSE_PROFILE,
    'DUPLEX_HOUSE': DUPLEX_PROFILE,
    'APARTMENT_COMPLEX': APARTMENT_PROFILE,
}

# Alias mapping for user-facing purpose strings
PURPOSE_ALIASES: Dict[str, str] = {
    'emergency_shelter': 'EMERGENCY_SHELTER',
    'residential_shelter': 'RESIDENTIAL_SHELTER',
    'community_center': 'COMMUNITY_CENTER',
    'medical_shelter': 'MEDICAL_SHELTER',
    'temporary_shelter': 'TEMPORARY_SHELTER',
    'school': 'EDUCATIONAL',
    'educational': 'EDUCATIONAL',
    'worker_accommodation': 'WORKER_ACCOMMODATION',
    'standard_house': 'STANDARD_HOUSE',
    'duplex_house': 'DUPLEX_HOUSE',
    'apartment_complex': 'APARTMENT_COMPLEX',
}


def get_purpose_profile(purpose: str) -> PurposeProfile:
    """
    Resolve a purpose string (user-facing or internal) to a PurposeProfile.
    Falls back to RESIDENTIAL_SHELTER if unrecognized.
    """
    key = PURPOSE_ALIASES.get(purpose.lower().strip(), purpose.upper().strip())
    return PURPOSE_REGISTRY.get(key, RESIDENTIAL_PROFILE)
