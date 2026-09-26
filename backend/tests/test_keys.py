import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def test_firebase():
    print("Testing Firebase...")
    api_key = os.getenv("VITE_FIREBASE_API_KEY")
    if not api_key:
        print("❌ VITE_FIREBASE_API_KEY is missing")
        return
    import httpx
    # Simple REST API call to verify the key is valid (using public getOobConfirmationCode endpoint or something safe)
    # Actually, just fetching the config with HTTP is enough, or let's use the Identity Toolkit API
    url = f"https://identitytoolkit.googleapis.com/v1/projects?key={api_key}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        # Even if it says INVALID_ARGUMENT, it usually means the key is structurally recognized. 
        # If the key is totally invalid, it says API_KEY_INVALID
        if "API_KEY_INVALID" in resp.text:
            print(f"❌ VITE_FIREBASE_API_KEY is INVALID: {resp.text}")
        else:
            print("✅ VITE_FIREBASE_API_KEY is functional (or at least valid format)")

def test_neon():
    print("\nTesting Neon PostgreSQL...")
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ DATABASE_URL is missing")
        return
    try:
        import psycopg2
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        conn.close()
        print("✅ DATABASE_URL is functional")
    except Exception as e:
        print(f"❌ DATABASE_URL failed: {e}")

async def main():
    await test_firebase()
    test_neon()
    print("\nTesting Gemini Key:")
    # We can't test Gemini key from .env because the user puts it in the frontend UI.
    print("Gemini API key is provided by the frontend via the settings panel.")

if __name__ == "__main__":
    asyncio.run(main())
