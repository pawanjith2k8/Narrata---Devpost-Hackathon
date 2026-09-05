import React from 'react';
import { Users, FileText, Sparkles, Volume2, Mic, UserCheck } from 'lucide-react';
import { ScriptLine, VoiceCasting } from '../types';

interface ScriptCastViewerProps {
  cast: VoiceCasting[];
  scriptLines: ScriptLine[];
  activeLineId: number | null;
  onSeekToLine?: (lineId: number) => void;
}

const SPEAKER_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  NARRATOR: {
    bg: 'bg-indigo-950/40',
    text: 'text-indigo-300',
    border: 'border-indigo-800/50',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
  },
  HOST: {
    bg: 'bg-cyan-950/40',
    text: 'text-cyan-300',
    border: 'border-cyan-800/50',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
  },
  DEFAULT_1: {
    bg: 'bg-purple-950/40',
    text: 'text-purple-300',
    border: 'border-purple-800/50',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
  },
  DEFAULT_2: {
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-300',
    border: 'border-emerald-800/50',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  },
  DEFAULT_3: {
    bg: 'bg-amber-950/40',
    text: 'text-amber-300',
    border: 'border-amber-800/50',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  }
};

export const ScriptCastViewer: React.FC<ScriptCastViewerProps> = ({
  cast,
  scriptLines,
  activeLineId,
  onSeekToLine
}) => {
  const getSpeakerTheme = (role: string, index: number) => {
    if (role.toUpperCase().includes('NARRATOR')) return SPEAKER_COLORS.NARRATOR;
    if (role.toUpperCase().includes('HOST')) return SPEAKER_COLORS.HOST;
    const fallbacks = [SPEAKER_COLORS.DEFAULT_1, SPEAKER_COLORS.DEFAULT_2, SPEAKER_COLORS.DEFAULT_3];
    return fallbacks[index % fallbacks.length];
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Voice Cast Board */}
      {cast.length > 0 && (
        <div className="bg-studio-900 border border-studio-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-brand-purple/10 text-brand-pink">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Dynamic Voice Cast (ElevenLabs MCP Assigned)
              </h3>
              <p className="text-[11px] text-slate-400">
                Voices matched dynamically based on character persona and live ElevenLabs catalog
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {cast.map((c, idx) => {
              const theme = getSpeakerTheme(c.role, idx);
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl ${theme.bg} border ${theme.border} space-y-2 relative overflow-hidden`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${theme.badge}`}>
                      {c.role}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {c.gender} • {c.accent}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-brand-cyan" />
                      {c.character_name || c.role}
                    </h4>
                    <p className="text-[11px] text-brand-cyan/90 font-medium">
                      ElevenLabs Voice: <span className="underline font-semibold">{c.voice_name}</span>
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-400 italic leading-relaxed pt-1 border-t border-studio-800/60">
                    "{c.match_rationale}"
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Line-by-Line Script Viewer */}
      {scriptLines.length > 0 && (
        <div className="bg-studio-900 border border-studio-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand-blue/10 text-brand-blue">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Production Script & Dialogue ({scriptLines.length} Lines)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Tag-directed script with emotional inflections and pause pacing
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {scriptLines.map((line, idx) => {
              const isCurrent = activeLineId === line.line_id;
              const theme = getSpeakerTheme(line.speaker_role, idx);

              return (
                <div
                  key={line.line_id || idx}
                  onClick={() => onSeekToLine && onSeekToLine(line.line_id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-start gap-3 ${
                    isCurrent
                      ? 'bg-brand-blue/15 border-brand-blue/60 shadow-lg shadow-brand-blue/10 ring-1 ring-brand-blue/50'
                      : 'bg-studio-950/60 hover:bg-studio-950 border-studio-800/80'
                  }`}
                >
                  {/* Speaker Badge */}
                  <div className="sm:w-36 flex-shrink-0 flex sm:flex-col items-start gap-1">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${theme.badge}`}>
                      {line.speaker_role}
                    </span>
                    {line.emotion && (
                      <span className="text-[10px] text-slate-400 italic">
                        [{line.emotion}]
                      </span>
                    )}
                  </div>

                  {/* Spoken Text */}
                  <div className="flex-1 space-y-1">
                    <p className={`text-xs leading-relaxed ${isCurrent ? 'text-white font-medium' : 'text-slate-200'}`}>
                      {line.text}
                    </p>
                  </div>

                  {/* Pause Tag */}
                  {line.pause_after_sec && (
                    <div className="sm:self-center text-[10px] text-slate-500 font-mono flex-shrink-0">
                      pause: +{line.pause_after_sec}s
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
