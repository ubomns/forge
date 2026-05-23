from fastapi import FastAPI  # type: ignore
from fastapi.responses import StreamingResponse  # type: ignore
from openai import OpenAI  # type: ignore
from pydantic import BaseModel
import json

app = FastAPI()

PROMPT_TEMPLATE = """You are a business idea consultant. A user has a rough concept:

"{description}"

Expand this into a comprehensive business plan with the following sections:

## Business Name & Tagline
## Concept Overview
## Key Features
## Revenue Model
## Target Audience
## Market Differentiation
## Next Steps

Use markdown formatting. Be specific, creative, and actionable."""


class IdeaRequest(BaseModel):
    description: str = "a new AI agent business idea"


@app.post("/api")
def idea(body: IdeaRequest):
    client = OpenAI()
    prompt = PROMPT_TEMPLATE.format(description=body.description)
    stream = client.chat.completions.create(
        model="gpt-5-nano",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )

    def event_stream():
        for chunk in stream:
            text = chunk.choices[0].delta.content
            if text:
                yield f"data: {json.dumps(text)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
