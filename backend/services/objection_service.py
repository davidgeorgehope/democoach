import json
from config import settings


async def generate_objections(demo_context: str, persona_type: str = "customer", count: int = 5) -> list:
    """Use LLM to generate objections for a given demo context."""

    prompt = f"""Generate {count} realistic objections that a {persona_type} would raise during a sales demo.

Context of the demo: {demo_context}

For each objection, provide:
- objection_text: The exact words the person would say
- trigger_context: What part of the demo would trigger this
- category: One of: technical_depth, competitive, credibility, commercial, scope_creep, recovery, coaching
- difficulty: 1-5 scale (1=easy to handle, 5=very challenging)
- reasoning: Why this is useful to practice

Return a JSON array of objects. Only return the JSON array, no other text."""

    if settings.ANTHROPIC_API_KEY:
        return await _generate_with_anthropic(prompt)
    elif settings.OPENAI_API_KEY:
        return await _generate_with_openai(prompt)
    else:
        raise ValueError("No LLM API key configured for objection generation")


async def _generate_with_anthropic(prompt: str) -> list:
    import anthropic
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text
    # Extract JSON from response
    return _parse_json_array(text)


async def _generate_with_openai(prompt: str) -> list:
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.8,
    )
    text = response.choices[0].message.content
    return _parse_json_array(text)


def _parse_json_array(text: str) -> list:
    """Extract a JSON array from LLM response text."""
    text = text.strip()
    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Try extracting from markdown code block
    if "```" in text:
        start = text.find("[")
        end = text.rfind("]") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
    return []
