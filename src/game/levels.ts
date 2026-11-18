import { TILE_SIZE, type ChapterMeta, type Enemy, type TileType, type WorldProp } from './types';

export interface LevelData {
  meta: ChapterMeta;
  tiles: TileType[][];
  playerStart: { x: number; y: number };
  props: WorldProp[];
  enemies: Enemy[];
}

const CHAR_MAP: Record<string, TileType> = {
  '.': 'grass',
  ',': 'path',
  'S': 'stone_floor',
  'D': 'dark_floor',
  '#': 'wall',
  'T': 'tree',
  '~': 'water',
  'B': 'bridge',
  '^': 'spikes',
};

function parseGrid(rows: string[]): TileType[][] {
  return rows.map((row) =>
    row.split('').map((ch) => CHAR_MAP[ch] ?? 'grass')
  );
}

function px(tx: number): number {
  return tx * TILE_SIZE;
}

export const CHAPTER_METAS: ChapterMeta[] = [
  {
    index: 0,
    id: 'ch1_forest',
    title: 'Глава 1: Лес Пробуждения',
    subtitle: 'Древние ворота и первые испытания',
    width: 26,
    height: 18,
    biome: 'forest',
    totalStars: 2,
  },
  {
    index: 1,
    id: 'ch2_ruins',
    title: 'Глава 2: Руины Огня',
    subtitle: 'Тайна трёх жаровен и кристаллов',
    width: 28,
    height: 20,
    biome: 'ruins',
    totalStars: 2,
  },
  {
    index: 2,
    id: 'ch3_sanctum',
    title: 'Глава 3: Зал Стража',
    subtitle: 'Испытание титана древних руин',
    width: 26,
    height: 22,
    biome: 'sanctum',
    totalStars: 2,
  },
];

export function buildLevel(chapterIndex: number): LevelData {
  if (chapterIndex === 0) return buildChapter1();
  if (chapterIndex === 1) return buildChapter2();
  return buildChapter3();
}

