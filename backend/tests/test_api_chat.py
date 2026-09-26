import requests

try:
    response = requests.post(
        "http://localhost:8000/api/llm/chat",
        json={"messages": [{"role": "user", "content": "Hello!"}]},
        stream=True
    )
    for chunk in response.iter_content(chunk_size=None, decode_unicode=True):
        print(chunk, end="", flush=True)
    print("\nSuccess.")
except Exception as e:
    print(f"Error: {e}")
