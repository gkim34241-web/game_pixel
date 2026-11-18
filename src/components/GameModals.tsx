import React from 'react';
import { Crown, Gamepad2, Home, Play, RotateCcw, Smartphone, Star, Trophy, Volume2, VolumeX } from 'lucide-react';
import type { HudSnapshot } from '../game/types';

interface GameModalsProps {
  hud: HudSnapshot;
  muted: boolean;
  touchEnabled: boolean;
  hapticsEnabled: boolean;
  onResume: () => void;
  onRestart: () => void;
  onNextChapter: () => void;
  onExitTitle: () => void;
  onToggleMute: () => void;
  onToggleTouch: () => void;
  onToggleHaptics: () => void;
  onOpenAchievements: () => void;
}

export const GameModals: React.FC<GameModalsProps> = ({
  hud,
  muted,
  touchEnabled,
  hapticsEnabled,
  onResume,
  onRestart,
  onNextChapter,
  onExitTitle,
  onToggleMute,
  onToggleTouch,
  onToggleHaptics,
  onOpenAchievements,
}) => {
  if (hud.screen === 'PLAYING' || hud.screen === 'TITLE') return null;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (hud.screen === 'PAUSED') {
    return (
      <div className="fixed inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">
          <h2 className="text-lg font-bold text-white mb-1">Пауза</h2>
          <p className="text-xs text-slate-400 mb-4">{hud.chapterTitle}</p>

          <div className="space-y-2.5 mb-5">
            <button
              type="button"
              onClick={onResume}
              className="w-full h-11 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              Продолжить
            </button>

            <button
              type="button"
              onClick={onOpenAchievements}
              className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Trophy className="w-4 h-4 text-amber-300" />
              Достижения
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onToggleMute}
                className="h-11 px-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-600 text-xs text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                {muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-sky-300" />}
                {muted ? 'Звук: Выкл' : 'Звук: Вкл'}
              </button>

              <button
                type="button"
                onClick={onToggleTouch}
                className="h-11 px-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-600 text-xs text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Gamepad2 className={`w-4 h-4 ${touchEnabled ? 'text-emerald-400' : 'text-slate-400'}`} />
                {touchEnabled ? 'Стик: Вкл' : 'Стик: Выкл'}
              </button>
            </div>

            <button
              type="button"
              onClick={onToggleHaptics}
              className="w-full h-10 px-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-600 text-xs text-slate-300 flex items-center justify-center gap-2 transition-colors"
            >
              <Smartphone className={`w-4 h-4 ${hapticsEnabled ? 'text-sky-300' : 'text-slate-500'}`} />
              Виброотклик: {hapticsEnabled ? 'Включён' : 'Выключен'}
            </button>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onRestart}
              className="flex-1 h-10 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Заново
            </button>
            <button
              type="button"
              onClick={onExitTitle}
              className="flex-1 h-10 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              В меню
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hud.screen === 'GAME_OVER') {
    return (
      <div className="fixed inset-0 z-40 bg-slate-950/85 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-rose-500/40 rounded-2xl p-6 text-center shadow-2xl">
          <h2 className="text-xl font-bold text-rose-300 mb-1.5">Рыцарь пал</h2>
          <p className="text-sm text-slate-400 mb-5">
            Совет: используйте рывок (Shift / Рывок), чтобы уклоняться от атак!
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onRestart}
              className="w-full h-12 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Попробовать снова
            </button>
            <button
              type="button"
              onClick={onExitTitle}
              className="w-full h-11 rounded-xl border border-slate-700 hover:bg-slate-800 text-sm text-slate-300 flex items-center justify-center gap-2 transition-colors"
            >
              <Home className="w-4 h-4" />
              Главное меню
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isFinalVictory = hud.screen === 'VICTORY';

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/85 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-amber-400/50 rounded-2xl p-6 text-center shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center mx-auto mb-3">
          <Crown className="w-6 h-6 text-amber-300" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">
          {isFinalVictory ? 'Хроники пройдены!' : 'Глава пройдена!'}
        </h2>
        <p className="text-xs text-slate-400 mb-5">{hud.chapterTitle}</p>

        <div className="grid grid-cols-3 gap-2.5 bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 mb-5">
          <div>
            <div className="text-[11px] text-slate-400">Звёзды</div>
            <div className="text-base font-mono-num font-bold text-amber-300 flex items-center justify-center gap-1 mt-0.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              {hud.starsCollected}/{hud.starsTotal}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Самоцветы</div>
            <div className="text-base font-mono-num font-bold text-violet-300 mt-0.5">{hud.gems}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Время</div>
            <div className="text-base font-mono-num font-bold text-sky-300 mt-0.5">
              {formatTime(hud.chapterTimeSec)}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {!isFinalVictory ? (
            <button
              type="button"
              onClick={onNextChapter}
              className="w-full h-12 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              Следующая глава
            </button>
          ) : (
            <button
              type="button"
              onClick={onRestart}
              className="w-full h-12 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Играть снова
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAchievements}
              className="flex-1 h-11 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trophy className="w-4 h-4 text-amber-300" />
              Достижения
            </button>
            <button
              type="button"
              onClick={onExitTitle}
              className="flex-1 h-11 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Home className="w-4 h-4" />
              В меню
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
