import {
  TILE_SIZE,
  type Direction,
  type Enemy,
  type FloatingText,
  type GameScreenState,
  type HudSnapshot,
  type InputState,
  type Particle,
  type PlayerState,
  type Projectile,
  type SaveProgress,
  type TileType,
  type WorldProp,
} from './types';
import { buildLevel, type LevelData } from './levels';
import { drawEnemy, drawPlayer, drawProjectile, drawProp, drawTile } from './sprites';
import { sound, triggerHaptic } from './audio';
import { achievementService } from './achievements';

const SAVE_KEY = 'kc_save_v1';

const DEFAULT_SAVE: SaveProgress = {
  highestUnlockedChapter: 0,
  collectedStarIds: [],
  bestGems: 0,
};

export function loadSaveProgress(): SaveProgress {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<SaveProgress>;
    return {
      highestUnlockedChapter: parsed.highestUnlockedChapter ?? 0,
      collectedStarIds: Array.isArray(parsed.collectedStarIds) ? parsed.collectedStarIds : [],
      bestGems: parsed.bestGems ?? 0,
    };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function writeSaveProgress(save: SaveProgress) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // ignore
  }
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onHudUpdate: (hud: HudSnapshot) => void;

  private rafId: number | null = null;
  private lastTime = 0;
  private elapsedTime = 0;
  private hitstopTimer = 0;
  private shakeTimer = 0;
  private shakeIntensity = 0;
  private hudSyncAccum = 0;

  private screen: GameScreenState = 'TITLE';
  private chapterIndex = 0;
  private level!: LevelData;
  private player!: PlayerState;
  private props: WorldProp[] = [];
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private bombSpawns: Array<{ id: string; x: number; y: number; timer: number }> = [];

  private camX = 0;
  private camY = 0;
  private viewW = 384;
  private viewH = 216;

  private dialogText: string | null = null;
  private chapterTimeSec = 0;
  private hapticsEnabled = true;
  private save: SaveProgress;

  // Combined input state from keyboard & touch
  private heldKeys: Set<string> = new Set();
  private touchMoveX = 0;
  private touchMoveY = 0;
  private pendingAttack = false;
  private pendingDash = false;
  private pendingInteract = false;
  private dodgeCountedIds: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement, onHudUpdate: (hud: HudSnapshot) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not initialize 2D canvas context');
    this.ctx = ctx;
    this.onHudUpdate = onHudUpdate;
    this.save = loadSaveProgress();
    this.loadChapter(0, 'TITLE');
  }

  public startLoop() {
    if (this.rafId !== null) return;
    this.lastTime = performance.now();
    const step = (now: number) => {
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  public destroy() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    sound.stopMusic();
  }

  public resizeViewport(cssWidth: number, cssHeight: number) {
    if (cssWidth <= 0 || cssHeight <= 0) return;
    const aspect = cssWidth / cssHeight;
    // Target crisp ~216px vertical pixel-art resolution
    const targetH = 216;
    const targetW = Math.max(256, Math.min(480, Math.round(targetH * aspect)));
    this.viewW = targetW;
    this.viewH = targetH;
    this.canvas.width = targetW;
    this.canvas.height = targetH;
    this.ctx.imageSmoothingEnabled = false;
  }

  public setHapticsEnabled(enabled: boolean) {
    this.hapticsEnabled = enabled;
  }

  public getScreen(): GameScreenState {
    return this.screen;
  }

  public loadChapter(index: number, nextScreen: GameScreenState = 'PLAYING') {
    this.chapterIndex = index;
    this.level = buildLevel(index);
    this.props = this.level.props.map((p) => ({ ...p }));
    this.enemies = this.level.enemies.map((e) => ({ ...e }));
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.dialogText = null;
    this.chapterTimeSec = 0;
    this.dodgeCountedIds.clear();

    // Mark already collected star pieces in current save? Let's allow re-collecting for gems or show them!
    // Actually keeping them collectible in chapter replay is fun and tracks chapterStarsFound cleanly.
    this.bombSpawns = this.props
      .filter((p) => p.kind === 'bomb_flower')
      .map((p) => ({ id: p.id, x: p.x, y: p.y, timer: 0 }));

    this.player = {
      x: this.level.playerStart.x + 2,
      y: this.level.playerStart.y + 2,
      w: 12,
      h: 12,
      vx: 0,
      vy: 0,
      dir: 'down',
      hp: 6,
      maxHp: 6,
      gems: 0,
      comboStep: 0,
      comboTimer: 0,
      attackTimer: 0,
      attackCooldown: 0,
      dashTimer: 0,
      dashCooldown: 0,
      dashDirX: 0,
      dashDirY: 1,
      invulnTimer: 0,
      hitFlash: 0,
      animTime: 0,
      carryingId: null,
      streakHits: 0,
      tookDamageInChapter: false,
    };

    this.screen = nextScreen;
    this.centerCameraImmediate();
    this.syncGates();
    this.emitHud();

    if (nextScreen === 'PLAYING') {
      sound.unlock();
      sound.startMusic();
    } else {
      sound.stopMusic();
    }
  }

  public setScreen(screen: GameScreenState) {
    this.screen = screen;
    if (screen === 'PLAYING') {
      sound.unlock();
      sound.startMusic();
    } else {
      sound.stopMusic();
    }
    this.emitHud();
  }

  public handleKeyDown(code: string) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
      // handled cleanly
    }
    this.heldKeys.add(code);
    if (this.screen === 'PLAYING') {
      if (code === 'Space' || code === 'KeyJ') this.pendingAttack = true;
      if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyK') this.pendingDash = true;
      if (code === 'KeyE' || code === 'KeyF') this.pendingInteract = true;
      if (code === 'Escape' || code === 'KeyP') this.setScreen('PAUSED');
    } else if (this.screen === 'PAUSED') {
      if (code === 'Escape' || code === 'KeyP') this.setScreen('PLAYING');
    }
  }

  public handleKeyUp(code: string) {
    this.heldKeys.delete(code);
  }

  public clearInputs() {
    this.heldKeys.clear();
    this.touchMoveX = 0;
    this.touchMoveY = 0;
  }

  public setTouchMove(x: number, y: number) {
    this.touchMoveX = x;
    this.touchMoveY = y;
  }

  public triggerTouchAttack() {
    if (this.screen !== 'PLAYING') return;
    sound.unlock();
    this.pendingAttack = true;
  }

  public triggerTouchDash() {
    if (this.screen !== 'PLAYING') return;
    sound.unlock();
    this.pendingDash = true;
  }

  public triggerTouchInteract() {
    if (this.screen !== 'PLAYING') return;
    sound.unlock();
    this.pendingInteract = true;
  }

  public dismissDialog() {
    this.dialogText = null;
    this.emitHud();
  }

  private getInput(): InputState {
    let kx = 0;
    let ky = 0;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) kx -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) kx += 1;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) ky -= 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) ky += 1;

    if (kx !== 0 && ky !== 0) {
      const inv = 1 / Math.SQRT2;
      kx *= inv;
      ky *= inv;
    }

    const moveX = Math.abs(this.touchMoveX) > 0.08 ? this.touchMoveX : kx;
    const moveY = Math.abs(this.touchMoveY) > 0.08 ? this.touchMoveY : ky;

    const input: InputState = {
      moveX,
      moveY,
      attackJustPressed: this.pendingAttack,
      dashJustPressed: this.pendingDash,
      interactJustPressed: this.pendingInteract,
    };

    this.pendingAttack = false;
    this.pendingDash = false;
    this.pendingInteract = false;
    return input;
  }

  private update(dt: number) {
    this.elapsedTime += dt;

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }

    if (this.screen !== 'PLAYING') return;

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.updateParticles(dt * 0.25);
      return;
    }

    this.chapterTimeSec += dt;
    const input = this.getInput();

    // Dismiss dialog automatically if player moves away or presses action
    if (this.dialogText && (input.attackJustPressed || input.interactJustPressed || input.dashJustPressed)) {
      this.dialogText = null;
      this.emitHud();
      return;
    }

    this.updatePlayer(dt, input);
    this.updateProps(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
    this.updateCamera(dt);

    this.hudSyncAccum += dt;
    if (this.hudSyncAccum >= 0.08) {
      this.hudSyncAccum = 0;
      this.emitHud();
    }
  }

  private updatePlayer(dt: number, input: InputState) {
    const p = this.player;
    if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
    if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - dt);
    if (p.attackTimer > 0) p.attackTimer = Math.max(0, p.attackTimer - dt);
    if (p.attackCooldown > 0) p.attackCooldown = Math.max(0, p.attackCooldown - dt);
    if (p.dashCooldown > 0) p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    if (p.comboTimer > 0) {
      p.comboTimer -= dt;
      if (p.comboTimer <= 0) p.comboStep = 0;
    }

    // Update facing direction
    if (Math.abs(input.moveX) > 0.1 || Math.abs(input.moveY) > 0.1) {
      if (Math.abs(input.moveX) > Math.abs(input.moveY)) {
        p.dir = input.moveX > 0 ? 'right' : 'left';
      } else {
        p.dir = input.moveY > 0 ? 'down' : 'up';
      }
    }

    // Dash input
    if (input.dashJustPressed && p.dashCooldown <= 0 && p.dashTimer <= 0) {
      let dx = input.moveX;
      let dy = input.moveY;
      if (Math.hypot(dx, dy) < 0.15) {
        const vec = this.dirVec(p.dir);
        dx = vec.x;
        dy = vec.y;
      } else {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;
      }
      p.dashDirX = dx;
      p.dashDirY = dy;
      p.dashTimer = 0.17;
      p.dashCooldown = 0.62;
      p.invulnTimer = Math.max(p.invulnTimer, 0.24);
      sound.dash();
      triggerHaptic(12, this.hapticsEnabled);
      this.spawnBurst(p.x + p.w / 2, p.y + p.h, 6, '#cbd5e1', 45);
    }

    // Interact / Lift input
    if (input.interactJustPressed) {
      if (p.carryingId) {
        this.throwCarriedObject();
      } else {
        this.tryInteractOrLift();
      }
    }

    // Attack input (throws carried item if holding one!)
    if (input.attackJustPressed) {
      if (p.carryingId) {
        this.throwCarriedObject();
      } else if (p.attackCooldown <= 0 && p.dashTimer <= 0) {
        this.performSwordAttack();
      }
    }

    // Movement
    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.vx = p.dashDirX * 195;
      p.vy = p.dashDirY * 195;
    } else {
      const speed = p.attackTimer > 0 ? 35 : 88;
      p.vx = input.moveX * speed;
      p.vy = input.moveY * speed;
    }

    if (Math.hypot(p.vx, p.vy) > 5) {
      p.animTime += dt;
    }

    this.moveEntityWithCollision(p, p.vx * dt, p.vy * dt, true);

    // Check push-block pushing
    if (p.dashTimer <= 0 && (Math.abs(input.moveX) > 0.3 || Math.abs(input.moveY) > 0.3)) {
      this.tryPushBlock(dt, p.dir);
    }

    // Torch ignition proximity while carrying torch
    if (p.carryingId) {
      const carried = this.props.find((pr) => pr.id === p.carryingId);
      if (carried) {
        carried.x = p.x - 2;
        carried.y = p.y - 11;
        carried.z = 2;
        if (carried.kind === 'torch_stand') {
          this.igniteNearbyBraziers(p.x + p.w / 2, p.y + p.h / 2, 24);
        }
      }
    }

    // Pickups & Portal check
    const pcx = p.x + p.w / 2;
    const pcy = p.y + p.h / 2;
    for (const prop of this.props) {
      if (prop.broken || prop.carried) continue;
      const prcx = prop.x + prop.w / 2;
      const prcy = prop.y + prop.h / 2;
      const dist = Math.hypot(pcx - prcx, pcy - prcy);

      if (prop.kind === 'gem_drop' && dist < 14) {
        prop.broken = true;
        p.gems += 5;
        sound.gem();
        this.addFloatingText(prcx, prcy - 6, '+5', '#c4b5fd');
        this.spawnBurst(prcx, prcy, 6, '#a78bfa', 40);
      } else if (prop.kind === 'heart_drop' && dist < 14) {
        if (p.hp < p.maxHp) {
          prop.broken = true;
          p.hp = Math.min(p.maxHp, p.hp + 2);
          sound.heal();
          this.addFloatingText(prcx, prcy - 6, '+2 HP', '#fca5a5');
          this.spawnBurst(prcx, prcy, 6, '#f87171', 40);
        }
      } else if (prop.kind === 'star_piece' && dist < 14) {
        prop.broken = true;
        sound.starPiece();
        triggerHaptic(30, this.hapticsEnabled);
        this.spawnBurst(prcx, prcy, 16, '#facc15', 70);
        this.addFloatingText(prcx, prcy - 10, 'Звёздный осколок!', '#fde047');

        const starKey = `${this.chapterIndex}-${prop.starIndex ?? 0}`;
        if (!this.save.collectedStarIds.includes(starKey)) {
          this.save.collectedStarIds.push(starKey);
          writeSaveProgress(this.save);
        }
        achievementService.setProgress('star_seeker', 1, this.hapticsEnabled);
        achievementService.setProgress('constellation', this.save.collectedStarIds.length, this.hapticsEnabled);
        this.emitHud();
      } else if (prop.kind === 'portal' && prop.active && dist < 12) {
        this.completeChapter();
        return;
      }
    }
  }

  private performSwordAttack() {
    const p = this.player;
    const isHeavy = p.comboStep === 2;
    p.attackTimer = 0.16;
    p.attackCooldown = isHeavy ? 0.34 : 0.22;
    p.comboTimer = 0.55;
    sound.sword(p.comboStep);
    triggerHaptic(isHeavy ? 22 : 12, this.hapticsEnabled);

    // Slight forward lunge
    const vec = this.dirVec(p.dir);
    this.moveEntityWithCollision(p, vec.x * (isHeavy ? 6 : 3), vec.y * (isHeavy ? 6 : 3), false);

    const reach = isHeavy ? 26 : 21;
    const hitX = p.x + p.w / 2 + vec.x * 12;
    const hitY = p.y + p.h / 2 + vec.y * 12;
    const dmg = isHeavy ? 24 : 15;

    let hitSomething = false;

    // Damage enemies
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const ecx = enemy.x + enemy.w / 2;
      const ecy = enemy.y + enemy.h / 2;
      const dist = Math.hypot(ecx - hitX, ecy - hitY);
      if (dist <= reach + enemy.w * 0.35) {
        this.damageEnemy(enemy, dmg, vec.x, vec.y, isHeavy);
        hitSomething = true;
      }
    }

    // Break pots/bushes, open chests, flip crystal switches!
    for (const prop of this.props) {
      if (prop.broken || prop.carried) continue;
      const prcx = prop.x + prop.w / 2;
      const prcy = prop.y + prop.h / 2;
      if (Math.hypot(prcx - hitX, prcy - hitY) <= reach) {
        if (prop.kind === 'pot') {
          this.breakPot(prop);
          hitSomething = true;
        } else if (prop.kind === 'bush') {
          prop.broken = true;
          sound.potBreak();
          this.spawnBurst(prcx, prcy, 8, '#22c55e', 50);
          hitSomething = true;
        } else if (prop.kind === 'chest' && !prop.active) {
          this.openChest(prop);
          hitSomething = true;
        } else if (prop.kind === 'crystal_switch') {
          this.toggleCrystalSwitch(prop);
          hitSomething = true;
        }
      }
    }

    if (hitSomething && isHeavy) {
      this.hitstopTimer = 0.045;
      this.addShake(2.2, 0.12);
    }

    p.comboStep = (p.comboStep + 1) % 3;
  }

  private tryInteractOrLift() {
    const p = this.player;
    const vec = this.dirVec(p.dir);
    const checkX = p.x + p.w / 2 + vec.x * 10;
    const checkY = p.y + p.h / 2 + vec.y * 10;

    let closest: WorldProp | null = null;
    let bestDist = 24;

    for (const prop of this.props) {
      if (prop.broken || prop.carried) continue;
      if (!['pot', 'bomb_flower', 'torch_stand', 'chest', 'signpost', 'crystal_switch'].includes(prop.kind)) {
        continue;
      }
      const d = Math.hypot(prop.x + prop.w / 2 - checkX, prop.y + prop.h / 2 - checkY);
      if (d < bestDist) {
        bestDist = d;
        closest = prop;
      }
    }

    if (!closest) return;

    if (closest.kind === 'signpost') {
      this.dialogText = closest.text || '...';
      sound.pickup();
      this.emitHud();
      return;
    }

    if (closest.kind === 'chest') {
      if (!closest.active) this.openChest(closest);
      return;
    }

    if (closest.kind === 'crystal_switch') {
      this.toggleCrystalSwitch(closest);
      return;
    }

    // Lift pot, bomb_flower, or torch_stand
    closest.carried = true;
    p.carryingId = closest.id;
    if (closest.kind === 'bomb_flower') {
      closest.fuseTimer = 4.0;
      const sp = this.bombSpawns.find((b) => b.id === closest!.id);
      if (sp) sp.timer = 4.5;
    }
    sound.pickup();
    triggerHaptic(14, this.hapticsEnabled);
    this.emitHud();
  }

  private throwCarriedObject() {
    const p = this.player;
    if (!p.carryingId) return;
    const prop = this.props.find((pr) => pr.id === p.carryingId);
    p.carryingId = null;
    if (!prop) return;

    const vec = this.dirVec(p.dir);
    prop.carried = false;
    prop.x = p.x + vec.x * 6;
    prop.y = p.y + vec.y * 6;
    prop.z = 8;
    prop.vx = vec.x * 165;
    prop.vy = vec.y * 165;
    prop.vz = 55;
    sound.throwObj();
    triggerHaptic(14, this.hapticsEnabled);
    this.emitHud();
  }

  private tryPushBlock(dt: number, dir: Direction) {
    const p = this.player;
    const vec = this.dirVec(dir);
    const probeX = p.x + p.w / 2 + vec.x * 9;
    const probeY = p.y + p.h / 2 + vec.y * 9;

    for (const prop of this.props) {
      if (prop.kind !== 'push_block' || prop.broken) continue;
      if (prop.pushTargetX !== undefined) continue; // Already sliding

      if (
        probeX >= prop.x - 2 &&
        probeX <= prop.x + prop.w + 2 &&
        probeY >= prop.y - 2 &&
        probeY <= prop.y + prop.h + 2
      ) {
        if (prop.pushDir !== dir) {
          prop.pushDir = dir;
          prop.pushHoldTimer = 0;
        }
        prop.pushHoldTimer = (prop.pushHoldTimer || 0) + dt;
        if (prop.pushHoldTimer >= 0.08) {
          prop.pushHoldTimer = 0;
          const nextX = Math.round(prop.x / TILE_SIZE) * TILE_SIZE + vec.x * TILE_SIZE;
          const nextY = Math.round(prop.y / TILE_SIZE) * TILE_SIZE + vec.y * TILE_SIZE;
          if (!this.isSolidAt(nextX + 2, nextY + 2, 12, 12, prop.id)) {
            prop.pushTargetX = nextX;
            prop.pushTargetY = nextY;
            sound.pickup();
            triggerHaptic(12, this.hapticsEnabled);
          }
        }
      } else if (prop.pushDir === dir) {
        prop.pushHoldTimer = 0;
      }
    }
  }

  private updateProps(dt: number) {
    // Respawn bomb flowers on pedestals
    for (const sp of this.bombSpawns) {
      const existing = this.props.find((p) => p.id === sp.id);
      if (!existing || existing.broken || existing.carried || existing.vx) {
        if (sp.timer > 0) {
          sp.timer -= dt;
          if (sp.timer <= 0) {
            // If old bomb was carried/thrown, replace its id or respawn fresh pedestal bomb
            if (existing && existing.broken) {
              existing.broken = false;
              existing.carried = false;
              existing.x = sp.x;
              existing.y = sp.y;
              existing.z = 0;
              existing.vx = 0;
              existing.vy = 0;
              existing.vz = 0;
              existing.fuseTimer = undefined;
              this.spawnBurst(sp.x + 8, sp.y + 8, 6, '#4ade80', 30);
            }
          }
        }
      }
    }

    // Reset pressure plates before checking blocks
    for (const prop of this.props) {
      if (prop.kind === 'pressure_plate') {
        prop.wasActive = prop.active;
        prop.active = false;
      }
    }

    for (const prop of this.props) {
      if (prop.broken) continue;

      // Sliding push-blocks
      if (prop.kind === 'push_block' && prop.pushTargetX !== undefined && prop.pushTargetY !== undefined) {
        const dx = prop.pushTargetX - prop.x;
        const dy = prop.pushTargetY - prop.y;
        const dist = Math.hypot(dx, dy);
        const step = 95 * dt;
        if (dist <= step) {
          prop.x = prop.pushTargetX;
          prop.y = prop.pushTargetY;
          prop.pushTargetX = undefined;
          prop.pushTargetY = undefined;
        } else {
          prop.x += (dx / dist) * step;
          prop.y += (dy / dist) * step;
        }
      }

      // Check pressure plates under push blocks
      if (prop.kind === 'push_block') {
        const bcx = prop.x + prop.w / 2;
        const bcy = prop.y + prop.h / 2;
        for (const plate of this.props) {
          if (plate.kind === 'pressure_plate') {
            const pcx = plate.x + plate.w / 2;
            const pcy = plate.y + plate.h / 2;
            if (Math.hypot(bcx - pcx, bcy - pcy) < 10) {
              plate.active = true;
              if (!(plate as WorldProp & { wasActive?: boolean }).wasActive) {
                sound.switchToggle();
                achievementService.setProgress('puzzle_solver', 1, this.hapticsEnabled);
              }
            }
          }
        }
      }

      // Thrown projectile motion for pots, bombs, torches
      if (!prop.carried && (prop.vx || prop.vy || (prop.z && prop.z > 0))) {
        const nx = prop.x + (prop.vx || 0) * dt;
        const ny = prop.y + (prop.vy || 0) * dt;
        prop.vz = (prop.vz || 0) - 240 * dt;
        prop.z = Math.max(0, (prop.z || 0) + prop.vz * dt);

        const hitWall = this.isSolidAt(nx + 2, ny + 2, 12, 12, prop.id);
        let hitEnemy: Enemy | null = null;
        for (const en of this.enemies) {
          if (en.hp > 0 && this.aabb(nx + 2, ny + 2, 12, 12, en.x, en.y, en.w, en.h)) {
            hitEnemy = en;
            break;
          }
        }

        // Hit crystal switch with thrown pot!
        for (const sw of this.props) {
          if (sw.kind === 'crystal_switch' && this.aabb(nx, ny, 16, 16, sw.x, sw.y, sw.w, sw.h)) {
            this.toggleCrystalSwitch(sw);
          }
        }

        if (hitWall || hitEnemy || prop.z <= 0) {
          if (prop.kind === 'pot') {
            this.breakPot(prop);
            if (hitEnemy) this.damageEnemy(hitEnemy, 18, (prop.vx || 0) > 0 ? 1 : -1, 0, false);
          } else if (prop.kind === 'bomb_flower') {
            this.explodeBomb(prop);
          } else if (prop.kind === 'torch_stand') {
            prop.vx = 0;
            prop.vy = 0;
            prop.vz = 0;
            prop.z = 0;
            // If torch landed in water, return it to start spot!
            const tx = Math.floor((prop.x + 8) / TILE_SIZE);
            const ty = Math.floor((prop.y + 8) / TILE_SIZE);
            if (this.getTile(tx, ty) === 'water') {
              const orig = this.level.props.find((lp) => lp.id === prop.id);
              if (orig) {
                prop.x = orig.x;
                prop.y = orig.y;
              }
            } else {
              this.igniteNearbyBraziers(prop.x + 8, prop.y + 8, 26);
            }
          }
        } else {
          prop.x = nx;
          prop.y = ny;
        }
      }

      // Bomb fuse countdown
      if (prop.kind === 'bomb_flower' && prop.fuseTimer !== undefined && prop.fuseTimer > 0) {
        prop.fuseTimer -= dt;
        if (prop.fuseTimer <= 0) {
          this.explodeBomb(prop);
        }
      }
    }

    this.syncGates();
  }

  private igniteNearbyBraziers(x: number, y: number, radius: number) {
    let litAny = false;
    for (const prop of this.props) {
      if (prop.kind === 'brazier' && !prop.active) {
        const dist = Math.hypot(prop.x + 8 - x, prop.y + 8 - y);
        if (dist <= radius) {
          prop.active = true;
          litAny = true;
          sound.ignite();
          this.spawnBurst(prop.x + 8, prop.y + 4, 12, '#f97316', 55);
          this.addFloatingText(prop.x + 8, prop.y - 4, 'Зажжено!', '#fde047');
        }
      }
    }
    if (litAny) {
      const litCount = this.props.filter((p) => p.kind === 'brazier' && p.active).length;
      if (this.chapterIndex === 1) {
        achievementService.setProgress('keeper_of_flame', litCount, this.hapticsEnabled);
      }
      this.syncGates();
    }
  }

  private toggleCrystalSwitch(sw: WorldProp) {
    sw.active = !sw.active;
    sound.switchToggle();
    this.spawnBurst(sw.x + 8, sw.y + 6, 8, sw.active ? '#38bdf8' : '#f87171', 45);
    for (const g of this.props) {
      if (g.kind === 'toggle_gate' && g.linkId === sw.linkId) {
        g.active = g.gateGroup === 'A' ? sw.active : !sw.active;
      }
    }
  }

  private syncGates() {
    for (const gate of this.props) {
      if (gate.kind !== 'locked_gate' || !gate.linkId) continue;
      const triggers = this.props.filter(
        (p) => (p.kind === 'pressure_plate' || p.kind === 'brazier') && p.linkId === gate.linkId
      );
      if (triggers.length === 0) continue;
      const activeCount = triggers.filter((t) => t.active).length;
      const needed = gate.requiredCount ?? triggers.length;
      const shouldOpen = activeCount >= needed;
      if (shouldOpen && !gate.active) {
        gate.active = true;
        sound.puzzleSolve();
        this.addShake(2, 0.2);
        this.addFloatingText(gate.x + 8, gate.y - 6, 'Врата открыты!', '#7dd3fc');
      } else if (!shouldOpen && gate.active) {
        gate.active = false;
      }
    }
  }

  private breakPot(prop: WorldProp) {
    prop.broken = true;
    sound.potBreak();
    const cx = prop.x + 8;
    const cy = prop.y + 8;
    this.spawnBurst(cx, cy, 10, '#ea580c', 60);
    achievementService.increment('pot_smasher', 1, this.hapticsEnabled);

    const roll = Math.random();
    if (roll < 0.25 && this.player.hp < this.player.maxHp) {
      this.props.push({
        id: `drop_${Date.now()}_${Math.random()}`,
        kind: 'heart_drop',
        x: prop.x,
        y: prop.y,
        w: 16,
        h: 16,
      });
    } else if (roll < 0.65) {
      this.props.push({
        id: `drop_${Date.now()}_${Math.random()}`,
        kind: 'gem_drop',
        x: prop.x,
        y: prop.y,
        w: 16,
        h: 16,
      });
    }
  }

  private openChest(prop: WorldProp) {
    prop.active = true;
    sound.chestOpen();
    triggerHaptic(25, this.hapticsEnabled);
    const cx = prop.x + 8;
    const cy = prop.y + 8;
    this.spawnBurst(cx, cy, 14, '#facc15', 70);
    achievementService.increment('treasure_hunter', 1, this.hapticsEnabled);

    if (prop.reward === 'heal') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 3);
      this.addFloatingText(cx, cy - 8, '+3 HP!', '#fca5a5');
    } else {
      this.player.gems += 30;
      this.addFloatingText(cx, cy - 8, '+30 Самоцветов!', '#fde047');
    }
    this.emitHud();
  }

  private explodeBomb(prop: WorldProp) {
    if (prop.broken) return;
    if (this.player.carryingId === prop.id) {
      this.player.carryingId = null;
    }
    prop.broken = true;
    prop.fuseTimer = undefined;
    prop.vx = 0;
    prop.vy = 0;
    prop.vz = 0;
    prop.z = 0;

    const sp = this.bombSpawns.find((b) => b.id === prop.id);
    if (sp) sp.timer = 4.5;

    const cx = prop.x + 8;
    const cy = prop.y + 8;
    sound.explosion();
    triggerHaptic(45, this.hapticsEnabled);
    this.addShake(4.5, 0.25);
    this.hitstopTimer = 0.05;
    this.spawnBurst(cx, cy, 22, '#f97316', 95);
    this.spawnBurst(cx, cy, 12, '#fef08a', 60);

    const blastRadius = 36;

    // Destroy cracked walls & nearby pots/bushes
    for (const other of this.props) {
      if (other.broken) continue;
      const ocx = other.x + other.w / 2;
      const ocy = other.y + other.h / 2;
      if (Math.hypot(ocx - cx, ocy - cy) <= blastRadius) {
        if (other.kind === 'cracked_wall') {
          other.broken = true;
          this.spawnBurst(ocx, ocy, 12, '#94a3b8', 70);
          this.addFloatingText(ocx, ocy - 6, 'Проход открыт!', '#7dd3fc');
          achievementService.setProgress('bomb_demolition', 1, this.hapticsEnabled);
        } else if (other.kind === 'pot') {
          this.breakPot(other);
        } else if (other.kind === 'bush') {
          other.broken = true;
          this.spawnBurst(ocx, ocy, 8, '#22c55e', 50);
        } else if (other.kind === 'brazier' && !other.active) {
          this.igniteNearbyBraziers(cx, cy, blastRadius);
        }
      }
    }

    // Blast enemies & stun Stone Warden Boss!
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const ecx = enemy.x + enemy.w / 2;
      const ecy = enemy.y + enemy.h / 2;
      const dist = Math.hypot(ecx - cx, ecy - cy);
      if (dist <= blastRadius + enemy.w * 0.4) {
        if (enemy.kind === 'boss_warden') {
          enemy.armorBroken = true;
          enemy.state = 'stunned';
          enemy.stateTimer = 3.8;
          enemy.vx = 0;
          enemy.vy = 0;
          this.addFloatingText(ecx, ecy - 14, 'БРОНЯ ПРОБИТА!', '#facc15');
          this.damageEnemy(enemy, 55, 0, 0, true);
        } else {
          const dx = ecx - cx;
          const dy = ecy - cy;
          const len = Math.max(1, Math.hypot(dx, dy));
          this.damageEnemy(enemy, 45, dx / len, dy / len, true);
        }
      }
    }
  }

  private damageEnemy(enemy: Enemy, rawDmg: number, dirX: number, dirY: number, heavy: boolean) {
    let dmg = rawDmg;
    if (enemy.kind === 'boss_warden') {
      dmg = enemy.armorBroken ? Math.round(rawDmg * 1.6) : Math.max(5, Math.round(rawDmg * 0.45));
    }

    enemy.hp -= dmg;
    enemy.hitFlash = 0.14;
    if (enemy.kind !== 'boss_warden') {
      enemy.vx = dirX * (heavy ? 120 : 80);
      enemy.vy = dirY * (heavy ? 120 : 80);
      if (enemy.state !== 'stunned') {
        enemy.state = 'stunned';
        enemy.stateTimer = 0.22;
      }
    }

    this.player.streakHits++;
    achievementService.setProgress('combo_master', this.player.streakHits, this.hapticsEnabled);

    sound.hit(heavy);
    this.spawnBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, heavy ? 10 : 6, '#fde047', 65);
    this.addFloatingText(
      enemy.x + enemy.w / 2,
      enemy.y - 4,
      `-${dmg}`,
      enemy.armorBroken ? '#facc15' : '#ffffff'
    );

    if (enemy.hp <= 0) {
      this.onEnemyDefeated(enemy);
    }
  }

  private onEnemyDefeated(enemy: Enemy) {
    const cx = enemy.x + enemy.w / 2;
    const cy = enemy.y + enemy.h / 2;
    this.spawnBurst(cx, cy, enemy.kind === 'boss_warden' ? 32 : 14, '#38bdf8', 85);
    this.player.gems += enemy.dropGems;
    this.addFloatingText(cx, cy - 8, `+${enemy.dropGems}`, '#c4b5fd');
    achievementService.setProgress('first_blood', 1, this.hapticsEnabled);

    if (enemy.kind === 'boss_warden') {
      sound.bossRoar();
      this.addShake(5, 0.35);
      achievementService.setProgress('warden_slayer', 1, this.hapticsEnabled);
    }

    if (enemy.linkGateId) {
      for (const prop of this.props) {
        if (prop.kind === 'portal' && prop.linkId === enemy.linkGateId) {
          prop.active = true;
          sound.puzzleSolve();
          this.addFloatingText(prop.x + 8, prop.y - 8, 'Портал открыт!', '#38bdf8');
        }
      }
    }
    this.emitHud();
  }

  private updateEnemies(dt: number) {
    const p = this.player;
    const pcx = p.x + p.w / 2;
    const pcy = p.y + p.h / 2;

    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      if (enemy.hitFlash > 0) enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.animTime += dt;

      const ecx = enemy.x + enemy.w / 2;
      const ecy = enemy.y + enemy.h / 2;
      const dx = pcx - ecx;
      const dy = pcy - ecy;
      const dist = Math.hypot(dx, dy);

      if (Math.abs(dx) > Math.abs(dy)) {
        enemy.dir = dx > 0 ? 'right' : 'left';
      } else {
        enemy.dir = dy > 0 ? 'down' : 'up';
      }

      if (enemy.state === 'stunned') {
        enemy.stateTimer -= dt;
        enemy.vx *= 0.85;
        enemy.vy *= 0.85;
        this.moveEntityWithCollision(enemy, enemy.vx * dt, enemy.vy * dt, false);
        if (enemy.stateTimer <= 0) {
          enemy.state = 'idle';
          enemy.stateTimer = 0.4;
          enemy.armorBroken = false;
        }
        continue;
      }

      if (enemy.kind === 'boss_warden') {
        this.updateBossWarden(enemy, dt, dx, dy, dist);
        continue;
      }

      const aggroRange = enemy.kind === 'fire_imp' ? 140 : 108;

      if (enemy.state === 'idle') {
        enemy.stateTimer -= dt;
        if (dist < aggroRange && enemy.stateTimer <= 0) {
          enemy.state = 'chase';
        }
      } else if (enemy.state === 'chase') {
        const atkDist = enemy.kind === 'fire_imp' ? 92 : 34;
        if (dist <= atkDist) {
          enemy.state = 'windup';
          enemy.stateTimer = enemy.kind === 'fire_imp' ? 0.65 : 0.45;
          enemy.vx = 0;
          enemy.vy = 0;
          enemy.attackTargetX = dist > 0 ? dx / dist : 0;
          enemy.attackTargetY = dist > 0 ? dy / dist : 1;
        } else if (dist > aggroRange * 1.4) {
          enemy.state = 'idle';
          enemy.stateTimer = 0.5;
        } else {
          const nx = dist > 0 ? dx / dist : 0;
          const ny = dist > 0 ? dy / dist : 0;
          this.moveEntityWithCollision(enemy, nx * enemy.speed * dt, ny * enemy.speed * dt, false);
        }
      } else if (enemy.state === 'windup') {
        enemy.stateTimer -= dt;
        if (enemy.stateTimer <= 0) {
          enemy.state = 'attack';
          if (enemy.kind === 'fire_imp') {
            this.projectiles.push({
              id: `proj_${Date.now()}_${Math.random()}`,
              fromPlayer: false,
              kind: 'fireball',
              x: ecx,
              y: ecy,
              vx: (enemy.attackTargetX || 0) * 110,
              vy: (enemy.attackTargetY || 1) * 110,
              radius: 4,
              damage: enemy.damage,
              life: 2.2,
              maxLife: 2.2,
              ignites: true,
            });
            enemy.state = 'cooldown';
            enemy.stateTimer = 1.1;
          } else {
            enemy.stateTimer = 0.25;
            const lungeSpeed = enemy.kind === 'slime' ? 125 : 145;
            enemy.vx = (enemy.attackTargetX || 0) * lungeSpeed;
            enemy.vy = (enemy.attackTargetY || 1) * lungeSpeed;
          }
        }
      } else if (enemy.state === 'attack') {
        enemy.stateTimer -= dt;
        this.moveEntityWithCollision(enemy, enemy.vx * dt, enemy.vy * dt, false);
        if (enemy.stateTimer <= 0) {
          enemy.state = 'cooldown';
          enemy.stateTimer = 0.65;
          enemy.vx = 0;
          enemy.vy = 0;
        }
      } else if (enemy.state === 'cooldown') {
        enemy.stateTimer -= dt;
        if (enemy.stateTimer <= 0) {
          enemy.state = 'chase';
        }
      }

      // Contact damage / Perfect Dodge detection!
      if (this.aabb(p.x, p.y, p.w, p.h, enemy.x + 1, enemy.y + 1, enemy.w - 2, enemy.h - 2)) {
        if (p.dashTimer > 0 && enemy.state === 'attack') {
          this.registerPerfectDodge(enemy.id);
        } else {
          this.damagePlayer(enemy.damage, ecx, ecy);
        }
      }
    }
  }

  private updateBossWarden(boss: Enemy, dt: number, dx: number, dy: number, dist: number) {
    const p = this.player;
    const bcx = boss.x + boss.w / 2;
    const bcy = boss.y + boss.h / 2;

    // Only activate once player enters Boss Arena (y < 11 * 16)
    if (p.y > 11 * TILE_SIZE) return;

    if (boss.state === 'idle') {
      boss.stateTimer -= dt;
      if (boss.stateTimer <= 0) {
        boss.state = 'chase';
        boss.stateTimer = 1.6;
      }
    } else if (boss.state === 'chase') {
      boss.stateTimer -= dt;
      if (dist > 0) {
        this.moveEntityWithCollision(boss, (dx / dist) * boss.speed * dt, (dy / dist) * boss.speed * dt, false);
      }
      if (boss.stateTimer <= 0) {
        boss.state = 'windup';
        boss.attackPattern = ((boss.attackPattern || 0) + 1) % 2;
        boss.stateTimer = 0.85;
        boss.attackTargetX = dist > 0 ? dx / dist : 0;
        boss.attackTargetY = dist > 0 ? dy / dist : 1;
      }
    } else if (boss.state === 'windup') {
      boss.stateTimer -= dt;
      if (boss.stateTimer <= 0) {
        boss.state = 'attack';
        if (boss.attackPattern === 0) {
          // Ground Slam Shockwave!
          sound.bossRoar();
          this.addShake(3.5, 0.25);
          this.spawnBurst(bcx, bcy, 16, '#f59e0b', 80);
          this.projectiles.push({
            id: `shock_${Date.now()}`,
            fromPlayer: false,
            kind: 'shockwave',
            x: bcx,
            y: bcy,
            vx: 0,
            vy: 0,
            radius: 14,
            damage: 1,
            life: 0.75,
            maxLife: 0.75,
          });
        } else {
          // 3-Boulder Spread Throw!
          sound.throwObj();
          const baseAngle = Math.atan2(boss.attackTargetY || 1, boss.attackTargetX || 0);
          for (const offset of [-0.32, 0, 0.32]) {
            const ang = baseAngle + offset;
            this.projectiles.push({
              id: `boulder_${Date.now()}_${offset}`,
              fromPlayer: false,
              kind: 'boulder',
              x: bcx,
              y: bcy,
              vx: Math.cos(ang) * 115,
              vy: Math.sin(ang) * 115,
              radius: 5,
              damage: 1,
              life: 2.5,
              maxLife: 2.5,
            });
          }
        }
        boss.state = 'cooldown';
        boss.stateTimer = 1.25;
      }
    } else if (boss.state === 'cooldown') {
      boss.stateTimer -= dt;
      if (boss.stateTimer <= 0) {
        boss.state = 'chase';
        boss.stateTimer = 1.4;
      }
    }

    if (this.aabb(p.x, p.y, p.w, p.h, boss.x + 2, boss.y + 2, boss.w - 4, boss.h - 4)) {
      this.damagePlayer(boss.damage, bcx, bcy);
    }
  }

  private updateProjectiles(dt: number) {
    const p = this.player;
    const pcx = p.x + p.w / 2;
    const pcy = p.y + p.h / 2;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      if (pr.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (pr.kind === 'shockwave') {
        pr.radius += 115 * dt;
        const dist = Math.hypot(pcx - pr.x, pcy - pr.y);
        if (Math.abs(dist - pr.radius) < 7) {
          if (p.dashTimer > 0) {
            this.registerPerfectDodge(pr.id);
          } else {
            this.damagePlayer(pr.damage, pr.x, pr.y);
          }
        }
        continue;
      }

      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;

      if (pr.ignites) {
        this.igniteNearbyBraziers(pr.x, pr.y, 14);
      }

      if (this.isSolidAt(pr.x - pr.radius, pr.y - pr.radius, pr.radius * 2, pr.radius * 2)) {
        this.spawnBurst(pr.x, pr.y, 6, pr.kind === 'fireball' ? '#f97316' : '#94a3b8', 45);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (!pr.fromPlayer && Math.hypot(pcx - pr.x, pcy - pr.y) < pr.radius + 6) {
        if (p.dashTimer > 0) {
          this.registerPerfectDodge(pr.id);
        } else {
          this.damagePlayer(pr.damage, pr.x, pr.y);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  private registerPerfectDodge(attackId: string) {
    if (this.dodgeCountedIds.has(attackId)) return;
    this.dodgeCountedIds.add(attackId);
    this.addFloatingText(this.player.x + 6, this.player.y - 6, 'Уклонение!', '#7dd3fc');
    achievementService.increment('phantom_dash', 1, this.hapticsEnabled);
  }

  private damagePlayer(amount: number, srcX: number, srcY: number) {
    const p = this.player;
    if (p.invulnTimer > 0 || p.dashTimer > 0) return;

    p.hp = Math.max(0, p.hp - amount);
    p.invulnTimer = 0.85;
    p.hitFlash = 0.18;
    p.streakHits = 0;
    p.tookDamageInChapter = true;

    const dx = p.x + p.w / 2 - srcX;
    const dy = p.y + p.h / 2 - srcY;
    const len = Math.max(1, Math.hypot(dx, dy));
    this.moveEntityWithCollision(p, (dx / len) * 10, (dy / len) * 10, false);

    sound.playerHurt();
    triggerHaptic(35, this.hapticsEnabled);
    this.addShake(3.5, 0.2);
    this.spawnBurst(p.x + p.w / 2, p.y + p.h / 2, 10, '#ef4444', 60);
    this.emitHud();

    if (p.hp <= 0) {
      this.setScreen('GAME_OVER');
    }
  }

  private completeChapter() {
    sound.victory();
    triggerHaptic(40, this.hapticsEnabled);
    if (!this.player.tookDamageInChapter) {
      achievementService.setProgress('unbreakable', 1, this.hapticsEnabled);
    }

    if (this.chapterIndex + 1 > this.save.highestUnlockedChapter && this.chapterIndex < 2) {
      this.save.highestUnlockedChapter = this.chapterIndex + 1;
    }
    this.save.bestGems = Math.max(this.save.bestGems, this.player.gems);
    writeSaveProgress(this.save);

    if (this.chapterIndex >= 2) {
      this.setScreen('VICTORY');
    } else {
      this.setScreen('CHAPTER_CLEAR');
    }
  }

  private getTile(tx: number, ty: number): TileType {
    if (ty < 0 || ty >= this.level.tiles.length || tx < 0 || tx >= this.level.tiles[0].length) {
      return 'wall';
    }
    return this.level.tiles[ty][tx];
  }

  private isSolidAt(x: number, y: number, w: number, h: number, ignorePropId?: string): boolean {
    const left = Math.floor(x / TILE_SIZE);
    const right = Math.floor((x + w - 0.01) / TILE_SIZE);
    const top = Math.floor(y / TILE_SIZE);
    const bottom = Math.floor((y + h - 0.01) / TILE_SIZE);

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        const t = this.getTile(tx, ty);
        if (t === 'wall' || t === 'tree' || t === 'water') {
          return true;
        }
      }
    }

    for (const prop of this.props) {
      if (prop.broken || prop.carried || prop.id === ignorePropId) continue;
      const isBlocking =
        prop.kind === 'push_block' ||
        prop.kind === 'cracked_wall' ||
        prop.kind === 'brazier' ||
        prop.kind === 'crystal_switch' ||
        prop.kind === 'signpost' ||
        prop.kind === 'chest' ||
        (prop.kind === 'locked_gate' && !prop.active) ||
        (prop.kind === 'toggle_gate' && !prop.active);

      if (isBlocking && this.aabb(x, y, w, h, prop.x + 1, prop.y + 1, prop.w - 2, prop.h - 2)) {
        return true;
      }
    }

    return false;
  }

  private moveEntityWithCollision(
    ent: { x: number; y: number; w: number; h: number },
    dx: number,
    dy: number,
    allowCornerSlide: boolean
  ) {
    if (dx !== 0) {
      if (!this.isSolidAt(ent.x + dx, ent.y, ent.w, ent.h)) {
        ent.x += dx;
      } else if (allowCornerSlide) {
        // Gentle corner sliding so hero never snags on doorway corners
        for (const nud of [-3, 3]) {
          if (!this.isSolidAt(ent.x + dx, ent.y + nud, ent.w, ent.h)) {
            ent.y += Math.sign(nud) * Math.min(Math.abs(dx), 2);
            break;
          }
        }
      }
    }
    if (dy !== 0) {
      if (!this.isSolidAt(ent.x, ent.y + dy, ent.w, ent.h)) {
        ent.y += dy;
      } else if (allowCornerSlide) {
        for (const nud of [-3, 3]) {
          if (!this.isSolidAt(ent.x + nud, ent.y + dy, ent.w, ent.h)) {
            ent.x += Math.sign(nud) * Math.min(Math.abs(dy), 2);
            break;
          }
        }
      }
    }
  }

  private aabb(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  private dirVec(dir: Direction): { x: number; y: number } {
    switch (dir) {
      case 'left': return { x: -1, y: 0 };
      case 'right': return { x: 1, y: 0 };
      case 'up': return { x: 0, y: -1 };
      case 'down': return { x: 0, y: 1 };
    }
  }

  private spawnBurst(x: number, y: number, count: number, color: string, speed: number) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = speed * (0.4 + Math.random() * 0.7);
      this.particles.push({
        x,
        y,
        z: 2 + Math.random() * 4,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        vz: 20 + Math.random() * 45,
        size: Math.random() > 0.5 ? 2 : 3,
        color,
        life: 0.25 + Math.random() * 0.25,
        maxLife: 0.5,
        gravity: 140,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vz -= (pt.gravity || 120) * dt;
      pt.z = Math.max(0, pt.z + pt.vz * dt);
    }
  }

  private addFloatingText(x: number, y: number, text: string, color: string) {
    this.floatingTexts.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
  }

  private updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y -= 16 * dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  private addShake(intensity: number, duration: number) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  private centerCameraImmediate() {
    const worldW = this.level.meta.width * TILE_SIZE;
    const worldH = this.level.meta.height * TILE_SIZE;
    this.camX = Math.max(0, Math.min(worldW - this.viewW, this.player.x + 8 - this.viewW / 2));
    this.camY = Math.max(0, Math.min(worldH - this.viewH, this.player.y + 8 - this.viewH / 2));
  }

  private updateCamera(dt: number) {
    const worldW = this.level.meta.width * TILE_SIZE;
    const worldH = this.level.meta.height * TILE_SIZE;
    const targetX = Math.max(0, Math.min(worldW - this.viewW, this.player.x + 6 - this.viewW / 2));
    const targetY = Math.max(0, Math.min(worldH - this.viewH, this.player.y + 6 - this.viewH / 2));
    const lerp = 1 - Math.exp(-10 * dt);
    this.camX += (targetX - this.camX) * lerp;
    this.camY += (targetY - this.camY) * lerp;
  }

  private render() {
    const ctx = this.ctx;
    ctx.fillStyle = '#0b131e';
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    let sx = 0;
    let sy = 0;
    if (this.shakeTimer > 0) {
      sx = Math.round((Math.random() * 2 - 1) * this.shakeIntensity);
      sy = Math.round((Math.random() * 2 - 1) * this.shakeIntensity);
    }

    const ox = Math.round(this.camX) + sx;
    const oy = Math.round(this.camY) + sy;

    ctx.save();
    ctx.translate(-ox, -oy);

    // Draw visible tiles only
    const startCol = Math.max(0, Math.floor(ox / TILE_SIZE) - 1);
    const endCol = Math.min(this.level.meta.width - 1, Math.ceil((ox + this.viewW) / TILE_SIZE) + 1);
    const startRow = Math.max(0, Math.floor(oy / TILE_SIZE) - 1);
    const endRow = Math.min(this.level.meta.height - 1, Math.ceil((oy + this.viewH) / TILE_SIZE) + 1);

    for (let ty = startRow; ty <= endRow; ty++) {
      for (let tx = startCol; tx <= endCol; tx++) {
        drawTile(ctx, this.level.tiles[ty][tx], tx, ty, this.elapsedTime, this.level.meta.biome);
      }
    }

    // Draw flat floor props first (pressure plates, portals, open gates)
    for (const prop of this.props) {
      if (prop.broken) continue;
      if (
        prop.kind === 'pressure_plate' ||
        prop.kind === 'portal' ||
        (prop.kind === 'locked_gate' && prop.active) ||
        (prop.kind === 'toggle_gate' && prop.active)
      ) {
        drawProp(ctx, prop, this.elapsedTime);
      }
    }

    // Y-sorted renderables (props + enemies + player)
    type RenderItem = { y: number; draw: () => void };
    const items: RenderItem[] = [];

    for (const prop of this.props) {
      if (prop.broken) continue;
      if (
        prop.kind === 'pressure_plate' ||
        prop.kind === 'portal' ||
        (prop.kind === 'locked_gate' && prop.active) ||
        (prop.kind === 'toggle_gate' && prop.active)
      ) {
        continue;
      }
      items.push({
        y: prop.carried ? this.player.y + 20 : prop.y + prop.h,
        draw: () => drawProp(ctx, prop, this.elapsedTime),
      });
    }

    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      items.push({
        y: enemy.y + enemy.h,
        draw: () => drawEnemy(ctx, enemy, this.elapsedTime),
      });
    }

    items.push({
      y: this.player.y + this.player.h,
      draw: () =>
        drawPlayer(
          ctx,
          { ...this.player, x: this.player.x - 2, y: this.player.y - 3 },
          this.elapsedTime
        ),
    });

    items.sort((a, b) => a.y - b.y);
    for (const item of items) item.draw();

    // Projectiles
    for (const pr of this.projectiles) {
      drawProjectile(ctx, pr);
    }

    // Particles
    for (const pt of this.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(Math.round(pt.x), Math.round(pt.y - pt.z), pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    // Floating combat/puzzle text
    ctx.font = 'bold 7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = Math.min(1, ft.life * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(ft.text, Math.round(ft.x) + 1, Math.round(ft.y) + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, Math.round(ft.x), Math.round(ft.y));
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  private getNearbyActionLabel(): string | null {
    const p = this.player;
    if (p.carryingId) return 'Бросить';
    const vec = this.dirVec(p.dir);
    const checkX = p.x + p.w / 2 + vec.x * 10;
    const checkY = p.y + p.h / 2 + vec.y * 10;

    for (const prop of this.props) {
      if (prop.broken || prop.carried) continue;
      const d = Math.hypot(prop.x + prop.w / 2 - checkX, prop.y + prop.h / 2 - checkY);
      if (d < 24) {
        if (prop.kind === 'pot') return 'Взять кувшин';
        if (prop.kind === 'bomb_flower') return 'Взять бомбу';
        if (prop.kind === 'torch_stand') return 'Взять факел';
        if (prop.kind === 'chest' && !prop.active) return 'Открыть сундук';
        if (prop.kind === 'signpost') return 'Прочитать';
        if (prop.kind === 'crystal_switch') return 'Кристалл';
      }
    }
    return null;
  }

  private emitHud() {
    const carried = this.player.carryingId
      ? this.props.find((pr) => pr.id === this.player.carryingId)?.kind ?? null
      : null;

    const boss = this.enemies.find(
      (e) => e.kind === 'boss_warden' && e.hp > 0 && this.player.y < 11 * TILE_SIZE
    );

    const chapterStarsFound: number[] = [];
    for (let i = 0; i < this.level.meta.totalStars; i++) {
      if (this.save.collectedStarIds.includes(`${this.chapterIndex}-${i}`)) {
        chapterStarsFound.push(i);
      }
    }

    const starsRemaining = this.props.filter((p) => p.kind === 'star_piece' && !p.broken).length;
    const starsCollectedInRun = this.level.meta.totalStars - starsRemaining;

    this.onHudUpdate({
      screen: this.screen,
      chapterIndex: this.chapterIndex,
      chapterTitle: this.level.meta.title,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      gems: this.player.gems,
      starsCollected: starsCollectedInRun,
      starsTotal: this.level.meta.totalStars,
      enemiesRemaining: this.enemies.filter((e) => e.hp > 0).length,
      carryingKind: carried,
      nearbyActionLabel: this.getNearbyActionLabel(),
      dashCooldownRatio: Math.min(1, Math.max(0, this.player.dashCooldown / 0.62)),
      dialogText: this.dialogText,
      bossName: boss ? boss.name : null,
      bossHp: boss ? boss.hp : 0,
      bossMaxHp: boss ? boss.maxHp : 1,
      bossStunned: boss ? !!boss.armorBroken : false,
      chapterTimeSec: Math.floor(this.chapterTimeSec),
      streakHits: this.player.streakHits,
      chapterStarsFound,
    });
  }
}
