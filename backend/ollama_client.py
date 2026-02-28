import httpx
import json
from typing import Optional, Literal

OLLAMA_BASE_URL = "http://localhost:11434"


class OllamaClient:
    """Client for interacting with Ollama API."""
    
    def __init__(self, base_url: str = OLLAMA_BASE_URL, timeout: float = 120.0):
        self.base_url = base_url
        self.timeout = timeout
    
    async def generate(
        self,
        model: str,
        prompt: str,
        system: Optional[str] = None
    ) -> str:
        """
        Generate a response from Ollama.
        
        Args:
            model: Model name (e.g., 'llama2', 'mistral')
            prompt: User prompt
            system: System prompt/instructions
            
        Returns:
            Generated text response
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False
            }
            
            if system:
                payload["system"] = system
            
            response = await client.post(
                f"{self.base_url}/api/generate",
                json=payload
            )
            response.raise_for_status()
            result = response.json()
            return result.get("response", "")
    
    async def chat(
        self,
        model: str,
        messages: list,
    ) -> str:
        """
        Chat with Ollama using chat API.
        
        Args:
            model: Model name
            messages: List of message dicts with 'role' and 'content'
            
        Returns:
            Assistant's response
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            payload = {
                "model": model,
                "messages": messages,
                "stream": False
            }
            
            response = await client.post(
                f"{self.base_url}/api/chat",
                json=payload
            )
            response.raise_for_status()
            result = response.json()
            return result.get("message", {}).get("content", "")
    
    async def list_models(self) -> list:
        """List available Ollama models."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{self.base_url}/api/tags")
            response.raise_for_status()
            result = response.json()
            return result.get("models", [])


def parse_verdict(response: str) -> tuple[Literal["pass", "fail", "inconclusive"], str, int]:
    """
    Parse LLM response to extract verdict, reasoning, and confidence.
    
    Expected format:
    VERDICT: pass|fail|inconclusive
    REASONING: explanation text
    CONFIDENCE: 0-100
    
    Args:
        response: Raw LLM response
        
    Returns:
        Tuple of (verdict, reasoning, confidence)
    """
    lines = response.strip().split('\n')
    verdict: Literal["pass", "fail", "inconclusive"] = "inconclusive"
    reasoning = ""
    confidence = 50  # Default mid-range confidence
    
    for line in lines:
        line = line.strip()
        if line.upper().startswith("VERDICT:"):
            verdict_text = line.split(":", 1)[1].strip().lower()
            if verdict_text in ["pass", "fail", "inconclusive"]:
                verdict = verdict_text  # type: ignore
        elif line.upper().startswith("REASONING:"):
            reasoning = line.split(":", 1)[1].strip()
        elif line.upper().startswith("CONFIDENCE:"):
            try:
                raw = line.split(":", 1)[1].strip()
                # Handle cases like "85%" or "85/100"
                raw = raw.replace("%", "").split("/")[0].strip()
                confidence = max(0, min(100, int(float(raw))))
            except (ValueError, IndexError):
                confidence = 50
    
    # If no explicit reasoning found, use entire response
    if not reasoning:
        reasoning = response.strip()
    
    return verdict, reasoning, confidence

