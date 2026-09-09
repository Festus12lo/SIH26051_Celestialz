import os
import asyncio
from google import genai
from dotenv import load_dotenv

load_dotenv()

async def test_gemini():
    keys_env = os.getenv("GEMINI_API_KEYS")
    key = keys_env.split(",")[0] if keys_env else None
    if not key:
        print("No GEMINI_API_KEYS found.")
        return

    client = genai.Client(api_key=key)
    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents="Hello! Tell me a joke quickly."
        )
        print("Response from gemini-1.5-flash:", response.text)
    except Exception as e:
        print("Error with gemini-1.5-flash:", e)

asyncio.run(test_gemini())
