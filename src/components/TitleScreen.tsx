import React, { useEffect, useState } from 'react';
import { Lock, Play, Star, Trophy, Volume2, VolumeX } from 'lucide-react';
import { CHAPTER_METAS } from '../game/levels';
import { achievementService } from '../game/achievements';
import type { SaveProgress } from '../game/types';

interface TitleScreenProps {
  save: SaveProgress;
  selectedChapter: number;
  onSelectChapter: (idx: number) => void;
  onStart: (chapterIndex: number) => void;
  onOpenAchievements: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

const KEY_ART_URL = '/src/assets/images/title_guardian_ruins_1795016752617.jpg';

export const TitleScreen: React.FC<TitleScreenProps> = ({
  save,
  selectedChapter,
  onSelectChapter,
  onStart,
  onOpenAchievements,
  muted,
  onToggleMute,
}) => {
  const [imgError, setImgError] = useState(false);
  const summary = achievementService.getSummary();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart(selectedChapter);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStart, selectedChapter]);

  return (
    <div className="fixed inset-0 z-30 bg-[#09111a] flex flex-col justify-between overflow-hidden">
      {/* Key Art Backdrop + CSS Fallback */}
      <div className="absolute inset-0 pointer-events-none">
        {!imgError ? (
          <img
            src={KEY_ART_URL}
            alt="Рыцарь перед древними руинами"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-right pixelated"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0b1726] via-[#13293d] to-[#1e3a2f]" />
        )}
        {/* Measured scrim keeping left 45% high-contrast for title & controls */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#09111a]/95 via-[#09111a]/70 to-[#09111a]/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09111a]/90 via-transparent to-[#09111a]/45" />
      </div>

      {/* Top Corner Utility Row */}
      <div
        className="relative z-10 flex items-center justify-between px-5 sm:px-8 pt-4"
        style={{ paddingTop: 'calc(14px + var(--sat))' }}
      >
        <div className="flex items-center gap-3 text-xs text-slate-300 font-mono-num">
          <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            {save.collectedStarIds.length}/6 звёзд
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-slate-300">
            Рекорд самоцветов: {save.bestGems}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          className="w-11 h-11 rounded-xl bg-slate-950/75 border border-slate-700/80 hover:border-slate-500 flex items-center justify-center text-slate-200 transition-colors"
          aria-label={muted ? 'Включить звук' : 'Выключить звук'}
        >
          {muted ? <VolumeX className="w-5 h-5 text-slate-400" /> : <Volume2 className="w-5 h-5 text-sky-300" />}
        </button>
      </div>

      {/* Main Left-Aligned Title Lockup & Chapter Launch */}
      <div
        className="relative z-10 flex-1 flex flex-col justify-center px-5 sm:px-10 md:px-14 max-w-2xl"
        style={{ paddingLeft: 'calc(20px + var(--sal))' }}
      >
        {/* Bespoke Inline SVG Title Lockup */}
        <div className="mb-5">
          <svg
            viewBox="0 0 420 88"
            className="w-full max-w-[390px] h-auto drop-shadow-[0_6px_18px_rgba(0,0,0,0.85)]"
            role="img"
            aria-label="Рыцарь Хроник"
          >
            <defs>
              <linearGradient id="goldTitle" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="55%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
            </defs>
            {/* Pixel Crest Shield */}
            <path
              d="M14 14h24v20l-12 12-12-12V14z"
              fill="#1d4ed8"
              stroke="#fbbf24"
              strokeWidth="2.5"
            />
            <path d="M26 19v18M20 26h12" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="square" />
            {/* Main Title */}
            <text
              x="50"
              y="38"
              fill="url(#goldTitle)"
              fontFamily="'Press Start 2P', monospace"
              fontSize="22"
              letterSpacing="1"
            >
              РЫЦАРЬ
            </text>
            <text
              x="50"
              y="66"
              fill="#e2e8f0"
              fontFamily="'Press Start 2P', monospace"
              fontSize="19"
              letterSpacing="2"
            >
              ХРОНИК
            </text>
            {/* Accent Underline */}
            <rect x="50" y="75" width="210" height="3" fill="#38bdf8" />
          </svg>
          <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-md leading-relaxed">
            Пиксельный экшен-квест с головоломками: толкайте рунные блоки, взрывайте тайные стены и победите Стража.
          </p>
        </div>

        {/* Chapter Selector */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-w-lg mb-5">
          {CHAPTER_METAS.map((ch) => {
            const unlocked = ch.index <= save.highestUnlockedChapter;
            const active = selectedChapter === ch.index;
            const starsInCh = save.collectedStarIds.filter((id) => id.startsWith(`${ch.index}-`)).length;

            return (
              <button
                key={ch.id}
                type="button"
                disabled={!unlocked}
                onClick={() => onSelectChapter(ch.index)}
                className={`text-left p-2.5 sm:p-3 rounded-xl border transition-all min-h-[64px] ${
                  !unlocked
                    ? 'bg-slate-950/60 border-slate-800/80 text-slate-600 cursor-not-allowed'
                    : active
                      ? 'bg-slate-900/95 border-amber-400 text-white shadow-lg'
                      : 'bg-slate-950/80 border-slate-700/80 text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-[11px] font-bold mb-1">
                  <span className={active ? 'text-amber-300' : ''}>Глава {ch.index + 1}</span>
                  {unlocked ? (
                    <span className="font-mono-num text-amber-300 flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {starsInCh}/{ch.totalStars}
                    </span>
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
                <div className="text-[11px] leading-tight line-clamp-2 opacity-90">
                  {ch.title.replace(/^Глава \d+:\s*/, '')}
                </div>
              </button>
            );
          })}
        </div>

        {/* Primary & Secondary CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onStart(selectedChapter)}
            className="h-12 px-6 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-slate-950 font-bold text-sm sm:text-base flex items-center gap-2.5 shadow-xl transition-all whitespace-nowrap"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            Начать приключение
          </button>

          <button
            type="button"
            onClick={onOpenAchievements}
            className="h-12 px-5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-600 text-slate-100 font-semibold text-sm flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            Достижения ({summary.unlockedCount}/{summary.totalCount})
          </button>
        </div>
      </div>

      {/* Single Flat Control Hint Line */}
      <div
        className="relative z-10 px-5 sm:px-10 py-3.5 text-xs text-slate-400"
        style={{ paddingBottom: 'calc(14px + var(--sab))' }}
      >
        <span>Стик / WASD — Движение</span>
        <span className="mx-2 text-slate-600" aria-hidden="true">·</span>
        <span>Меч / Пробел — Атака и бросок</span>
        <span className="mx-2 text-slate-600" aria-hidden="true">·</span>
        <span>Shift — Рывок</span>
        <span className="mx-2 text-slate-600" aria-hidden="true">·</span>
        <span>E — Взять предмет</span>
      </div>
    </div>
  );
};
