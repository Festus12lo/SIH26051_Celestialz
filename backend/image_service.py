"""
ThermoShelter — Multi-Model Image Generation Service
Routes highly detailed architectural prompts to the best available AI image generator.
Currently supports Gemini 3.1 Flash Image (Premium), Stability AI (Premium), and Pollinations.ai (Free Fallback).
"""

import os
import urllib.parse
import httpx
import base64
from dotenv import load_dotenv
import asyncio
try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

load_dotenv()

async def generate_image_url(prompt: str, injected_keys: dict = None) -> str:
    """
    Takes an architectural prompt and returns an image URL that the frontend can render.
    If using an API that returns bytes, it returns a base64 data URI string.
    """
    print(f"[ImageService] Routing image generation request...")
    
    # ── 1. NVIDIA AI (Stable Diffusion XL) - New Top Priority ──
    nvidia_key = (injected_keys.get("nvidia") if injected_keys else None) or os.getenv("NVIDIA_API_KEY")
    if nvidia_key and nvidia_key.strip():
        print(f"[ImageService] Found NVIDIA API key. Attempting NVIDIA Image generation...")
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(
                base_url="https://integrate.api.nvidia.com/v1",
                api_key=nvidia_key.strip(),
                timeout=10.0
            )
            response = await asyncio.wait_for(
                client.images.generate(
                    model="stabilityai/stable-diffusion-xl-base-1.0",
                    prompt=prompt,
                    size="1024x1024",
                    n=1,
                    response_format="b64_json"
                ),
                timeout=12.0
            )
            if response.data and len(response.data) > 0 and response.data[0].b64_json:
                base64_img = response.data[0].b64_json
                print(f"[ImageService] NVIDIA AI image successfully generated!")
                return f"data:image/jpeg;base64,{base64_img}"
            elif response.data and len(response.data) > 0 and response.data[0].url:
                url = response.data[0].url
                print(f"[ImageService] NVIDIA AI image successfully generated! (URL)")
                return url
        except Exception as e:
            print(f"[ImageService] NVIDIA Image generation threw an exception: {e}")

    # ── 2. GEMINI 3.1 FLASH IMAGE - Fallback 1 ──
    gemini_key = (injected_keys.get("gemini") if injected_keys else None) or os.getenv("GEMINI_API_KEY")
    if genai and gemini_key and gemini_key.strip():
        print(f"[ImageService] Found Gemini API key. Attempting Gemini 3.1 Flash Image generation...")
        try:
            client = genai.Client(api_key=gemini_key.strip())
            result = await asyncio.wait_for(
                client.aio.interactions.create(
                    model='gemini-3.1-flash-image',
                    input=prompt,
                    response_format={
                        "type": "image",
                        "mime_type": "image/jpeg",
                        "aspect_ratio": "16:9"
                    }
                ),
                timeout=10.0
            )
            if result.output_image and result.output_image.data:
                base64_img = result.output_image.data
                print(f"[ImageService] Gemini AI image successfully generated!")
                return f"data:image/jpeg;base64,{base64_img}"
        except Exception as e:
            print(f"[ImageService] Gemini Image generation threw an exception: {e}")

    # ── 2. STABILITY AI (Stable Image Core) - Fallback 1 ──
    stability_keys_raw = os.getenv("STABILITY_API_KEY")
    if stability_keys_raw and stability_keys_raw.strip():
        import random
        keys = [k.strip() for k in stability_keys_raw.split(',') if k.strip()]
        stability_key = random.choice(keys)
        
        print(f"[ImageService] Found Stability keys. Attempting Stable Image Core generation...")
        headers = {
            "Authorization": f"Bearer {stability_key}",
            "Accept": "image/*"
        }
        files = {
            "prompt": (None, prompt),
            "negative_prompt": (None, "luxury, mansion, expensive, glossy, polished, manicured lawns, unreal engine, cinematic, fancy"),
            "output_format": (None, "jpeg")
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
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
    
    # ── 3. POLLINATIONS.AI (Free Fallback) ──
    print(f"[ImageService] Falling back to free Pollinations.ai...")
    
    # Enhancing prompt for Pollinations to ensure better quality architectural output
    enhanced_prompt = prompt + ", highly detailed, photorealistic, 8k resolution, documentary style, realistic"
    encoded_prompt = urllib.parse.quote(enhanced_prompt)
    
    # Pollinations simply returns the image bytes directly when you hit this URL
    fallback_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true&seed={os.urandom(4).hex()}"
    print(f"[ImageService] Generated Pollinations fallback URL.")
    return fallback_url

if __name__ == "__main__":
    # Test script
    async def test():
        url = await generate_image_url("A high-tech sci-fi emergency shelter in the jungle")
        print(f"Resulting URL (First 100 chars): {url[:100]}...")
    asyncio.run(test())
