"""
ThermoShelter — Natural Language Interface & Architectural Explainer
Converts human natural-language design briefs into structured ShelterRequests
and generates evidence-based architectural trade-off narratives.
NO thermodynamic calculations or code rules are performed here; engineering decisions
remain strictly grounded in physics simulation and statutory validator engines.
"""

import re
from typing import Dict, Any, List, Optional
from .user_input import ShelterRequest


class NaturalLanguageInterpreter:
    """
    Parses unstructured text briefs into structured ShelterRequests.
    """

    LOCATION_KEYWORDS = {
        "LEH": "Leh",
        "LADAKH": "Leh",
        "SHIMLA": "Shimla",
        "HIMACHAL": "Shimla",
        "MANALI": "Shimla",
        "JAIPUR": "Jaipur",
        "RAJASTHAN": "Jaipur",
        "DESERT": "Jaipur",
        "KARUR": "Karur",
        "TAMIL NADU": "Karur",
        "SOUTH INDIA": "Karur",
    }

    PURPOSE_KEYWORDS = {
        "EMERGENCY": "emergency_shelter",
        "DISASTER": "emergency_shelter",
        "REFUGEE": "emergency_shelter",
        "RELIEF": "emergency_shelter",
        "RESIDENTIAL": "residential_shelter",
        "HOME": "residential_shelter",
        "FAMILY": "residential_shelter",
        "HOUSE": "residential_shelter",
        "COMMUNITY": "community_center",
        "HALL": "community_center",
        "SCHOOL": "school",
        "CLASSROOM": "school",
        "CLINIC": "emergency_shelter",
    }

    OBJECTIVE_KEYWORDS = {
        "WARMTH": "winter_warmth",
        "WINTER": "winter_warmth",
        "COLD": "winter_warmth",
        "FREEZE": "winter_warmth",
        "HEATING": "winter_warmth",
        "COOL": "summer_cooling",
        "COOLING": "summer_cooling",
        "SUMMER": "summer_cooling",
        "HOT": "summer_cooling",
        "HEAT": "summer_cooling",
        "BALANCED": "balanced",
        "MODERATE": "balanced",
        "YEAR-ROUND": "balanced",
    }

    @classmethod
    def parse_natural_language_request(cls, text: str) -> ShelterRequest:
        """
        Parses free-form natural language query into a typed ShelterRequest.
        """
        text_upper = text.upper()

        # 1. Extract Location
        location = "Leh"  # Default
        for kw, loc_val in cls.LOCATION_KEYWORDS.items():
            if kw in text_upper:
                location = loc_val
                break

        # 2. Extract Occupancy
        occupants = 4  # Default
        # Match patterns like "for 6 people", "4 occupants", "family of 5", "8 refugees"
        occ_match = re.search(r'(\d+)\s*(?:PEOPLE|PERSON|PERSONS|OCCUPANTS|OCCUPANCY|REFUGEES|BEDS|SOULS|MEMBERS)', text_upper)
        if occ_match:
            occupants = int(occ_match.group(1))
        else:
            family_match = re.search(r'FAMILY OF\s*(\d+)', text_upper)
            if family_match:
                occupants = int(family_match.group(1))

        # Clamp occupants [1, 20]
        occupants = max(1, min(20, occupants))

        # 3. Extract Purpose
        purpose = "emergency_shelter" if ("EMERGENCY" in text_upper or "DISASTER" in text_upper or "REFUGEE" in text_upper) else "residential_shelter"
        for kw, purp_val in cls.PURPOSE_KEYWORDS.items():
            if kw in text_upper:
                purpose = purp_val
                break

        # 4. Extract Thermal Objective
        if location in ("Leh", "Shimla"):
            thermal_objective = "winter_warmth"
        elif location == "Jaipur":
            thermal_objective = "summer_cooling"
        else:
            thermal_objective = "balanced"

        for kw, obj_val in cls.OBJECTIVE_KEYWORDS.items():
            if kw in text_upper:
                thermal_objective = obj_val
                break

        # 5. Extract Floor Area if specified (e.g. "24 m²", "30 sq m", "40 sqm")
        area_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:M2|SQM|SQ M|SQUARE METRES|SQUARE METERS)', text_upper)
        preferred_area = float(area_match.group(1)) if area_match else max(14.0, occupants * 6.0)

        return ShelterRequest(
            location=location,
            occupants=occupants,
            purpose=purpose,
            thermal_objective=thermal_objective,
            preferred_area_m2=preferred_area
        )


class ArchitecturalExplainer:
    """
    Generates multi-faceted evidence-based narratives explaining design decisions and trade-offs.
    """

    @classmethod
    def explain_design_decision(
        cls,
        design,
        performance,
        comfort,
        multi_obj
    ) -> str:
        """
        Synthesize detailed engineering rationale for a specific design candidate.
        """
        geom = design.geometry
        env = design.envelope
        azimuth = design.orientation_azimuth_deg
        solar_kwh = performance.total_solar_gain_kWh.value
        loss_kwh = performance.total_conductive_heat_loss_kWh.value
        lift_c = performance.temperature_lift_C.value

        sentences = [
            f"This design achieves a +{lift_c:.1f}°C temperature lift over ambient outdoor freeze conditions.",
            f"Facing {azimuth:.0f}° True South allows the {geom.length_m}m long glazed facade to capture {solar_kwh:.1f} kWh of winter solar radiation.",
            f"The {env.wall_material_id} wall assembly (U={env.wall_u_value_W_m2K:.3f} W/m²K) restricts conductive heat loss to {loss_kwh:.1f} kWh.",
            f"The thermal buffer index of {comfort.thermal_buffer_index:.2f} stabilizes indoor temperatures to an average of {performance.avg_indoor_temp_C.value:.1f}°C.",
            f"Multi-objective composite score: {multi_obj.composite_utility_score:.1f}/100 (Comfort: {multi_obj.comfort_score:.0f}, Solar: {multi_obj.solar_efficiency_score:.0f}, Cost: {multi_obj.economic_cost_score:.0f}, Carbon: {multi_obj.embodied_carbon_score:.0f})."
        ]

        return " ".join(sentences)

    @classmethod
    def explain_archetype_trade_offs(cls, alternatives: List[Any]) -> str:
        """
        Generate high-level comparison narrative across the 5 architectural archetypes.
        """
        lines = [
            "Architectural Archetype Trade-Off Comparison:",
            "- High-Performance Passive Optimal: Maximum solar gain and thermal buffer stability using premium thermal envelope assemblies.",
            "- Low-Cost Modular: Maximizes affordability and construction simplicity with standardized modular dimensions.",
            "- Vernacular Heritage: Uses 100% locally sourced unbaked earth and thatch with zero imported embodied carbon.",
            "- Rapid Emergency: Lightweight prefabricated dry assembly for immediate post-disaster life-safety.",
            "- Balanced Constructability: Best all-around compromise of thermal performance, durability, and straightforward buildability."
        ]
        return "\n".join(lines)
