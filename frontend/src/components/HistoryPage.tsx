import React, { useEffect, useState, useRef } from "react";
import { Clock, Download, Play, Pause, Mic2, FileAudio, RefreshCw, Inbox } from "lucide-react";
import { HistoryEntry } from "../types";

function formatDuration(sec: number): string {
  if (!sec) return "0s";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString();
}

const FORMAT_LABELS: Record<string, string> = {
  podcast: "🎙️ Podcast",
  trailer: "🎬 Trailer",
  drama: "🎭 Drama",
  docu: "📰 Documentary",
  debate: "⚖️ Debate",
};

const INPUT_TYPE_LABELS: Record<string, string> = {
  topic: "💡 Topic",
  url: "🔗 URL",
  script: "📝 Script",
};

interface AudioMiniPlayerProps {
  audioUrl: string;
}

const AudioMiniPlayer: React.FC<AudioMiniPlayerProps> = ({ audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center gap-3 mt-3">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />
      <button
        onClick={toggle}
        className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-blue/20 hover:bg-brand-blue/40 text-brand-cyan flex items-center justify-center transition"
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-0.5">
        <input
          type="range" min={0} max={duration || 0} step={0.1} value={currentTime}
          onChange={e => { const t = parseFloat(e.target.value); if (audioRef.current) audioRef.current.currentTime = t; setCurrentTime(t); }}
          className="w-full h-1 appearance-none rounded-full bg-studio-700 accent-brand-blue cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export const HistoryPage: React.FC = () => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/history");
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setEntries(data.history || []);
    } catch (e: any) {
      setError(e.message || "Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-purple/10 border border-brand-purple/20 text-brand-pink">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Production History</h2>
            <p className="text-xs text-slate-400">All your past Narrata productions with audio replay</p>
          </div>
        </div>
        <button
          onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-studio-800 hover:bg-studio-700 border border-studio-700 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-blue" />
          <p className="text-sm">Loading history...</p>
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center text-red-300 text-sm">{error}</div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="bg-studio-900/40 border border-studio-800/60 rounded-2xl p-16 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-studio-800 flex items-center justify-center mx-auto text-slate-500">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-300">No productions yet</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">Go to Studio and generate your first audio production. It will appear here once complete.</p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div className="space-y-4">
          {entries.map(entry => (
            <div key={entry.job_id} className="bg-studio-900/60 border border-studio-800/70 rounded-2xl p-5 hover:border-studio-700 transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex-shrink-0 mt-0.5 w-9 h-9 rounded-xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-cyan">
                    <Mic2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-100 truncate">{entry.title || `Production ${entry.job_id}`}</h3>
                    {entry.logline && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{entry.logline}</p>}
                  </div>
                </div>
                {entry.audio_exists && (
                  <a href={entry.download_url} download
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-800 hover:bg-studio-700 border border-studio-700 text-xs font-semibold text-slate-300 transition">
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="px-2 py-0.5 rounded-full bg-brand-purple/15 border border-brand-purple/25 text-[11px] font-semibold text-brand-pink">
                  {FORMAT_LABELS[entry.format_type] || entry.format_type}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-studio-800 border border-studio-700 text-[11px] text-slate-400">
                  {INPUT_TYPE_LABELS[entry.input_type] || entry.input_type}
                </span>
                {entry.tone && <span className="px-2 py-0.5 rounded-full bg-studio-800 border border-studio-700 text-[11px] text-slate-400">🎭 {entry.tone}</span>}
                <span className="px-2 py-0.5 rounded-full bg-studio-800 border border-studio-700 text-[11px] text-slate-400">⏱ {formatDuration(entry.total_duration)}</span>
                <span className="px-2 py-0.5 rounded-full bg-studio-800 border border-studio-700 text-[11px] text-slate-400">
                  <FileAudio className="inline w-2.5 h-2.5 mr-0.5" />{formatFileSize(entry.file_size_bytes)}
                </span>
                <span className="ml-auto text-[11px] text-slate-500">{formatDate(entry.timestamp)}</span>
              </div>

              <div className="mt-3 p-3 rounded-xl bg-studio-950/60 border border-studio-800/50">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-semibold">{INPUT_TYPE_LABELS[entry.input_type] || "Input"} Used</p>
                <p className="text-xs text-slate-300 line-clamp-3 font-mono break-all">{entry.input_content}</p>
                {entry.custom_instructions && (
                  <div className="mt-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 font-semibold">Custom Instructions</p>
                    <p className="text-xs text-slate-400 line-clamp-2">{entry.custom_instructions}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-slate-500">
                  <span>🎤 {entry.voice_count} voice{entry.voice_count !== 1 ? "s" : ""}</span>
                  <span>🧑 {entry.gender_preference}</span>
                  <span>🕐 {entry.target_duration_sec}s target</span>
                </div>
              </div>

              {entry.audio_exists
                ? <AudioMiniPlayer audioUrl={entry.audio_url} />
                : <div className="mt-3 text-[11px] text-slate-600 italic">Audio file no longer available.</div>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