function buildChapter1(): LevelData {
  // 26 cols x 18 rows
  const grid = [
    'TTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T######T..........T######T',
    'T#SSSS#T..,,,,,,..#SSSSSS#',
    'T#SSSS#...,SSSS,..#SSSSSS#',
    'T#SSSS#...,SSSS,..#SSSSSS#',
    'T######T..#SSSS#..########',
    'T~~~~~~T###SSSS####~~~~~~T',
    'T~~~~~~~~~~BBBB~~~~~~~~~~T',
    'T...,,,,...,,,,...,,,....T',
    'T..,,,,,,..,,,,..,,,,,,..T',
    'T..,,,,,,..,,,,..,,,,,,..T',
    'T...,,,,...,,,,...,,,....T',
    'T...,,,,.........,,,,,...T',
    'T..,,,,,,.......,,,,,,...T',
    'T..,,,,,,.......,,,,,,...T',
    'T..,,,,,,.......,,,,,,...T',
    'T........................T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTT',
  ];

  const tiles = parseGrid(grid);
  // Cracked wall passage at (6,3) and (6,4)
  tiles[3][6] = 'stone_floor';
  tiles[4][6] = 'stone_floor';
  // Passage from center top into courtyard right
  tiles[3][17] = 'path';
  tiles[4][17] = 'path';
  tiles[3][18] = 'stone_floor';
  tiles[4][18] = 'stone_floor';

  const props: WorldProp[] = [
    {
      id: 'sign_1',
      kind: 'signpost',
      x: px(5),
      y: px(13),
      w: 16,
      h: 16,
      text: 'Толкните рунный блок на синюю плиту, чтобы открыть мост. Разбивайте кувшины мечом!',
    },
    {
      id: 'sign_2',
      kind: 'signpost',
      x: px(9),
      y: px(4),
      w: 16,
      h: 16,
      text: 'Поднимите цветок-бомбу и бросьте его в треснувшую стену слева!',
    },
    // Pots
    { id: 'pot_1', kind: 'pot', x: px(2), y: px(12), w: 16, h: 16 },
    { id: 'pot_2', kind: 'pot', x: px(2), y: px(13), w: 16, h: 16 },
    { id: 'pot_3', kind: 'pot', x: px(3), y: px(12), w: 16, h: 16 },
    { id: 'pot_4', kind: 'pot', x: px(14), y: px(14), w: 16, h: 16 },
    { id: 'pot_5', kind: 'pot', x: px(15), y: px(14), w: 16, h: 16 },
    { id: 'pot_6', kind: 'pot', x: px(23), y: px(2), w: 16, h: 16 },
    { id: 'pot_7', kind: 'pot', x: px(24), y: px(2), w: 16, h: 16 },

    // Puzzle 1: Push block onto pressure plate to open bridge gates
    {
      id: 'block_1',
      kind: 'push_block',
      x: px(5),
      y: px(10),
      w: 16,
      h: 16,
    },
    {
      id: 'plate_1',
      kind: 'pressure_plate',
      x: px(9),
      y: px(10),
      w: 16,
      h: 16,
      linkId: 'bridge_gate_1',
    },
    {
      id: 'gate_b1',
      kind: 'locked_gate',
      x: px(11),
      y: px(6),
      w: 16,
      h: 16,
      linkId: 'bridge_gate_1',
      requiredCount: 1,
    },
    {
      id: 'gate_b2',
      kind: 'locked_gate',
      x: px(12),
      y: px(6),
      w: 16,
      h: 16,
      linkId: 'bridge_gate_1',
      requiredCount: 1,
    },
    {
      id: 'gate_b3',
      kind: 'locked_gate',
      x: px(13),
      y: px(6),
      w: 16,
      h: 16,
      linkId: 'bridge_gate_1',
      requiredCount: 1,
    },
    {
      id: 'gate_b4',
      kind: 'locked_gate',
      x: px(14),
      y: px(6),
      w: 16,
      h: 16,
      linkId: 'bridge_gate_1',
      requiredCount: 1,
    },

    // Puzzle 2: Cracked wall + Bomb flower
    { id: 'cw_1', kind: 'cracked_wall', x: px(6), y: px(3), w: 16, h: 16 },
    { id: 'cw_2', kind: 'cracked_wall', x: px(6), y: px(4), w: 16, h: 16 },
    { id: 'bomb_1', kind: 'bomb_flower', x: px(9), y: px(2), w: 16, h: 16, respawnTimer: 0 },

    // Secret grove rewards
    { id: 'star_1_0', kind: 'star_piece', x: px(3), y: px(3), w: 16, h: 16, starIndex: 0 },
    { id: 'chest_1', kind: 'chest', x: px(4), y: px(2), w: 16, h: 16, reward: 'gems' },

    // Bushes hiding Star Piece #2 in bottom-right
    { id: 'bush_1', kind: 'bush', x: px(21), y: px(15), w: 16, h: 16 },
    { id: 'bush_2', kind: 'bush', x: px(21), y: px(16), w: 16, h: 16 },
    { id: 'bush_3', kind: 'bush', x: px(22), y: px(14), w: 16, h: 16 },
    { id: 'star_1_1', kind: 'star_piece', x: px(23), y: px(15), w: 16, h: 16, starIndex: 1 },

    // Courtyard Chest & Exit Portal
    { id: 'chest_2', kind: 'chest', x: px(24), y: px(4), w: 16, h: 16, reward: 'heal' },
    { id: 'portal_1', kind: 'portal', x: px(21), y: px(2), w: 16, h: 16, active: false, linkId: 'ch1_clear' },
  ];

  const enemies: Enemy[] = [
    {
      id: 'slime_1',
      kind: 'slime',
      name: 'Лесной слизень',
      x: px(7),
      y: px(9),
      w: 16,
      h: 16,
      vx: 0,
      vy: 0,
      hp: 30,
      maxHp: 30,
      speed: 28,
      damage: 1,
      dir: 'left',
      state: 'idle',
      stateTimer: 0.6,
      hitFlash: 0,
      animTime: 0,
      dropGems: 5,
    },
    {
      id: 'slime_2',
      kind: 'slime',
      name: 'Лесной слизень',
      x: px(19),
      y: px(11),
      w: 16,
      h: 16,
      vx: 0,
      vy: 0,
      hp: 30,
      maxHp: 30,
      speed: 28,
      damage: 1,
      dir: 'left',
      state: 'idle',
      stateTimer: 0.8,
      hitFlash: 0,
      animTime: 0.4,
      dropGems: 5,
    },
    {
      id: 'goblin_1',
      kind: 'goblin',
      name: 'Гоблин-разведчик',
      x: px(19),
      y: px(4),
      w: 16,
      h: 16,
      vx: 0,
      vy: 0,
      hp: 45,
      maxHp: 45,
      speed: 44,
      damage: 1,
      dir: 'left',
      state: 'idle',
      stateTimer: 0.5,
      hitFlash: 0,
      animTime: 0,
      dropGems: 10,
    },
    {
      id: 'goblin_capt',
      kind: 'goblin',
      name: 'Капитан гоблинов',
      x: px(22),
      y: px(3),
      w: 16,
      h: 16,
      vx: 0,
      vy: 0,
      hp: 75,
      maxHp: 75,
      speed: 48,
      damage: 2,
      dir: 'left',
      state: 'idle',
      stateTimer: 0.7,
      hitFlash: 0,
      animTime: 0.2,
      dropGems: 25,
      isMiniBoss: true,
      linkGateId: 'ch1_clear',
    },
  ];

  return {
    meta: CHAPTER_METAS[0],
    tiles,
    playerStart: { x: px(3), y: px(14) },
    props,
    enemies,
  };
}

