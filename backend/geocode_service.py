"""
ThermoShelter — Geocode & Climate Region Resolution Service
Resolves city names to lat/lon (via Nominatim) and looks up NBC 2016 climate region data from the database.
"""

import os
import math
import httpx
import psycopg2
from psycopg2.extras import DictCursor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")

# ─────────────────────────────────────────────────────────────
# NOMINATIM GEOCODER (Free, no API key, city-level)
# ─────────────────────────────────────────────────────────────

async def geocode_city(city_name: str, country_code: str = "in") -> dict:
    """
    Geocode a city name to lat/lon using OpenStreetMap Nominatim.
    Restricted to city-level results only.
    Returns: {"city": str, "state": str, "lat": float, "lon": float} or None
    """
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": city_name,
        "format": "json",
        "addressdetails": 1,
        "limit": 5,
        "featuretype": "city",
        "countrycodes": country_code,
    }
    headers = {
        "User-Agent": "ThermoShelter/1.0 (hackathon project)"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code == 200:
                results = response.json()
                if results:
                    top = results[0]
                    addr = top.get("address", {})
                    return {
                        "city": addr.get("city") or addr.get("town") or addr.get("village") or city_name,
                        "state": addr.get("state", ""),
                        "lat": float(top["lat"]),
                        "lon": float(top["lon"]),
                        "display_name": top.get("display_name", ""),
                    }
    except Exception as e:
        print(f"[GeoService] Nominatim geocoding failed: {e}")
    
    return None


async def autocomplete_city(query: str, country_code: str = "in") -> list:
    """
    Return city-level autocomplete suggestions for a partial query.
    Returns: [{"city": str, "state": str, "lat": float, "lon": float, "display_name": str}, ...]
    """
    if len(query) < 2:
        return []
    
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": query,
        "format": "json",
        "addressdetails": 1,
        "limit": 6,
        "countrycodes": country_code,
    }
    headers = {
        "User-Agent": "ThermoShelter/1.0 (hackathon project)"
    }
    
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code == 200:
                results = response.json()
                suggestions = []
                seen = set()
                for r in results:
                    addr = r.get("address", {})
                    city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("county") or ""
                    state = addr.get("state", "")
                    key = f"{city.lower()}_{state.lower()}"
                    if city and key not in seen:
                        seen.add(key)
                        suggestions.append({
                            "city": city,
                            "state": state,
                            "lat": float(r["lat"]),
                            "lon": float(r["lon"]),
                            "display_name": f"{city}, {state}" if state else city,
                        })
                return suggestions
    except Exception as e:
        print(f"[GeoService] Autocomplete failed: {e}")
    
    return []


# ─────────────────────────────────────────────────────────────
# CLIMATE REGION DATABASE LOOKUP
# ─────────────────────────────────────────────────────────────

def _get_db_connection():
    if not DATABASE_URL:
        return None
    try:
        return psycopg2.connect(DATABASE_URL)
    except Exception as e:
        print(f"[GeoService] Warning: Could not connect to database ({e}). Using offline climate defaults.")
        return None


def lookup_climate_region(city: str, state: str = None, lat: float = None, lon: float = None) -> dict:
    """
    Look up climate region from the database.
    
    Strategy:
    1. Exact city match (case-insensitive)
    2. State match (pick any city from same state)
    3. Nearest city by lat/lon (Haversine)
    4. Fallback defaults
    """
    conn = _get_db_connection()
    if not conn:
        return _default_region(city, lat, lon)

    row = None
    try:
        cursor = conn.cursor(cursor_factory=DictCursor)
        
        # Strategy 1: Exact city match
        cursor.execute(
            "SELECT * FROM climate_regions WHERE LOWER(city) = LOWER(%s) LIMIT 1",
            (city,)
        )
        row = cursor.fetchone()
        
        # Strategy 2: State match
        if not row and state:
            cursor.execute(
                "SELECT * FROM climate_regions WHERE LOWER(state) = LOWER(%s) LIMIT 1",
                (state,)
            )
            row = cursor.fetchone()
        
        # Strategy 3: Nearest by lat/lon
        if not row and lat is not None and lon is not None:
            cursor.execute("SELECT * FROM climate_regions")
            all_regions = cursor.fetchall()
            if all_regions:
                nearest = min(all_regions, key=lambda r: _haversine(lat, lon, r["lat"], r["lon"]))
                row = nearest
    except Exception as e:
        print(f"[GeoService] Warning: Climate region query failed ({e}). Using default region.")
    finally:
        try:
            conn.close()
        except Exception:
            pass
    
    if row:
        return dict(row)
    
    # Strategy 4: Fallback (composite zone, Delhi-like)
    return _default_region(city, lat, lon)


