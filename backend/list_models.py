import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

keys_env = os.getenv("GEMINI_API_KEYS")
key = keys_env.split(",")[0] if keys_env else None

client = genai.Client(api_key=key)
print([m.name for m in client.models.list()])
