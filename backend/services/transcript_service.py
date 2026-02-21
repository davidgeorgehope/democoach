import json
from pathlib import Path
from config import settings


def parse_transcript_file(content: str, filename: str) -> str:
    """Parse various transcript formats into plain text."""
    ext = Path(filename).suffix.lower()

    if ext in ('.vtt', '.srt'):
        return _parse_subtitle_format(content)
    # For .txt and .md, return as-is
    return content


def _parse_subtitle_format(content: str) -> str:
    """Strip timestamps from VTT/SRT format, keep just the text."""
    lines = content.split('\n')
    text_lines = []
    for line in lines:
        line = line.strip()
        # Skip empty lines, sequence numbers, timestamps, and WEBVTT header
        if not line:
            continue
        if line.isdigit():
            continue
        if '-->' in line:
            continue
        if line.startswith('WEBVTT'):
            continue
        text_lines.append(line)
    return '\n'.join(text_lines)


async def extract_objections_from_transcript(content: str) -> list:
    """Use LLM to extract objections from a transcript."""
    prompts_dir = Path(__file__).parent.parent / "prompts"
    extraction_prompt = (prompts_dir / "extraction.txt").read_text()

    full_prompt = f"{extraction_prompt}\n\nTRANSCRIPT:\n{content}"

    if settings.ANTHROPIC_API_KEY:
        return await _extract_with_anthropic(full_prompt)
    elif settings.OPENAI_API_KEY:
        return await _extract_with_openai(full_prompt)
    else:
        raise ValueError("No LLM API key configured for extraction")


async def _extract_with_anthropic(prompt: str) -> list:
    import anthropic
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text
    return _parse_json_array(text)


async def _extract_with_openai(prompt: str) -> list:
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.choices[0].message.content
    return _parse_json_array(text)


def _parse_json_array(text: str) -> list:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    if "```" in text:
        start = text.find("[")
        end = text.rfind("]") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
    return []
