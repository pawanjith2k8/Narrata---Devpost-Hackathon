import React, { useState, useEffect } from 'react';
import { Film, Clock, Users, Play, Link as LinkIcon, FileText, Sparkles, SlidersHorizontal, UserCheck, Mic } from 'lucide-react';
import { InputType, FormatType } from '../types';

interface StudioInputProps {
  onGenerate: (params: {
    inputType: InputType;
    inputContent: string;
    formatType: FormatType;
    targetDuration: number;
    voiceCount: number;
    genderPreference: string;
    voiceGenders: string[];
    customInstructions: string;
  }) => void;
  isGenerating: boolean;
}

export const StudioInput: React.FC<StudioInputProps> = ({
  onGenerate,
  isGenerating,
}) => {
  const [inputType, setInputType] = useState<InputType>('topic');
  const [inputContent, setInputContent] = useState('');
  const [formatType, setFormatType] = useState<FormatType>('podcast');
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [targetDuration, setTargetDuration] = useState<number>(45);
  
  // Voice count state: 0 = Auto, 1, 2, 3, 4, or custom number
  const [voiceMode, setVoiceMode] = useState<'auto' | 'preset' | 'custom'>('preset');
  const [voiceCount, setVoiceCount] = useState<number>(2);
  const [customVoiceNum, setCustomVoiceNum] = useState<number>(5);
  
  // Per-voice gender array e.g. ["male", "female"]
  const [voiceGenders, setVoiceGenders] = useState<string[]>(['male', 'female']);
  const [customInstructions, setCustomInstructions] = useState('');

  const numVoices = voiceMode === 'auto' ? 2 : voiceMode === 'custom' ? Math.max(1, customVoiceNum) : voiceCount;

  // Keep voiceGenders synchronized with the number of voices
  useEffect(() => {
    setVoiceGenders((prev) => {
      const updated = [...prev];
      while (updated.length < numVoices) {
        updated.push(updated.length % 2 === 0 ? 'male' : 'female');
      }
      return updated.slice(0, numVoices);
    });
  }, [numVoices]);

  const handleVoiceGenderChange = (index: number, gender: string) => {
    setVoiceGenders((prev) => {
      const updated = [...prev];
      updated[index] = gender;
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim() || isGenerating) return;

    onGenerate({
      inputType,
      inputContent: inputContent.trim(),
      formatType,
      targetDuration: isCustomDuration ? targetDuration : 0, // 0 = Auto
      voiceCount: voiceMode === 'auto' ? 0 : numVoices,
      genderPreference: 'custom',
      voiceGenders: voiceMode === 'auto' ? [] : voiceGenders,
      customInstructions: customInstructions.trim(),
    });
  };

  return (
    <div className="bg-studio-900 border border-studio-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl pointer-events-none" />

      <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
        {/* Input Mode Selector */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-studio-800/80">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-studio-950 border border-studio-800">
            <button
              type="button"
              onClick={() => setInputType('topic')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                inputType === 'topic'
                  ? 'bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Prompt / Topic</span>
            </button>
            <button
              type="button"
              onClick={() => setInputType('url')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                inputType === 'url'
                  ? 'bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Article URL</span>
            </button>
            <button
              type="button"
              onClick={() => setInputType('script')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                inputType === 'script'
                  ? 'bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Raw Script</span>
            </button>
          </div>
        </div>

        {/* Main Text Input */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            {inputType === 'topic' && 'Enter Any Topic or Story Idea'}
            {inputType === 'url' && 'Article URL for Web Grounding'}
            {inputType === 'script' && 'Custom Dialogue Script'}
          </label>
          <textarea
            rows={inputType === 'url' ? 2 : 4}
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder={
              inputType === 'topic'
                ? 'Type any topic (e.g., A true-crime podcast investigating the Mona Lisa theft, an epic sci-fi trailer about a sentient satellite, a tech debate on AI agents...)'
                : inputType === 'url'
                ? 'https://en.wikipedia.org/wiki/Voynich_manuscript'
                : 'NARRATOR: Enter custom lines with speaker tags...'
            }
            className="w-full px-4 py-3 rounded-xl bg-studio-950 border border-studio-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-brand-blue transition text-sm leading-relaxed resize-y font-sans"
            required
          />
        </div>

        {/* Top Controls: Format, Duration & Cast Size */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* 1. Format Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-brand-cyan" /> Format & Style
            </label>
            <select
              value={formatType}
              onChange={(e) => setFormatType(e.target.value as FormatType)}
              className="w-full px-3 py-2.5 rounded-xl bg-studio-950 border border-studio-800 text-xs text-slate-200 focus:outline-none focus:border-brand-blue"
            >
              <option value="podcast">🎙️ Studio Podcast</option>
              <option value="trailer">🎬 Movie Trailer</option>
              <option value="drama">🚀 Sci-Fi Drama</option>
              <option value="docu">🔍 Documentary</option>
              <option value="debate">⚡ Quick Debate</option>
            </select>
          </div>

          {/* 2. Target Duration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-amber" /> Duration
              </label>
              <button
                type="button"
                onClick={() => setIsCustomDuration(!isCustomDuration)}
                className="text-[10px] text-brand-cyan hover:underline flex items-center gap-1"
              >
                <SlidersHorizontal className="w-2.5 h-2.5" />
                {isCustomDuration ? 'Set Auto' : 'Custom'}
              </button>
            </div>

            {!isCustomDuration ? (
              <div className="px-3 py-2 rounded-xl bg-studio-950 border border-studio-800/80 text-xs text-slate-400 flex items-center justify-between">
                <span className="text-brand-cyan font-medium">Auto (Smart)</span>
                <span className="text-[10px] text-slate-500">Agent decides</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-studio-950 px-3 py-2 rounded-xl border border-studio-800">
                <input
                  type="range"
                  min={20}
                  max={120}
                  step={10}
                  value={targetDuration}
                  onChange={(e) => setTargetDuration(Number(e.target.value))}
                  className="w-full h-1.5 bg-studio-900 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
                />
                <span className="text-xs font-mono text-slate-300 min-w-[28px]">
                  {targetDuration}s
                </span>
              </div>
            )}
          </div>

          {/* 3. Cast Size */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-brand-pink" /> Cast Size
              </label>
              <span className="text-[10px] text-brand-pink font-mono">
                {voiceMode === 'auto' ? 'Auto Cast' : `${numVoices} Speakers`}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setVoiceMode('auto')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                  voiceMode === 'auto'
                    ? 'bg-brand-pink/20 text-brand-pink border-brand-pink/50 shadow-sm'
                    : 'bg-studio-950 text-slate-400 border-studio-800 hover:text-slate-200'
                }`}
              >
                Auto
              </button>

              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setVoiceMode('preset');
                    setVoiceCount(num);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition border ${
                    voiceMode === 'preset' && voiceCount === num
                      ? 'bg-brand-purple/30 text-brand-pink border-brand-pink/50 shadow-sm'
                      : 'bg-studio-950 text-slate-400 border-studio-800 hover:text-slate-200'
                  }`}
                >
                  {num}
                </button>
              ))}

              {voiceMode === 'custom' ? (
                <div className="flex items-center bg-studio-950 px-1 py-1 rounded-lg border border-brand-pink/50">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={customVoiceNum}
                    onChange={(e) => setCustomVoiceNum(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-8 bg-transparent text-xs text-brand-pink font-bold focus:outline-none text-center"
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setVoiceMode('custom')}
                  className="px-2 py-1.5 rounded-lg text-xs font-bold transition border bg-studio-950 text-slate-400 border-studio-800 hover:text-brand-pink hover:border-brand-pink/30"
                  title="Custom speaker count"
                >
                  +
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. Voice-by-Voice Gender Customizer */}
        {voiceMode !== 'auto' && (
          <div className="p-4 rounded-xl bg-studio-950/80 border border-studio-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-brand-cyan" />
                Individual Voice Gender Preferences
              </span>
              <span className="text-[11px] text-slate-400">
                Choose Male / Female for each speaker
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {voiceGenders.slice(0, numVoices).map((gender, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-studio-900 border border-studio-800 flex items-center justify-between gap-2"
                >
                  <span className="text-xs font-semibold text-slate-300">
                    Voice {idx + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleVoiceGenderChange(idx, 'female')}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition border ${
                        gender === 'female'
                          ? 'bg-brand-pink/20 text-brand-pink border-brand-pink/50'
                          : 'bg-studio-950 text-slate-500 border-studio-800 hover:text-slate-300'
                      }`}
                    >
                      ♀ Female
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVoiceGenderChange(idx, 'male')}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition border ${
                        gender === 'male'
                          ? 'bg-brand-blue/20 text-brand-cyan border-brand-blue/50'
                          : 'bg-studio-950 text-slate-500 border-studio-800 hover:text-slate-300'
                      }`}
                    >
                      ♂ Male
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={isGenerating || !inputContent.trim()}
            className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-sm text-white shadow-xl transition-all ${
              isGenerating || !inputContent.trim()
                ? 'bg-studio-800 text-slate-500 cursor-not-allowed border border-studio-700/50'
                : 'bg-gradient-to-r from-brand-blue via-brand-purple to-brand-pink hover:opacity-95 shadow-brand-blue/25 hover:shadow-brand-purple/30 active:scale-98'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Agent Orchestrating Production...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Produce Master Audio &rarr;</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
