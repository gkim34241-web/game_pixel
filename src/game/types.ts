export const TILE_SIZE = 16;

export type GameScreenState =
  | 'TITLE'
  | 'PLAYING'
  | 'PAUSED'
  | 'CHAPTER_CLEAR'
  | 'VICTORY'
  | 'GAME_OVER';

export type Direction = 'down' | 'up' | 'left' | 'right';

export type TileType =
  | 'grass'
  | 'path'
  | 'stone_floor'
  | 'dark_floor'
  | 'wall'
  | 'tree'
  | 'water'
  | 'bridge'
  | 'spikes';

export type PropKind =
  | 'pot'
  | 'bush'
  | 'bomb_flower'
  | 'torch_stand'
  | 'push_block'
  | 'pressure_plate'
  | 'brazier'
  | 'crystal_switch'
  | 'toggle_gate'
  | 'cracked_wall'
  | 'locked_gate'
  | 'chest'
  | 'star_piece'
  | 'signpost'
  | 'portal'
  | 'heart_drop'
  | 'gem_drop';

export interface WorldProp {
  id: string;
  kind: PropKind;
  x: number;
  y: number;
  w: number;
  h: number;
  // State flags
  active?: boolean;       // For plate (pressed), brazier (lit), crystal_switch (state A/B), portal (open), chest (opened)
  wasActive?: boolean;
  broken?: boolean;
  carried?: boolean;
  respawnTimer?: number;  // For bomb flower pedestals
  fuseTimer?: number;     // Bomb countdown when lit/thrown
  vx?: number;
  vy?: number;
  vz?: number;
  z?: number;
  // Puzzle links
  linkId?: string;        // Connects plates/braziers/switches to gates
  gateGroup?: 'A' | 'B';  // Toggle gate group for crystal switches
  requiredCount?: number; // Number of linked triggers required to open locked_gate
  // Push-block smooth slide target
  pushTargetX?: number;
  pushTargetY?: number;
  pushCooldown?: number;
  pushHoldTimer?: number;
  pushDir?: Direction;
  // Metadata
  text?: string;          // Signpost dialogue
  reward?: 'gems' | 'heal' | 'star';
  starIndex?: number;
  colorVariant?: number;
}

export type EnemyKind = 'slime' | 'goblin' | 'fire_imp' | 'skeleton' | 'boss_warden';

export interface Enemy {
  id: string;
  kind: EnemyKind;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  dir: Direction;
  state: 'idle' | 'chase' | 'windup' | 'attack' | 'stunned' | 'cooldown';
  stateTimer: number;
  hitFlash: number;
  animTime: number;
  attackTargetX?: number;
  attackTargetY?: number;
  attackPattern?: number; // For boss patterns
  armorBroken?: boolean;  // Boss vulnerability window
  dropGems: number;
  isMiniBoss?: boolean;
  linkGateId?: string;    // Unlocks gate when defeated
}

export interface Projectile {
  id: string;
  fromPlayer: boolean;
  kind: 'fireball' | 'boulder' | 'shockwave' | 'sword_beam';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  maxLife: number;
  ignites?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity?: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface PlayerState {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  dir: Direction;
  hp: number;
  maxHp: number;
  gems: number;
  comboStep: number;
  comboTimer: number;
  attackTimer: number;
  attackCooldown: number;
  dashTimer: number;
  dashCooldown: number;
  dashDirX: number;
  dashDirY: number;
  invulnTimer: number;
  hitFlash: number;
  animTime: number;
  carryingId: string | null;
  streakHits: number;
  tookDamageInChapter: boolean;
}

export interface ChapterMeta {
  index: number;
  id: string;
  title: string;
  subtitle: string;
  width: number;
  height: number;
  biome: 'forest' | 'ruins' | 'sanctum';
  totalStars: number;
}

export interface HudSnapshot {
  screen: GameScreenState;
  chapterIndex: number;
  chapterTitle: string;
  hp: number;
  maxHp: number;
  gems: number;
  starsCollected: number;
  starsTotal: number;
  enemiesRemaining: number;
  carryingKind: PropKind | null;
  nearbyActionLabel: string | null;
  dashCooldownRatio: number; // 0 = ready, 1 = cooling down
  dialogText: string | null;
  bossName: string | null;
  bossHp: number;
  bossMaxHp: number;
  bossStunned: boolean;
  chapterTimeSec: number;
  streakHits: number;
  chapterStarsFound: number[];
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  points: number;
  target: number;
  icon: 'sword' | 'pot' | 'puzzle' | 'bomb' | 'flame' | 'star' | 'constellation' | 'dash' | 'combo' | 'chest' | 'boss' | 'shield';
}

export interface AchievementProgress {
  unlocked: boolean;
  unlockedAt?: number;
  progress: number;
}

export interface SaveProgress {
  highestUnlockedChapter: number;
  collectedStarIds: string[]; // e.g. "0-0", "0-1"
  bestGems: number;
}

export interface InputState {
  moveX: number;
  moveY: number;
  attackJustPressed: boolean;
  dashJustPressed: boolean;
  interactJustPressed: boolean;
}
