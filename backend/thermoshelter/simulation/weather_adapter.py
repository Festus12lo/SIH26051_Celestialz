import os
import csv
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class WeatherProvider(ABC):
    """
    Abstract base class for all weather data providers.
    Ensures all weather ingestion strictly conforms to the canonical schema expected by the physics engine.
    """
    
    @abstractmethod
    def fetch_weather(self, location: str, start_date: str = "", end_date: str = "") -> List[Dict[str, float]]:
        """
        Retrieves weather data and formats it into the canonical schema.
        Expected schema:
        - temp_air: float (C)
        - ghi: float (W/m2)
        - dni: float (W/m2)
        - dhi: float (W/m2)
        - wind_speed: float (m/s)
        - rel_humidity: float (%)
        """
        pass


class SyntheticWeatherProvider(WeatherProvider):
    """
    Provider that reads the legacy synthetic bounding models (e.g. weather_2026.csv).
    Explicitly flagged as synthetic for engineering traceability.
    """
    def __init__(self, data_dir: str):
        self.data_dir = data_dir

    def fetch_weather(self, location: str, start_date: str = "", end_date: str = "") -> List[Dict[str, float]]:
        valid_locations = ["Leh", "Shimla", "Karur", "Jaipur"]
        if location not in valid_locations:
            raise ValueError(f"Location must be one of {valid_locations}")

        filename = f"{location.lower()}_weather_2026.csv"
        filepath = os.path.join(self.data_dir, filename)

        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Synthetic weather fallback file not found: {filepath}")

        weather_data = []
        try:
            with open(filepath, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    processed_row = {}
                    for key, value in row.items():
                        if key == 'datetime':
                            processed_row[key] = value
                        else:
                            try:
                                processed_row[key] = float(value) if value != '' else 0.0
                            except ValueError:
                                processed_row[key] = value
                    
                    # Map to canonical schema if using legacy synthetic names
                    mapped_row = processed_row.copy()
                    if 'temperature_2m' in processed_row and 'temp_air' not in processed_row:
                        mapped_row['temp_air'] = processed_row['temperature_2m']
                    if 'shortwave_radiation' in processed_row and 'ghi' not in processed_row:
                        mapped_row['ghi'] = processed_row['shortwave_radiation']
                        mapped_row['dni'] = 0.0
                        mapped_row['dhi'] = processed_row['shortwave_radiation']
                    if 'windspeed_10m' in processed_row and 'wind_speed' not in processed_row:
                        mapped_row['wind_speed'] = processed_row['windspeed_10m'] / 3.6 # km/h to m/s
                    if 'relativehumidity_2m' in processed_row and 'rel_humidity' not in processed_row:
                        mapped_row['rel_humidity'] = processed_row['relativehumidity_2m']
                        
                    weather_data.append(mapped_row)
        except Exception as e:
            raise RuntimeError(f"Error loading synthetic weather data from {filepath}: {e}")

        return weather_data


class HistoricalWeatherProvider(WeatherProvider):
    """
    Future-ready provider for reading EPW or TMY3 datasets.
    """
    def __init__(self, data_dir: str):
        self.data_dir = data_dir

    def fetch_weather(self, location: str, start_date: str = "", end_date: str = "") -> List[Dict[str, float]]:
        raise NotImplementedError("Historical TMY3/EPW parsing is strictly required prior to commercial deployment, but is not yet implemented.")


class WeatherAdapter:
    """
    Canonical interface separating the V2 Architectural Engine from raw weather data sources.
    Implements: Retrieval -> Validation -> Quality Control -> Canonical Output
    """
    def __init__(self, provider: WeatherProvider):
        self.provider = provider

    def get_canonical_weather(self, location: str, hours: int = 48) -> List[Dict[str, float]]:
        """
        Retrieves weather data, validates units, and trims to the requested simulation horizon.
        """
        # Retrieval
        raw_data = self.provider.fetch_weather(location=location)
        
        # Validation & Quality Control (Basic checks)
        if not raw_data:
            raise ValueError(f"Weather provider returned empty data for location: {location}")
            
        required_keys = ["temp_air", "ghi", "dni", "dhi"]
        for key in required_keys:
            if key not in raw_data[0]:
                raise ValueError(f"Weather record is missing required canonical key: {key}")

        # Trim to simulation horizon
        sim_weather = raw_data[:hours] if hours < len(raw_data) else raw_data
        
        return sim_weather
