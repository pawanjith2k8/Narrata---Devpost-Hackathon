export type InputType = 'topic' | 'url' | 'script';

export type FormatType = 'podcast' | 'trailer' | 'drama' | 'docu' | 'debate';

export interface CharacterProfile {
  role: string;
  display_name: string;
  gender: string;
  voice_description: string;
  personality: string;
}

export interface ProductionOutline {
  title: string;
  logline: string;
  format: string;
  tone: string;
  pacing: string;
  characters: CharacterProfile[];
  narrative_arc: string[];
}

export interface ScriptLine {
  line_id: number;
  speaker_role: string;
  speaker_name?: string;
  text: string;
  emotion: string;
  pause_after_sec?: number;
}

export interface VoiceCasting {
  role: string;
  character_name: string;
  voice_id: string;
  voice_name: string;
  gender: string;
  accent: string;
  match_rationale: string;
}

export interface ToolCallLog {
  id: string;
  tool_name: string;
  arguments: Record<string, any>;
  result?: Record<string, any>;
  status: 'running' | 'completed' | 'failed';
  timestamp: number;
  durationMs?: number;
}

export interface AgentThought {
  step: number;
  thought: string;
  timestamp: number;
}

export interface StepStatus {
  step: number;
  step_name: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  message?: string;
}

export interface AudioTimelineEntry {
  id: number;
  speaker: string;
  text: string;
  emotion: string;
  start_time: number;
  end_time: number;
  duration: number;
  pause_after: number;
}

export interface ProductionArtifact {
  job_id: string;
  audio_url: string;
  download_url: string;
  total_duration: number;
  total_lines: number;
  file_size_bytes: number;
  timeline: AudioTimelineEntry[];
  production_info: {
    title: string;
    logline: string;
    format: string;
    tone: string;
    cast: VoiceCasting[];
  };
}

export interface ApiKeys {
  geminiApiKey: string;
  elevenlabsApiKey: string;
}