def _haversine(lat1, lon1, lat2, lon2):
    """Calculate great-circle distance between two points in km."""
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def _default_region(city, lat=None, lon=None):
    """Return a sensible default when no DB match is found."""
    # Use latitude to guess zone if available
    zone = "composite"
    if lat is not None:
        if lat > 32:
            zone = "cold"
        elif lat > 28:
            zone = "composite"
        elif lat > 20:
            zone = "hot_dry"
        else:
            zone = "warm_humid"
    
    return {
        "id": 0,
        "city": city or "Unknown",
        "state": "Unknown",
        "lat": lat or 26.9,
        "lon": lon or 75.8,
        "altitude_m": 200,
        "nbc_zone": zone,
        "avg_winter_temp_c": 10.0,
        "avg_summer_temp_c": 38.0,
        "annual_rainfall_mm": 800,
        "humidity_class": "semi_arid",
        "seismic_zone": "III",
        "wind_speed_basic_ms": 44.0,
        "snow_zone": "zone_i",
        "vernacular_architecture": f"Regional vernacular construction appropriate for {zone} climate",
        "typical_wall_material": "brick",
        "typical_roof_material": "rcc_flat",
        "color_palette": "neutral_earth",
        "landscape_description": f"Indian {zone} zone landscape",
        "vegetation": "mixed_deciduous",
    }


# ─────────────────────────────────────────────────────────────
# PROMPT STYLE RULES LOOKUP
# ─────────────────────────────────────────────────────────────

def lookup_prompt_style(nbc_zone: str, building_type: str) -> dict:
    """
    Get the prompt style rules for a given NBC zone + building type.
    Falls back to 'residential' if building_type not found, then to 'composite' zone.
    """
    # Normalize building_type
    bt = building_type.lower().strip()
    if bt in ("community", "institutional"):
        bt = "institutional"
    elif bt in ("permanent", "residential"):
        bt = "residential"
    elif bt in ("emergency", "deployable"):
        bt = "emergency"
    else:
        bt = "residential"

    conn = _get_db_connection()
    if not conn:
        return {
            "style_2d": "Professional architectural blueprint, top-down orthographic, dimension lines in meters, room labels, north arrow",
            "style_3d": "Isometric cutaway 3D architectural rendering, partially removed roof showing interior layout",
            "negative_prompt": "luxury, mansion, fantasy, cartoon",
            "environment_desc": f"Indian {nbc_zone} landscape appropriate to the region",
        }

    row = None
    try:
        cursor = conn.cursor(cursor_factory=DictCursor)
        # Try exact match
        cursor.execute(
            "SELECT * FROM prompt_style_rules WHERE nbc_zone = %s AND building_type = %s LIMIT 1",
            (nbc_zone, bt)
        )
        row = cursor.fetchone()
        
        # Fallback to residential in same zone
        if not row:
            cursor.execute(
                "SELECT * FROM prompt_style_rules WHERE nbc_zone = %s AND building_type = 'residential' LIMIT 1",
                (nbc_zone,)
            )
            row = cursor.fetchone()
        
        # Fallback to composite residential
        if not row:
            cursor.execute(
                "SELECT * FROM prompt_style_rules WHERE nbc_zone = 'composite' AND building_type = 'residential' LIMIT 1"
            )
            row = cursor.fetchone()
    except Exception as e:
        print(f"[GeoService] Warning: Prompt style query failed ({e}).")
    finally:
        try:
            conn.close()
        except Exception:
            pass
    
    if row:
        return dict(row)
    
    # Absolute fallback
    return {
        "style_2d": "Professional architectural blueprint, top-down orthographic, dimension lines in meters, room labels, north arrow",
        "style_3d": "Isometric cutaway 3D architectural rendering, partially removed roof showing interior layout",
        "negative_prompt": "luxury, mansion, fantasy, cartoon",
        "environment_desc": "Indian landscape appropriate to the region",
    }


# ─────────────────────────────────────────────────────────────
# MATERIAL VISUAL RULES LOOKUP
# ─────────────────────────────────────────────────────────────

def lookup_material_visual(material_id: str) -> dict:
    """Get the visual rendering rules for a material."""
    conn = _get_db_connection()
    cursor = conn.cursor(cursor_factory=DictCursor)
    
    cursor.execute(
        "SELECT * FROM material_visual_rules WHERE material_id = %s LIMIT 1",
        (material_id,)
    )
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    
    return {
        "material_id": material_id,
        "visual_texture": material_id.replace("_", " "),
        "section_hatch": "diagonal_lines",
        "color_hint": "#888888",
    }


# ─────────────────────────────────────────────────────────────
# FULL RESOLUTION (combines geocoding + DB lookup)
# ─────────────────────────────────────────────────────────────

async def resolve_location(city: str, lat: float = None, lon: float = None, state: str = None) -> dict:
    """
    Full resolution pipeline:
    1. If lat/lon missing → geocode via Nominatim
    2. Look up climate region in DB
    3. Return fully enriched location object
    """
    resolved_state = state
    
    # Step 1: Geocode if needed
    if not lat or not lon:
        geo = await geocode_city(city)
        if geo:
            lat = geo["lat"]
            lon = geo["lon"]
            resolved_state = geo.get("state", state)
        else:
            # Can't geocode, use rough defaults
            lat = lat or 26.9
            lon = lon or 75.8
    
    # Step 2: DB lookup
    region = lookup_climate_region(city, resolved_state, lat, lon)
    
    # Override lat/lon from the provided values (more precise than DB)
    region["lat"] = lat
    region["lon"] = lon
    
    return region
