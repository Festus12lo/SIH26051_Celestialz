import asyncio
from llm import generate_chat_stream_with_llm

async def main():
    print("Starting chat stream test...")
    messages = [{"role": "user", "content": "Hello! Give me a short 1 sentence response."}]
    try:
        async for chunk in generate_chat_stream_with_llm(messages):
            print(chunk, end="", flush=True)
        print("\n\nDone.")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    asyncio.run(main())
