import type { ThermalTelemetryData } from '../components/simulation/ThermalPhysicsTelemetryCard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function fetchLiveSimulationTelemetry(
  lat: number = 34.1526,
  lon: number = 77.5771,
  shelterType: string = 'emergency',
  selectedMaterials: { structural: string; roofing: string; glazing?: string },
  comfortTarget: string = 'normal'
): Promise<ThermalTelemetryData | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const res = await fetch(`${API_BASE_URL}/api/decision/simulate-thermal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat,
        lon,
        shelter_type: shelterType,
        selected_materials: selectedMaterials,
        comfort_target: comfortTarget,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();

    // Map backend output to telemetry format
    const perf = data.performance_metrics || {};
    const envProps = data.envelope_properties || {};
    const shelter = data.shelter_profile || {};

    const ambient = perf.mean_outdoor_temp_c ?? data.ambient_temp_c ?? 25.0;
    const indoor = perf.mean_indoor_temp_c ?? data.indoor_temp_c ?? 24.7;
    const deltaT = perf.mean_temp_differential_delta_t ?? Math.round((indoor - ambient) * 10) / 10;
    const comfortScore = perf.comfort_score_pct ?? 85;

    // Total UA divided by floor area gives effective envelope rate in W/m²K
    const floorArea = shelter.floor_area_m2 || 36.0;
    const heatLoss = envProps.total_ua_w_k ? (envProps.total_ua_w_k / floorArea) : (data.heat_loss_rate_w_m2k ?? 1.2);
    
    // Sum hourly solar radiation or default
    const solarSeries = data.hourly_timeseries?.solar_dni_w_m2 || [];
    const avgSolar = solarSeries.length > 0 ? (solarSeries.reduce((a: number, b: number) => a + b, 0) / solarSeries.length) : 350;
    const solarGainKWh = (avgSolar * 6.0 * 12.0 * 0.45) / 1000;

    return {
      ambientOutside: Math.round(ambient * 10) / 10,
      estIndoorTemp: Math.round(indoor * 10) / 10,
      solarHeatGain: Math.max(0.5, Math.round(solarGainKWh * 10) / 10),
      heatLossRate: Math.round(heatLoss * 10) / 10,
      comfortScorePct: comfortScore,
      deltaT: Math.round(deltaT * 10) / 10,
    };
  } catch (err) {
    // Graceful offline fallback
    return null;
  }
}
