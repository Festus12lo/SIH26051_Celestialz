"""
ThermoShelter — User Input Module
Translates user-friendly shelter requests into internal design requirements.
No ML features, model names, or internal engineering details are exposed.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List


@dataclass
class ShelterRequest:
    """
    User-facing shelter design request.
    Contains ONLY the practical information a non-technical user would provide.
    """
    # REQUIRED
    location: str                          # "Leh", "Shimla", "Jaipur", "Karur"
    occupants: int = 4                     # Number of people
    purpose: str = "residential_shelter"   # "emergency_shelter", "residential_shelter", "community_center", "school"
    thermal_objective: str = "balanced"    # "winter_warmth", "summer_cooling", "balanced"

    # OPTIONAL — system derives sensible defaults if not provided
    preferred_area_m2: Optional[float] = None        # Approximate desired floor area
    max_area_m2: Optional[float] = None              # Maximum allowed shelter area
    preferred_material: Optional[str] = None          # "stone", "rammed_earth", "cseb", "timber", "brick", "any"
    window_preference: Optional[str] = None           # "minimal", "moderate", "large_south", "any"
    design_constraints: Optional[List[str]] = None    # Free-form constraints

    def __post_init__(self):
        if self.occupants < 1:
            raise ValueError("Shelter must accommodate at least 1 occupant.")
        if self.thermal_objective not in ("winter_warmth", "summer_cooling", "balanced"):
            raise ValueError(f"Invalid thermal_objective: {self.thermal_objective}")
        if self.preferred_area_m2 is not None and self.preferred_area_m2 <= 0:
            raise ValueError("preferred_area_m2 must be positive.")


class RequestInterpreter:
    """
    Converts a user-facing ShelterRequest into internal UserRequirements
    and derives missing parameters from location, climate, and purpose.
    """

    # Minimum floor area per occupant (m²) by purpose — based on NBC India / SPHERE standards
    AREA_PER_OCCUPANT = {
        "emergency_shelter": 3.5,
        "residential_shelter": 6.0,
        "community_center": 4.0,
        "school": 5.0,
    }

    PURPOSE_MAP = {
        "emergency_shelter": "EMERGENCY_SHELTER",
        "residential_shelter": "RESIDENTIAL_SHELTER",
        "community_center": "COMMUNITY_CENTER",
        "school": "EDUCATIONAL",
    }

    BUDGET_TIER_MAP = {
        "emergency_shelter": "EMERGENCY",
        "residential_shelter": "STANDARD",
        "community_center": "STANDARD",
        "school": "STANDARD",
    }

    MATERIAL_PREFERENCE_MAP = {
        "stone": "LOCAL_PRIMARY",
        "rammed_earth": "LOCAL_PRIMARY",
        "cseb": "LOCAL_PRIMARY",
        "timber": "HYBRID",
        "brick": "ANY",
        "any": "ANY",
        None: "LOCAL_PRIMARY",
    }

    @classmethod
    def derive_floor_area(cls, request: ShelterRequest) -> float:
        """Derive target floor area from occupants and purpose if not specified."""
        if request.preferred_area_m2 is not None:
            return request.preferred_area_m2
        per_person = cls.AREA_PER_OCCUPANT.get(request.purpose, 5.0)
        return round(max(per_person * request.occupants, 9.0), 1)  # Minimum 9 m²

    @classmethod
    def derive_thermal_parameters(cls, request: ShelterRequest, is_cold_climate: bool) -> Dict[str, Any]:
        """
        Derive internal thermal parameters from user's thermal objective.
        The user says "winter warmth" — we translate to engineering targets.
        """
        if request.thermal_objective == "winter_warmth":
            return {
                "min_indoor_temp_target_C": 5.0 if is_cold_climate else 18.0,
                "ventilation_level": "low",
                "shading_level": "low",
            }
        elif request.thermal_objective == "summer_cooling":
            return {
                "min_indoor_temp_target_C": 20.0,
                "ventilation_level": "high",
                "shading_level": "high",
            }
        else:  # balanced
            return {
                "min_indoor_temp_target_C": 10.0 if is_cold_climate else 20.0,
                "ventilation_level": "medium" if not is_cold_climate else "low",
                "shading_level": "medium",
            }

    @classmethod
    def interpret(cls, request: ShelterRequest, is_cold_climate: bool = True) -> Dict[str, Any]:
        """
        Full interpretation: ShelterRequest → dict of UserRequirements parameters.
        """
        area = cls.derive_floor_area(request)
        thermal = cls.derive_thermal_parameters(request, is_cold_climate)

        return {
            "occupant_count": request.occupants,
            "target_floor_area_m2": area,
            "max_budget_tier": cls.BUDGET_TIER_MAP.get(request.purpose, "STANDARD"),
            "local_material_preference": cls.MATERIAL_PREFERENCE_MAP.get(request.preferred_material, "LOCAL_PRIMARY"),
            "intended_use": cls.PURPOSE_MAP.get(request.purpose, "RESIDENTIAL_SHELTER"),
            "min_indoor_temp_target_C": thermal["min_indoor_temp_target_C"],
            "ventilation_level": thermal["ventilation_level"],
            "shading_level": thermal["shading_level"],
            "ground_condition": "soil",
        }
