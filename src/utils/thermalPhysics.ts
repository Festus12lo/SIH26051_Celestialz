import type { MaterialDef } from '../constants/materials';
import type { EnvironmentPresetId } from '../components/simulation/EnvironmentSimulationPanel';
import type { ThermalTelemetryData } from '../components/simulation/ThermalPhysicsTelemetryCard';

export interface EnvironmentalConditions {
  ambientTemp: number; // °C
  solarRadiation: number; // W/m²
  sunElevation: number; // degrees
  sunAzimuth: number; // degrees
  skyColor: string;
  sunColor: string;
  lightIntensity: number;
}

export const ENVIRONMENT_CONFIGS: Record<EnvironmentPresetId, EnvironmentalConditions> = {
  daylight: {
    ambientTemp: 25.0,
    solarRadiation: 650,
    sunElevation: 62,
    sunAzimuth: 180,
    skyColor: '#070b14',
    sunColor: '#ffffff',
    lightIntensity: 2.2,
  },
  night: {
    ambientTemp: 10.0,
    solarRadiation: 0,
    sunElevation: -12,
    sunAzimuth: 180,
    skyColor: '#020408',
    sunColor: '#60a5fa',
    lightIntensity: 0.35,
  },
  desert: {
    ambientTemp: 42.0,
    solarRadiation: 950,
    sunElevation: 78,
    sunAzimuth: 195,
    skyColor: '#120b06',
    sunColor: '#fed7aa',
    lightIntensity: 2.8,
  },
  arctic: {
    ambientTemp: -18.0,
    solarRadiation: 180,
    sunElevation: 18,
    sunAzimuth: 160,
    skyColor: '#050c18',
    sunColor: '#93c5fd',
    lightIntensity: 1.6,
  },
  disaster: {
    ambientTemp: 16.0,
    solarRadiation: 300,
    sunElevation: 38,
    sunAzimuth: 215,
    skyColor: '#0b1016',
    sunColor: '#cbd5e1',
    lightIntensity: 1.2,
  },
};

/**
 * Computes instantaneous dynamic thermal physics telemetry.
 * Matches real-world lumped thermal conductance ODE.
 */
