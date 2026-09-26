import asyncio
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_apis():
    problems = []

    print("Testing GET /")
    try:
        response = client.get("/")
        print(f"Status: {response.status_code}, Body: {response.json()}")
        if response.status_code != 200:
            problems.append("GET / failed with status " + str(response.status_code))
    except Exception as e:
        problems.append(f"GET / threw exception: {e}")

    print("\nTesting GET /api/materials")
    try:
        response = client.get("/api/materials")
        print(f"Status: {response.status_code}, Body: {str(response.json())[:100]}...")
        if response.status_code != 200:
            problems.append("GET /api/materials failed with status " + str(response.status_code))
    except Exception as e:
        problems.append(f"GET /api/materials threw exception: {e}")

    print("\nTesting POST /api/llm/parse-requirements")
    try:
        response = client.post("/api/llm/parse-requirements", json={"prompt": "Build a shelter for 4 people in Leh with a budget of 300000"})
        print(f"Status: {response.status_code}, Body: {str(response.json())[:100]}...")
        if response.status_code != 200:
            problems.append("POST /api/llm/parse-requirements failed with status " + str(response.status_code))
    except Exception as e:
        problems.append(f"POST /api/llm/parse-requirements threw exception: {e}")

    print("\nTesting POST /api/llm/generate-rationale")
    try:
        response = client.post("/api/llm/generate-rationale", json={"design_parameters": {}, "thermal_results": {}})
        print(f"Status: {response.status_code}, Body: {str(response.json())[:100]}...")
        if response.status_code != 200:
            problems.append("POST /api/llm/generate-rationale failed with status " + str(response.status_code))
    except Exception as e:
        problems.append(f"POST /api/llm/generate-rationale threw exception: {e}")

    print("\nTesting POST /api/llm/chat")
    try:
        response = client.post("/api/llm/chat", json={"messages": [{"role": "user", "content": "Hello"}]})
        print(f"Status: {response.status_code}, Body: {str(response.content)[:100]}...")
        if response.status_code != 200:
            problems.append("POST /api/llm/chat failed with status " + str(response.status_code))
    except Exception as e:
        problems.append(f"POST /api/llm/chat threw exception: {e}")

    print("\n--- RESULTS ---")
    if not problems:
        print("All APIs are working correctly.")
    else:
        print("Problems found:")
        for p in problems:
            print("-", p)

if __name__ == "__main__":
    test_apis()
