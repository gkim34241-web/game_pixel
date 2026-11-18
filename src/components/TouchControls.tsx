import React, { useRef, useState } from 'react';
import { Flame, Hand, PackageOpen, Shield, Sparkles, Sword, Wind } from 'lucide-react';
import type { PropKind } from '../game/types';

interface TouchControlsProps {
  visible: boolean;
  carryingKind: PropKind | null;
  nearbyActionLabel: string | null;
  dashCooldownRatio: number;
  onMove: (x: number, y: number) => void;
  onAttack: () => void;
  onDash: () => void;
  onInteract: () => void;
}

const JOYSTICK_RADIUS = 44;

export const TouchControls: React.FC<TouchControlsProps> = ({
  visible,
  carryingKind,
  nearbyActionLabel,
  dashCooldownRatio,
  onMove,
  onAttack,
  onDash,
  onInteract,
}) => {
  const [joyActive, setJoyActive] = useState(false);
  const [joyBase, setJoyBase] = useState({ x: 84, y: 0 });
  const [joyKnob, setJoyKnob] = useState({ x: 0, y: 0 });
  const joyPointerId = useRef<number | null>(null);
  const zoneRef = useRef<HTMLDivElement | null>(null);

  if (!visible) return null;

  const handleJoyDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== null) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    joyPointerId.current = e.pointerId;

    const rect = e.currentTarget.getBoundingClientRect();
    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;
    setJoyBase({ x: lx, y: ly });
    setJoyKnob({ x: 0, y: 0 });
    setJoyActive(true);
    onMove(0, 0);
  };

  const handleJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== e.pointerId) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;

    let dx = lx - joyBase.x;
    let dy = ly - joyBase.y;
    const dist = Math.hypot(dx, dy);
    if (dist > JOYSTICK_RADIUS) {
      dx = (dx / dist) * JOYSTICK_RADIUS;
      dy = (dy / dist) * JOYSTICK_RADIUS;
    }

    setJoyKnob({ x: dx, y: dy });
    const nx = dx / JOYSTICK_RADIUS;
    const ny = dy / JOYSTICK_RADIUS;
    const mag = Math.hypot(nx, ny);
    if (mag < 0.14) {
      onMove(0, 0);
    } else {
      onMove(nx, ny);
    }
  };

  const handleJoyUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== e.pointerId) return;
    e.preventDefault();
    joyPointerId.current = null;
    setJoyActive(false);
    setJoyKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  const isCarrying = carryingKind !== null;
  const canInteract = nearbyActionLabel !== null && !isCarrying;

  const renderCarryIcon = () => {
    if (carryingKind === 'bomb_flower') return <Sparkles className="w-7 h-7 text-amber-200" />;
    if (carryingKind === 'torch_stand') return <Flame className="w-7 h-7 text-orange-200" />;
    if (carryingKind === 'pot') return <PackageOpen className="w-7 h-7 text-amber-100" />;
    return <Sword className="w-8 h-8 text-sky-100" />;
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-20 select-none touch-surface">
      {/* Left Half: Floating Virtual Joystick Zone */}
      <div
        ref={zoneRef}
        onPointerDown={handleJoyDown}
        onPointerMove={handleJoyMove}
        onPointerUp={handleJoyUp}
        onPointerCancel={handleJoyUp}
        className="absolute left-0 top-14 bottom-0 w-[46%] pointer-events-auto touch-surface"
        aria-label="Виртуальный джойстик движения"
      >
        {/* Idle hint ring at bottom-left */}
        {!joyActive && (
          <div
            className="absolute bottom-7 left-7 w-24 h-24 rounded-full border-2 border-white/20 bg-slate-950/25 flex items-center justify-center"
            style={{
              marginLeft: 'var(--sal)',
              marginBottom: 'var(--sab)',
            }}
          >
            <div className="w-10 h-10 rounded-full border border-white/35 bg-white/15" />
          </div>
        )}

        {/* Active dynamic joystick anchored under thumb */}
        {joyActive && (
          <div
            className="absolute w-24 h-24 -ml-12 -mt-12 rounded-full border-2 border-sky-300/55 bg-slate-950/45 flex items-center justify-center"
            style={{ left: joyBase.x, top: joyBase.y }}
          >
            <div
              className="w-11 h-11 rounded-full border-2 border-white/80 bg-sky-400/50 shadow-lg"
              style={{
                transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`,
              }}
            />
          </div>
        )}
      </div>

      {/* Right Bottom: Ergonomic Action Cluster */}
      <div
        className="absolute right-5 bottom-5 flex items-end gap-3.5 pointer-events-auto touch-surface"
        style={{
          marginRight: 'var(--sar)',
          marginBottom: 'var(--sab)',
        }}
      >
        {/* Dash Button */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDash();
          }}
          className="relative w-14 h-14 rounded-full border-2 border-sky-300/60 bg-slate-900/75 active:scale-95 transition-transform flex flex-col items-center justify-center text-sky-100 shadow-lg touch-surface"
          aria-label="Рывок"
        >
          {dashCooldownRatio > 0 && (
            <div
              className="absolute inset-0 rounded-full bg-slate-950/65"
              style={{
                clipPath: `inset(${Math.round((1 - dashCooldownRatio) * 100)}% 0 0 0)`,
              }}
            />
          )}
          <Wind className="w-5 h-5 relative z-10" />
          <span className="text-[9px] font-semibold tracking-tight relative z-10 mt-0.5">
            Рывок
          </span>
        </button>

        {/* Vertical stack: Interact (top) + Primary Sword/Throw (bottom) */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onInteract();
            }}
            className={`w-14 h-14 rounded-full border-2 active:scale-95 transition-all flex flex-col items-center justify-center shadow-lg touch-surface ${
              canInteract
                ? 'border-amber-300 bg-amber-600/85 text-amber-50 scale-105'
                : isCarrying
                  ? 'border-orange-300 bg-orange-600/80 text-white'
                  : 'border-white/30 bg-slate-900/65 text-slate-300'
            }`}
            aria-label={nearbyActionLabel || 'Действие'}
          >
            {isCarrying ? <Shield className="w-5 h-5" /> : <Hand className="w-5 h-5" />}
            <span className="text-[9px] font-semibold leading-none mt-0.5 max-w-[48px] truncate">
              {isCarrying ? 'Бросить' : nearbyActionLabel ? 'Взять' : 'Действ.'}
            </span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAttack();
            }}
            className={`w-[72px] h-[72px] rounded-full border-2 active:scale-90 transition-transform flex flex-col items-center justify-center shadow-xl touch-surface ${
              isCarrying
                ? 'border-amber-300 bg-amber-500/85 text-slate-950'
                : 'border-sky-300/80 bg-sky-600/80 text-white'
            }`}
            aria-label={isCarrying ? 'Бросить предмет' : 'Удар мечом'}
          >
            {renderCarryIcon()}
            <span className="text-[10px] font-bold tracking-tight mt-0.5">
              {isCarrying ? 'Бросить' : 'Меч'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
