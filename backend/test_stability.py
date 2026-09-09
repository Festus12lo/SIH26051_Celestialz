import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def test_stability():
    stability_key = os.getenv("STABILITY_API_KEY")
    if not stability_key:
        print("No stability key")
        return
        
    prompt = "A high-tech sci-fi emergency shelter in the jungle"
    headers = {
        "Authorization": f"Bearer {stability_key.strip()}",
        "Accept": "image/*"
    }
    files = {
        "prompt": (None, prompt),
        "output_format": (None, "jpeg")
    }
    
    print("Sending request...")
    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post("https://api.stability.ai/v2beta/stable-image/generate/core", headers=headers, files=files)
        print(f"Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Error: {response.text}")
        else:
            print("Success! Got image bytes.")

asyncio.run(test_stability())
