import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

async def test_openai():
    key = os.getenv("OPENAI_API_KEY")
    if not key: return "No key"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get("https://api.openai.com/v1/models", headers={"Authorization": f"Bearer {key}"})
            return f"{res.status_code} OK" if res.status_code == 200 else f"Failed: {res.status_code} - {res.text}"
    except Exception as e: return f"Error: {e}"

async def test_fal():
    key = os.getenv("FAL_API_KEY")
    if not key: return "No key"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post("https://fal.run/fal-ai/flux/schnell", headers={"Authorization": f"Key {key}"}, json={})
            # 422 Unprocessable Entity means the key is valid but payload is empty.
            return f"Auth Valid (Got {res.status_code})" if res.status_code in [200, 422] else f"Failed: {res.status_code} - {res.text}"
    except Exception as e: return f"Error: {e}"

async def test_stability():
    key = os.getenv("STABILITY_API_KEY")
    if not key: return "No key"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get("https://api.stability.ai/v1/user/balance", headers={"Authorization": f"Bearer {key}"})
            return f"{res.status_code} OK" if res.status_code == 200 else f"Failed: {res.status_code} - {res.text}"
    except Exception as e: return f"Error: {e}"

async def test_replicate():
    key = os.getenv("REPLICATE_API_KEY")
    if not key: return "No key"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get("https://api.replicate.com/v1/models/stability-ai/sdxl", headers={"Authorization": f"Bearer {key}"})
            return f"{res.status_code} OK" if res.status_code == 200 else f"Failed: {res.status_code} - {res.text}"
    except Exception as e: return f"Error: {e}"

async def test_hf():
    key = os.getenv("HUGGINGFACE_API_KEY")
    if not key: return "No key"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get("https://huggingface.co/api/whoami-v2", headers={"Authorization": f"Bearer {key}"})
            return f"{res.status_code} OK" if res.status_code == 200 else f"Failed: {res.status_code} - {res.text}"
    except Exception as e: return f"Error: {e}"

async def main():
    print("====================================")
    print("Testing OpenAI       :", await test_openai())
    print("Testing Fal.ai       :", await test_fal())
    print("Testing Stability    :", await test_stability())
    print("Testing Replicate    :", await test_replicate())
    print("Testing Hugging Face :", await test_hf())
    print("====================================")

asyncio.run(main())
