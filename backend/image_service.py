"""
ThermoShelter — Multi-Model Image Generation Service
Routes highly detailed architectural prompts to the best available AI image generator.
If an API key is present in .env, it uses it. If not (or if it fails/rate-limits),
it gracefully falls back to a free zero-setup alternative.
"""

import os
import urllib.parse
import httpx
import base64
from dotenv import load_dotenv
import asyncio

load_dotenv()

# The premier open-source model for architectural realism
HF_MODEL_URL = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell"

async def generate_image_url(prompt: str) -> str:
    """
    Takes an architectural prompt and returns an image URL that the frontend can render.
    If using an API that returns bytes, it returns a base64 data URI string.
    """
    print(f"[ImageService] Routing image generation request...")
    
    # ── 1. STABILITY AI (Stable Image Core) - Top Priority Premium ──
    stability_keys_raw = os.getenv("STABILITY_API_KEY")
    if stability_keys_raw and stability_keys_raw.strip():
        import random
        keys = [k.strip() for k in stability_keys_raw.split(',') if k.strip()]
        stability_key = random.choice(keys)
        
        print(f"[ImageService] Found Stability keys. Using key ending in ...{stability_key[-4:]}. Attempting Stable Image Core generation...")
        headers = {
            "Authorization": f"Bearer {stability_key}",
            "Accept": "image/*"
        }
        files = {
            "prompt": (None, prompt),
            "output_format": (None, "jpeg")
        }
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post("https://api.stability.ai/v2beta/stable-image/generate/core", headers=headers, files=files)
                if response.status_code == 200:
                    image_bytes = response.content
                    base64_img = base64.b64encode(image_bytes).decode('utf-8')
                    print(f"[ImageService] Stability AI image successfully generated!")
                    return f"data:image/jpeg;base64,{base64_img}"
                else:
                    print(f"[ImageService] Stability AI failed ({response.status_code}): {response.text}")
        except Exception as e:
            print(f"[ImageService] Stability AI threw an exception: {e}")
    
    # ── 1. OPENAI (DALL-E 3) - Premium Priority ──
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key and openai_key.strip():
        print(f"[ImageService] Found OpenAI key. Attempting DALL-E 3 generation...")
        headers = {
            "Authorization": f"Bearer {openai_key.strip()}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-image-2",
            "prompt": prompt,
            "n": 1,
            "size": "1024x1024"
        }
        
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post("https://api.openai.com/v1/images/generations", headers=headers, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    image_url = data["data"][0]["url"]
                    print(f"[ImageService] OpenAI image successfully generated!")
                    return image_url
                else:
                    print(f"[ImageService] OpenAI failed ({response.status_code}): {response.text}")
        except Exception as e:
            print(f"[ImageService] OpenAI threw an exception: {e}")

    # ── 2. FAL.AI (FLUX.1-schnell via Fal) - High Speed Premium ──
    fal_key = os.getenv("FAL_API_KEY")
    if fal_key and fal_key.strip():
        print(f"[ImageService] Found Fal.ai key. Attempting FLUX generation...")
        headers = {
            "Authorization": f"Key {fal_key.strip()}",
            "Content-Type": "application/json"
        }
        payload = {
            "prompt": prompt,
            "image_size": "square_hd"
        }
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post("https://fal.run/fal-ai/flux/schnell", headers=headers, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    if "images" in data and len(data["images"]) > 0:
                        image_url = data["images"][0]["url"]
                        print(f"[ImageService] Fal.ai image successfully generated!")
                        return image_url
                print(f"[ImageService] Fal.ai failed ({response.status_code}): {response.text}")
        except Exception as e:
            print(f"[ImageService] Fal.ai threw an exception: {e}")


    # ── 3. HUGGING FACE (Fallback 1) ──
    hf_key = os.getenv("HUGGINGFACE_API_KEY")
    if hf_key and hf_key.strip():
        print(f"[ImageService] Found HuggingFace key. Attempting FLUX.1 generation...")
        headers = {"Authorization": f"Bearer {hf_key.strip()}"}
        payload = {"inputs": prompt}
        
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(HF_MODEL_URL, headers=headers, json=payload)
                if response.status_code == 200:
                    # Convert binary image bytes to Base64 Data URI so the frontend can render it instantly
                    image_bytes = response.content
                    base64_img = base64.b64encode(image_bytes).decode('utf-8')
                    print(f"[ImageService] HuggingFace image successfully generated!")
                    return f"data:image/jpeg;base64,{base64_img}"
                else:
                    print(f"[ImageService] HuggingFace failed ({response.status_code}): {response.text}")
        except Exception as e:
            print(f"[ImageService] HuggingFace threw an exception: {e}")
            
    # ── 4. REPLICATE (SDXL) - Fallback Premium ──
    replicate_key = os.getenv("REPLICATE_API_KEY")
    if replicate_key and replicate_key.strip():
        print(f"[ImageService] Found Replicate key. Attempting SDXL generation...")
        headers = {
            "Authorization": f"Bearer {replicate_key.strip()}",
            "Prefer": "wait"
        }
        payload = {
            "input": {"prompt": prompt}
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post("https://api.replicate.com/v1/models/stability-ai/sdxl/predictions", headers=headers, json=payload)
                if response.status_code in [200, 201]:
                    data = response.json()
                    if data.get("status") == "succeeded" and data.get("output"):
                        image_url = data["output"][0]
                        print(f"[ImageService] Replicate image successfully generated!")
                        return image_url
                    else:
                        print(f"[ImageService] Replicate generation not immediately ready or failed: {data.get('status')}")
                else:
                    print(f"[ImageService] Replicate failed ({response.status_code}): {response.text}")
        except Exception as e:
            print(f"[ImageService] Replicate threw an exception: {e}")

    # ── 5. POLLINATIONS.AI (Free Fallback) ──
    print(f"[ImageService] Falling back to free Pollinations.ai...")
    encoded_prompt = urllib.parse.quote(prompt)
    # Pollinations simply returns the image bytes directly when you hit this URL
    fallback_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true"
    print(f"[ImageService] Generated Pollinations fallback URL.")
    return fallback_url

if __name__ == "__main__":
    # Test script
    async def test():
        url = await generate_image_url("A high-tech sci-fi emergency shelter in the jungle")
        print(f"Resulting URL (First 100 chars): {url[:100]}...")
    asyncio.run(test())
