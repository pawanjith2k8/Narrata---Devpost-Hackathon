import React from 'react';
import { Mic2, Key, Radio, Sparkles, Clock } from 'lucide-react';
import { ApiKeys } from '../types';

type ActiveTab = 'studio' | 'history';

interface HeaderProps {
  apiKeys: ApiKeys;
  onOpenKeyModal: () => void;
  isGenerating: boolean;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  apiKeys,
  onOpenKeyModal,
  isGenerating,
  activeTab,
  onTabChange,
}) => {
  const hasGemini = Boolean(apiKeys.geminiApiKey);
  const hasEleven = Boolean(apiKeys.elevenlabsApiKey);

  return (
    <header className="border-b border-studio-800/80 bg-studio-900/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-purple to-brand-blue p-[1px] shadow-lg shadow-brand-blue/10">
            <div className="w-full h-full bg-studio-950 rounded-[11px] flex items-center justify-center">
              <Mic2 className="w-5 h-5 text-brand-cyan" />
            </div>
            {isGenerating && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-blue"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                NARRATA
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-purple/20 text-brand-pink border border-brand-purple/30">
                <Sparkles className="w-2.5 h-2.5" /> Agentic Studio
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Autonomous Multi-Voice AI Podcast & Trailer Producer
            </p>
          </div>
        </div>

        {/* Center: Tab Navigation */}
        <div className="hidden md:flex items-center gap-1 px-1 py-1 rounded-xl bg-studio-850/80 border border-studio-700/60">
          <button
            onClick={() => onTabChange('studio')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'studio'
                ? 'bg-brand-blue/20 text-brand-cyan border border-brand-blue/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Studio
          </button>
          <button
            onClick={() => onTabChange('history')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-brand-purple/20 text-brand-pink border border-brand-purple/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            History
          </button>
        </div>

        {/* Right Nav */}
        <div className="flex items-center gap-3">
          {/* API Key Modal Button */}
          <button
            onClick={onOpenKeyModal}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              hasGemini && hasEleven
                ? 'bg-studio-850 hover:bg-studio-800 text-slate-200 border-studio-700'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Keys</span>
            {(!hasGemini || !hasEleven) && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            )}
          </button>

          {/* Mobile: History tab button */}
          <button
            onClick={() => onTabChange(activeTab === 'history' ? 'studio' : 'history')}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 bg-studio-850/80 border border-studio-700/60 transition"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
