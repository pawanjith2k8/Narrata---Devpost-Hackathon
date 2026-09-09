"""
Narrata FastAPI Server.
Exposes streaming endpoints for agentic audio production, dynamic voice exploration,
and master audio streaming/downloading.
"""

import os
import uuid
import json
from typing import Optional
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

from agent import NarrataAgent
from mcp_client import ElevenLabsMCPToolRegistry

# Load environment variables from .env
load_dotenv()

app = FastAPI(
    title="Narrata API",
    description="Autonomous Multi-Voice AI Podcast & Trailer Producer Agent",
    version="1.0.0"
)

# Enable CORS for local Vite dev server and production Cloud Run
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AUDIO_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output_audio")
os.makedirs(AUDIO_OUTPUT_DIR, exist_ok=True)


class GenerateRequest(BaseModel):
    input_type: str = "topic"  # "topic", "url", or "script"
    input_content: str
    format_type: str = "podcast"  # "podcast", "trailer", "drama", "docu", "debate"
    target_duration_sec: int = 60
    voice_count: int = 2
    gender_preference: Optional[str] = "mixed"  # "mixed", "female", "male", "any"
    voice_genders: Optional[list] = None  # Specific list e.g. ["female", "male"]
    custom_instructions: Optional[str] = ""
    gemini_api_key: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None


@app.get("/api/health")
async def health_check():
    has_gemini = bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
    has_eleven = bool(os.getenv("ELEVENLABS_API_KEY"))
    return {
        "status": "healthy",
        "service": "Narrata Agent Producer",
        "env_keys_configured": {
            "gemini": has_gemini,
            "elevenlabs": has_eleven
        }
    }


@app.get("/api/voices")
async def get_live_voices(api_key: Optional[str] = Query(None)):
    """Fetches real-time available voices via ElevenLabs MCP tool."""
    key = api_key or os.getenv("ELEVENLABS_API_KEY")
    if not key:
        raise HTTPException(
            status_code=400,
            detail="ElevenLabs API Key is required to fetch the voice library."
        )
    registry = ElevenLabsMCPToolRegistry(api_key=key)
    try:
        result = await registry.list_voices()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate")
async def generate_production(payload: GenerateRequest):
    """
    Starts the multi-step agent pipeline and streams real-time SSE events.
    """
    job_id = str(uuid.uuid4())[:12]
    agent = NarrataAgent()

    async def event_generator():
        try:
            async for event in agent.run_pipeline(
                job_id=job_id,
                input_type=payload.input_type,
                input_content=payload.input_content,
                format_type=payload.format_type,
                target_duration_sec=payload.target_duration_sec,
                voice_count=payload.voice_count,
                gender_preference=payload.gender_preference or "mixed",
                voice_genders=payload.voice_genders,
                custom_instructions=payload.custom_instructions or "",
                gemini_key=payload.gemini_api_key,
                elevenlabs_key=payload.elevenlabs_api_key,
                output_dir=AUDIO_OUTPUT_DIR
            ):
                event_name = event.get("event", "message")
                event_data = json.dumps(event.get("data", {}))
                yield f"event: {event_name}\ndata: {event_data}\n\n"
        except Exception as e:
            error_event = json.dumps({"message": f"Fatal pipeline error: {str(e)}"})
            yield f"event: error\ndata: {error_event}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/api/audio/{job_id}")
async def get_audio(job_id: str, download: bool = False):
    """Serves or downloads the master audio file for a completed job."""
    file_path = os.path.join(AUDIO_OUTPUT_DIR, f"{job_id}_master.mp3")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Audio file for job '{job_id}' not found.")

    headers = {}
    if download:
        headers["Content-Disposition"] = f'attachment; filename="narrata_{job_id}.mp3"'

    return FileResponse(
        file_path,
        media_type="audio/mpeg",
        headers=headers
    )


@app.get("/api/history")
async def get_history():
    """Returns all past production jobs sorted by newest first."""
    entries = []
    try:
        for fname in os.listdir(AUDIO_OUTPUT_DIR):
            if fname.endswith("_meta.json"):
                meta_path = os.path.join(AUDIO_OUTPUT_DIR, fname)
                try:
                    with open(meta_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                    # Also confirm the audio file still exists
                    audio_path = os.path.join(AUDIO_OUTPUT_DIR, f"{meta.get('job_id', '')}_master.mp3")
                    meta["audio_exists"] = os.path.exists(audio_path)
                    entries.append(meta)
                except Exception:
                    continue
    except Exception:
        pass

    # Sort newest first
    entries.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    return {"history": entries, "total": len(entries)}



# Serve React static assets if built in frontend/dist
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
