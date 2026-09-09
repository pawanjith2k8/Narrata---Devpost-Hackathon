import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StudioInput } from './components/StudioInput';
import { AgentArtifactConsole } from './components/AgentArtifactConsole';
import { ScriptCastViewer } from './components/ScriptCastViewer';
import { StudioPlayer } from './components/StudioPlayer';
import { ApiKeyModal } from './components/ApiKeyModal';
import { HistoryPage } from './components/HistoryPage';
import {
  InputType,
  FormatType,
  StepStatus,
  AgentThought,
  ToolCallLog,
  ProductionOutline,
  ScriptLine,
  VoiceCasting,
  ProductionArtifact,
  ApiKeys
} from './types';

type ActiveTab = 'studio' | 'history';

const INITIAL_STEPS: StepStatus[] = [
  { step: 1, step_name: 'Research & Plan', status: 'pending' },
  { step: 2, step_name: 'Scriptwriting', status: 'pending' },
  { step: 3, step_name: 'Voice Casting (MCP)', status: 'pending' },
  { step: 4, step_name: 'Synthesis (MCP)', status: 'pending' },
  { step: 5, step_name: 'Audio Assembly', status: 'pending' },
];

export function App() {
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => {
    return {
      geminiApiKey: localStorage.getItem('narrata_gemini_key') || '',
      elevenlabsApiKey: localStorage.getItem('narrata_eleven_key') || '',
    };
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('studio');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Agent State
  const [steps, setSteps] = useState<StepStatus[]>(INITIAL_STEPS);
  const [currentStep, setCurrentStep] = useState(0);
  const [thoughts, setThoughts] = useState<AgentThought[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallLog[]>([]);
  const [outline, setOutline] = useState<ProductionOutline | null>(null);
  const [scriptLines, setScriptLines] = useState<ScriptLine[]>([]);
  const [cast, setCast] = useState<VoiceCasting[]>([]);
  const [finalArtifact, setFinalArtifact] = useState<ProductionArtifact | null>(null);

  // Audio Sync Playback State
  const [currentTime, setCurrentTime] = useState(0);
  const [activeLineId, setActiveLineId] = useState<number | null>(null);
  const [seekTime, setSeekTime] = useState<number | null>(null);

  const handleSaveKeys = (keys: ApiKeys) => {
    setApiKeys(keys);
    localStorage.setItem('narrata_gemini_key', keys.geminiApiKey);
    localStorage.setItem('narrata_eleven_key', keys.elevenlabsApiKey);
  };

  // Sync active script line with audio player timeline
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
    if (!finalArtifact || !finalArtifact.timeline) return;

    const currentEntry = finalArtifact.timeline.find(
      (entry) => time >= entry.start_time && time <= entry.end_time + entry.pause_after
    );

    if (currentEntry) {
      setActiveLineId(currentEntry.id);
    }
  };

  const handleSeekToLine = (lineId: number) => {
    if (!finalArtifact || !finalArtifact.timeline) return;
    const entry = finalArtifact.timeline.find((t) => t.id === lineId);
    if (entry) {
      setSeekTime(entry.start_time);
      setActiveLineId(lineId);
    }
  };

  const handleGenerate = async (params: {
    inputType: InputType;
    inputContent: string;
    formatType: FormatType;
    targetDuration: number;
    voiceCount: number;
    genderPreference?: string;
    voiceGenders?: string[];
    customInstructions: string;
  }) => {
    // Reset state for new run
    setIsGenerating(true);
    setError(null);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'pending' })));
    setThoughts([]);
    setToolCalls([]);
    setOutline(null);
    setScriptLines([]);
    setCast([]);
    setFinalArtifact(null);
    setActiveLineId(null);
    setSeekTime(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_type: params.inputType,
          input_content: params.inputContent,
          format_type: params.formatType,
          target_duration_sec: params.targetDuration,
          voice_count: params.voiceCount,
          gender_preference: params.genderPreference || "mixed",
          voice_genders: params.voiceGenders || [],
          custom_instructions: params.customInstructions,
          gemini_api_key: apiKeys.geminiApiKey || undefined,
          elevenlabs_api_key: apiKeys.elevenlabsApiKey || undefined,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server returned status ${response.status}: ${errText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response stream not readable');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEventName = 'message';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('event:')) {
            currentEventName = trimmed.replace('event:', '').trim();
          } else if (trimmed.startsWith('data:')) {
            const jsonStr = trimmed.replace('data:', '').trim();
            try {
              const data = JSON.parse(jsonStr);
              processServerEvent(currentEventName, data);
            } catch (e) {
              console.error('Error parsing SSE data:', e, jsonStr);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Generation failure:', err);
      setError(err.message || 'An unexpected error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const processServerEvent = (eventName: string, data: any) => {
    switch (eventName) {
      case 'step_start':
        setCurrentStep(data.step);
        setSteps((prev) =>
          prev.map((s) => {
            if (s.step === data.step) {
              return {
                ...s,
                status: data.status || 'active',
                message: data.message,
              };
            }
            if (data.status === 'active' && s.step < data.step) {
              return { ...s, status: 'completed' };
            }
            return s;
          })
        );
        break;

      case 'thought':
        setThoughts((prev) => [
          ...prev,
          {
            step: data.step,
            thought: data.thought,
            timestamp: Date.now(),
          },
        ]);
        break;

      case 'tool_call':
        setToolCalls((prev) => [
          ...prev,
          {
            id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            tool_name: data.tool_name,
            arguments: data.arguments || {},
            status: 'running',
            timestamp: data.timestamp ? data.timestamp * 1000 : Date.now(),
          },
        ]);
        break;

      case 'tool_result':
        setToolCalls((prev) =>
          prev.map((tc, idx) => {
            if (idx === prev.length - 1 && tc.status === 'running') {
              return {
                ...tc,
                result: data,
                status: 'completed',
              };
            }
            return tc;
          })
        );
        break;

      case 'outline_ready':
        setOutline(data);
        break;

      case 'script_ready':
        if (data.script_lines) {
          setScriptLines(data.script_lines);
        }
        break;

      case 'casting_ready':
        if (data.castings) {
          setCast(data.castings);
        }
        break;

      case 'assembly_complete':
        setFinalArtifact(data);
        setSteps((prev) => prev.map((s) => ({ ...s, status: 'completed' })));
        break;

      case 'error':
        setError(data.message || 'Pipeline error received from agent.');
        setIsGenerating(false);
        break;

      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-studio-950 text-slate-100 flex flex-col">
      {/* Header */}
      <Header
        apiKeys={apiKeys}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        isGenerating={isGenerating}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Workspace */}
      <main className="flex-1 w-full">
        {activeTab === 'history' ? (
          <HistoryPage />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Studio Input Bar */}
            <StudioInput
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />

            {/* Live Studio Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Live Agent Artifact Console */}
              <div className="lg:col-span-5 space-y-6">
                <AgentArtifactConsole
                  steps={steps}
                  thoughts={thoughts}
                  toolCalls={toolCalls}
                  outline={outline}
                  error={error}
                  currentStep={currentStep}
                />
              </div>

              {/* Right Column: Production Output Stage */}
              <div className="lg:col-span-7 space-y-6">
                {/* Master Studio Audio Player when completed */}
                {finalArtifact && (
                  <StudioPlayer
                    artifact={finalArtifact}
                    onTimeUpdate={handleTimeUpdate}
                    seekTime={seekTime}
                  />
                )}

                {/* Dynamic Voice Cast & Synchronized Script Viewer */}
                <ScriptCastViewer
                  cast={cast}
                  scriptLines={scriptLines}
                  activeLineId={activeLineId}
                  onSeekToLine={handleSeekToLine}
                />

                {/* Empty State when no generation has started */}
                {!finalArtifact && scriptLines.length === 0 && !isGenerating && (
                  <div className="bg-studio-900/40 border border-studio-800/60 rounded-2xl p-10 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 text-brand-cyan flex items-center justify-center mx-auto">
                      <span className="text-xl">🎙️</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-200">
                      Ready for Production
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Enter any topic, URL, or script above to begin. Narrata will autonomously plan the narrative arc, write multi-turn dialogue, cast ElevenLabs voices via MCP, and master the studio audio.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        apiKeys={apiKeys}
        onSaveKeys={handleSaveKeys}
      />
    </div>
  );
}

export default App;

