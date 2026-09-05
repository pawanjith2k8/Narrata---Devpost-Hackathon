import React, { useState } from 'react';
import {
  Brain,
  Wrench,
  CheckCircle2,
  CircleDashed,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Terminal,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { StepStatus, AgentThought, ToolCallLog, ProductionOutline } from '../types';

interface AgentArtifactConsoleProps {
  steps: StepStatus[];
  thoughts: AgentThought[];
  toolCalls: ToolCallLog[];
  outline: ProductionOutline | null;
  error: string | null;
  currentStep: number;
}

export const AgentArtifactConsole: React.FC<AgentArtifactConsoleProps> = ({
  steps,
  thoughts,
  toolCalls,
  outline,
  error,
  currentStep,
}) => {
  const [activeTab, setActiveTab] = useState<'reasoning' | 'tools' | 'outline'>('reasoning');
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);

  const toggleToolExpand = (id: string) => {
    setExpandedToolId(expandedToolId === id ? null : id);
  };

  return (
    <div className="bg-studio-900 border border-studio-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Header / Tabs */}
      <div className="px-5 py-3.5 bg-studio-850/80 border-b border-studio-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-cyan/10 text-brand-cyan">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Agent Execution Console
          </span>
        </div>

        {/* Console Tab Pills */}
        <div className="flex items-center gap-1 p-1 bg-studio-950 rounded-xl border border-studio-800/80 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('reasoning')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition ${
              activeTab === 'reasoning'
                ? 'bg-brand-blue/20 text-brand-cyan font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Reasoning ({thoughts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tools')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition ${
              activeTab === 'tools'
                ? 'bg-brand-pink/20 text-brand-pink font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>MCP Tool Calls ({toolCalls.length})</span>
          </button>
          {outline && (
            <button
              type="button"
              onClick={() => setActiveTab('outline')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition ${
                activeTab === 'outline'
                  ? 'bg-brand-purple/20 text-brand-pink font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Production Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Step Progress Bar */}
      <div className="px-5 py-3 bg-studio-950/60 border-b border-studio-800/60 grid grid-cols-2 sm:grid-cols-5 gap-2">
        {steps.map((s) => {
          const isActive = s.status === 'active';
          const isDone = s.status === 'completed';
          const isFailed = s.status === 'failed';

          return (
            <div
              key={s.step}
              className={`flex items-center gap-2 p-2 rounded-xl text-xs transition border ${
                isActive
                  ? 'bg-brand-blue/10 border-brand-blue/40 text-brand-cyan'
                  : isDone
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : isFailed
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-studio-900/50 border-studio-800/40 text-slate-500'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              ) : isActive ? (
                <CircleDashed className="w-3.5 h-3.5 text-brand-cyan animate-spin flex-shrink-0" />
              ) : isFailed ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-slate-700 flex items-center justify-center text-[9px] text-slate-500 flex-shrink-0">
                  {s.step}
                </div>
              )}
              <span className="truncate font-medium text-[11px]">{s.step_name}</span>
            </div>
          );
        })}
      </div>

      {/* Error Alert if any */}
      {error && (
        <div className="m-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Pipeline Error:</span>
            <p className="font-mono text-[11px] whitespace-pre-wrap">{error}</p>
          </div>
        </div>
      )}

      {/* Tab Panels */}
      <div className="p-4 sm:p-5 max-h-[380px] overflow-y-auto space-y-3 font-mono text-xs">
        {/* Tab 1: Reasoning & Chain of Thought */}
        {activeTab === 'reasoning' && (
          <div className="space-y-3">
            {thoughts.length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-sans">
                <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Agent reasoning logs will appear here during production.</p>
              </div>
            ) : (
              thoughts.map((t, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-studio-950 border border-studio-800/80 text-slate-300 flex items-start gap-3"
                >
                  <div className="p-1 rounded bg-studio-850 text-brand-cyan flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3" />
                  </div>
                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Step {t.step} Reasoning</span>
                      <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[12px] font-sans text-slate-200 leading-relaxed">
                      {t.thought}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: MCP Tool Calls */}
        {activeTab === 'tools' && (
          <div className="space-y-3">
            {toolCalls.length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-sans">
                <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>ElevenLabs MCP tool calls (list_voices, text_to_speech) will be logged here.</p>
              </div>
            ) : (
              toolCalls.map((tc) => {
                const isExpanded = expandedToolId === tc.id;
                return (
                  <div
                    key={tc.id}
                    className="rounded-xl bg-studio-950 border border-studio-800/80 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleToolExpand(tc.id)}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-studio-850/50 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <Terminal className="w-3.5 h-3.5 text-brand-pink" />
                        <span className="font-bold text-brand-pink text-[11px]">
                          {tc.tool_name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-studio-850 text-slate-400">
                          {tc.arguments.speaker || tc.arguments.category || 'call'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {tc.result?.bytes_received ? `${tc.result.bytes_received} bytes` : 'OK'}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 py-3 bg-studio-900 border-t border-studio-800 text-[11px] space-y-2">
                        <div>
                          <span className="text-slate-500 block text-[10px]">MCP Arguments:</span>
                          <pre className="p-2 rounded bg-studio-950 border border-studio-800 text-slate-300 overflow-x-auto">
                            {JSON.stringify(tc.arguments, null, 2)}
                          </pre>
                        </div>
                        {tc.result && (
                          <div>
                            <span className="text-slate-500 block text-[10px]">MCP Response:</span>
                            <pre className="p-2 rounded bg-studio-950 border border-studio-800 text-emerald-300 overflow-x-auto">
                              {JSON.stringify(tc.result, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 3: Structured Production Plan */}
        {activeTab === 'outline' && outline && (
          <div className="space-y-4 font-sans">
            <div className="p-3.5 rounded-xl bg-studio-950 border border-studio-800">
              <h4 className="text-sm font-bold text-brand-cyan mb-1">{outline.title}</h4>
              <p className="text-xs text-slate-300 italic mb-2">"{outline.logline}"</p>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-studio-850 border border-studio-700 text-slate-300">
                  Tone: {outline.tone}
                </span>
                <span className="px-2 py-0.5 rounded bg-studio-850 border border-studio-700 text-slate-300">
                  Pacing: {outline.pacing}
                </span>
              </div>
            </div>

            {/* Narrative Arc */}
            <div className="p-3.5 rounded-xl bg-studio-950 border border-studio-800 space-y-1.5">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Narrative Arc
              </span>
              <ul className="space-y-1 text-xs text-slate-400">
                {outline.narrative_arc.map((arc, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-purple" />
                    <span>{arc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