function buildChapter2(): LevelData {
  // 28 cols x 20 rows
  const grid = [
    '############################',
    '#SSSSSSSSSSSSDDSSSSSSSSSSSS#',
    '#SSSS#SS#SSSSDDSSSS#SSSSSSS#',
    '#SSSS#SSSSSSSSSSSSS#SSSSSSS#',
    '#SSSS#SSSSSSSSSSSSS#SSSSSSS#',
    '#SSSS####SSSSSSSSSS####SSSS#',
    '#SSSSSSSSSSSSSSSSSSSSSSSSSS#',
    '#SSSSSSSS~~~~SS~~~~SSSSSSSS#',
    '#SSSSSSSS~~~~SS~~~~SSSSSSSS#',
    '#SSSSBBBBSSSSSSSSSSBBBBSSSS#',
    '#SSSSSSSSSSSSSSSSSSSSSSSSSS#',
    '#SSSSSSSS##SSSSSS##SSSSSSSS#',
    '#SSSSSSSS##SSSSSS##SSSSSSSS#',
    '#SSSSSSSSSSSSSSSSSSSSSSSSSS#',
    '#~~~~SSSSSSSSSSSSSSSSSS~~~~#',
    '#~~~~SSSSSSSSSSSSSSSSSS~~~~#',
    '#SSSS##SSSSSSSSSSSSSS#S#####',
    '#SSSS##SSSSSSSSSSSSSS#SSSSS#',
    '#SSSSSSSSSSSSSSSSSSSS#SSSSS#',
    '############################',
  ];

  const tiles = parseGrid(grid);
  // Carve north-center portal sanctuary
  tiles[1][13] = 'dark_floor';
  tiles[1][14] = 'dark_floor';
  tiles[2][13] = 'dark_floor';
  tiles[2][14] = 'dark_floor';
  tiles[3][13] = 'dark_floor';
  tiles[3][14] = 'dark_floor';
  // Left cracked wall room access at (5,3) & (5,4)
  tiles[3][5] = 'stone_floor';
  tiles[4][5] = 'stone_floor';

  const props: WorldProp[] = [
    {
      id: 'sign_2_1',
      kind: 'signpost',
      x: px(12),
      y: px(17),
      w: 16,
      h: 16,
      text: 'Возьмите пылающий факел и зажгите все 3 жаровни в руинах, чтобы открыть северные врата!',
    },
    // Torch stand (carryable fire source!)
    { id: 'torch_1', kind: 'torch_stand', x: px(14), y: px(16), w: 16, h: 16 },
    // 3 Unlit Braziers
    { id: 'brazier_1', kind: 'brazier', x: px(4), y: px(11), w: 16, h: 16, active: false, linkId: 'fire_vault' },
    { id: 'brazier_2', kind: 'brazier', x: px(11), y: px(4), w: 16, h: 16, active: false, linkId: 'fire_vault' },
    { id: 'brazier_3', kind: 'brazier', x: px(24), y: px(11), w: 16, h: 16, active: false, linkId: 'fire_vault' },

    // Vault Locked Gate at north center (cols 13, 14 row 3)
    { id: 'vgate_1', kind: 'locked_gate', x: px(13), y: px(3), w: 16, h: 16, linkId: 'fire_vault', requiredCount: 3 },
    { id: 'vgate_2', kind: 'locked_gate', x: px(14), y: px(3), w: 16, h: 16, linkId: 'fire_vault', requiredCount: 3 },
    { id: 'portal_2', kind: 'portal', x: px(13), y: px(1), w: 16, h: 16, active: true },

    // Crystal Switch + Toggle Gate in bottom-right vault (col 22 row 16)
    { id: 'cswitch_1', kind: 'crystal_switch', x: px(19), y: px(15), w: 16, h: 16, active: true, linkId: 'crys_1' },
    { id: 'tgate_b1', kind: 'toggle_gate', x: px(22), y: px(16), w: 16, h: 16, linkId: 'crys_1', gateGroup: 'B', active: false },
    { id: 'star_2_0', kind: 'star_piece', x: px(24), y: px(17), w: 16, h: 16, starIndex: 0 },
    { id: 'chest_2_1', kind: 'chest', x: px(25), y: px(17), w: 16, h: 16, reward: 'gems' },

    // Top-left Cracked wall + Bomb flower secret
    { id: 'cw_2_1', kind: 'cracked_wall', x: px(5), y: px(3), w: 16, h: 16 },
    { id: 'cw_2_2', kind: 'cracked_wall', x: px(5), y: px(4), w: 16, h: 16 },
    { id: 'bomb_2_1', kind: 'bomb_flower', x: px(7), y: px(6), w: 16, h: 16, respawnTimer: 0 },
    { id: 'star_2_1', kind: 'star_piece', x: px(2), y: px(2), w: 16, h: 16, starIndex: 1 },
    { id: 'chest_2_2', kind: 'chest', x: px(3), y: px(2), w: 16, h: 16, reward: 'heal' },

    // Pots
    { id: 'pot_2_1', kind: 'pot', x: px(10), y: px(17), w: 16, h: 16 },
    { id: 'pot_2_2', kind: 'pot', x: px(11), y: px(17), w: 16, h: 16 },
    { id: 'pot_2_3', kind: 'pot', x: px(2), y: px(17), w: 16, h: 16 },
    { id: 'pot_2_4', kind: 'pot', x: px(25), y: px(2), w: 16, h: 16 },
  ];

  const enemies: Enemy[] = [
    {
      id: 'imp_1',
      kind: 'fire_imp',
      name: 'Огненный бес',
      x: px(5),
      y: px(10),
      w: 16,
      h: 16,
      vx: 0,
      vy: 0,
      hp: 45,
      maxHp: 45,
      speed: 38,
      damage: 1,
      dir: 'down',
      state: 'idle',
      stateTimer: 1.0,
      hitFlash: 0,
      animTime: 0,
      dropGems: 12,
    },
    {
      id: 'imp_2',
      kind: 'fire_imp',
      name: 'Огненный бес',
      x: px(23),
      y: px(6),
      w: 16,
      h: 16,
      vx: 0,
      vy: 0,
      hp: 45,
      maxHp: 45,
      speed: 38,
      damage: 1,
      dir: 'left',
      state: 'idle',
      stateTimer: 1.2,
      hitFlash: 0,
      animTime: 0.4,
      dropGems: 12,
    },
    {
      id: 'skel_1',
      kind: 'skeleton',
      name: 'Страж-скелет',
      x: px(14),
      y: px(9),
      w: 16,
      h: 16,
      vx: 0,
      vy: 0,
      hp: 65,
      maxHp: 65,
      speed: 36,
      damage: 2,
      dir: 'down',
      state: 'idle',
      stateTimer: 0.7,
      hitFlash: 0,
      animTime: 0,
      dropGems: 15,
    },
    {
      id: 'skel_2',
      kind: 'skeleton',
      name: 'Страж-скелет',
      x: px(17),
      y: px(4),
      w: 16,
      h: 16,
      vx: 0,
      vy: 0,
      hp: 65,
      maxHp: 65,
      speed: 36,
      damage: 2,
      dir: 'left',
      state: 'idle',
      stateTimer: 0.9,
      hitFlash: 0,
      animTime: 0.3,
      dropGems: 15,
    },
  ];

  return {
    meta: CHAPTER_METAS[1],
    tiles,
    playerStart: { x: px(13), y: px(18) },
    props,
    enemies,
  };
}

