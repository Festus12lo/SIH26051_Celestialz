import asyncio
import time
from llm_client import LLMPipeline

async def test_all():
    pipeline = LLMPipeline()
    print("Testing generate_text...")
    start = time.time()
    try:
        res = await pipeline.generate_text("You are a helpful assistant.", "Say hello quickly.")
        print(f"generate_text time: {time.time() - start:.2f}s")
        print(f"Response: {res}")
    except Exception as e:
        print(f"generate_text failed: {e}")

    print("\nTesting generate_json...")
    start = time.time()
    try:
        res = await pipeline.generate_json("You return JSON.", "Return {\"hello\": \"world\"}.")
        print(f"generate_json time: {time.time() - start:.2f}s")
        print(f"Response: {res}")
    except Exception as e:
        print(f"generate_json failed: {e}")

asyncio.run(test_all())
