from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
import time
from typing import Dict
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ThermoShelter Backend")

# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Simple IP-based rate limiter
_rate_limits: Dict[str, list] = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 30  # max requests per window per IP

def check_rate_limit(request: Request) -> bool:
    """Returns True if the request should be rate-limited (rejected)."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    # Clean old entries
    _rate_limits[client_ip] = [t for t in _rate_limits[client_ip] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_limits[client_ip]) >= RATE_LIMIT_MAX:
        return True
    _rate_limits[client_ip].append(now)
    return False

# Read allowed origins from env; support regex for localhost, Vercel, and Railway
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()] if _raw_origins else [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# Guarantee production origins are always present regardless of env overrides
_required_origins = [
    "https://sih-26051-celestialz.vercel.app",
    "https://thermoshelter.vercel.app",
    "https://sih26051celestialz-production.up.railway.app",
]
for origin in _required_origins:
    if origin not in ALLOWED_ORIGINS:
        ALLOWED_ORIGINS.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://([a-zA-Z0-9-]+\.)*(vercel\.app|railway\.app|localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "ThermoShelter API is running"}

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "thermoshelter-backend", "version": "2.1.0"}

from fastapi.responses import StreamingResponse
from llm import parse_requirements_with_llm, generate_rationale_with_llm, generate_chat_response_with_llm, generate_chat_stream_with_llm
from spec_generator import load_all_materials
from geocode_service import resolve_location, autocomplete_city, lookup_climate_region

@app.get("/api/materials")
def get_materials():
    materials = load_all_materials()
    return {"status": "success", "materials": materials}

from blueprint_llm import generate_blueprint

@app.post("/api/llm/parse-requirements")
async def parse_requirements(request: Request):
    if check_rate_limit(request):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment.")
    request_data = await request.json()
    injected_keys = {
        "gemini": request.headers.get("x-gemini-key"),
        "groq": request.headers.get("x-groq-key"),
        "openrouter": request.headers.get("x-openrouter-key"),
        "nvidia": request.headers.get("x-nvidia-key")
    }
    messages = request_data.get("messages", [])
    user_prompt = ""
    if messages:
        user_prompt = messages[-1].get("content", "")
    else:
        user_prompt = request_data.get("prompt", "")
        
    reqs = await parse_requirements_with_llm(user_prompt, injected_keys)
    
    # ── Location Resolution (DB-backed, replaces hardcoded coords) ──
    loc = reqs.get("location") or request_data.get("resolvedLocation", {}).get("city") or "Leh"
    frontend_lat = request_data.get("resolvedLocation", {}).get("lat")
    frontend_lon = request_data.get("resolvedLocation", {}).get("lon")
    
    resolved = await resolve_location(
        city=loc,
        lat=frontend_lat,
        lon=frontend_lon,
        state=request_data.get("resolvedLocation", {}).get("state")
    )
    lat = resolved["lat"]
    lon = resolved["lon"]
    
    # Safely get and cast occupancy and budget to integers to prevent TypeError/ValueError
    occupancy = 4
    try:
        if reqs.get("occupancy") is not None and str(reqs.get("occupancy")).strip() != "":
            occupancy = int(float(str(reqs.get("occupancy"))))
    except (ValueError, TypeError):
        pass
        
    budget = 300000
    try:
        if reqs.get("budget") is not None and str(reqs.get("budget")).strip() != "":
            budget = int(float(str(reqs.get("budget"))))
    except (ValueError, TypeError):
        pass
    
    # ── Building Type Detection & Normalization ──
    building_type_input = (
        request_data.get("building_type") or 
        request_data.get("shelterType") or 
        reqs.get("building_type") or 
        ""
    )
    combined_type_text = f"{building_type_input} {user_prompt}".lower()
    if "emergency" in combined_type_text or "disaster" in combined_type_text or "rapid" in combined_type_text:
        building_type = "emergency"
    elif "community" in combined_type_text or "hall" in combined_type_text or "center" in combined_type_text:
        building_type = "community"
    else:
        building_type = "residential"
    
    try:
        blueprint = await generate_blueprint(
            occupancy=occupancy,
            location=loc,
            budget=budget,
            lat=lat,
            lon=lon,
            climate_concerns=reqs.get("climate_concerns") or [],
            building_type=building_type,
            injected_keys=injected_keys,
            resolved_region=resolved
        )
        return {"status": "success", "blueprint": blueprint}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

@app.post("/api/llm/generate-rationale")
async def generate_rationale(request: Request):
    request_data = await request.json()
    injected_keys = {
        "gemini": request.headers.get("x-gemini-key"),
        "groq": request.headers.get("x-groq-key"),
        "openrouter": request.headers.get("x-openrouter-key"),
        "nvidia": request.headers.get("x-nvidia-key")
    }
    design_parameters = request_data.get("design_parameters", {})
    thermal_results = request_data.get("thermal_results", {})
    rationale = await generate_rationale_with_llm(design_parameters, thermal_results, injected_keys)
    return {"rationale": rationale}

@app.post("/api/llm/chat")
async def chat_endpoint(request: Request):
    if check_rate_limit(request):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment.")
    request_data = await request.json()
    injected_keys = {
        "gemini": request.headers.get("x-gemini-key"),
        "groq": request.headers.get("x-groq-key"),
        "openrouter": request.headers.get("x-openrouter-key"),
        "nvidia": request.headers.get("x-nvidia-key")
    }
    messages = request_data.get("messages", [])
    return StreamingResponse(generate_chat_stream_with_llm(messages, injected_keys), media_type="text/plain")

# ─────────────────────────────────────────────────────────────
# GEOCODE & LOCATION ENDPOINTS
# ─────────────────────────────────────────────────────────────

@app.get("/api/geocode/autocomplete")
async def geocode_autocomplete(q: str = ""):
    """City-level autocomplete for location search. Returns top suggestions."""
    if len(q) < 2:
        return {"suggestions": []}
    suggestions = await autocomplete_city(q)
    return {"suggestions": suggestions}

@app.get("/api/geocode/resolve")
async def geocode_resolve(city: str, lat: float = None, lon: float = None, state: str = None):
    """Resolve a city to its full climate region profile from the database."""
    resolved = await resolve_location(city=city, lat=lat, lon=lon, state=state)
    return {"status": "success", "region": resolved}

@app.get("/api/logs")
async def get_logs():
    """Returns the last 100 lines of the LLM log file."""
    from pathlib import Path
    log_file = Path(__file__).parent / "llm.log"
    if not log_file.exists():
        return {"logs": ["No logs found."]}
    
    try:
        with open(log_file, "r") as f:
            lines = f.readlines()
            return {"logs": lines[-100:]}
    except Exception as e:
        return {"logs": [f"Error reading logs: {str(e)}"]}

# ─────────────────────────────────────────────────────────────
# DECISION MAKING & THERMAL IMPACT SIMULATION ENDPOINTS
# ─────────────────────────────────────────────────────────────

from decision_engine import evaluate_and_recommend_materials, SHELTER_ARCHETYPES
from thermal_simulator import run_dynamic_thermal_simulation, simulate_material_swap
from weather import fetch_live_weather, get_offline_weather_fallback

@app.post("/api/decision/recommend-materials")
async def recommend_materials_endpoint(request: Request):
    """
    Evaluates real-time weather, NBC climate zone, and shelter archetype to recommend
    area-specific materials and ranked alternatives.
    """
    body = await request.json()
    location = body.get("location", "Leh")
    lat = body.get("lat")
    lon = body.get("lon")
    state = body.get("state")
    shelter_type = body.get("shelter_type", "permanent")
    occupancy = body.get("occupancy")
    budget_inr = body.get("budget_inr")

    # If coordinates are missing, resolve them
    if lat is None or lon is None:
        resolved = await resolve_location(city=location, state=state)
        lat = resolved["lat"]
        lon = resolved["lon"]
        state = resolved.get("state")

    try:
        decision = await evaluate_and_recommend_materials(
            location=location,
            lat=float(lat),
            lon=float(lon),
            shelter_type=shelter_type,
            occupancy=occupancy,
            budget_inr=budget_inr,
            state=state
        )
        return decision
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/decision/simulate-thermal")
async def simulate_thermal_endpoint(request: Request):
    """
    Runs a 48-hour dynamic thermal simulation comparing indoor temp (T_in) vs outdoor temp (T_out),
    calculating Delta T, thermal time lag, decrement factor, and comfort scores.
    """
    if check_rate_limit(request):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment.")
    body = await request.json()
    lat = body.get("lat", 34.1526)
    lon = body.get("lon", 77.5771)
    shelter_type = body.get("shelter_type", "permanent")
    occupancy = body.get("occupancy")
    selected_materials = body.get("selected_materials", {})
    dimensions = body.get("dimensions")
    comfort_target = body.get("comfort_target", "normal")  # 'normal' | 'warm' | 'hot'

    # Check material compatibility
    archetype = SHELTER_ARCHETYPES.get(shelter_type.lower(), SHELTER_ARCHETYPES.get("permanent", {}))
    preferred_structural = archetype.get("preferred_structural", [])
    compatibility_warnings = []
    structural_id = selected_materials.get("structural", "")
    if structural_id and preferred_structural and structural_id not in preferred_structural:
        compatibility_warnings.append(
            f"Material '{structural_id}' is not in the recommended list for {shelter_type} shelters."
        )

    # Fetch live weather
    try:
        weather_data = await fetch_live_weather(float(lat), float(lon))
    except Exception as e:
        print(f"[ThermalAPI] Live weather fallback: {e}")
        weather_data = get_offline_weather_fallback(float(lat), float(lon))

    try:
        simulation_result = run_dynamic_thermal_simulation(
            weather_data=weather_data,
            selected_materials=selected_materials,
            shelter_type=shelter_type,
            occupancy=occupancy,
            dimensions=dimensions,
            comfort_target=comfort_target
        )
        if compatibility_warnings:
            simulation_result["compatibility_warnings"] = compatibility_warnings
        return simulation_result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/decision/swap-impact")
async def swap_impact_endpoint(request: Request):
    """
    Simulates the exact thermodynamic delta (Delta T), carbon delta, and cost delta
    when a single material layer is swapped in the envelope.
    """
    body = await request.json()
    lat = body.get("lat", 34.1526)
    lon = body.get("lon", 77.5771)
    shelter_type = body.get("shelter_type", "permanent")
    occupancy = body.get("occupancy")
    base_materials = body.get("base_materials", {})
    swapped_category = body.get("swapped_category", "structural")
    new_material_id = body.get("new_material_id", "cseb")
    dimensions = body.get("dimensions")

    try:
        weather_data = await fetch_live_weather(float(lat), float(lon))
    except Exception as e:
        weather_data = get_offline_weather_fallback(float(lat), float(lon))

    try:
        swap_result = simulate_material_swap(
            base_materials=base_materials,
            swapped_category=swapped_category,
            new_material_id=new_material_id,
            weather_data=weather_data,
            shelter_type=shelter_type,
            occupancy=occupancy,
            dimensions=dimensions
        )
        return swap_result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

