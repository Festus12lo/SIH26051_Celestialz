import urllib.request
import json
import urllib.error
import os

url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent'
data = {
    "contents": [
        {
            "parts": [
                {"text": "Explain how AI works in a few words"}
            ]
        }
    ]
}

req = urllib.request.Request(
    url, 
    data=json.dumps(data).encode('utf-8'), 
    headers={
        'Content-Type': 'application/json',
        'x-goog-api-key': os.environ.get('GEMINI_API_KEY', 'YOUR_API_KEY_HERE')
    }
)

try:
    res = urllib.request.urlopen(req)
    print(res.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
