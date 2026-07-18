import React from 'react';
import { Play, Pause, SkipForward, RotateCcw, Zap, Clock } from 'lucide-react';

interface ControlPanelProps {
  isAnimating: boolean;
  setIsAnimating: (v: boolean) => void;
  animationSpeed: number;
  setAnimationSpeed: (v: number) => void;
  currentStep: number;
  stepForward: () => void;
  resetAnimation: () => void;
  isStepMode: boolean;
  setIsStepMode: (v: boolean) => void;
  processingTime: number;
  prediction: number | null;
  confidence: number | null;
}

const TOTAL = 18;

const STEPS: Record<number, { label: string; color: string }> = {
  0:  { label: 'Waiting for input',                        color: 'text-gray-500'    },
  1:  { label: 'Scanning drawing — 784 pixels',            color: 'text-sky-400'     },
  2:  { label: 'Detecting edges and shapes',               color: 'text-sky-300'     },
  3:  { label: 'Transmitting signals to Layer 1 (256)',    color: 'text-amber-400'   },
  4:  { label: 'Layer 1 — recognising basic patterns',     color: 'text-cyan-400'    },
  5:  { label: 'Layer 1 — combining curves and lines',     color: 'text-cyan-300'    },
  6:  { label: 'Transmitting signals to Layer 2 (128)',    color: 'text-amber-400'   },
  7:  { label: 'Layer 2 — forming abstract features',      color: 'text-violet-400'  },
  8:  { label: 'Layer 2 — narrowing candidates',           color: 'text-violet-300'  },
  9:  { label: 'Transmitting signals to Layer 3 (64)',     color: 'text-amber-400'   },
  10: { label: 'Layer 3 — refining features',              color: 'text-purple-400'  },
  11: { label: 'Layer 3 — scoring candidates',             color: 'text-purple-300'  },
  12: { label: 'Transmitting signals to Layer 4 (32)',     color: 'text-amber-400'   },
  13: { label: 'Layer 4 — making final judgement',         color: 'text-pink-400'    },
  14: { label: 'Layer 4 — eliminating possibilities',      color: 'text-pink-300'    },
  15: { label: 'Transmitting signals to Output (10)',      color: 'text-amber-400'   },
  16: { label: 'Output neurons — voting on digit',          color: 'text-emerald-400' },
  17: { label: 'Calculating final confidence score',       color: 'text-emerald-300' },
  18: { label: 'Prediction complete',                      color: 'text-emerald-400' },
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isAnimating, setIsAnimating, animationSpeed, setAnimationSpeed,
  currentStep, stepForward, resetAnimation, isStepMode, setIsStepMode,
  processingTime, prediction, confidence
}) => {
  const info       = STEPS[currentStep] ?? STEPS[0];
  const pct        = Math.round((currentStep / TOTAL) * 100);
  const isDone     = currentStep >= TOTAL;
  const isFireStep = [3,6,9,12,15].includes(currentStep);

  return (
    <div className="glass-panel rounded-2xl p-6 glow-border h-full flex flex-col justify-between">
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
          <span>AI Wave Controls</span>
          <span className="text-xs bg-[#00d9ff]/20 text-[#00d9ff] px-2 py-0.5 rounded-full border border-[#00d9ff]/30 font-mono">
            {currentStep} / {TOTAL}
          </span>
        </h2>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-2 mb-4 bg-black/45 p-1 rounded-xl border border-gray-900">
          {[
            { label: 'Auto Wave',    active: !isStepMode, onClick: () => { setIsStepMode(false); setIsAnimating(true); } },
            { label: 'Step-by-Step', active:  isStepMode, onClick: () => { setIsStepMode(true);  setIsAnimating(false); resetAnimation(); } },
          ].map(({ label, active, onClick }) => (
            <button key={label} onClick={onClick}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${active ? 'bg-[#00d9ff] text-black shadow-md' : 'text-gray-400 hover:text-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-black/40 rounded-full h-2 mb-3 border border-gray-900 overflow-hidden">
          <div className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: isDone ? 'linear-gradient(90deg,#00ffcc,#00d9ff)' :
                isFireStep ? 'linear-gradient(90deg,#ff8800,#ffcc00)' :
                'linear-gradient(90deg,#0044ff,#00d9ff)'
            }}
          />
        </div>

        {/* Step status */}
        <div className={`border rounded-xl p-3 mb-4 transition-all duration-500 ${
          isDone ? 'bg-emerald-500/10 border-emerald-500/30' :
          isFireStep ? 'bg-amber-500/10 border-amber-500/30' :
          'bg-black/30 border-gray-900/60'
        }`}>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">AI Brain Signal Wave</span>
          <p className={`text-xs font-semibold ${info.color}`}>{info.label}</p>
        </div>

        {/* Action controls */}
        <div className="flex gap-2 mb-5">
          {!isStepMode ? (
            <button onClick={() => setIsAnimating(!isAnimating)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#141414] hover:bg-[#1f1f1f] border border-gray-800 rounded-xl text-xs font-semibold transition-all text-white">
              {isAnimating
                ? <><Pause className="w-4 h-4 text-[#00d9ff]" /><span>Pause</span></>
                : <><Play  className="w-4 h-4 text-emerald-400" /><span>Resume</span></>}
            </button>
          ) : (
            <button onClick={stepForward} disabled={isDone}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 border rounded-xl text-xs font-semibold transition-all ${
                isDone ? 'bg-gray-900 border-gray-950 text-gray-600 cursor-not-allowed'
                       : 'bg-[#141414] hover:bg-[#1f1f1f] border-gray-800 text-white hover:border-[#00d9ff]/30'}`}>
              <SkipForward className="w-4 h-4 text-[#00d9ff]" />
              <span>Next Step</span>
            </button>
          )}
          <button onClick={resetAnimation}
            className="p-2 bg-[#141414] hover:bg-[#1f1f1f] border border-gray-800 rounded-xl text-gray-300 hover:text-white transition-all" title="Reset">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {!isStepMode && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Wave Speed</span>
              <span className="text-[#00d9ff] font-mono">{animationSpeed}ms / step</span>
            </div>
            <input type="range" min={200} max={3000} step={100} value={animationSpeed}
              onChange={e => setAnimationSpeed(Number(e.target.value))}
              className="w-full h-1 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#00d9ff]"
            />
            <div className="flex justify-between text-[9px] text-gray-700 mt-0.5"><span>Fast</span><span>Slow</span></div>
          </div>
        )}
      </div>

      {/* Footer metrics + prediction */}
      <div className="border-t border-gray-800/80 pt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-500" />Thinking Speed</span>
          <span className="text-[#00d9ff] font-mono">{processingTime}ms</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-gray-500" />Total Connections</span>
          <span className="text-[#00d9ff] font-mono">~230K</span>
        </div>

        {prediction !== null && (
          <div className={`mt-3 rounded-xl p-4 border transition-all duration-700 ${
            isDone ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#00d9ff]/5 border-[#00d9ff]/10'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">AI's Guess</span>
                <span className={`text-2xl font-bold leading-none ${isDone ? 'text-emerald-300' : 'text-white'}`}>
                  I think it's a {prediction}!
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Certainty</span>
                <span className={`text-xl font-bold leading-none ${
                  confidence !== null && confidence > 0.9 ? 'text-emerald-400' :
                  confidence !== null && confidence > 0.6 ? 'text-amber-400' : 'text-red-400'}`}>
                  {confidence !== null ? `${(confidence * 100).toFixed(0)}%` : '—'}
                </span>
              </div>
            </div>
            {confidence !== null && (
              <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
                <div className="h-1.5 rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.round(confidence * 100)}%`,
                    background: confidence > 0.9 ? '#00ffcc' : confidence > 0.6 ? '#fbbf24' : '#f87171'
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
