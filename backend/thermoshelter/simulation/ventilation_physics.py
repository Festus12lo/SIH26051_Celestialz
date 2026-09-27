"""
ThermoShelter — Ventilation Physics Engine
Calculates Buoyancy-driven Airflow (Stack Effect) using exact thermodynamic physics.
"""

import math

class NaturalVentilationEngine:
    """
    Deterministic physics engine for natural ventilation.
    Implements buoyancy and stack effect equations based on solar/environmental states.
    """

    # Physical Constants
    GRAVITY = 9.81  # m/s^2
    SPECIFIC_GAS_CONSTANT_AIR = 287.05  # J/(kg·K)
    SEA_LEVEL_PRESSURE = 101325.0  # Pascals
    STANDARD_TEMPERATURE_K = 288.15  # 15°C
    TEMPERATURE_LAPSE_RATE = 0.0065  # K/m

    @classmethod
    def calculate_atmospheric_pressure(cls, elevation_m: float) -> float:
        """
        Calculates local atmospheric pressure using the barometric formula.
        Important for high-altitude contexts (e.g. Ladakh).
        """
        if elevation_m < 0:
            elevation_m = 0.0
            
        exponent = (cls.GRAVITY) / (cls.SPECIFIC_GAS_CONSTANT_AIR * cls.TEMPERATURE_LAPSE_RATE)
        base = 1.0 - (cls.TEMPERATURE_LAPSE_RATE * elevation_m) / cls.STANDARD_TEMPERATURE_K
        
        if base <= 0:
            return cls.SEA_LEVEL_PRESSURE # Fallback
            
        pressure = cls.SEA_LEVEL_PRESSURE * math.pow(base, exponent)
        return pressure

    @classmethod
    def calculate_air_density(cls, temperature_C: float, elevation_m: float) -> float:
        """
        Calculates exact air density ρ = P / (R * T)
        """
        temp_K = temperature_C + 273.15
        pressure_Pa = cls.calculate_atmospheric_pressure(elevation_m)
        rho = pressure_Pa / (cls.SPECIFIC_GAS_CONSTANT_AIR * temp_K)
        return rho

    @classmethod
    def calculate_stack_pressure(cls, height_diff_m: float, t_in_C: float, t_out_C: float, elevation_m: float = 0.0) -> float:
        """
        Calculates the Stack Effect Pressure differential (Δp).
        Equation: Δp = g * H * (1/T_out - 1/T_in) * (P_atm / R)
        where (P_atm / R) is equivalent to ρ_ref * T_ref.
        """
        if height_diff_m <= 0 or abs(t_in_C - t_out_C) < 0.1:
            return 0.0
            
        t_in_K = t_in_C + 273.15
        t_out_K = t_out_C + 273.15
        
        # Calculate local atmospheric pressure factor (P_atm / R)
        p_atm = cls.calculate_atmospheric_pressure(elevation_m)
        rho_ref_factor = p_atm / cls.SPECIFIC_GAS_CONSTANT_AIR
        
        delta_p = cls.GRAVITY * height_diff_m * ((1.0 / t_out_K) - (1.0 / t_in_K)) * rho_ref_factor
        return delta_p

    @classmethod
    def calculate_stack_velocity(cls, delta_p: float, t_in_C: float, elevation_m: float = 0.0, discharge_coeff: float = 0.65) -> float:
        """
        Calculates airflow velocity (m/s) using Bernoulli's equation.
        v = C_d * sqrt(2 * |Δp| / ρ_in)
        """
        if abs(delta_p) < 1e-4:
            return 0.0
            
        rho_in = cls.calculate_air_density(t_in_C, elevation_m)
        velocity = discharge_coeff * math.sqrt(2.0 * abs(delta_p) / rho_in)
        return velocity

    @classmethod
    def calculate_volumetric_flow(cls, velocity_m_s: float, effective_area_m2: float) -> float:
        """
        Calculates Volumetric Flow Rate (m³/s).
        Q = A * v
        """
        return effective_area_m2 * velocity_m_s

    @classmethod
    def simulate_stack_effect(
        cls,
        t_in_C: float,
        t_out_C: float,
        building_height_m: float,
        lower_opening_area_m2: float,
        upper_opening_area_m2: float,
        elevation_m: float = 0.0,
        discharge_coeff: float = 0.65
    ) -> dict:
        """
        Complete wrapper calculating Δp, velocity, and volumetric flow for a building.
        Handles the series area calculation A_eff = 1 / sqrt((1/A_lower^2) + (1/A_upper^2))
        """
        if lower_opening_area_m2 <= 0 or upper_opening_area_m2 <= 0:
            return {
                "pressure_diff_Pa": 0.0,
                "velocity_m_s": 0.0,
                "volumetric_flow_m3_s": 0.0,
                "air_changes_per_hour": 0.0
            }

        # Effective area of two openings in series
        a_eff = 1.0 / math.sqrt((1.0 / (lower_opening_area_m2 ** 2)) + (1.0 / (upper_opening_area_m2 ** 2)))

        delta_p = cls.calculate_stack_pressure(building_height_m, t_in_C, t_out_C, elevation_m)
        velocity = cls.calculate_stack_velocity(delta_p, t_in_C, elevation_m, discharge_coeff)
        flow_m3_s = cls.calculate_volumetric_flow(velocity, a_eff)

        # Retain sign to indicate flow direction (positive = out the top, negative = in the top)
        direction = 1.0 if delta_p > 0 else -1.0

        return {
            "pressure_diff_Pa": round(delta_p, 3),
            "velocity_m_s": round(velocity * direction, 3),
            "volumetric_flow_m3_s": round(flow_m3_s * direction, 3)
        }
