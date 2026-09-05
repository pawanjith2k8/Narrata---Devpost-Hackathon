"""
Web research and URL extraction module for Narrata.
Extracts clean text and metadata from article URLs to feed into the Gemini agent.
"""

import httpx
from bs4 import BeautifulSoup
from typing import Dict, Any, Optional


class ContentExtractor:
    """Extracts clean readable article text from URLs."""

    @staticmethod
    async def extract_url_content(url: str) -> Dict[str, Any]:
        """Fetches web page content, extracts headline, meta description, and article paragraphs."""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            try:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
            except Exception as e:
                raise RuntimeError(f"Failed to fetch content from URL '{url}': {str(e)}")

        soup = BeautifulSoup(response.text, "html.parser")

        # Remove script and style tags
        for script in soup(["script", "style", "nav", "footer", "header", "noscript", "aside"]):
            script.decompose()

        title = soup.title.string.strip() if soup.title and soup.title.string else ""
        
        # Meta description
        meta_desc = ""
        meta_tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
        if meta_tag and meta_tag.get("content"):
            meta_desc = meta_tag["content"].strip()

        # Extract main article paragraphs
        paragraphs = []
        for p in soup.find_all("p"):
            text = p.get_text().strip()
            if len(text) > 30:  # Skip tiny fragments
                paragraphs.append(text)

        body_text = "\n\n".join(paragraphs[:25])  # Cap at reasonable length for context window

        if not body_text:
            # Fallback to general text extraction
            body_text = soup.get_text(separator="\n", strip=True)[:4000]

        return {
            "url": url,
            "title": title,
            "description": meta_desc,
            "content": body_text[:6000]
        }
