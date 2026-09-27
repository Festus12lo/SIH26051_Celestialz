"""
ThermoShelter — Model G: Thermal Comfort & Bioclimatic Habitability Engine
Computes thermal comfort metrics according to ASHRAE Standard 55 and NBC 2016 Adaptive Comfort Model,
evaluating indoor temperature stability, comfort band compliance, and extreme cold exposure degree-hours.
"""

from dataclasses import dataclass
from typing import Dict, Any, List, Optional
import numpy as np


@dataclass
class ComfortReport:
    """Comprehensive thermal comfort evaluation metrics."""
    neutral_comfort_temp_C: float
    comfort_band_min_C: float
    comfort_band_max_C: float
    hours_in_comfort_band: int
    comfort_hours_percent: float
    thermal_buffer_index: float       # 0.0 (no buffering) to 1.0 (perfect stability)
    indoor_temperature_swing_C: float # Max - Min indoor temp
    outdoor_temperature_swing_C: float # Max - Min outdoor temp
    hours_below_10C: int
    hours_below_5C: int
    hours_below_0C: int
    discomfort_degree_hours_10C: float # Cumulative degree-hours below 10°C
    comfort_verdict: str              # 'COMFORTABLE', 'ACCEPTABLE', 'MARGINAL', 'UNSAFE'
    interpretation: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "neutral_comfort_temp_C": round(self.neutral_comfort_temp_C, 1),
            "comfort_band_min_C": round(self.comfort_band_min_C, 1),
            "comfort_band_max_C": round(self.comfort_band_max_C, 1),
            "hours_in_comfort_band": self.hours_in_comfort_band,
            "comfort_hours_percent": round(self.comfort_hours_percent, 1),
            "thermal_buffer_index": round(self.thermal_buffer_index, 2),
            "indoor_temperature_swing_C": round(self.indoor_temperature_swing_C, 1),
            "outdoor_temperature_swing_C": round(self.outdoor_temperature_swing_C, 1),
            "hours_below_10C": self.hours_below_10C,
            "hours_below_5C": self.hours_below_5C,
            "hours_below_0C": self.hours_below_0C,
            "discomfort_degree_hours_10C": round(self.discomfort_degree_hours_10C, 1),
            "comfort_verdict": self.comfort_verdict,
            "interpretation": self.interpretation,
        }


class ModelG_ThermalComfortPredictor:
    """
    Model G: Evaluates occupant thermal comfort, adaptive satisfaction thresholds,
    and thermal mass buffering based on validated hourly physics traces.
    """
    MODEL_NAME = "ModelG_ThermalComfortPredictor"
    MODEL_VERSION = "2.0.0-ashrae55-adaptive"

    @classmethod
    def calculate_adaptive_neutral_temperature(cls, mean_outdoor_temp_C: float) -> float:
        """
        ASHRAE Standard 55 / NBC 2016 Adaptive Comfort Model:
        T_comfort = 17.8 + 0.31 * T_outdoor_mean
        Clamped within physiological limits [15.0°C, 28.0°C].
        """
        t_c = 17.8 + 0.31 * mean_outdoor_temp_C
        return max(15.0, min(28.0, t_c))

    def evaluate_comfort(
        self,
        indoor_temps: List[float],
        outdoor_temps: List[float],
        climate_zone: str = "Cold-Arid"
    ) -> ComfortReport:
        """
        Compute complete suite of comfort metrics from hourly temperature arrays.
        """
        if not indoor_temps or not outdoor_temps:
            return ComfortReport(
                neutral_comfort_temp_C=18.0, comfort_band_min_C=14.5, comfort_band_max_C=21.5,
                hours_in_comfort_band=0, comfort_hours_percent=0.0, thermal_buffer_index=0.0,
                indoor_temperature_swing_C=0.0, outdoor_temperature_swing_C=0.0,
                hours_below_10C=0, hours_below_5C=0, hours_below_0C=0, discomfort_degree_hours_10C=0.0,
                comfort_verdict="NO_DATA", interpretation="No simulation data available."
            )

        n_hours = len(indoor_temps)
        in_arr = np.array(indoor_temps)
        out_arr = np.array(outdoor_temps)

        mean_out = float(np.mean(out_arr))
        neutral_t = self.calculate_adaptive_neutral_temperature(mean_out)

        # 80% Acceptability Band: Neutral +/- 3.5°C
        # For sub-zero emergency winter shelters, minimum acceptable threshold is 10.0°C (day) / 5.0°C (night freeze threshold)
        band_min = max(8.0, neutral_t - 3.5)
        band_max = neutral_t + 3.5

        # Comfort hours count
        in_band_mask = (in_arr >= band_min) & (in_arr <= band_max)
        hours_in_band = int(np.sum(in_band_mask))
        comfort_pct = (hours_in_band / n_hours) * 100.0

        # Swings
        in_swing = float(np.max(in_arr) - np.min(in_arr))
        out_swing = float(np.max(out_arr) - np.min(out_arr))

        # Thermal Buffer Index: 1 - (std_in / std_out)
        std_in = float(np.std(in_arr))
        std_out = float(np.std(out_arr))
        tbi = max(0.0, min(1.0, 1.0 - (std_in / max(0.1, std_out))))

        # Hazard thresholds
        below_10 = int(np.sum(in_arr < 10.0))
        below_5 = int(np.sum(in_arr < 5.0))
        below_0 = int(np.sum(in_arr < 0.0))

        # Degree hours below 10°C
        ddh_10 = float(np.sum(np.maximum(0.0, 10.0 - in_arr)))

        # Verdict
        if comfort_pct >= 60.0 and below_0 == 0:
            verdict = "COMFORTABLE"
        elif below_0 == 0 and below_5 <= (n_hours * 0.25):
            verdict = "ACCEPTABLE"
        elif below_0 <= (n_hours * 0.15):
            verdict = "MARGINAL"
        else:
            verdict = "UNSAFE"

        interpretation = (
            f"Thermal buffer index of {tbi:.2f} reduces outdoor swing from {out_swing:.1f}°C to {in_swing:.1f}°C. "
            f"Indoor temperature maintained in comfort band ({band_min:.1f}°C-{band_max:.1f}°C) for {hours_in_band}/{n_hours} hours ({comfort_pct:.0f}%). "
            f"Freeze hazard hours (<0°C): {below_0}h."
        )

        return ComfortReport(
            neutral_comfort_temp_C=neutral_t,
            comfort_band_min_C=band_min,
            comfort_band_max_C=band_max,
            hours_in_comfort_band=hours_in_band,
            comfort_hours_percent=comfort_pct,
            thermal_buffer_index=tbi,
            indoor_temperature_swing_C=in_swing,
            outdoor_temperature_swing_C=out_swing,
            hours_below_10C=below_10,
            hours_below_5C=below_5,
            hours_below_0C=below_0,
            discomfort_degree_hours_10C=ddh_10,
            comfort_verdict=verdict,
            interpretation=interpretation
        )
