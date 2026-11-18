import React, { useState } from 'react';
import { CheckCircle2, Lock, RotateCcw, Trophy, X } from 'lucide-react';
import { achievementService } from '../game/achievements';
import { AchievementIcon } from './AchievementToast';

interface AchievementsModalProps {
  open: boolean;
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ open, onClose }) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [refreshTick, setRefreshTick] = useState(0);

  if (!open) return null;

  const items = achievementService.getAll();
  const summary = achievementService.getSummary();

  const filtered = items.filter(({ state }) => {
    if (filter === 'unlocked') return state.unlocked;
    if (filter === 'locked') return !state.unlocked;
    return true;
  });

  // Keep refreshTick referenced so reset updates immediately
  void refreshTick;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[88vh] bg-slate-900 border border-slate-700 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">Достижения</h2>
              <div className="text-xs text-slate-400 font-mono-num">
                Открыто {summary.unlockedCount} из {summary.totalCount} · {summary.points}/{summary.maxPoints} очков
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-lg border border-slate-700 hover:bg-slate-800 flex items-center justify-center text-slate-300 transition-colors shrink-0"
            aria-label="Закрыть достижения"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Все
            </button>
            <button
              type="button"
              onClick={() => setFilter('unlocked')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filter === 'unlocked' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Открытые
            </button>
            <button
              type="button"
              onClick={() => setFilter('locked')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filter === 'locked' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              В процессе
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              achievementService.resetAll();
              setRefreshTick((t) => t + 1);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-rose-300 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Сбросить
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-400">
              В этой категории пока нет достижений.
            </div>
          ) : (
            filtered.map(({ def, state }) => {
              const pct = Math.min(100, Math.round((state.progress / def.target) * 100));
              return (
                <div
                  key={def.id}
                  className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-colors ${
                    state.unlocked
                      ? 'bg-slate-800/70 border-amber-400/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                      state.unlocked
                        ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    <AchievementIcon icon={def.icon} className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`text-sm font-semibold truncate ${state.unlocked ? 'text-white' : 'text-slate-300'}`}>
                        {def.title}
                      </h3>
                      <span className="text-xs font-mono-num text-amber-300 shrink-0">
                        +{def.points}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-snug">{def.description}</p>
                    <div className="flex items-center gap-2.5 mt-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-200 ${
                            state.unlocked ? 'bg-amber-400' : 'bg-sky-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono-num text-slate-400 shrink-0">
                        {state.progress}/{def.target}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {state.unlocked ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
