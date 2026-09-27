"""
ThermoShelter — Physics Simulation Bridge Module
Integrates DesignState directly with the V1.1 Reduced-Order ThermalEngine
and provides robust failure handling for physically invalid candidates.
"""

import os
import sys
import traceback
from typing import Dict, Any, List, Optional
from ..core.design_state import DesignState
from ..core.performance_vector import PerformanceVector, MetricValue

# Import existing ThermalEngine from data/thermal
THERMAL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "thermal"))
if THERMAL_DIR not in sys.path:
    sys.path.insert(0, THERMAL_DIR)

try:
    from thermal_engine import ThermalEngine
except ImportError:
    ThermalEngine = None
from .weather_adapter import WeatherAdapter, SyntheticWeatherProvider
from .ventilation_physics import NaturalVentilationEngine


class PhysicsBridge:
    """
    Executes reduced-order physics simulations on candidate DesignStates.
    Provides robust, graceful exception handling without masking errors.
    """

    def __init__(
        self,
        materials_csv_path: Optional[str] = None,
        weather_dir_path: Optional[str] = None
    ):
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        canonical_mat_path = os.path.join(root_dir, "data", "canonical", "materials", "material_properties.csv")
        v1_mat_path = os.path.join(root_dir, "data", "materials", "material_properties.csv")
        
        # Prefer canonical materials database if available
        mat_path = materials_csv_path or (canonical_mat_path if os.path.exists(canonical_mat_path) else v1_mat_path)
        wea_path = weather_dir_path or os.path.join(root_dir, "data", "raw")
        
        self.engine = ThermalEngine(
            materials_csv_path=mat_path,
            weather_data_path=wea_path
        )
        
        # Instantiate the official weather adapter pattern
        provider = SyntheticWeatherProvider(data_dir=wea_path)
        self.weather_adapter = WeatherAdapter(provider=provider)

    def simulate(
        self,
        design: DesignState,
        hours: int = 48,
        initial_temp_C: Optional[float] = None
    ) -> PerformanceVector:
        """
        Execute hourly thermal physics simulation on DesignState.
        Returns a failed PerformanceVector if the candidate is physically invalid.
        """
        perf, _ = self.simulate_with_timeseries(design, hours, initial_temp_C)
        return perf

    def simulate_with_timeseries(
        self,
        design: DesignState,
        hours: int = 48,
        initial_temp_C: Optional[float] = None
    ) -> tuple:
        """
        Execute hourly thermal simulation and return both the PerformanceVector
        AND the raw hourly results for time-series visualization.

        Returns:
            (PerformanceVector, List[Dict]) — perf vector and hourly records.
            On failure, hourly list will be empty.
        """
        config = design.to_simulation_config()
        location_name = design.context.location_name

        try:
            # Load weather observations via adapter
            sim_weather = self.weather_adapter.get_canonical_weather(location=location_name, hours=hours)

            # Execute hourly simulation
            hourly_results = self.engine.simulate_hourly(
                shelter_config=config,
                weather_data=sim_weather,
                initial_indoor_temp=initial_temp_C
            )

            if not hourly_results:
                return self._create_failed_vector(
                    design,
                    error_message=f"Simulation returned 0 results for design {design.design_id}"
                ), []

            first_hr = hourly_results[0]
            wall_u = design.envelope.wall_u_value_W_m2K
            roof_u = design.envelope.roof_u_value_W_m2K
            floor_u = design.envelope.floor_u_value_W_m2K
            capacitance = first_hr.get('effective_capacitance_J_K', 1e7)
            time_constant_hrs = first_hr.get('thermal_time_constant_hours', 40.0)

            # Stack Effect calculation using worst-case thermal differential
            indoor_temps = [r['indoor_temperature_C'] for r in hourly_results]
            outdoor_temps = [r['outdoor_temperature_C'] for r in hourly_results]
            max_diff = -1
            t_in_stack, t_out_stack = 20.0, 20.0
            for tin, tout in zip(indoor_temps, outdoor_temps):
                if abs(tin - tout) > max_diff:
                    max_diff = abs(tin - tout)
                    t_in_stack, t_out_stack = tin, tout

            # Assume 50% of total opening area is lower, 50% is upper for cross/stack flow
            total_area = design.total_opening_area_m2
            stack_res = NaturalVentilationEngine.simulate_stack_effect(
                t_in_C=t_in_stack,
                t_out_C=t_out_stack,
                building_height_m=design.geometry.height_m,
                lower_opening_area_m2=total_area * 0.5,
                upper_opening_area_m2=total_area * 0.5,
                elevation_m=design.context.elevation_m
            )

            from ..core.performance_vector import MetricValue
            peak_vel = MetricValue("peak_stack_velocity", stack_res["velocity_m_s"], "m/s", "NaturalVentilationEngine", "CALCULATED", "Peak stack effect buoyancy-driven velocity")
            peak_flow = MetricValue("peak_stack_flow", stack_res["volumetric_flow_m3_s"], "m³/s", "NaturalVentilationEngine", "CALCULATED", "Peak stack effect volumetric flow rate")

            # Build standardized PerformanceVector
            perf = PerformanceVector.from_simulation_results(
                hourly_results=hourly_results,
                wall_u=wall_u,
                roof_u=roof_u,
                floor_u=floor_u,
                capacitance_J_K=capacitance,
                time_constant_hours=time_constant_hrs,
                peak_stack_velocity_m_s=peak_vel,
                peak_stack_flow_m3_s=peak_flow
            )
            return perf, hourly_results

        except (ValueError, KeyError, RuntimeError) as e:
            # Gracefully capture physical invalidity (e.g. openings >= wall area)
            return self._create_failed_vector(
                design,
                error_message=f"{type(e).__name__}: {str(e)}"
            ), []
        except Exception as e:
            # Capture unexpected system exception with full diagnostic trace
            return self._create_failed_vector(
                design,
                error_message=f"UNEXPECTED_SIMULATION_EXCEPTION: {type(e).__name__}: {str(e)}"
            ), []

    def _create_failed_vector(self, design: DesignState, error_message: str) -> PerformanceVector:
        """Construct a standardized failed PerformanceVector with explicit error provenance."""
        wall_u = design.envelope.wall_u_value_W_m2K
        roof_u = design.envelope.roof_u_value_W_m2K
        floor_u = design.envelope.floor_u_value_W_m2K

        return PerformanceVector(
            avg_indoor_temp_C=MetricValue("avg_indoor_temp", -999.0, "°C", "ThermalEngine", "UNAVAILABLE", "Failed simulation"),
            min_indoor_temp_C=MetricValue("min_indoor_temp", -999.0, "°C", "ThermalEngine", "UNAVAILABLE", "Failed simulation"),
            max_indoor_temp_C=MetricValue("max_indoor_temp", -999.0, "°C", "ThermalEngine", "UNAVAILABLE", "Failed simulation"),
            temperature_lift_C=MetricValue("temperature_lift", -999.0, "°C", "ThermalEngine", "UNAVAILABLE", "Failed simulation"),
            diurnal_temperature_swing_C=MetricValue("diurnal_swing", -999.0, "°C", "ThermalEngine", "UNAVAILABLE", "Failed simulation"),
            hours_below_5C=MetricValue("hours_below_5C", 0.0, "hours", "ThermalEngine", "UNAVAILABLE", "Failed simulation"),
            hours_acceptable_comfort=MetricValue("hours_acceptable_comfort", 0.0, "hours", "ThermalEngine", "UNAVAILABLE", "Failed simulation"),
            peak_wall_heat_flux_W_m2=MetricValue("peak_wall_heat_flux", 0.0, "W/m²", "ThermalEngine", "UNAVAILABLE", "Failed simulation"),
            total_conductive_heat_loss_kWh=MetricValue("total_conductive_heat_loss", 0.0, "kWh", "ThermalEngine", "UNAVAILABLE", "Failed simulation"),
            total_solar_gain_kWh=MetricValue("total_solar_gain", 0.0, "kWh", "ThermalEngine", "UNAVAILABLE", "Failed simulation"),
            total_ventilation_heat_loss_kWh=MetricValue("total_ventilation_heat_loss", 0.0, "kWh", "ThermalEngine", "UNAVAILABLE", "Failed simulation"),
            effective_thermal_capacitance_MJ_K=MetricValue("thermal_capacitance", 0.0, "MJ/K", "ThermalEngine", "UNAVAILABLE", "Failed simulation"),
            thermal_time_constant_hours=MetricValue("thermal_time_constant", 0.0, "hours", "ThermalEngine", "UNAVAILABLE", "Failed simulation"),
            wall_u_value_W_m2K=MetricValue("wall_u_value", wall_u, "W/(m²·K)", "ISO 6946:2017", "CALCULATED", "Effective overall wall U-value"),
            roof_u_value_W_m2K=MetricValue("roof_u_value", roof_u, "W/(m²·K)", "ISO 6946:2017", "CALCULATED", "Effective overall roof U-value"),
            floor_u_value_W_m2K=MetricValue("floor_u_value", floor_u, "W/(m²·K)", "ISO 6946:2017", "CALCULATED", "Effective overall floor U-value"),
            simulation_status="FAILED",
            energy_balance_max_error_W=float("inf"),
            constraint_violations=[error_message],
            raw_simulation_hours=0
        )
