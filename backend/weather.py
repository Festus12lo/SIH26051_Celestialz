import httpx
import time

# Simple in-memory cache for the hackathon: { (lat, lon): (timestamp, data) }
CACHE = {}
CACHE_TTL = 15 * 60  # 15 minutes to avoid Open-Meteo rate limits during demo

async def fetch_live_weather(lat: float, lon: float):
    cache_key = (lat, lon)
    current_time = time.time()
    
    # Check Cache
    if cache_key in CACHE:
        timestamp, data = CACHE[cache_key]
        if current_time - timestamp < CACHE_TTL:
            return data
            
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m",
        "hourly": "temperature_2m,direct_normal_irradiance,diffuse_radiation",
        "timezone": "auto",
        "forecast_days": 2
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            
            # Format data specifically for our ThermoShelter frontend
            result = {
                "current": {
                    "temperature": data["current"]["temperature_2m"],
                    "humidity": data["current"]["relative_humidity_2m"],
                    "wind_speed": data["current"]["wind_speed_10m"],
                },
                "forecast": data["hourly"]["temperature_2m"][:48],  # Next 48 hours
                "solar_forecast_dni": data["hourly"]["direct_normal_irradiance"][:48],
                "solar_forecast_diffuse": data["hourly"]["diffuse_radiation"][:48],
                "updated_at": current_time
            }
            
            CACHE[cache_key] = (current_time, result)
            return result
        except httpx.HTTPStatusError as e:
            raise RuntimeError(f"Weather API HTTP error {e.response.status_code}: {e}")
        except httpx.RequestError as e:
            raise RuntimeError(f"Weather API connection error: {e}")
        except Exception as e:
            raise RuntimeError(f"Failed to fetch weather: {e}")


def get_offline_weather_fallback(lat: float, lon: float, avg_temp_c: float = -10.0) -> dict:
    """
    Returns a synthetic 48-hour weather profile for offline use.
    Uses a simple sinusoidal day/night temperature swing around avg_temp_c.
    Used when internet is unavailable (common in Ladakh field deployments).
    """
    import math as _math
    # Day-night swing: ±8°C in cold climates (dry air = large diurnal range)
    swing = 8.0
    forecast = [
        round(avg_temp_c + swing * _math.sin(_math.pi * ((h % 24) - 6) / 12), 1)
        for h in range(48)
    ]
    # Solar DNI: 0 at night, peaks midday at ~700 W/m² (high altitude, clear sky)
    solar = [
        max(0.0, round(700 * _math.sin(_math.pi * ((h % 24) - 6) / 12), 1))
        for h in range(48)
    ]
    return {
        "current": {
            "temperature": avg_temp_c,
            "humidity": 30,
            "wind_speed": 15,
        },
        "forecast": forecast,
        "solar_forecast_dni": solar,
        "solar_forecast_diffuse": [s * 0.15 for s in solar],
        "updated_at": time.time(),
        "is_offline_fallback": True,
    }