function buildChapter3(): LevelData {
  // 26 cols x 22 rows
  const grid = [
    '##########################',
    '#DDDDDDDDDDDDDDDDDDDDDDDD#',
    '#DDDDDDDDDD####DDDDDDDDDD#',
    '#DDDDDDDDDDDDDDDDDDDDDDDD#',
    '#DDDDDDDDDDDDDDDDDDDDDDDD#',
    '#DDDDDDDDDDDDDDDDDDDDDDDD#',
    '#DDDDDDDDDDDDDDDDDDDDDDDD#',
    '#DDDDDDDDDDDDDDDDDDDDDDDD#',
    '#DDDDDDDDDDDDDDDDDDDDDDDD#',
    '#DDDDDDDDDDDDDDDDDDDDDDDD#',
    '#DDDDDDDDDDDDDDDDDDDDDDDD#',
    '############DD############',
    '#SSSSSSSSSS#DD#SSSSSSSSSS#',
    '#SSSSSSSSSS#DD#SSSSSSSSSS#',
    '#SSSSSSSSSS#DD#SSSSSSSSSS#',
    '#SSSSSSSSSS#DD#SSSSSS#####',
    '#SSSSSSSSSSSDDSSSSSSS#SSS#',
    '#SSSSSSSSSSSDDSSSSSSS#SSS#',
    '#SSSSSSSSSSSDDSSSSSSS#SSS#',
    '#SSSSSSSSSSSDDSSSSSSS#SSS#',
    '#SSSSSSSSSSSDDSSSSSSS#SSS#',
    '##########################',
  ];

  const tiles = parseGrid(grid);
  // Secret room behind cracked wall at (21,16) & (21,17)
  tiles[16][21] = 'stone_floor';
  tiles[17][21] = 'stone_floor';
  // Crown alcove at top center
  tiles[1][11] = 'dark_floor';
  tiles[1][12] = 'dark_floor';
  tiles[1][13] = 'dark_floor';
  tiles[1][14] = 'dark_floor';
  tiles[2][11] = 'dark_floor';
  tiles[2][12] = 'dark_floor';
  tiles[2][13] = 'dark_floor';
  tiles[2][14] = 'dark_floor';

  const props: WorldProp[] = [
    {
      id: 'sign_3_1',
      kind: 'signpost',
      x: px(11),
      y: px(18),
      w: 16,
      h: 16,
      text: 'Чтобы открыть зал Босса: поставьте блок на плиту слева И зажгите жаровню справа!',
    },
    {
      id: 'sign_3_boss',
      kind: 'signpost',
      x: px(10),
      y: px(10),
      w: 16,
      h: 16,
      text: 'Совет: бросайте цветы-бомбы в Каменного Стража, чтобы разрушить его броню!',
    },
    // Left Trial: Push Block -> Plate
    { id: 'block_3', kind: 'push_block', x: px(4), y: px(16), w: 16, h: 16 },
    { id: 'plate_3', kind: 'pressure_plate', x: px(8), y: px(16), w: 16, h: 16, linkId: 'boss_door' },
    // Right Trial: Torch -> Brazier
    { id: 'torch_3', kind: 'torch_stand', x: px(16), y: px(19), w: 16, h: 16 },
    { id: 'brazier_3_1', kind: 'brazier', x: px(18), y: px(14), w: 16, h: 16, active: false, linkId: 'boss_door' },
    // Boss Doors
    { id: 'bgate_1', kind: 'locked_gate', x: px(12), y: px(11), w: 16, h: 16, linkId: 'boss_door', requiredCount: 2 },
    { id: 'bgate_2', kind: 'locked_gate', x: px(13), y: px(11), w: 16, h: 16, linkId: 'boss_door', requiredCount: 2 },

    // Secret Bomb Room in right wing
    { id: 'cw_3_1', kind: 'cracked_wall', x: px(21), y: px(16), w: 16, h: 16 },
    { id: 'cw_3_2', kind: 'cracked_wall', x: px(21), y: px(17), w: 16, h: 16 },
    { id: 'bomb_3_trial', kind: 'bomb_flower', x: px(19), y: px(18), w: 16, h: 16, respawnTimer: 0 },
    { id: 'star_3_0', kind: 'star_piece', x: px(23), y: px(16), w: 16, h: 16, starIndex: 0 },
    { id: 'chest_3_1', kind: 'chest', x: px(23), y: px(18), w: 16, h: 16, reward: 'heal' },

    // Pots
    { id: 'pot_3_1', kind: 'pot', x: px(2), y: px(13), w: 16, h: 16 },
    { id: 'pot_3_2', kind: 'pot', x: px(3), y: px(13), w: 16, h: 16 },
    { id: 'pot_3_3', kind: 'pot', x: px(2), y: px(19), w: 16, h: 16 },

    // Boss Arena Respawning Bomb Flowers (4 corners!)
    { id: 'bbomb_1', kind: 'bomb_flower', x: px(3), y: px(3), w: 16, h: 16, respawnTimer: 0 },
    { id: 'bbomb_2', kind: 'bomb_flower', x: px(22), y: px(3), w: 16, h: 16, respawnTimer: 0 },
    { id: 'bbomb_3', kind: 'bomb_flower', x: px(3), y: px(9), w: 16, h: 16, respawnTimer: 0 },
    { id: 'bbomb_4', kind: 'bomb_flower', x: px(22), y: px(9), w: 16, h: 16, respawnTimer: 0 },

    // Victory Rewards behind Boss
    { id: 'star_3_1', kind: 'star_piece', x: px(11), y: px(1), w: 16, h: 16, starIndex: 1 },
    { id: 'chest_3_crown', kind: 'chest', x: px(14), y: px(1), w: 16, h: 16, reward: 'gems' },
    { id: 'portal_3', kind: 'portal', x: px(12), y: px(1), w: 16, h: 16, active: false, linkId: 'ch3_clear' },
  ];

  const enemies: Enemy[] = [
    {
      id: 'skel_3_1',
      kind: 'skeleton',
      name: 'Рыцарь праха',
      x: px(6),
      y: px(14),
      w: 16,
      h: 16,
      vx: 0,
      vy: 0,
      hp: 55,
      maxHp: 55,
      speed: 35,
      damage: 1,
      dir: 'down',
      state: 'idle',
      stateTimer: 0.7,
      hitFlash: 0,
      animTime: 0,
      dropGems: 15,
    },
    {
      id: 'boss_warden',
      kind: 'boss_warden',
      name: 'Каменный Страж',
      x: px(12),
      y: px(5),
      w: 32,
      h: 32,
      vx: 0,
      vy: 0,
      hp: 340,
      maxHp: 340,
      speed: 28,
      damage: 2,
      dir: 'down',
      state: 'idle',
      stateTimer: 1.2,
      hitFlash: 0,
      animTime: 0,
      dropGems: 100,
      isMiniBoss: true,
      linkGateId: 'ch3_clear',
    },
  ];

  return {
    meta: CHAPTER_METAS[2],
    tiles,
    playerStart: { x: px(12), y: px(19) },
    props,
    enemies,
  };
}
