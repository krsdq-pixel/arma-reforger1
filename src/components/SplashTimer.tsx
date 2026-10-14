import React, { useEffect, useState } from 'react';
import { ActiveRound, Language } from '../types/mortar';
import { translations } from '../utils/translations';
import { playSplashAlertSound } from '../utils/audio';

interface SplashTimerProps {
  activeRounds: ActiveRound[];
  onRemoveRound: (id: string) => void;
  onClearAll: () => void;
  lang: Language;
  muted: boolean;
}

export const SplashTimer: React.FC<SplashTimerProps> = ({
  activeRounds,
  onRemoveRound,
  onClearAll,
  lang,
  muted
}) => {
  const t = translations[lang];
  const [, setTick] = useState(0);

  // Update interval for smooth millisecond/sub-second countdown
  useEffect(() => {
    if (activeRounds.length === 0) return;
    const interval = setInterval(() => {
      setTick(n => n + 1);
    }, 100);
    return () => clearInterval(interval);
  }, [activeRounds.length]);

  // Check for newly splashed rounds and play sound
  useEffect(() => {
    const now = Date.now();
    activeRounds.forEach(round => {
      if (!round.hasSplashed && now >= round.impactTime) {
        round.hasSplashed = true;
        playSplashAlertSound(muted);
      }
    });
  }, [activeRounds, muted]);

  if (activeRounds.length === 0) return null;

  const now = Date.now();

  return (
    <div className="bg-zinc-900/90 border border-amber-500/30 rounded-lg p-3 shadow-lg shadow-black/40">
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span className="font-bold text-amber-300 uppercase tracking-wide">
            {t.splashTitle} ({activeRounds.length})
          </span>
        </div>
        <button
          onClick={onClearAll}
          className="text-[11px] text-zinc-400 hover:text-zinc-200 hover:underline px-1.5 py-0.5 rounded cursor-pointer"
        >
          {t.abortAll}
        </button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {activeRounds.map((round, idx) => {
          const remainingMs = Math.max(0, round.impactTime - now);
          const remainingSec = (remainingMs / 1000);
          const isImpacted = remainingMs === 0;
          const elapsed = round.tof - remainingSec;
          const progressPercent = Math.min(100, Math.max(0, (elapsed / round.tof) * 100));

          return (
            <div
              key={round.id}
              className={`p-2.5 rounded border transition-all ${
                isImpacted
                  ? 'bg-red-950/60 border-red-500 text-red-200 animate-pulse'
                  : 'bg-zinc-950/70 border-zinc-700/80 text-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-zinc-800 text-[10px] flex items-center justify-center font-mono font-bold text-amber-400">
                    #{idx + 1}
                  </span>
                  <span>{round.targetName}</span>
                </span>

                <div className="flex items-center gap-2">
                  {isImpacted ? (
                    <span className="font-bold text-red-400 tracking-wider">
                      💥 {t.splashImpact}
                    </span>
                  ) : (
                    <span className="font-mono text-base font-bold text-amber-400 tabular-nums">
                      {remainingSec.toFixed(1)}s
                    </span>
                  )}

                  <button
                    onClick={() => onRemoveRound(round.id)}
                    className="text-zinc-500 hover:text-zinc-300 text-xs p-1 cursor-pointer"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-100 ${
                    isImpacted ? 'bg-red-500' : 'bg-gradient-to-r from-amber-500 to-emerald-400'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-zinc-400 mt-1 font-mono">
                <span>{lang === 'ar' ? `الشحنة: ${round.charge}` : `CHG: ${round.charge}`}</span>
                <span>{lang === 'ar' ? `الاتجاه: ${round.bearing.toFixed(0)}` : `AZ: ${round.bearing.toFixed(0)}°`}</span>
                <span>{lang === 'ar' ? `الارتفاع: ${round.elevation.toFixed(0)}` : `ELEV: ${round.elevation.toFixed(0)}`}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
