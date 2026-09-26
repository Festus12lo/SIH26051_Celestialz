import os, asyncio, time
from google import genai
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("GEMINI_API_KEYS").split(",")[0]
client = genai.Client(api_key=key)

start = time.time()
try:
    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents="Hello! Tell me a joke quickly."
    )
    print(f"Time taken gemini-3.5-flash: {time.time() - start:.2f}s")
    print(response.text.encode('ascii', 'ignore').decode())
except Exception as e:
    print("Error:", e)
