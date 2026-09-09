import os
import asyncio
import time
from google import genai
from dotenv import load_dotenv

load_dotenv()

async def test_gemini():
    keys_env = os.getenv("GEMINI_API_KEYS")
    key = keys_env.split(",")[0] if keys_env else None
    
    start_time = time.time()
    client = genai.Client(api_key=key)
    try:
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents="Hello! Tell me a joke quickly."
        )
        print(f"Time taken: {time.time() - start_time:.2f} seconds")
        # Ensure we don't hit charmap encoding issues on Windows
        print(response.text.encode('ascii', 'ignore').decode())
    except Exception as e:
        print("Error with gemini-3.6-flash:", e)

asyncio.run(test_gemini())
