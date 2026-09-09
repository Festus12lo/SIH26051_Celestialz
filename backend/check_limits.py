import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

async def check_groq_limits():
    key = os.getenv("GROQ_API_KEY")
    try:
        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama3-8b-8192",
            "messages": [{"role": "user", "content": "hi"}]
        }
        async with httpx.AsyncClient() as client:
            res = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=10.0)
            print("Groq Response Status:", res.status_code)
            
            # Print rate limit headers
            print("--- Groq Rate Limits ---")
            for k, v in res.headers.items():
                if "x-ratelimit" in k.lower():
                    print(f"{k}: {v}")
                    
    except Exception as e:
        print("Groq error:", e)

async def check_openrouter_limits():
    key = os.getenv("OPENROUTER_API_KEY")
    try:
        headers = {
            "Authorization": f"Bearer {key}",
        }
        async with httpx.AsyncClient() as client:
            res = await client.get("https://openrouter.ai/api/v1/auth/key", headers=headers, timeout=10.0)
            print("\nOpenRouter Response Status:", res.status_code)
            if res.status_code == 200:
                data = res.json()
                print("OpenRouter Credits Remaining:", data.get('data', {}).get('limit') - data.get('data', {}).get('usage') if data.get('data', {}).get('limit') is not None else "Unlimited / Usage: " + str(data.get('data', {}).get('usage')))
            else:
                print("OpenRouter API Key check failed:", res.text)
    except Exception as e:
        print("OpenRouter error:", e)

async def main():
    await check_groq_limits()
    await check_openrouter_limits()

asyncio.run(main())