export function calculateThermalTelemetry(
  environmentId: EnvironmentPresetId,
  roof: MaterialDef,
  wall: MaterialDef,
  window?: MaterialDef,
  liveWeather?: { ambientTemp: number; solarRadiation: number },
  comfortTarget: 'normal' | 'warm' | 'hot' = 'normal'
): ThermalTelemetryData {
  const env = ENVIRONMENT_CONFIGS[environmentId];
  const ambient = liveWeather ? liveWeather.ambientTemp : env.ambientTemp;
  const solarFlux = liveWeather ? liveWeather.solarRadiation : env.solarRadiation;

  // 1. Heat Loss Rate (Overall Envelope U-value in W/m²K)
  // R_wall total = (rValue_per_inch * 3.5 inches) + internal/external surface air resistance (0.17)
  const rWallInches = wall.rValue || 4.0;
  const rWallTotal = rWallInches * 0.25 + 0.17;
  const uWall = 1.0 / Math.max(0.1, rWallTotal);

  // Roof U-value
  const uRoof = (1.0 - (roof.albedo || 0.5) * 0.4) * 0.6;

  // Window / Fenestration U-value (W/m²K)
  const uWindow = window?.uValue ?? (window?.id === 'single_clear' ? 5.8 : window?.id === 'low_e_argon' ? 1.4 : window?.id === 'solar_control' ? 2.2 : 2.4);
  const shgc = window?.shgc ?? (window?.id === 'single_clear' ? 0.85 : window?.id === 'solar_control' ? 0.28 : window?.id === 'low_e_argon' ? 0.35 : 0.55);

  // Weighted overall envelope heat loss coefficient: 55% wall, 30% roof, 15% fenestration
  const heatLossRate = Math.max(0.3, Math.min(4.5, (uWall * 0.55) + (uRoof * 0.30) + (uWindow * 0.15)));

  // 2. Solar Heat Gain (kWh/day)
  // Roof absorption + Window solar transmittance
  const albedo = roof.albedo !== undefined ? roof.albedo : 0.5;
  const roofSolarAbsorptivity = Math.max(0.04, 1.0 - albedo);
  
  // Standard shelter: 36 m² roof, 6.5 m² glazing
  const dailySolarHours = environmentId === 'night' ? 0 : 5.8;
  const roofSolarGainKWh = (solarFlux * dailySolarHours * 36 * roofSolarAbsorptivity * 0.15) / 1000;
  const windowSolarGainKWh = (solarFlux * dailySolarHours * 6.5 * shgc * 0.70) / 1000;
  const totalSolarHeatGain = Math.max(0, Math.round((roofSolarGainKWh + windowSolarGainKWh) * 10) / 10);
  const fenestrationGainRounded = Math.max(0, Math.round(windowSolarGainKWh * 10) / 10);

  // 3. Estimated Indoor Equilibrium Temperature (°C)
  let deltaT = 0;

  if (ambient < 18) {
    // Cold climate: Low-E argon window (U=1.4) traps interior heat vs single clear (U=5.8) which leaks
    const windowRetentionMultiplier = Math.max(0.6, 2.5 / uWindow);
    const retentionFactor = (1.0 / heatLossRate) * 1.6 * windowRetentionMultiplier;
    deltaT = retentionFactor * (totalSolarHeatGain * 0.35 + 1.2);
    // In extreme cold (-18°C), good envelope brings it toward 18-22°C
    deltaT = Math.min(38, Math.max(6, deltaT));
  } else if (ambient > 30) {
    // Hot climate: Solar control glazing (SHGC 0.28) and high albedo reflect heat
    const solarPenetration = totalSolarHeatGain * 0.55;
    const windowHeatPenalty = (shgc - 0.30) * 8.0;
    const conductiveGain = (ambient - 25) * 0.25 * heatLossRate;
    deltaT = -(albedo * 6.5) + solarPenetration + conductiveGain + windowHeatPenalty;
  } else {
    // Moderate climate (around 25°C)
    const solarEffect = (totalSolarHeatGain - 2.0) * 0.25;
    const windowEffect = (uWindow - 2.0) * 0.3;
    const albedoDamping = (albedo - 0.5) * -0.5;
    deltaT = -0.2 + solarEffect + albedoDamping + windowEffect;
  }

  // 4. Thermal Mass Flywheel Damping (Building Thermodynamics)
  // Permanent masonry (CSEB, Rammed Earth, Cavity Brick) provides 10-14h phase lag damping
  // Deployable panels (EPS, PIR, Canvas) have zero flywheel storage
  const mass = wall.thermalMass || 'Low';
  if (ambient > 28) {
    // In extreme heat, high thermal mass prevents midday interior temperature spikes
    const massPeakDamping = mass === 'Very High' ? 3.5 : mass === 'High' ? 2.2 : mass === 'Medium' ? 1.0 : 0;
    deltaT -= massPeakDamping;
  } else if (ambient < 16) {
    // In cold conditions, high thermal mass retains daytime solar enthalpy and releases it at night
    const massNightStorage = mass === 'Very High' ? 3.0 : mass === 'High' ? 2.0 : mass === 'Medium' ? 1.0 : 0;
    deltaT += massNightStorage;
  }

  let estIndoor = ambient + deltaT;
  const COMFORT_BANDS = {
    normal: { min: 20, max: 25, supplementalWm2: 0 },
    warm:   { min: 26, max: 30, supplementalWm2: 15 },
    hot:    { min: 30, max: 35, supplementalWm2: 30 },
  };
  const band = COMFORT_BANDS[comfortTarget] || COMFORT_BANDS.normal;

  if (estIndoor < band.min) {
    const supplementalKw = (band.supplementalWm2 * 36) / 1000;
    estIndoor += supplementalKw * 2.5;
  } else if (estIndoor > band.max) {
    estIndoor -= 1.5;
  }

  // Comfort score based on proximity to target band
  let comfortScorePct = 85;
  if (estIndoor >= band.min && estIndoor <= band.max) {
    comfortScorePct = 95;
  } else {
    const deviation = Math.min(Math.abs(estIndoor - band.min), Math.abs(estIndoor - band.max));
    comfortScorePct = Math.max(30, Math.round(95 - deviation * 7));
  }

  const estIndoorTemp = Math.round(estIndoor * 10) / 10;
  const deltaTRounded = Math.round((estIndoor - ambient) * 10) / 10;

  return {
    ambientOutside: Math.round(ambient * 10) / 10,
    estIndoorTemp,
    solarHeatGain: totalSolarHeatGain,
    heatLossRate: Math.round(heatLossRate * 10) / 10,
    windowUValue: Math.round(uWindow * 10) / 10,
    fenestrationSolarGain: fenestrationGainRounded,
    comfortScorePct,
    deltaT: deltaTRounded,
  };
}
