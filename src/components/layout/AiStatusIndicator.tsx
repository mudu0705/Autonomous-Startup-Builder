import React, { useState } from 'react';
import { useHealth } from '../../hooks/useHealth.ts';
import { Sparkles, ChevronDown } from 'lucide-react';

export const AiStatusIndicator: React.FC = () => {
  const { aiData, isLoading } = useHealth();
  const [isOpen, setIsOpen] = useState(false);

  const ollamaOnline = aiData?.ollama?.available ?? false;
  const geminiOnline = aiData?.gemini?.available ?? false;
  const researchOnline = aiData?.research?.available ?? false;
  const activeProvider = aiData?.activeProvider || 'none';

  return (
    <div className="relative inline-block text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
        title="AI Engine Status Indicator"
      >
        <Sparkles className="h-3 w-3 text-emerald-400" />
        <span className="hidden sm:inline font-medium text-[11px] text-slate-400">AI Engine:</span>
        <span className="flex items-center gap-1 font-mono text-[10px]">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              ollamaOnline
                ? 'bg-emerald-400 animate-pulse'
                : geminiOnline
                ? 'bg-sky-400'
                : 'bg-amber-400'
            }`}
          />
          <span className="capitalize text-slate-200">
            {activeProvider !== 'none' ? activeProvider : (isLoading ? 'Checking...' : 'Deterministic')}
          </span>
        </span>
        <ChevronDown className="h-3 w-3 text-slate-500" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-800 p-3.5 shadow-2xl z-50 space-y-2.5 text-xs text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="font-semibold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              AI Engine Status
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {aiData?.configuredMode ? `Mode: ${aiData.configuredMode}` : 'Mode: auto'}
            </span>
          </div>

          <div className="space-y-2 pt-0.5">
            {/* Ollama */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-300">
                <span className={`w-2 h-2 rounded-full ${ollamaOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600'}`} />
                <span>Ollama (Local)</span>
              </span>
              <span className={`font-mono text-[11px] ${ollamaOnline ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                {ollamaOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Gemini */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-300">
                <span className={`w-2 h-2 rounded-full ${geminiOnline ? 'bg-sky-400 shadow-sm shadow-sky-400/50' : 'bg-slate-600'}`} />
                <span>Gemini (Cloud)</span>
              </span>
              <span className={`font-mono text-[11px] ${geminiOnline ? 'text-sky-400 font-semibold' : 'text-slate-500'}`}>
                {geminiOnline ? 'Available' : 'Unavailable'}
              </span>
            </div>

            {/* Live Research */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-300">
                <span className={`w-2 h-2 rounded-full ${researchOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600'}`} />
                <span>Live Research</span>
              </span>
              <span className={`font-mono text-[11px] ${researchOnline ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                {researchOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 leading-relaxed">
            {ollamaOnline
              ? `Model: ${aiData?.ollama?.model || 'qwen2.5-coder:7b'}. Local AI offline mode is ready.`
              : geminiOnline
              ? 'Using Google Gemini. Run `ollama serve` for local offline AI.'
              : 'Using deterministic venture baseline models. Connect Ollama or Gemini for live AI.'}
          </div>
        </div>
      )}
    </div>
  );
};
