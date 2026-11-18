import React from 'react';
import { Pause, Star, Volume2, VolumeX } from 'lucide-react';
import type { HudSnapshot } from '../game/types';

interface GameHUDProps {
  hud: HudSnapshot;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onDismissDialog: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  muted,
  onToggleMute,
  onPause,
  onDismissDialog,
}) => {
  const fullHearts = Math.floor(hud.hp / 2);
  const halfHeart = hud.hp % 2 === 1;
  const maxHearts = Math.ceil(hud.maxHp / 2);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 sm:p-4"
      style={{
        paddingTop: 'calc(10px + var(--sat))',
        paddingLeft: 'calc(12px + var(--sal))',
        paddingRight: 'calc(12px + var(--sar))',
        paddingBottom: 'calc(12px + var(--sab))',
      }}
    >
      {/* Top Perimeter Bar */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Hearts + Gems + Star Pieces */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5 bg-slate-950/80 border border-slate-700/80 rounded-lg px-2.5 py-1.5 shadow-md">
            {/* Pixel Hearts */}
            <div className="flex items-center gap-1" aria-label={`Здоровье ${hud.hp} из ${hud.maxHp}`}>
              {Array.from({ length: maxHearts }).map((_, idx) => {
                const filled = idx < fullHearts;
                const half = idx === fullHearts && halfHeart;
                return (
                  <svg key={idx} viewBox="0 0 12 11" className="w-4 h-4 pixelated">
                    <path
                      d="M1 2h3v1h1v1h2V3h1V2h3v3h-1v2H9v1H7v1H5V8H3V7H2V5H1V2z"
                      fill="#1e293b"
                    />
                    {filled && (
                      <path
                        d="M2 2h2v1h1v1h2V3h1V2h2v3H9v2H7v1H5V7H3V5H2V2z"
                        fill="#ef4444"
                      />
                    )}
                    {half && (
                      <path
                        d="M2 2h2v1h1v1h1v4H5V7H3V5H2V2z"
                        fill="#ef4444"
                      />
                    )}
                    {(filled || half) && <rect x="3" y="3" width="1" height="1" fill="#fecaca" />}
                  </svg>
                );
              })}
            </div>
            <span className="text-xs font-mono-num font-bold text-slate-100">
              {hud.hp}/{hud.maxHp}
            </span>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/75 border border-slate-700/70 rounded-lg px-2.5 py-1 text-xs font-mono-num text-slate-200">
            <span className="flex items-center gap-1 text-amber-300 font-semibold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {hud.starsCollected}/{hud.starsTotal}
            </span>
            <span className="text-slate-500" aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-violet-300 font-semibold">
              <span className="inline-block w-2.5 h-2.5 rotate-45 bg-violet-400 border border-violet-200" />
              {hud.gems}
            </span>
            {hud.streakHits >= 3 && (
              <>
                <span className="text-slate-500" aria-hidden="true">·</span>
                <span className="text-sky-300 font-bold">{hud.streakHits}x</span>
              </>
            )}
          </div>
        </div>

        {/* Top-Center: Boss Bar (only active in Boss fight) */}
        {hud.bossName && (
          <div className="hidden sm:flex flex-col items-center w-64 md:w-80 bg-slate-950/85 border border-slate-700 rounded-lg px-3 py-1.5 shadow-lg">
            <div className="w-full flex items-center justify-between text-[11px] font-semibold mb-1">
              <span className="text-amber-200 truncate">{hud.bossName}</span>
              <span className="font-mono-num text-slate-300">
                {hud.bossStunned ? 'УЯЗВИМ!' : `${hud.bossHp}/${hud.bossMaxHp}`}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-sm overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-150 ${
                  hud.bossStunned ? 'bg-amber-400' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, (hud.bossHp / hud.bossMaxHp) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* Top-Right: Chapter & Interactive Audio/Pause Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="hidden md:block bg-slate-950/75 border border-slate-700/70 rounded-lg px-3 py-2 text-xs text-slate-200 font-medium whitespace-nowrap">
            {hud.chapterTitle}
          </div>
          <button
            type="button"
            onClick={onToggleMute}
            className="w-11 h-11 rounded-lg bg-slate-950/80 border border-slate-700 hover:border-slate-500 active:scale-95 flex items-center justify-center text-slate-200 transition-colors"
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
          >
            {muted ? <VolumeX className="w-5 h-5 text-slate-400" /> : <Volume2 className="w-5 h-5 text-sky-300" />}
          </button>
          <button
            type="button"
            onClick={onPause}
            className="w-11 h-11 rounded-lg bg-slate-950/80 border border-slate-700 hover:border-slate-500 active:scale-95 flex items-center justify-center text-slate-100 transition-colors"
            aria-label="Пауза"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Boss Bar fallback */}
      {hud.bossName && (
        <div className="sm:hidden mx-auto w-60 bg-slate-950/85 border border-slate-700 rounded-lg px-2.5 py-1 mt-1">
          <div className="flex items-center justify-between text-[10px] font-semibold mb-0.5">
            <span className="text-amber-200 truncate">{hud.bossName}</span>
            <span className="font-mono-num text-slate-300">
              {hud.bossStunned ? 'УЯЗВИМ!' : `${hud.bossHp}`}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-sm overflow-hidden">
            <div
              className={`h-full ${hud.bossStunned ? 'bg-amber-400' : 'bg-rose-500'}`}
              style={{ width: `${Math.max(0, Math.min(100, (hud.bossHp / hud.bossMaxHp) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom Center: Signpost Dialogue Box */}
      <div className="flex justify-center">
        {hud.dialogText && (
          <button
            type="button"
            onClick={onDismissDialog}
            className="pointer-events-auto max-w-md bg-slate-950/95 border-2 border-amber-400/80 rounded-xl px-4 py-3 text-left shadow-2xl mb-16 sm:mb-4"
          >
            <div className="text-[11px] font-bold text-amber-300 mb-1">Древняя табличка</div>
            <p className="text-sm text-slate-100 leading-snug">{hud.dialogText}</p>
            <div className="text-[11px] text-slate-400 mt-1.5">Нажмите, чтобы закрыть</div>
          </button>
        )}
      </div>
    </div>
  );
};
