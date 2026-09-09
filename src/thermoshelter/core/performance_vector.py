"""
ThermoShelter — Performance Vector Module
Represents standardized physical and engineering performance metrics produced
by physics simulation and engineering validation.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, Any, Optional, List


@dataclass
class MetricValue:
    """Represents a single physical performance metric with unit and status."""
    name: str
    value: float
    unit: str
    source: str
    status: str  # 'SIMULATED', 'CALCULATED', 'MEASURED', 'UNAVAILABLE'
    description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class PerformanceVector:
    """
    Standardized, transparent performance vector.
    Contains ONLY metrics that are actually calculated by the physics simulation
    and engineering validation layer.
    """
    # Core Thermal Metrics
    avg_indoor_temp_C: MetricValue
    min_indoor_temp_C: MetricValue
    max_indoor_temp_C: MetricValue
    temperature_lift_C: MetricValue          # (Avg Indoor - Avg Outdoor)
    diurnal_temperature_swing_C: MetricValue # (Max Indoor - Min Indoor)
    hours_below_5C: MetricValue             # Cold risk hours
    hours_acceptable_comfort: MetricValue    # Hours within acceptable band (e.g. 5C to 25C)
    
    # Envelope Heat Flows & Resistances
    peak_wall_heat_flux_W_m2: MetricValue
    total_conductive_heat_loss_kWh: MetricValue
    total_solar_gain_kWh: MetricValue
    total_ventilation_heat_loss_kWh: MetricValue
    
    # Building Physics Capacitance & Dynamics
    effective_thermal_capacitance_MJ_K: MetricValue
    thermal_time_constant_hours: MetricValue
    
    # Envelope Effective U-Values
    wall_u_value_W_m2K: MetricValue
    roof_u_value_W_m2K: MetricValue
    floor_u_value_W_m2K: MetricValue
    
    # Validation & Simulation Metadata
    simulation_status: str                   # 'CONVERGED', 'UNSTABLE', 'FAILED'
    energy_balance_max_error_W: float
    constraint_violations: List[str] = field(default_factory=list)
    raw_simulation_hours: int = 0
    
    # Ventilation Physics (Stack Effect)
    peak_stack_velocity_m_s: Optional[MetricValue] = None
    peak_stack_flow_m3_s: Optional[MetricValue] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert performance vector to serializable dictionary."""
        data = {}
        for k, v in self.__dict__.items():
            if isinstance(v, MetricValue):
                data[k] = v.to_dict()
            else:
                data[k] = v
        return data

    @classmethod
    def from_simulation_results(
        cls,
        hourly_results: List[Dict[str, Any]],
        wall_u: float,
        roof_u: float,
        floor_u: float,
        capacitance_J_K: float,
        time_constant_hours: float,
        constraint_violations: Optional[List[str]] = None,
        peak_stack_velocity_m_s: Optional[MetricValue] = None,
        peak_stack_flow_m3_s: Optional[MetricValue] = None
    ) -> "PerformanceVector":
        """Construct PerformanceVector from raw hourly simulation outputs."""
        if not hourly_results:
            raise ValueError("Cannot construct PerformanceVector from empty simulation results.")

        indoor_temps = [r['indoor_temperature_C'] for r in hourly_results]
        outdoor_temps = [r['outdoor_temperature_C'] for r in hourly_results]
        
        avg_in = sum(indoor_temps) / len(indoor_temps)
        avg_out = sum(outdoor_temps) / len(outdoor_temps)
        min_in = min(indoor_temps)
        max_in = max(indoor_temps)
        
        hours_cold = sum(1 for t in indoor_temps if t < 5.0)
        hours_comfort = sum(1 for t in indoor_temps if 5.0 <= t <= 25.0)
        
        # Integrate energy fluxes (W -> kWh over 1h steps)
        wall_losses = sum(abs(r.get('wall_heat_flow_W', 0.0)) for r in hourly_results) / 1000.0
        roof_losses = sum(abs(r.get('roof_heat_flow_W', 0.0)) for r in hourly_results) / 1000.0
        floor_losses = sum(abs(r.get('floor_heat_flow_W', 0.0)) for r in hourly_results) / 1000.0
        total_conduction_loss = wall_losses + roof_losses + floor_losses
        
        total_solar = sum(r.get('solar_gain_W', 0.0) for r in hourly_results) / 1000.0
        total_vent = sum(abs(r.get('ventilation_heat_flow_W', 0.0)) for r in hourly_results) / 1000.0
        
        wall_area = hourly_results[0].get('wall_area_m2', 50.0)
        peak_wall_flux = max(abs(r.get('wall_heat_flow_W', 0.0)) for r in hourly_results) / max(wall_area, 1.0)
        max_eb_err = max(r.get('energy_balance_error_W', 0.0) for r in hourly_results)

        return cls(
            avg_indoor_temp_C=MetricValue("avg_indoor_temp", avg_in, "°C", "ThermalEngine", "SIMULATED", "Average indoor air temperature over simulated period"),
            min_indoor_temp_C=MetricValue("min_indoor_temp", min_in, "°C", "ThermalEngine", "SIMULATED", "Minimum indoor temperature reached"),
            max_indoor_temp_C=MetricValue("max_indoor_temp", max_in, "°C", "ThermalEngine", "SIMULATED", "Maximum indoor temperature reached"),
            temperature_lift_C=MetricValue("temperature_lift", avg_in - avg_out, "°C", "ThermalEngine", "SIMULATED", "Mean indoor temperature lift above ambient"),
            diurnal_temperature_swing_C=MetricValue("diurnal_swing", max_in - min_in, "°C", "ThermalEngine", "SIMULATED", "Indoor diurnal temperature oscillation"),
            hours_below_5C=MetricValue("hours_below_5C", float(hours_cold), "hours", "ThermalEngine", "SIMULATED", "Total hours where indoor temperature fell below 5°C"),
            hours_acceptable_comfort=MetricValue("hours_acceptable_comfort", float(hours_comfort), "hours", "ThermalEngine", "SIMULATED", "Hours within 5°C to 25°C thermal band"),
            peak_wall_heat_flux_W_m2=MetricValue("peak_wall_heat_flux", peak_wall_flux, "W/m²", "ThermalEngine", "SIMULATED", "Peak instantaneous envelope heat flux"),
            total_conductive_heat_loss_kWh=MetricValue("total_conductive_heat_loss", total_conduction_loss, "kWh", "ThermalEngine", "SIMULATED", "Cumulative conductive transmission loss"),
            total_solar_gain_kWh=MetricValue("total_solar_gain", total_solar, "kWh", "ThermalEngine", "SIMULATED", "Cumulative solar heat intake"),
            total_ventilation_heat_loss_kWh=MetricValue("total_ventilation_heat_loss", total_vent, "kWh", "ThermalEngine", "SIMULATED", "Cumulative ventilation enthalpy loss"),
            effective_thermal_capacitance_MJ_K=MetricValue("thermal_capacitance", capacitance_J_K / 1e6, "MJ/K", "ThermalEngine", "CALCULATED", "Total envelope lumped thermal storage capacitance"),
            thermal_time_constant_hours=MetricValue("thermal_time_constant", time_constant_hours, "hours", "ThermalEngine", "CALCULATED", "Envelope thermal lag response time constant"),
            wall_u_value_W_m2K=MetricValue("wall_u_value", wall_u, "W/(m²·K)", "ISO 6946:2017", "CALCULATED", "Effective overall wall thermal transmittance"),
            roof_u_value_W_m2K=MetricValue("roof_u_value", roof_u, "W/(m²·K)", "ISO 6946:2017", "CALCULATED", "Effective overall roof thermal transmittance"),
            floor_u_value_W_m2K=MetricValue("floor_u_value", floor_u, "W/(m²·K)", "ISO 6946:2017", "CALCULATED", "Effective overall floor thermal transmittance"),
            simulation_status="CONVERGED",
            energy_balance_max_error_W=max_eb_err,
            constraint_violations=constraint_violations or [],
            raw_simulation_hours=len(hourly_results),
            peak_stack_velocity_m_s=peak_stack_velocity_m_s,
            peak_stack_flow_m3_s=peak_stack_flow_m3_s
        )
