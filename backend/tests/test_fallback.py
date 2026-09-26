import asyncio
import json
from blueprint_llm import generate_blueprint

async def test_invalid_key_fallback():
    print("Testing generate_blueprint with an invalid API key...")
    
    # Intentionally bad key
    injected_keys = {
        "GEMINI_API_KEY": "INVALID_TEST_KEY_12345"
    }
    
    try:
        result = await generate_blueprint(
            occupancy=4,
            location="Leh, Ladakh",
            budget=300000,
            lat=34.1526,
            lon=77.5771,
            climate_concerns=["extreme cold"],
            injected_keys=injected_keys
        )
        
        source = result.get("meta", {}).get("llm_source")
        print(f"Test completed. LLM Source used: {source}")
        
        if source == "default_fallback":
            print("✅ SUCCESS: Fallback logic successfully triggered when API key was invalid.")
        else:
            print("❌ FAILURE: Expected 'default_fallback' but got something else.")
            
    except Exception as e:
        print(f"❌ FAILURE: An exception occurred that was not caught by the fallback logic: {e}")

if __name__ == "__main__":
    asyncio.run(test_invalid_key_fallback())
