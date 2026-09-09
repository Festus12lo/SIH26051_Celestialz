from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ThermoShelter Backend")

# Read allowed origins from env; default to wildcard for local development only
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",")] if _raw_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "ThermoShelter API is running"}

from fastapi.responses import StreamingResponse
from llm import parse_requirements_with_llm, generate_rationale_with_llm, generate_chat_response_with_llm, generate_chat_stream_with_llm
from spec_generator import load_all_materials

@app.get("/api/materials")
def get_materials():
    materials = load_all_materials()
    return {"status": "success", "materials": materials}

from blueprint_llm import generate_blueprint

@app.post("/api/llm/parse-requirements")
async def parse_requirements(request_data: dict):
    messages = request_data.get("messages", [])
    user_prompt = ""
    if messages:
        user_prompt = messages[-1].get("content", "")
    else:
        user_prompt = request_data.get("prompt", "")
        
    reqs = await parse_requirements_with_llm(user_prompt)
    
    # Default coordinates (Leh) if location is Leh, otherwise dummy coords
    loc = reqs.get("location") or "Leh"
    lat = 34.1526 if "Leh" in loc else 26.9124
    lon = 77.5771 if "Leh" in loc else 75.7873
    
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
    
    building_type_raw = reqs.get("building_type")
    building_type = str(building_type_raw).strip() if building_type_raw else "residential"
    
    try:
        blueprint = await generate_blueprint(
            occupancy=occupancy,
            location=loc,
            budget=budget,
            lat=lat,
            lon=lon,
            climate_concerns=reqs.get("climate_concerns") or [],
            building_type=building_type
        )
        return {"status": "success", "blueprint": blueprint}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

@app.post("/api/llm/generate-rationale")
async def generate_rationale(request_data: dict):
    design_parameters = request_data.get("design_parameters", {})
    thermal_results = request_data.get("thermal_results", {})
    rationale = await generate_rationale_with_llm(design_parameters, thermal_results)
    return {"rationale": rationale}

@app.post("/api/llm/chat")
async def chat_endpoint(request_data: dict):
    messages = request_data.get("messages", [])
    return StreamingResponse(generate_chat_stream_with_llm(messages), media_type="text/plain")
