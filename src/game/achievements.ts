import type { AchievementDef, AchievementProgress } from './types';
import { sound, triggerHaptic } from './audio';

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_blood',
    title: 'Первый клинок',
    description: 'Победите своего первого врага в приключении.',
    points: 10,
    target: 1,
    icon: 'sword',
  },
  {
    id: 'pot_smasher',
    title: 'Гроза кувшинов',
    description: 'Разбейте 15 глиняных кувшинов в поисках сокровищ.',
    points: 15,
    target: 15,
    icon: 'pot',
  },
  {
    id: 'puzzle_solver',
    title: 'Механик руин',
    description: 'Активируйте нажимную плиту с помощью рунного блока.',
    points: 15,
    target: 1,
    icon: 'puzzle',
  },
  {
    id: 'bomb_demolition',
    title: 'Подрывник',
    description: 'Взорвите треснувшую стену цветком-бомбой.',
    points: 20,
    target: 1,
    icon: 'bomb',
  },
  {
    id: 'keeper_of_flame',
    title: 'Хранитель пламени',
    description: 'Зажгите все 3 древние жаровни во второй главе.',
    points: 25,
    target: 3,
    icon: 'flame',
  },
  {
    id: 'star_seeker',
    title: 'Искатель звёзд',
    description: 'Найдите первый тайный Звёздный осколок.',
    points: 15,
    target: 1,
    icon: 'star',
  },
  {
    id: 'constellation',
    title: 'Мастер созвездий',
    description: 'Соберите все 6 Звёздных осколков во всех главах.',
    points: 50,
    target: 6,
    icon: 'constellation',
  },
  {
    id: 'phantom_dash',
    title: 'Неуловимая тень',
    description: 'Уклонитесь рывком от вражеских атак 5 раз.',
    points: 20,
    target: 5,
    icon: 'dash',
  },
  {
    id: 'combo_master',
    title: 'Танец меча',
    description: 'Нанесите серию из 10 ударов без получения урона.',
    points: 25,
    target: 10,
    icon: 'combo',
  },
  {
    id: 'treasure_hunter',
    title: 'Искатель кладов',
    description: 'Откройте 4 сундука с сокровищами.',
    points: 20,
    target: 4,
    icon: 'chest',
  },
  {
    id: 'warden_slayer',
    title: 'Покоритель Стража',
    description: 'Победите древнего Каменного Стража в Тронном зале.',
    points: 50,
    target: 1,
    icon: 'boss',
  },
  {
    id: 'unbreakable',
    title: 'Несокрушимый рыцарь',
    description: 'Пройдите любую главу без единого ранения.',
    points: 40,
    target: 1,
    icon: 'shield',
  },
];

const STORAGE_KEY = 'kc_achievements_v1';

// Optional bridge for native Android Play Games Services / Capacitor plugins
declare global {
  interface Window {
    AndroidAchievements?: {
      unlockAchievement?: (id: string, title: string) => void;
    };
  }
}

export type AchievementListener = (unlockedDef: AchievementDef) => void;

class AchievementService {
  private map: Record<string, AchievementProgress> = {};
  private listeners: Set<AchievementListener> = new Set();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.map = JSON.parse(raw);
      }
    } catch {
      this.map = {};
    }
    for (const def of ACHIEVEMENTS) {
      if (!this.map[def.id]) {
        this.map[def.id] = { unlocked: false, progress: 0 };
      }
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.map));
    } catch {
      // ignore
    }
  }

  public subscribe(fn: AchievementListener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  public getAll(): Array<{ def: AchievementDef; state: AchievementProgress }> {
    return ACHIEVEMENTS.map((def) => ({
      def,
      state: this.map[def.id] || { unlocked: false, progress: 0 },
    }));
  }

  public getSummary(): { unlockedCount: number; totalCount: number; points: number; maxPoints: number } {
    let unlockedCount = 0;
    let points = 0;
    let maxPoints = 0;
    for (const def of ACHIEVEMENTS) {
      maxPoints += def.points;
      const st = this.map[def.id];
      if (st?.unlocked) {
        unlockedCount++;
        points += def.points;
      }
    }
    return { unlockedCount, totalCount: ACHIEVEMENTS.length, points, maxPoints };
  }

  public setProgress(id: string, value: number, hapticsEnabled = true) {
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def) return;
    const current = this.map[id] || { unlocked: false, progress: 0 };
    if (current.unlocked) return;

    const clamped = Math.min(def.target, Math.max(current.progress, value));
    current.progress = clamped;
    if (clamped >= def.target && !current.unlocked) {
      current.unlocked = true;
      current.unlockedAt = Date.now();
      this.map[id] = current;
      this.save();
      this.notifyUnlock(def, hapticsEnabled);
    } else {
      this.map[id] = current;
      this.save();
    }
  }

  public increment(id: string, delta = 1, hapticsEnabled = true) {
    const current = this.map[id]?.progress ?? 0;
    this.setProgress(id, current + delta, hapticsEnabled);
  }

  private notifyUnlock(def: AchievementDef, hapticsEnabled: boolean) {
    sound.achievement();
    triggerHaptic(35, hapticsEnabled);
    try {
      window.AndroidAchievements?.unlockAchievement?.(def.id, def.title);
    } catch {
      // ignore
    }
    for (const fn of this.listeners) {
      fn(def);
    }
  }

  public resetAll() {
    this.map = {};
    for (const def of ACHIEVEMENTS) {
      this.map[def.id] = { unlocked: false, progress: 0 };
    }
    this.save();
  }
}

export const achievementService = new AchievementService();
