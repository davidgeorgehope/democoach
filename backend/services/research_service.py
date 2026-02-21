import json
from config import settings


async def research_company(company_name: str, industry: str = "") -> dict:
    """Use Gemini with Google Search grounding to research a company."""
    industry_ctx = f" in the {industry} industry" if industry else ""
    query = f"""Research {company_name}{industry_ctx} and provide:

1. **Company Overview**: What they do, size, recent news
2. **Pain Hypotheses**: What operational/technical challenges they likely face
3. **Tech Stack Signals**: Any known technology choices, platforms, or tools they use
4. **Recent Initiatives**: Recent announcements, partnerships, or strategic moves
5. **Potential Demo Angles**: How to tailor a demo to their likely needs

Format as a structured analysis. Be specific and cite what you find."""

    return await _grounded_search(query)


async def research_competitive(product_name: str, competitors: str = "") -> dict:
    """Use Gemini with Google Search grounding for competitive intelligence."""
    competitor_ctx = f" Focus especially on: {competitors}." if competitors else ""
    query = f"""Research the competitive landscape for {product_name}.{competitor_ctx}

Provide:

1. **Key Competitors**: Main alternatives and their positioning
2. **Differentiators**: What makes {product_name} unique vs competitors
3. **Common Objections**: Objections prospects typically raise when comparing
4. **Competitor Strengths**: Where competitors genuinely excel
5. **Competitor Weaknesses**: Known limitations or complaints about competitors
6. **Battle Card Points**: Key talking points for competitive deals

Format as structured competitive intelligence. Be specific and cite sources."""

    return await _grounded_search(query)


async def _grounded_search(query: str) -> dict:
    """Execute a grounded search using Gemini with Google Search."""
    if not settings.GOOGLE_AI_API_KEY:
        raise ValueError("GOOGLE_AI_API_KEY not configured")

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.GOOGLE_AI_API_KEY)

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=query,
        config=types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())],
            temperature=0.7,
            max_output_tokens=4096,
        ),
    )

    content = response.text or ""

    # Extract grounding sources
    sources = []
    if response.candidates and len(response.candidates) > 0:
        grounding_metadata = response.candidates[0].grounding_metadata
        if grounding_metadata and grounding_metadata.grounding_chunks:
            for chunk in grounding_metadata.grounding_chunks:
                if chunk.web:
                    sources.append({
                        "title": chunk.web.title or "",
                        "url": chunk.web.uri or "",
                    })

    return {
        "content": content,
        "sources": sources,
    }
