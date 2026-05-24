"""
Multi-provider LLM client.

Supported providers (set via LLM_PROVIDER env var):
  - openai     — OpenAI (gpt-4.1-mini default). Requires OPENAI_API_KEY.
  - openrouter  — OpenRouter (openai-compatible). Requires OPENROUTER_API_KEY.
  - groq       — Groq (openai-compatible). Requires GROQ_API_KEY.
  - ollama     — Local Ollama. No key needed. Set OLLAMA_BASE_URL (default http://localhost:11434/v1).

Providers that support structured outputs (json_schema + strict):
  openai, openrouter (model-dependent)

Providers that require prompt-based JSON + Pydantic fallback:
  groq, ollama
"""

from __future__ import annotations

import json
import os
from typing import Any

from openai import OpenAI
from pydantic import BaseModel, ValidationError

PROVIDERS: dict[str, dict[str, Any]] = {
    "openai": {
        "base_url": None,
        "env_key": "OPENAI_API_KEY",
        "default_model": "gpt-4.1-mini",
        "supports_structured_outputs": True,
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "env_key": "OPENROUTER_API_KEY",
        "default_model": "openai/gpt-4.1-mini",
        "supports_structured_outputs": True,
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "env_key": "GROQ_API_KEY",
        "default_model": "llama-3.3-70b-versatile",
        "supports_structured_outputs": False,
    },
    "ollama": {
        "base_url": None,
        "env_key": "OLLAMA_API_KEY",
        "default_model": "llama3.1",
        "supports_structured_outputs": False,
    },
}


def _get_provider_config() -> tuple[str, dict[str, Any]]:
    provider_name = os.environ.get("LLM_PROVIDER", "openai").lower()
    if provider_name not in PROVIDERS:
        raise ValueError(
            f"Unknown LLM_PROVIDER '{provider_name}'. Choose from: {', '.join(PROVIDERS.keys())}"
        )
    return provider_name, PROVIDERS[provider_name]


def get_client() -> OpenAI:
    provider_name, config = _get_provider_config()
    api_key = os.environ.get(config["env_key"], "")

    if provider_name == "ollama":
        base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434/v1")
        api_key = api_key or "ollama"
        return OpenAI(base_url=base_url, api_key=api_key)

    if not api_key:
        raise ValueError(f"{config['env_key']} environment variable is not set (required for {provider_name})")

    base_url = config.get("base_url")
    kwargs: dict[str, Any] = {"api_key": api_key}
    if base_url:
        kwargs["base_url"] = base_url

    return OpenAI(**kwargs)


def get_model() -> str:
    model_override = os.environ.get("LLM_MODEL")
    if model_override:
        return model_override
    _, config = _get_provider_config()
    return config["default_model"]


def supports_structured_outputs() -> bool:
    _, config = _get_provider_config()
    return config["supports_structured_outputs"]


def check_api_key() -> str | None:
    provider_name, config = _get_provider_config()
    if provider_name == "ollama":
        return None
    key = os.environ.get(config["env_key"], "")
    return key if key else None


class LLMResponse:
    __slots__ = ("raw_content", "parsed")

    def __init__(self, raw_content: str, parsed: BaseModel | None):
        self.raw_content = raw_content
        self.parsed = parsed


def call_structured(
    client: OpenAI,
    model: str,
    messages: list[dict[str, str]],
    schema: dict,
    schema_name: str,
    pydantic_model: type[BaseModel],
    temperature: float = 0.7,
) -> LLMResponse:
    """
    Call the LLM and return a validated Pydantic model.

    For providers that support structured outputs, use response_format
    with json_schema + strict. For others, inject the schema into the
    prompt and parse/validate the response via Pydantic.
    """
    if supports_structured_outputs():
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": schema_name,
                    "strict": True,
                    "schema": schema,
                },
            },
            temperature=temperature,
            stream=False,
        )
    else:
        schema_instruction = (
            f"\n\nYou MUST respond with a JSON object that exactly matches this schema:\n"
            f"```json\n{json.dumps(schema, indent=2)}\n```\n"
            f"Do not include any text outside the JSON object."
        )
        augmented_messages = list(messages)
        augmented_messages[-1] = {
            "role": messages[-1]["role"],
            "content": messages[-1]["content"] + schema_instruction,
        }

        response = client.chat.completions.create(
            model=model,
            messages=augmented_messages,
            temperature=temperature,
            stream=False,
        )

    content = response.choices[0].message.content
    if not content:
        raise ValueError("Empty response from model")

    try:
        data = json.loads(content)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Model returned invalid JSON: {exc}") from exc

    try:
        parsed = pydantic_model.model_validate(data)
    except ValidationError as exc:
        raise ValueError(f"Schema validation failed: {exc}") from exc

    return LLMResponse(raw_content=content, parsed=parsed)


def provider_info() -> dict[str, str]:
    provider_name, config = _get_provider_config()
    return {
        "provider": provider_name,
        "model": get_model(),
        "structured_outputs": str(config["supports_structured_outputs"]),
    }