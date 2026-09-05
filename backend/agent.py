"""
Narrata Autonomous Agent Orchestrator.
Uses Gemini for planning, research, scriptwriting, and voice-casting,
and coordinates ElevenLabs MCP tools for dynamic voice discovery and audio synthesis.
Emits detailed real-time event streams mirroring Antigravity's visible plan-and-execute pattern.
"""

import os
import json
import time
import asyncio
from typing import AsyncGenerator, Dict, Any, List, Optional
from google import genai
from google.genai import types
from dotenv import load_dotenv

from mcp_client import ElevenLabsMCPToolRegistry
from researcher import ContentExtractor
from audio_engine import AudioEngine

load_dotenv()


class NarrataAgent:
    """
    Autonomous Podcast & Trailer Production Agent.
    Coordinates Gemini reasoning with ElevenLabs MCP tools.
    """

    def __init__(
        self,
        gemini_api_key: Optional[str] = None,
        elevenlabs_api_key: Optional[str] = None,
        model_name: str = "gemini-flash-latest"
    ):
        self.gemini_key = gemini_api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
        self.elevenlabs_key = elevenlabs_api_key or os.getenv("ELEVENLABS_API_KEY", "")
        self.model_name = model_name
        self.mcp_registry = ElevenLabsMCPToolRegistry(api_key=self.elevenlabs_key)

    def _get_gemini_client(self, override_key: Optional[str] = None) -> genai.Client:
        key = override_key or self.gemini_key
        if not key:
            raise ValueError("Gemini API Key is missing. Please provide a valid GEMINI_API_KEY / GOOGLE_API_KEY.")
        return genai.Client(api_key=key)

    def _clean_json_text(self, text: str) -> str:
        """Strips markdown code fences if present to ensure clean JSON parsing."""
        clean = text.strip()
        if clean.startswith("```"):
            lines = clean.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            clean = "\n".join(lines).strip()
        return clean

    def _generate_with_fallback(self, client: genai.Client, prompt: str, temperature: float = 0.7) -> str:
        """Tries verified flash models with automatic fallback."""
        candidate_models = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.5-flash-lite"]
        last_error = None
        for model in candidate_models:
            for attempt in range(2):
                try:
                    resp = client.models.generate_content(
                        model=model,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            temperature=temperature,
                            response_mime_type="application/json"
                        )
                    )
                    if resp.text:
                        return self._clean_json_text(resp.text)
                except Exception as e:
                    last_error = e
                    time.sleep(1)
                    continue
        raise last_error or RuntimeError("All candidate Gemini models failed.")

    async def run_pipeline(
        self,
        job_id: str,
        input_type: str,  # "topic", "url", or "script"
        input_content: str,
        format_type: str = "podcast",  # "podcast", "trailer", "drama", "docu", "debate"
        target_duration_sec: int = 60,
        voice_count: int = 2,
        gender_preference: str = "mixed",  # "mixed", "female", "male", "any"
        voice_genders: Optional[List[str]] = None,  # e.g. ["female", "male"]
        custom_instructions: str = "",
        gemini_key: Optional[str] = None,
        elevenlabs_key: Optional[str] = None,
        output_dir: str = "output_audio"
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Executes the 5-step agentic pipeline and yields SSE events.
        """
        active_gemini_key = gemini_key or self.gemini_key
        active_elevenlabs_key = elevenlabs_key or self.elevenlabs_key

        if not active_gemini_key:
            yield {
                "event": "error",
                "data": {
                    "message": "Missing Gemini API Key. Please provide your Google Gemini API key in settings or environment variables."
                }
            }
            return

        if not active_elevenlabs_key:
            yield {
                "event": "error",
                "data": {
                    "message": "Missing ElevenLabs API Key. Please provide your ElevenLabs API key in settings or environment variables."
                }
            }
            return

        client = self._get_gemini_client(active_gemini_key)

        # =========================================================================
        # STEP 1: Research & Production Planning
        # =========================================================================
        yield {
            "event": "step_start",
            "data": {
                "step": 1,
                "step_name": "Research & Production Plan",
                "status": "active",
                "message": "Analyzing inputs, researching context, and drafting structural plan..."
            }
        }

        research_context = ""
        if input_type == "url":
            yield {
                "event": "thought",
                "data": {
                    "step": 1,
                    "thought": f"Agent identified input as web URL: '{input_content}'. Initiating content extraction to parse ground-truth article material..."
                }
            }
            try:
                extracted = await ContentExtractor.extract_url_content(input_content)
                research_context = f"Article Title: {extracted['title']}\nDescription: {extracted['description']}\nArticle Text:\n{extracted['content']}"
                yield {
                    "event": "thought",
                    "data": {
                        "step": 1,
                        "thought": f"Successfully extracted article '{extracted['title']}' ({len(extracted['content'])} characters). Using this as primary source material."
                    }
                }
            except Exception as e:
                yield {
                    "event": "error",
                    "data": {"message": f"URL Research failed: {str(e)}"}
                }
                return
        elif input_type == "topic":
            yield {
                "event": "thought",
                "data": {
                    "step": 1,
                    "thought": f"Agent processing creative topic: '{input_content}'. Establishing narrative theme, tone, target pacing, and multi-character dynamic for {format_type.upper()} format."
                }
            }
            research_context = f"Topic/Prompt: {input_content}"
        else:  # raw script
            yield {
                "event": "thought",
                "data": {
                    "step": 1,
                    "thought": "Agent processing raw user-supplied script. Parsing structure, line breaks, and speaker identities..."
                }
            }
            research_context = f"Raw Script Provided:\n{input_content}"

        # Format duration guidance
        if target_duration_sec and target_duration_sec > 0:
            duration_instruction = f"TARGET DURATION: ~{target_duration_sec} seconds"
            word_target = f"~{int(target_duration_sec * 2.3)} words (roughly {target_duration_sec} seconds of speech)"
        else:
            duration_instruction = "TARGET DURATION: Auto (determine the natural, compelling length for this scene/topic)"
            word_target = "Natural conversational length (typically 4 to 8 punchy lines for trailers/teasers, or 6 to 12 engaging lines for podcasts/dramas)"

        # Format gender guidance (either specific per-voice or overall preference)
        if voice_genders and len(voice_genders) > 0:
            voice_specs = [f"Voice {idx+1}: {g.capitalize()}" for idx, g in enumerate(voice_genders) if g != "auto"]
            if voice_specs:
                gender_instruction = f"EXACT PER-CHARACTER GENDER ASSIGNMENTS: {', '.join(voice_specs)}. You MUST follow these gender assignments for the corresponding characters."
            else:
                gender_instruction = "GENDER PREFERENCE: Mixed / Balanced dynamic."
        elif gender_preference == "female":
            gender_instruction = "GENDER PREFERENCE: All Female voices (every character must be female)."
        elif gender_preference == "male":
            gender_instruction = "GENDER PREFERENCE: All Male voices (every character must be male)."
        else:
            gender_instruction = "GENDER PREFERENCE: Mixed / Balanced dynamic (or based naturally on the characters)."

        # Prompt Gemini to create structured production outline
        plan_prompt = f"""You are Narrata's Lead Audio Producer & Showrunner.
Design a complete, high-impact audio production plan for the following project:

INPUT CONTEXT:
{research_context}

FORMAT: {format_type} (e.g. podcast segment, cinematic trailer, audio drama, investigative deep-dive)
{duration_instruction}
TARGET NUMBER OF DISTINCT CHARACTERS/VOICES: {voice_count if voice_count and voice_count > 0 else 'Auto (choose ideal cast size, usually 2)'}
{gender_instruction}
ADDITIONAL INSTRUCTIONS: {custom_instructions or "Create an immersive, professional studio production with sharp dialogue, emotional pacing, and distinct character personalities."}

Generate a JSON response conforming EXACTLY to this schema:
{{
  "title": "Compelling Title of the Production",
  "logline": "1-2 sentence dramatic hook or summary",
  "format": "{format_type}",
  "tone": "e.g. Dark & Suspenseful, Cinematic Epic, In-depth Investigative, Energetic & Witty",
  "pacing": "Fast-paced / Measured / Dramatic pauses",
  "characters": [
    {{
      "role": "Role Name (e.g. NARRATOR, DETECTIVE_HALE, DR_ELENA_VANCE, HOST_ALEX)",
      "display_name": "Full Character Name / Title",
      "gender": "male" | "female" | "neutral",
      "voice_description": "Detailed description of vocal traits (e.g. deep, raspy, authoritative, British accent, 40s)",
      "personality": "Brief personality and emotional disposition in the scene"
    }}
  ],
  "narrative_arc": [
    "Phase 1: Hook / Cold Open",
    "Phase 2: Rising Tension / Core Investigation",
    "Phase 3: Climax / Key Revelation",
    "Phase 4: Outro / Cliffhanger Call-to-Action"
  ]
}}

Output ONLY pure JSON. No markdown backticks, no preamble."""

        yield {
            "event": "thought",
            "data": {
                "step": 1,
                "thought": "Sending structural plan prompt to Gemini 2.5/2.0 model with character profiling requirements..."
            }
        }

        try:
            plan_text = self._generate_with_fallback(client, plan_prompt, temperature=0.7)
            outline_data = json.loads(plan_text)
        except Exception as e:
            yield {
                "event": "error",
                "data": {"message": f"Gemini Planning call failed: {str(e)}"}
            }
            return

        yield {
            "event": "outline_ready",
            "data": outline_data
        }
        yield {
            "event": "step_start",
            "data": {
                "step": 1,
                "status": "completed",
                "message": f"Production Plan formulated: '{outline_data.get('title')}' with {len(outline_data.get('characters', []))} character roles."
            }
        }

        # =========================================================================
        # STEP 2: Scriptwriting & Dialogue Direction
        # =========================================================================
        yield {
            "event": "step_start",
            "data": {
                "step": 2,
                "step_name": "Scriptwriting & Voice Direction",
                "status": "active",
                "message": "Writing multi-speaker dialogue script with emotional tags and pacing markers..."
            }
        }

        script_prompt = f"""You are the Master Screenwriter and Dialogue Director for Narrata.
Using the approved production plan below, write the complete, word-for-word spoken dialogue script.

PRODUCTION PLAN:
{json.dumps(outline_data, indent=2)}

TARGET TOTAL WORDS: {word_target}
FORMAT: {format_type}
SPEAKER ROLES TO USE: {[c['role'] for c in outline_data['characters']]}

RULES:
1. Every line MUST be spoken by one of the defined character roles.
2. Give each line an explicit `emotion` (e.g. 'whispering', 'tense', 'excited', 'ominous', 'urgent', 'authoritative', 'inquisitive').
3. Include realistic pauses between lines with `pause_after_sec` (e.g. 0.3 for rapid dialogue, 0.7 for dramatic silence, 1.0 for scene transitions).
4. For movie trailers: Use punchy, dramatic narration with crescendo lines and character soundbites.
5. For podcasts: Use natural conversational chemistry, authentic transitions, and engaging back-and-forth.

Generate a JSON response conforming EXACTLY to this schema:
{{
  "script_lines": [
    {{
      "line_id": 1,
      "speaker_role": "ROLE_NAME",
      "speaker_name": "Display Name",
      "text": "Exact dialogue text to be voiced (do not include stage directions inside the text string).",
      "emotion": "emotional tone tag",
      "pause_after_sec": 0.5
    }}
  ]
}}

Output ONLY pure JSON. No markdown backticks, no preamble."""

        yield {
            "event": "thought",
            "data": {
                "step": 2,
                "thought": f"Drafting multi-turn dialogue with emotional delivery tags. Targeting ~{int(target_duration_sec * 2.3)} words across {len(outline_data['characters'])} speakers..."
            }
        }

        try:
            script_text = self._generate_with_fallback(client, script_prompt, temperature=0.75)
            script_data = json.loads(script_text)
            script_lines = script_data.get("script_lines", [])
        except Exception as e:
            yield {
                "event": "error",
                "data": {"message": f"Gemini Scriptwriting call failed: {str(e)}"}
            }
            return

        yield {
            "event": "script_ready",
            "data": {
                "total_lines": len(script_lines),
                "script_lines": script_lines
            }
        }
        yield {
            "event": "step_start",
            "data": {
                "step": 2,
                "status": "completed",
                "message": f"Script generated: {len(script_lines)} dialogue lines formatted."
            }
        }

        # =========================================================================
        # STEP 3: Dynamic Voice Casting via ElevenLabs MCP
        # =========================================================================
        yield {
            "event": "step_start",
            "data": {
                "step": 3,
                "step_name": "Voice Casting via ElevenLabs MCP",
                "status": "active",
                "message": "Invoking ElevenLabs MCP tool 'elevenlabs__list_voices' to query live voice library..."
            }
        }

        # Tool Call Log: elevenlabs__list_voices
        mcp_tool_call_1 = {
            "tool_name": "elevenlabs__list_voices",
            "arguments": {"category": "all"},
            "timestamp": time.time()
        }
        yield {
            "event": "tool_call",
            "data": mcp_tool_call_1
        }

        try:
            voices_result = await self.mcp_registry.list_voices(api_key=active_elevenlabs_key)
            available_voices = voices_result.get("voices", [])
        except Exception as e:
            yield {
                "event": "error",
                "data": {"message": f"ElevenLabs MCP 'elevenlabs__list_voices' failed: {str(e)}"}
            }
            return

        yield {
            "event": "tool_result",
            "data": {
                "tool_name": "elevenlabs__list_voices",
                "result_summary": f"Discovered {len(available_voices)} live ElevenLabs voices in user library.",
                "sample_voices": [v["name"] for v in available_voices[:6]]
            }
        }

        yield {
            "event": "thought",
            "data": {
                "step": 3,
                "thought": f"Retrieved {len(available_voices)} voices from ElevenLabs MCP. Passing live voice metadata to Gemini Casting Director to dynamically pair characters with optimal voice profiles without hardcoding."
            }
        }

        # Prompt Gemini to dynamically cast voices
        casting_prompt = f"""You are the Voice Casting Director for Narrata.
Match each character role in our production to the BEST available voice from ElevenLabs.

CHARACTERS TO CAST:
{json.dumps(outline_data['characters'], indent=2)}

AVAILABLE ELEVENLABS VOICES (REAL CATALOG FROM MCP):
{json.dumps([{
    'voice_id': v['voice_id'],
    'name': v['name'],
    'gender': v['gender'],
    'accent': v['accent'],
    'age': v['age'],
    'description': v['description']
} for v in available_voices], indent=2)}

RULES:
1. Every character MUST be assigned a unique `voice_id` from the provided list (unless there are more characters than voices).
2. Match gender, age, tone, and vocal characteristics faithfully to the character's persona.
3. Provide a clear `match_rationale` explaining why this specific voice fits the character's role.

Generate a JSON response conforming EXACTLY to this schema:
{{
  "castings": [
    {{
      "role": "ROLE_NAME",
      "character_name": "Character Name",
      "voice_id": "EXACT_VOICE_ID_FROM_LIST",
      "voice_name": "Exact Name of ElevenLabs Voice",
      "gender": "male" | "female" | "neutral",
      "accent": "accent tag",
      "match_rationale": "Reasoning for casting this voice"
    }}
  ]
}}

Output ONLY pure JSON. No markdown backticks, no preamble."""

        try:
            casting_text = self._generate_with_fallback(client, casting_prompt, temperature=0.2)
            casting_data = json.loads(casting_text)
            castings = casting_data.get("castings", [])
        except Exception as e:
            yield {
                "event": "error",
                "data": {"message": f"Gemini Voice Casting analysis failed: {str(e)}"}
            }
            return

        # Build quick lookup map: role -> voice info
        voice_map = {c["role"]: c for c in castings}

        yield {
            "event": "casting_ready",
            "data": {
                "castings": castings
            }
        }
        yield {
            "event": "step_start",
            "data": {
                "step": 3,
                "status": "completed",
                "message": f"Voice Casting complete: {len(castings)} roles dynamically assigned to ElevenLabs voices."
            }
        }

        # =========================================================================
        # STEP 4: Audio Synthesis via ElevenLabs MCP
        # =========================================================================
        yield {
            "event": "step_start",
            "data": {
                "step": 4,
                "step_name": "Multi-Speaker Speech Synthesis",
                "status": "active",
                "message": f"Calling ElevenLabs MCP 'elevenlabs__text_to_speech' across {len(script_lines)} dialogue lines..."
            }
        }

        synthesized_clips = []
        total_lines = len(script_lines)

        for i, line in enumerate(script_lines):
            line_id = line.get("line_id", i + 1)
            role = line.get("speaker_role", "")
            text = line.get("text", "")
            emotion = line.get("emotion", "neutral")
            pause_after = line.get("pause_after_sec", 0.45)

            cast_info = voice_map.get(role)
            if not cast_info:
                # Fallback to first available cast
                cast_info = castings[0] if castings else {
                    "voice_id": available_voices[0]["voice_id"],
                    "voice_name": available_voices[0]["name"]
                }

            voice_id = cast_info["voice_id"]
            voice_name = cast_info["voice_name"]

            yield {
                "event": "thought",
                "data": {
                    "step": 4,
                    "thought": f"Synthesizing line {i+1}/{total_lines} for [{role}] ({voice_name}): \"{text[:45]}...\" (Emotion: {emotion})"
                }
            }

            mcp_tool_call_tts = {
                "tool_name": "elevenlabs__text_to_speech",
                "arguments": {
                    "voice_id": voice_id,
                    "voice_name": voice_name,
                    "line_id": line_id,
                    "speaker": role,
                    "text": text,
                    "emotion": emotion
                },
                "timestamp": time.time()
            }
            yield {
                "event": "tool_call",
                "data": mcp_tool_call_tts
            }

            try:
                # Voice emotion tuning
                stability = 0.5
                style = 0.15
                if emotion in ["excited", "urgent", "terrified", "furious"]:
                    stability = 0.35
                    style = 0.35
                elif emotion in ["whispering", "solemn", "mysterious"]:
                    stability = 0.65
                    style = 0.20

                audio_bytes = await self.mcp_registry.synthesize_speech(
                    voice_id=voice_id,
                    text=text,
                    stability=stability,
                    style=style,
                    api_key=active_elevenlabs_key
                )

                synthesized_clips.append({
                    "id": line_id,
                    "speaker": role,
                    "speaker_name": line.get("speaker_name", role),
                    "text": text,
                    "emotion": emotion,
                    "audio_bytes": audio_bytes,
                    "pause_after": pause_after,
                    "voice_name": voice_name
                })

                yield {
                    "event": "tool_result",
                    "data": {
                        "tool_name": "elevenlabs__text_to_speech",
                        "line_id": line_id,
                        "speaker": role,
                        "bytes_received": len(audio_bytes),
                        "status": "success"
                    }
                }

                yield {
                    "event": "synthesis_progress",
                    "data": {
                        "completed_lines": i + 1,
                        "total_lines": total_lines,
                        "percent": round(((i + 1) / total_lines) * 100, 1),
                        "current_line": {
                            "line_id": line_id,
                            "speaker": role,
                            "voice_name": voice_name,
                            "text": text
                        }
                    }
                }

            except Exception as e:
                yield {
                    "event": "error",
                    "data": {
                        "message": f"ElevenLabs synthesis error on line {i+1} for '{role}': {str(e)}"
                    }
                }
                return

        yield {
            "event": "step_start",
            "data": {
                "step": 4,
                "status": "completed",
                "message": f"Speech synthesis completed: {len(synthesized_clips)} audio segments synthesized."
            }
        }

        # =========================================================================
        # STEP 5: Audio Post-Production & Stitching
        # =========================================================================
        yield {
            "event": "step_start",
            "data": {
                "step": 5,
                "step_name": "Audio Assembly & Pacing Mastering",
                "status": "active",
                "message": "Stitching segments with natural pauses, computing synchronized timeline..."
            }
        }

        yield {
            "event": "thought",
            "data": {
                "step": 5,
                "thought": "Mastering audio tracks: splicing per-line MP3 buffers, inserting silence spacing, and building timeline mapping for synchronized script playback."
            }
        }

        os.makedirs(output_dir, exist_ok=True)
        master_output_path = os.path.join(output_dir, f"{job_id}_master.mp3")

        try:
            stitch_result = AudioEngine.stitch_audio_clips(
                clips=synthesized_clips,
                output_path=master_output_path
            )
        except Exception as e:
            yield {
                "event": "error",
                "data": {"message": f"Audio stitching failed: {str(e)}"}
            }
            return

        yield {
            "event": "assembly_complete",
            "data": {
                "job_id": job_id,
                "audio_url": f"/api/audio/{job_id}",
                "download_url": f"/api/audio/{job_id}?download=true",
                "total_duration": stitch_result["total_duration"],
                "total_lines": stitch_result["total_lines"],
                "file_size_bytes": stitch_result["file_size_bytes"],
                "timeline": stitch_result["timeline"],
                "production_info": {
                    "title": outline_data.get("title"),
                    "logline": outline_data.get("logline"),
                    "format": format_type,
                    "tone": outline_data.get("tone"),
                    "cast": castings
                }
            }
        }

        yield {
            "event": "step_start",
            "data": {
                "step": 5,
                "status": "completed",
                "message": f"Master Production finalized! Total duration: {stitch_result['total_duration']}s."
            }
        }
