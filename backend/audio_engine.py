"""
Audio assembly and stitching engine for Narrata.
Concatenates individual spoken audio clips with natural conversational pauses,
normalizes pacing, and builds timeline metadata for script synchronization.
"""

import os
import io
import struct
import math
from typing import List, Dict, Any, Tuple


class AudioEngine:
    """Stitches audio chunks together and produces timing maps."""

    @staticmethod
    def generate_silence_mp3(duration_sec: float) -> bytes:
        """
        Generates approximate silent MPEG-1 Layer 3 frames for pauses.
        Standard 128kbps, 44.1kHz stereo silent frame pattern or minimal padding.
        """
        if duration_sec <= 0:
            return b""
        # A standard 128kbps, 44.1kHz MP3 frame is 417 or 418 bytes representing ~26.122ms of audio
        # 1152 samples / 44100 Hz = 0.0261224 sec per frame
        # Standard silent MP3 MPEG 1.0 Layer III 128kbps 44.1kHz Joint Stereo frame:
        # Header: 0xFF 0xFB 0x90 0x64 (or 0x90 0x44)
        frame_header = b"\xff\xfb\x90\x64"
        frame_body = b"\x00" * (417 - len(frame_header))
        silent_frame = frame_header + frame_body
        num_frames = int(duration_sec / 0.0261224)
        return silent_frame * max(1, num_frames)

    @staticmethod
    def generate_silence_wav(duration_sec: float, sample_rate: int = 44100, num_channels: int = 1) -> bytes:
        """Generates raw PCM silence for WAV."""
        num_samples = int(duration_sec * sample_rate)
        return b"\x00" * (num_samples * num_channels * 2)

    @classmethod
    def stitch_audio_clips(
        cls,
        clips: List[Dict[str, Any]],
        output_path: str,
        default_pause_sec: float = 0.45
    ) -> Dict[str, Any]:
        """
        Stitches audio chunks together into a single master file.
        
        Args:
            clips: List of dicts, each having:
                   - 'id': str or int
                   - 'speaker': str
                   - 'text': str
                   - 'audio_bytes': bytes
                   - 'pause_after': float (optional)
            output_path: Destination file path
            default_pause_sec: Pause between lines if not specified

        Returns:
            Dict with 'total_duration', 'timeline', and 'file_path'
        """
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        
        timeline: List[Dict[str, Any]] = []
        current_time = 0.0
        combined_bytes = bytearray()

        for idx, clip in enumerate(clips):
            audio_data = clip.get("audio_bytes", b"")
            if not audio_data:
                continue

            pause_sec = clip.get("pause_after", default_pause_sec)
            
            # Estimate or calculate duration of this clip
            # For MP3 @ 128kbps: bytes * 8 / 128000 = seconds
            # For WAV: (bytes - 44) / (44100 * 2) = seconds
            clip_len = len(audio_data)
            is_wav = audio_data.startswith(b"RIFF")
            
            if is_wav:
                # Basic WAV estimation
                clip_duration = max(0.2, (clip_len - 44) / (44100 * 2))
            else:
                # MP3 approximation (assuming ~128kbps from ElevenLabs)
                clip_duration = max(0.2, (clip_len * 8) / 128000.0)

            # Strip ID3 tag if present to allow clean MP3 frame concatenation
            clean_audio = audio_data
            if not is_wav and audio_data.startswith(b"ID3"):
                try:
                    # ID3v2 tag size is at bytes 6..9 (syncsafe integer)
                    tag_size = (
                        (audio_data[6] << 21)
                        | (audio_data[7] << 14)
                        | (audio_data[8] << 7)
                        | audio_data[9]
                    )
                    header_end = 10 + tag_size
                    clean_audio = audio_data[header_end:]
                except Exception:
                    clean_audio = audio_data

            start_time = current_time
            combined_bytes.extend(clean_audio)
            current_time += clip_duration

            # Add natural pause between speakers
            is_last = (idx == len(clips) - 1)
            actual_pause = 0.0 if is_last else pause_sec
            if actual_pause > 0:
                silence_chunk = cls.generate_silence_mp3(actual_pause) if not is_wav else cls.generate_silence_wav(actual_pause)
                combined_bytes.extend(silence_chunk)
                current_time += actual_pause

            end_time = start_time + clip_duration
            
            timeline.append({
                "id": clip.get("id", idx),
                "speaker": clip.get("speaker", "Unknown"),
                "text": clip.get("text", ""),
                "emotion": clip.get("emotion", "neutral"),
                "start_time": round(start_time, 2),
                "end_time": round(end_time, 2),
                "duration": round(clip_duration, 2),
                "pause_after": round(actual_pause, 2)
            })

        # Write output file
        with open(output_path, "wb") as f:
            f.write(combined_bytes)

        return {
            "file_path": output_path,
            "total_duration": round(current_time, 2),
            "timeline": timeline,
            "total_lines": len(timeline),
            "file_size_bytes": len(combined_bytes)
        }
