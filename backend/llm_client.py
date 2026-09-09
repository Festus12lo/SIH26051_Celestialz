import os
import json
import httpx
from google import genai
from dotenv import load_dotenv

load_dotenv()

class LLMPipeline:
    """
    Centralized LLM Pipeline for ThermoShelter.
    Handles API key rotation, provider fallbacks (Gemini -> Groq -> OpenRouter),
    and enforces structured output format (JSON or text).
    """
    def __init__(self):
        keys_env = os.getenv("GEMINI_API_KEYS") or os.getenv("GEMINI_API_KEY")
        self.gemini_keys = [k.strip() for k in keys_env.split(",")] if keys_env else []
        self.groq_key = os.getenv("GROQ_API_KEY")
        self.openrouter_key = os.getenv("OPENROUTER_API_KEY")
        self.nvidia_key = os.getenv("NVIDIA_API_KEY")

    async def generate_text(self, system_prompt: str, user_prompt: str) -> str:
        """Generate a text response with fallbacks."""
        # 1. Try Gemini
        last_error = None
        for key in self.gemini_keys:
            try:
                client = genai.Client(api_key=key)
                response = client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=user_prompt,
                    config={"system_instruction": system_prompt}
                )
                return response.text.strip()
            except Exception as e:
                last_error = e
                continue
        
        # 2. Try Nvidia
        if self.nvidia_key:
            try:
                headers = {
                    "Authorization": f"Bearer {self.nvidia_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "meta/llama-3.1-70b-instruct",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                }
                async with httpx.AsyncClient() as client:
                    res = await client.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload, timeout=15.0)
                    res.raise_for_status()
                    content = res.json()["choices"][0]["message"]["content"]
                    return content.strip()
            except Exception as e:
                last_error = e
                
        # 3. Try OpenRouter (Groq doesn't always have a good chat fallback for free, OpenRouter has free Llama)
        if self.openrouter_key:
            try:
                headers = {
                    "Authorization": f"Bearer {self.openrouter_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "meta-llama/llama-3.1-8b-instruct:free",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                }
                async with httpx.AsyncClient() as client:
                    res = await client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=15.0)
                    res.raise_for_status()
                    content = res.json()["choices"][0]["message"]["content"]
                    return content.strip()
            except Exception as e:
                last_error = e
        
        raise RuntimeError(f"All LLM providers failed for text generation. Last error: {last_error}")

    async def generate_json(self, system_prompt: str, user_prompt: str) -> dict:
        """Generate structured JSON response with fallbacks."""
        # 1. Try Gemini
        last_error = None
        for key in self.gemini_keys:
            try:
                client = genai.Client(api_key=key)
                response = client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=user_prompt,
                    config={
                        "system_instruction": system_prompt,
                        "response_mime_type": "application/json"
                    }
                )
                return json.loads(response.text.strip())
            except Exception as e:
                last_error = e
                continue
                
        # 2. Try Nvidia
        if self.nvidia_key:
            try:
                headers = {
                    "Authorization": f"Bearer {self.nvidia_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "meta/llama-3.1-70b-instruct",
                    "messages": [
                        {"role": "system", "content": system_prompt + "\n\nRETURN ONLY VALID JSON. No markdown formatting."},
                        {"role": "user", "content": user_prompt}
                    ],
                    "response_format": {"type": "json_object"}
                }
                async with httpx.AsyncClient() as client:
                    res = await client.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload, timeout=15.0)
                    res.raise_for_status()
                    content = res.json()["choices"][0]["message"]["content"]
                    return json.loads(content.strip())
            except Exception as e:
                last_error = e
        
        # 3. Try Groq (Llama3-8b supports JSON mode well)
        if self.groq_key and self.groq_key != "your_groq_api_key_here":
            try:
                headers = {
                    "Authorization": f"Bearer {self.groq_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "llama-3.1-8b-instant",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "response_format": {"type": "json_object"}
                }
                async with httpx.AsyncClient() as client:
                    res = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=15.0)
                    res.raise_for_status()
                    content = res.json()["choices"][0]["message"]["content"]
                    return json.loads(content.strip())
            except Exception as e:
                last_error = e
                
        # 3. Try OpenRouter (Fallback, requires manual JSON extraction)
        if self.openrouter_key:
            try:
                headers = {
                    "Authorization": f"Bearer {self.openrouter_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "meta-llama/llama-3.1-8b-instruct:free",
                    "messages": [
                        {"role": "system", "content": system_prompt + "\n\nRETURN ONLY JSON. No markdown wrappers."},
                        {"role": "user", "content": user_prompt}
                    ]
                }
                async with httpx.AsyncClient() as client:
                    res = await client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=15.0)
                    res.raise_for_status()
                    content = res.json()["choices"][0]["message"]["content"].strip()
                    if content.startswith("```json"):
                        content = content[7:-3].strip()
                    elif content.startswith("```"):
                        content = content[3:-3].strip()
                    return json.loads(content)
            except Exception as e:
                last_error = e

        raise RuntimeError(f"All LLM providers failed for JSON generation. Last error: {last_error}")

    async def chat(self, system_prompt: str, history: list) -> str:
        """
        Special chat method that preserves message history.
        history is expected to be a list of dicts: [{"role": "user"|"assistant", "content": "..."}]
        """
        last_error = None
        for key in self.gemini_keys:
            try:
                client = genai.Client(api_key=key)
                
                # Convert history format for Gemini
                gemini_history = []
                for msg in history[:-1]:
                    role = "model" if msg.get("role") == "assistant" else "user"
                    gemini_history.append({"role": role, "parts": [{"text": msg.get("content", "")}]})
                
                chat_session = client.chats.create(
                    model="gemini-1.5-flash",
                    config={"system_instruction": system_prompt},
                    history=gemini_history
                )
                
                last_content = history[-1].get("content", "")
                response = chat_session.send_message(last_content)
                return response.text.strip()
            except Exception as e:
                last_error = e
                continue
                
        # Fallback for chat (Nvidia)
        if self.nvidia_key:
            try:
                headers = {
                    "Authorization": f"Bearer {self.nvidia_key}",
                    "Content-Type": "application/json"
                }
                messages = [{"role": "system", "content": system_prompt}] + history
                payload = {
                    "model": "meta/llama-3.1-70b-instruct",
                    "messages": messages
                }
                async with httpx.AsyncClient() as client:
                    res = await client.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload, timeout=15.0)
                    res.raise_for_status()
                    content = res.json()["choices"][0]["message"]["content"]
                    return content.strip()
            except Exception as e:
                last_error = e
                
        # Fallback for chat (OpenRouter)
        if self.openrouter_key:
            try:
                headers = {
                    "Authorization": f"Bearer {self.openrouter_key}",
                    "Content-Type": "application/json"
                }
                messages = [{"role": "system", "content": system_prompt}] + history
                payload = {
                    "model": "meta-llama/llama-3.1-8b-instruct:free",
                    "messages": messages
                }
                async with httpx.AsyncClient() as client:
                    res = await client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=15.0)
                    res.raise_for_status()
                    content = res.json()["choices"][0]["message"]["content"]
                    return content.strip()
            except Exception as e:
                last_error = e

        raise RuntimeError(f"All LLM providers failed for chat generation. Last error: {last_error}")

    async def chat_stream(self, system_prompt: str, history: list):
        """
        Special chat method that streams response chunks.
        history is expected to be a list of dicts: [{"role": "user"|"assistant", "content": "..."}]
        """
        last_error = None
        for key in self.gemini_keys:
            try:
                client = genai.Client(api_key=key)
                
                gemini_history = []
                for msg in history[:-1]:
                    role = "model" if msg.get("role") == "assistant" else "user"
                    gemini_history.append({"role": role, "parts": [{"text": msg.get("content", "")}]})
                
                chat_session = client.aio.chats.create(
                    model="gemini-1.5-flash",
                    config={"system_instruction": system_prompt},
                    history=gemini_history
                )
                
                last_content = history[-1].get("content", "")
                response_stream = await chat_session.send_message_stream(last_content)
                async for chunk in response_stream:
                    if chunk.text:
                        yield chunk.text
                return
            except Exception as e:
                print(f"Gemini streaming failed: {e}")
                last_error = e
                continue
                
        if self.nvidia_key:
            try:
                headers = {
                    "Authorization": f"Bearer {self.nvidia_key}",
                    "Content-Type": "application/json"
                }
                messages = [{"role": "system", "content": system_prompt}] + history
                payload = {
                    "model": "meta/llama-3.1-70b-instruct",
                    "messages": messages,
                    "stream": True
                }
                async with httpx.AsyncClient() as client:
                    async with client.stream("POST", "https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload, timeout=15.0) as res:
                        res.raise_for_status()
                        async for line in res.aiter_lines():
                            if line.startswith("data: "):
                                data_str = line[6:]
                                if data_str == "[DONE]":
                                    break
                                try:
                                    import json
                                    data = json.loads(data_str)
                                    if "choices" in data and len(data["choices"]) > 0:
                                        delta = data["choices"][0].get("delta", {})
                                        if "content" in delta:
                                            yield delta["content"]
                                except Exception:
                                    pass
                return
            except Exception as e:
                print(f"Nvidia streaming failed: {e}")
                last_error = e
                
        if self.openrouter_key:
            try:
                headers = {
                    "Authorization": f"Bearer {self.openrouter_key}",
                    "Content-Type": "application/json"
                }
                messages = [{"role": "system", "content": system_prompt}] + history
                payload = {
                    "model": "meta-llama/llama-3.1-8b-instruct:free",
                    "messages": messages,
                    "stream": True
                }
                async with httpx.AsyncClient() as client:
                    async with client.stream("POST", "https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=15.0) as res:
                        res.raise_for_status()
                        async for line in res.aiter_lines():
                            if line.startswith("data: "):
                                data_str = line[6:]
                                if data_str == "[DONE]":
                                    break
                                try:
                                    import json
                                    data = json.loads(data_str)
                                    if "choices" in data and len(data["choices"]) > 0:
                                        delta = data["choices"][0].get("delta", {})
                                        if "content" in delta:
                                            yield delta["content"]
                                except Exception:
                                    pass
                return
            except Exception as e:
                last_error = e

        yield f"All LLM providers failed for chat streaming. Last error: {last_error}"
