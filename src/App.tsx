import { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine, loadSaveProgress } from './game/engine';
import { achievementService } from './game/achievements';
import { sound } from './game/audio';
import type { AchievementDef, HudSnapshot, SaveProgress } from './game/types';
import { GameHUD } from './components/GameHUD';
import { TouchControls } from './components/TouchControls';
import { TitleScreen } from './components/TitleScreen';
import { GameModals } from './components/GameModals';
import { AchievementsModal } from './components/AchievementsModal';
import { AchievementToast } from './components/AchievementToast';

const INITIAL_HUD: HudSnapshot = {
  screen: 'TITLE',
  chapterIndex: 0,
  chapterTitle: 'Глава 1: Лес Пробуждения',
  hp: 6,
  maxHp: 6,
  gems: 0,
  starsCollected: 0,
  starsTotal: 2,
  enemiesRemaining: 4,
  carryingKind: null,
  nearbyActionLabel: null,
  dashCooldownRatio: 0,
  dialogText: null,
  bossName: null,
  bossHp: 0,
  bossMaxHp: 1,
  bossStunned: false,
  chapterTimeSec: 0,
  streakHits: 0,
  chapterStarsFound: [],
};

function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [save, setSave] = useState<SaveProgress>(() => loadSaveProgress());
  const [selectedChapter, setSelectedChapter] = useState<number>(() => loadSaveProgress().highestUnlockedChapter);
  const [muted, setMuted] = useState<boolean>(() => sound.isMuted());
  const [touchEnabled, setTouchEnabled] = useState<boolean>(() => detectTouchDevice());
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true);
  const [achievementsOpen, setAchievementsOpen] = useState<boolean>(false);
  const [activeToast, setActiveToast] = useState<AchievementDef | null>(null);
  const toastQueueRef = useRef<AchievementDef[]>([]);
  const toastTimerRef = useRef<number | null>(null);

  const showNextToast = useCallback(() => {
    if (toastTimerRef.current !== null) return;
    const next = toastQueueRef.current.shift();
    if (!next) {
      setActiveToast(null);
      return;
    }
    setActiveToast(next);
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setActiveToast(null);
      showNextToast();
    }, 3200);
  }, []);

  useEffect(() => {
    const unsub = achievementService.subscribe((def) => {
      toastQueueRef.current.push(def);
      showNextToast();
    });
    return () => {
      unsub();
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [showNextToast]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;

    const handleResize = () => {
      engine.resizeViewport(window.innerWidth, window.innerHeight);
    };
    handleResize();
    engine.startLoop();

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      engine.handleKeyDown(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      engine.handleKeyUp(e.code);
    };
    const onBlur = () => {
      engine.clearInputs();
    };
    const onTouchDetect = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        setTouchEnabled(true);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pointerdown', onTouchDetect, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pointerdown', onTouchDetect);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleStartChapter = useCallback((chapterIdx: number) => {
    sound.unlock();
    engineRef.current?.loadChapter(chapterIdx, 'PLAYING');
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = sound.toggleMute();
    setMuted(nextMuted);
    if (!nextMuted && engineRef.current?.getScreen() === 'PLAYING') {
      sound.startMusic();
    }
  }, []);

  const handleToggleHaptics = useCallback(() => {
    setHapticsEnabled((prev) => {
      const next = !prev;
      engineRef.current?.setHapticsEnabled(next);
      return next;
    });
  }, []);

  const handleExitTitle = useCallback(() => {
    const latest = loadSaveProgress();
    setSave(latest);
    setSelectedChapter(Math.min(2, latest.highestUnlockedChapter));
    engineRef.current?.setScreen('TITLE');
  }, []);

  const handleNextChapter = useCallback(() => {
    const latest = loadSaveProgress();
    setSave(latest);
    const nextIdx = Math.min(2, hud.chapterIndex + 1);
    setSelectedChapter(nextIdx);
    engineRef.current?.loadChapter(nextIdx, 'PLAYING');
  }, [hud.chapterIndex]);

  const handleRestartChapter = useCallback(() => {
    engineRef.current?.loadChapter(hud.chapterIndex, 'PLAYING');
  }, [hud.chapterIndex]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0b131e] select-none">
      {/* Isolated Pixel-Art Game Viewport */}
      <div className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="w-full h-full block pixelated touch-surface"
        />
      </div>

      {/* Title Screen */}
      {hud.screen === 'TITLE' && (
        <TitleScreen
          save={save}
          selectedChapter={selectedChapter}
          onSelectChapter={setSelectedChapter}
          onStart={handleStartChapter}
          onOpenAchievements={() => setAchievementsOpen(true)}
          muted={muted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Active Gameplay HUD & Android Touch Controls */}
      {hud.screen === 'PLAYING' && (
        <>
          <GameHUD
            hud={hud}
            muted={muted}
            onToggleMute={handleToggleMute}
            onPause={() => engineRef.current?.setScreen('PAUSED')}
            onDismissDialog={() => engineRef.current?.dismissDialog()}
          />
          <TouchControls
            visible={touchEnabled && !hud.dialogText}
            carryingKind={hud.carryingKind}
            nearbyActionLabel={hud.nearbyActionLabel}
            dashCooldownRatio={hud.dashCooldownRatio}
            onMove={(x, y) => engineRef.current?.setTouchMove(x, y)}
            onAttack={() => engineRef.current?.triggerTouchAttack()}
            onDash={() => engineRef.current?.triggerTouchDash()}
            onInteract={() => engineRef.current?.triggerTouchInteract()}
          />
        </>
      )}

      {/* Pause / Chapter Clear / Victory / Game Over Modals */}
      <GameModals
        hud={hud}
        muted={muted}
        touchEnabled={touchEnabled}
        hapticsEnabled={hapticsEnabled}
        onResume={() => engineRef.current?.setScreen('PLAYING')}
        onRestart={handleRestartChapter}
        onNextChapter={handleNextChapter}
        onExitTitle={handleExitTitle}
        onToggleMute={handleToggleMute}
        onToggleTouch={() => setTouchEnabled((v) => !v)}
        onToggleHaptics={handleToggleHaptics}
        onOpenAchievements={() => setAchievementsOpen(true)}
      />

      {/* Achievements Gallery Modal */}
      <AchievementsModal
        open={achievementsOpen}
        onClose={() => setAchievementsOpen(false)}
      />

      {/* Celebratory Achievement Unlock Toast */}
      <AchievementToast achievement={activeToast} />
    </main>
  );
}
