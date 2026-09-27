import json
from llm_client import LLMPipeline
from prompts import REQUIREMENTS_PARSER_PROMPT, RATIONALE_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT
from procurement_engine import ProcurementEngine
import sys
import os

# Comprehensive assembly-to-material ID mapping to ensure zero external import dependencies
ASSEMBLY_TO_MATERIAL = {
    # Cold-Arid (High Altitude Alpine)
    "ASM-WALL-CATALOGUE-EPS": "eps",
    "ASM-WALL-CATALOGUE-AEROGEL": "aerogel",
    "ASM-WALL-LADAKH-INS-MOD": "MAT-CSEB",
    "ASM-WALL-LADAKH-IMP-TRAD": "MAT-RAMMED",
    "ASM-WALL-LADAKH-LIGHT-INS": "MAT-TIMBER-FRAME",
    "ASM-WALL-LADAKH-SUPER-INS": "MAT-STRAWBALE",
    "ASM-WALL-LADAKH-MILITARY-SIP": "MAT-SIP-MILITARY",
    "ASM-ROOF-LADAKH-INS-MOD": "MAT-XPS",
    "ASM-ROOF-LADAKH-TRAD": "MAT-THATCH",
    "ASM-ROOF-LADAKH-AEROGEL": "MAT-AEROGEL-TEXTILE",
    "ASM-FLOOR-LADAKH-INS-SLAB": "MAT-CONCRETE",
    "ASM-FLOOR-LADAKH-MILITARY-SIP": "MAT-SIP-MILITARY",
    # Cold-Cloudy (High Altitude Himalayan)
    "ASM-WALL-SHIMLA-COLD": "MAT-STONE",
    "ASM-WALL-SHIMLA-TIMBER": "MAT-TIMBER-FRAME",
    "ASM-ROOF-SHIMLA-PITCHED": "MAT-XPS",
    "ASM-FLOOR-SHIMLA-RAISED": "MAT-TIMBER-FRAME",
    # Hot-Dry (Composite Desert / Semi-Arid)
    "ASM-WALL-JAIPUR-MASS": "MAT-STONE",
    "ASM-WALL-JAIPUR-AAC": "MAT-CSEB",
    "ASM-WALL-HOT-PCM-DRYWALL": "MAT-PCM-BOARD",
    "ASM-WALL-HOT-RAMMED-INS": "MAT-RAMMED-INSULATED",
    "ASM-WALL-HOT-REV-BRICK": "MAT-REVERSE-BRICK",
    "ASM-ROOF-JAIPUR-COOL": "MAT-CONCRETE",
    "ASM-ROOF-HOT-RADIANT-FOIL": "MAT-RADIANT-FOIL",
    "ASM-FLOOR-JAIPUR-SLAB": "MAT-CONCRETE",
    # Warm-Humid (Tropical Coastal / Monsoon)
    "ASM-WALL-WARM-COMP": "MAT-BRICK",
    "ASM-WALL-WARM-HEMPCRETE": "MAT-HEMPCRETE",
    "ASM-WALL-WARM-LGSF": "MAT-LGSF-PORTAL",
    "ASM-ROOF-WARM-VENT": "MAT-CONCRETE",
    "ASM-ROOF-WARM-PTFE": "MAT-PTFE-MEMBRANE",
    "ASM-FLOOR-WARM-TILED": "MAT-BRICK",
}

procurement_engine = ProcurementEngine()

def get_material_id(assembly_id: str):
    if not assembly_id:
        return None
    if assembly_id in ASSEMBLY_TO_MATERIAL:
        return ASSEMBLY_TO_MATERIAL[assembly_id]
    if assembly_id.startswith("MAT-"):
        return assembly_id
    a_lower = assembly_id.lower()
    for aid, mid in ASSEMBLY_TO_MATERIAL.items():
        if aid.lower() == a_lower:
            return mid
    return None

def get_fallback_requirements(prompt: str):
    p_lower = prompt.lower() if prompt else ""
    b_type = "emergency" if ("emergency" in p_lower or "disaster" in p_lower) else ("community" if "community" in p_lower else "residential")
    return {
        "location": "Leh",
        "occupancy": 4,
        "climate_concerns": ["extreme cold", "sudden heat wave"],
        "budget": 250000 if b_type == "emergency" else 300000,
        "building_type": b_type,
        "original_prompt": prompt,
        "is_fallback": True
    }

async def parse_requirements_with_llm(user_prompt: str, injected_keys: dict = None) -> dict:
    pipeline = LLMPipeline(injected_keys)
    try:
        parsed_json = await pipeline.generate_json(REQUIREMENTS_PARSER_PROMPT, user_prompt)
        print("Success: Requirements parsed via LLMPipeline")
    except Exception as e:
        print(f"Warning: All LLM providers failed for requirements parsing. Using static fallback. Error: {e}")
        parsed_json = get_fallback_requirements(user_prompt)
    
    # Ensure original_prompt is always included
    if "original_prompt" not in parsed_json:
        parsed_json["original_prompt"] = user_prompt
        
    parsed_json["rate_limit_hit"] = pipeline.primary_rate_limit_hit
        
    return parsed_json

async def generate_rationale_with_llm(design_parameters: dict, thermal_results: dict, injected_keys: dict = None) -> str:
    # Extract assemblies
    wall_assembly_id = design_parameters.get("wall_assembly", "")
    roof_assembly_id = design_parameters.get("roof_assembly", "")
    
    wall_mat = get_material_id(wall_assembly_id) if wall_assembly_id else None
    roof_mat = get_material_id(roof_assembly_id) if roof_assembly_id else None
    
    procurement_data = {}
    if wall_mat:
        proc_result = procurement_engine.check_stock_and_price(wall_mat)
        procurement_data["WALL_PROCUREMENT"] = proc_result.dict()
    if roof_mat:
        proc_result = procurement_engine.check_stock_and_price(roof_mat)
        procurement_data["ROOF_PROCUREMENT"] = proc_result.dict()

    user_prompt = (
        f"Design Parameters: {json.dumps(design_parameters)}\n"
        f"Thermal Results: {json.dumps(thermal_results)}\n"
        f"LIVE PROCUREMENT DATA (Output this directly to the user!): {json.dumps(procurement_data)}"
    )
    
    pipeline = LLMPipeline(injected_keys)
    try:
        response = await pipeline.generate_text(RATIONALE_SYSTEM_PROMPT, user_prompt)
        return response
    except Exception as e:
        print(f"Warning: All LLM providers failed for rationale. Using static fallback. Error: {e}")
        return "This design won because its combination of high thermal mass, smart glazing, and insulation effectively minimizes heat loss during cold nights and blocks solar gain during sudden heat waves."

async def generate_chat_response_with_llm(messages: list, injected_keys: dict = None) -> str:
    pipeline = LLMPipeline(injected_keys)
    try:
        response = await pipeline.chat(CHAT_SYSTEM_PROMPT, messages)
        return response
    except Exception as e:
        print(f"Warning: All LLM providers failed for chat. Using static fallback. Error: {e}")
        return "I'm having trouble connecting to my brain right now, but I can help you with ThermoShelter parameters."

async def generate_chat_stream_with_llm(messages: list, injected_keys: dict = None):
    pipeline = LLMPipeline(injected_keys)
    try:
        async for chunk in pipeline.chat_stream(CHAT_SYSTEM_PROMPT, messages):
            yield chunk
    except Exception as e:
        print(f"Warning: Streaming failed. Error: {e}")
        yield "I'm having trouble connecting to my brain right now, but I can help you with ThermoShelter parameters."
