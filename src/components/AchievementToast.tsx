import React from 'react';
import { Award, Bomb, Compass, Flame, PackageOpen, Shield, Skull, Sparkles, Star, Sword, Trophy, Wind } from 'lucide-react';
import type { AchievementDef } from '../game/types';

export function AchievementIcon({ icon, className }: { icon: AchievementDef['icon']; className?: string }) {
  switch (icon) {
    case 'sword': return <Sword className={className} />;
    case 'pot': return <PackageOpen className={className} />;
    case 'puzzle': return <Compass className={className} />;
    case 'bomb': return <Bomb className={className} />;
    case 'flame': return <Flame className={className} />;
    case 'star': return <Star className={className} />;
    case 'constellation': return <Sparkles className={className} />;
    case 'dash': return <Wind className={className} />;
    case 'combo': return <Award className={className} />;
    case 'chest': return <Trophy className={className} />;
    case 'boss': return <Skull className={className} />;
    case 'shield': return <Shield className={className} />;
  }
}

export const AchievementToast: React.FC<{ achievement: AchievementDef | null }> = ({ achievement }) => {
  if (!achievement) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200"
      style={{ marginTop: 'var(--sat)' }}
    >
      <div className="flex items-center gap-3 bg-slate-950/95 border-2 border-amber-400 rounded-xl px-4 py-2.5 shadow-2xl min-w-[260px] max-w-[90vw]">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shrink-0">
          <AchievementIcon icon={achievement.icon} className="w-5 h-5 text-amber-300" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold text-amber-300 tracking-wide">
            Достижение открыто · +{achievement.points} очков
          </div>
          <div className="text-sm font-bold text-white truncate">{achievement.title}</div>
        </div>
      </div>
    </div>
  );
};
