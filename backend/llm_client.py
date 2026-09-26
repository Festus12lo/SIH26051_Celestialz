import os
import json
import httpx
from google import genai
from dotenv import load_dotenv
import logging

# Configure logger
logger = logging.getLogger("LLMPipeline")
logger.setLevel(logging.INFO)
log_file = os.path.join(os.path.dirname(__file__), "llm.log")
fh = logging.FileHandler(log_file)
fh.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(fh)

load_dotenv()

def mask_key(key: str) -> str:
    """Mask API key for safe logging: shows first 4 and last 4 chars if long enough, else '***'."""
    if not key or len(key) < 10:
        return "***"
    return f"{key[:4]}...{key[-4:]}"

GEMINI_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"]

class LLMPipeline:
    """
    Centralized LLM Pipeline for ThermoShelter.
    Handles API key rotation, provider fallbacks (Gemini -> Groq -> OpenRouter),
    and enforces structured output format (JSON or text).
    """
    def __init__(self, injected_keys: dict = None):
        injected_keys = injected_keys or {}
        
        server_env = os.getenv("GEMINI_API_KEYS") or os.getenv("GEMINI_API_KEY")
        server_keys = [k.strip() for k in server_env.split(",") if k.strip()] if server_env else []
        
        gemini_injected = (injected_keys.get("gemini") or "").strip()
        if gemini_injected and gemini_injected.lower() not in ["null", "undefined", "none", ""]:
            # Prioritize client-provided key if valid, but keep server keys as reliable fallback
            self.gemini_keys = [gemini_injected] + [k for k in server_keys if k != gemini_injected]
        else:
            self.gemini_keys = server_keys
            
        self.groq_key = injected_keys.get("groq") or os.getenv("GROQ_API_KEY")
        self.openrouter_key = injected_keys.get("openrouter") or os.getenv("OPENROUTER_API_KEY")
        self.nvidia_key = injected_keys.get("nvidia") or os.getenv("NVIDIA_API_KEY")
        self.primary_rate_limit_hit = False

    async def generate_text(self, system_prompt: str, user_prompt: str) -> str:
        """Generate a text response with fallbacks."""
        # 1. Try Gemini
        last_error = None
        for key in self.gemini_keys:
            client = genai.Client(api_key=key)
            for model_name in GEMINI_MODELS:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=user_prompt,
                        config={"system_instruction": system_prompt}
                    )
                    logger.info(f"Gemini text success using model {model_name} with key {mask_key(key)}")
                    return response.text.strip()
                except Exception as e:
                    err_str = str(e).lower()
                    if "429" in err_str or "quota" in err_str or "exhausted" in err_str:
                        self.primary_rate_limit_hit = True
                    logger.warning(f"Gemini text error ({model_name}): {e}")
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
                    "model": "meta/llama-3.2-11b-vision-instruct",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                }
                async with httpx.AsyncClient() as client:
                    res = await client.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload, timeout=15.0)
                    res.raise_for_status()
                    content = res.json()["choices"][0]["message"]["content"]
                    logger.info(f"Nvidia text success")
                    return content.strip()
            except Exception as e:
                logger.warning(f"Nvidia text error: {e}")
                last_error = e
                
        # 3. Try Groq
        if self.groq_key and self.groq_key != "your_groq_api_key_here":
            try:
                headers = {
                    "Authorization": f"Bearer {self.groq_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "openai/gpt-oss-20b",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                }
                async with httpx.AsyncClient() as client:
                    res = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=15.0)
                    res.raise_for_status()
                    content = res.json()["choices"][0]["message"]["content"]
                    logger.info(f"Groq text success")
                    return content.strip()
            except Exception as e:
                logger.warning(f"Groq text error: {e}")
                last_error = e

        # 4. Try OpenRouter
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
                    logger.info(f"OpenRouter text success")
                    return content.strip()
            except Exception as e:
                logger.warning(f"OpenRouter text error: {e}")
                last_error = e
        
        logger.error(f"All LLM providers failed for text generation: {last_error}")
        raise RuntimeError(f"All LLM providers failed for text generation. Last error: {last_error}")

    async def generate_json(self, system_prompt: str, user_prompt: str) -> dict:
        """Generate structured JSON response with fallbacks."""
        last_error = None
        
        # 1. Try Nvidia
        if self.nvidia_key:
            try:
                headers = {
                    "Authorization": f"Bearer {self.nvidia_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "meta/llama-3.2-11b-vision-instruct",
                    "messages": [
                        {"role": "system", "content": system_prompt + "\n\nRETURN ONLY VALID JSON. No markdown formatting."},
                        {"role": "user", "content": user_prompt}
                    ],
                    "response_format": {"type": "json_object"}
                }
                async with httpx.AsyncClient() as client:
                    res = await client.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload, timeout=25.0)
                    res.raise_for_status()
                    content = res.json()["choices"][0]["message"]["content"]
                    logger.info(f"Nvidia JSON success")
                    return json.loads(content.strip())
            except Exception as e:
                last_error = e
                logger.warning(f"[LLMPipeline] Nvidia JSON failed: {e}")

        # 2. Try Gemini
        for key in self.gemini_keys:
            client = genai.Client(api_key=key)
            for model_name in GEMINI_MODELS:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=user_prompt,
                        config={
                            "system_instruction": system_prompt,
                            "response_mime_type": "application/json"
                        }
                    )
                    logger.info(f"Gemini JSON success using model {model_name} with key {mask_key(key)}")
                    return json.loads(response.text.strip())
                except Exception as e:
                    err_str = str(e).lower()
                    if "429" in err_str or "quota" in err_str or "exhausted" in err_str:
                        self.primary_rate_limit_hit = True
                    last_error = e
                    logger.warning(f"[LLMPipeline] Gemini JSON failed ({model_name}): {e}")
                    continue
        
        # 3. Try Groq (Llama3-8b supports JSON mode well)
        if self.groq_key and self.groq_key != "your_groq_api_key_here":
            try:
                headers = {
                    "Authorization": f"Bearer {self.groq_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "openai/gpt-oss-120b",
                    "messages": [
                        {"role": "system", "content": system_prompt + "\n\nRETURN ONLY VALID JSON. No markdown formatting."},
                        {"role": "user", "content": user_prompt}
                    ]
                }
                async with httpx.AsyncClient() as client:
                    res = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=15.0)
                    res.raise_for_status()
                    content = res.json()["choices"][0]["message"]["content"]
                    logger.info(f"Groq JSON success")
                    return json.loads(content.strip())
            except Exception as e:
                logger.warning(f"[LLMPipeline] Groq JSON failed: {e}")
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
                        content = content[3:-3].strip()
                    logger.info(f"OpenRouter JSON success")
                    return json.loads(content)
            except Exception as e:
                logger.warning(f"[LLMPipeline] OpenRouter JSON failed: {e}")
                last_error = e

        logger.error(f"All LLM providers failed for JSON generation: {last_error}")
        raise RuntimeError(f"All LLM providers failed for JSON generation. Last error: {last_error}")

    async def chat(self, system_prompt: str, history: list) -> str:
        """
        Special chat method that preserves message history.
        history is expected to be a list of dicts: [{"role": "user"|"assistant", "content": "..."}]
        """
        last_error = None
        for key in self.gemini_keys:
            client = genai.Client(api_key=key)
            gemini_history = []
            for msg in history[:-1]:
                role = "model" if msg.get("role") == "assistant" else "user"
                gemini_history.append({"role": role, "parts": [{"text": msg.get("content", "")}]})
            last_content = history[-1].get("content", "")

            for model_name in GEMINI_MODELS:
                try:
                    chat_session = client.chats.create(
                        model=model_name,
                        config={"system_instruction": system_prompt},
                        history=gemini_history
                    )
                    response = chat_session.send_message(last_content)
                    return response.text.strip()
                except Exception as e:
                    err_str = str(e).lower()
                    if "429" in err_str or "quota" in err_str or "exhausted" in err_str:
                        self.primary_rate_limit_hit = True
                    logger.warning(f"Gemini chat error ({model_name}): {e}")
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
                    "model": "meta/llama-3.2-11b-vision-instruct",
                    "messages": messages
                }
                async with httpx.AsyncClient() as client:
                    res = await client.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload, timeout=15.0)
                    res.raise_for_status()
                    content = res.json()["choices"][0]["message"]["content"]
                    return content.strip()
            except Exception as e:
                last_error = e
                
        # Fallback for chat (Groq)
        if self.groq_key and self.groq_key != "your_groq_api_key_here":
            try:
                headers = {
                    "Authorization": f"Bearer {self.groq_key}",
                    "Content-Type": "application/json"
                }
                messages = [{"role": "system", "content": system_prompt}] + history
                payload = {
                    "model": "openai/gpt-oss-20b",
                    "messages": messages
                }
                async with httpx.AsyncClient() as client:
                    res = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=15.0)
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

        logger.error(f"All LLM providers failed for chat generation. Last error: {last_error}")
        return (
            "Hello! I am the ThermoShelter Bioclimatic Architect. "
            "I specialize in climate-resilient shelter engineering, thermal envelope optimization, and passive solar design.\n\n"
            "*(Note: All API keys appear to be exhausted or invalid. Using offline fallback mode.)*"
        )

    async def chat_stream(self, system_prompt: str, history: list):
        """
        Special chat method that streams response chunks.
        history is expected to be a list of dicts: [{"role": "user"|"assistant", "content": "..."}]
        """
        last_error = None
        for key in self.gemini_keys:
            client = genai.Client(api_key=key)
            gemini_history = []
            for msg in history[:-1]:
                role = "model" if msg.get("role") == "assistant" else "user"
                gemini_history.append({"role": role, "parts": [{"text": msg.get("content", "")}]})
            last_content = history[-1].get("content", "")

            for model_name in GEMINI_MODELS:
                try:
                    chat_session = client.chats.create(
                        model=model_name,
                        config={"system_instruction": system_prompt},
                        history=gemini_history
                    )
                    response_stream = chat_session.send_message_stream(last_content)
                    streamed_any = False
                    for chunk in response_stream:
                        if chunk.text:
                            streamed_any = True
                            yield chunk.text
                    if streamed_any:
                        return
                except Exception as e:
                    err_str = str(e).lower()
                    if "429" in err_str or "quota" in err_str or "exhausted" in err_str:
                        self.primary_rate_limit_hit = True
                        yield "__RATE_LIMIT_HIT__"
                    logger.warning(f"Gemini streaming failed ({model_name}): {e}")
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
                    "model": "meta/llama-3.2-11b-vision-instruct",
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
                
        if self.groq_key and self.groq_key != "your_groq_api_key_here":
            try:
                headers = {
                    "Authorization": f"Bearer {self.groq_key}",
                    "Content-Type": "application/json"
                }
                messages = [{"role": "system", "content": system_prompt}] + history
                payload = {
                    "model": "openai/gpt-oss-20b",
                    "messages": messages,
                    "stream": True
                }
                async with httpx.AsyncClient() as client:
                    async with client.stream("POST", "https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=15.0) as res:
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
                print(f"Groq streaming failed: {e}")
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

        logger.error(f"All LLM providers failed for chat streaming. Last error: {last_error}")
        fallback_chunks = [
            "Hello! ", "I am ", "the ThermoShelter ", "Bioclimatic Architect. ",
            "I specialize in climate-resilient shelter engineering, thermal envelope optimization, ",
            "and passive solar design.\n\n",
            "• **Envelope Insulation:** Optimized assemblies with EPS, Aerogel, and multi-layered thermal breaks.\n",
            "• **Passive Solar Orientation:** True South azimuth (180°) with calculated solar overhangs.\n",
            "• **Extreme Climate Specs:** Zone V heavy snow load tolerance (2.5 kN/m²) and deep frost-line foundations.\n\n",
            "*(Note: All API keys appear to be exhausted or invalid. Using offline fallback mode.)*"
        ]
        for chunk in fallback_chunks:
            yield chunk
        return
