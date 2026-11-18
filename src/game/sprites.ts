import { TILE_SIZE, type Direction, type Enemy, type PlayerState, type Projectile, type TileType, type WorldProp } from './types';

function hash2D(x: number, y: number): number {
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: TileType,
  tx: number,
  ty: number,
  time: number,
  biome: 'forest' | 'ruins' | 'sanctum'
) {
  const x = tx * TILE_SIZE;
  const y = ty * TILE_SIZE;
  const rnd = hash2D(tx, ty);

  if (tile === 'grass') {
    ctx.fillStyle = biome === 'forest' ? '#2d6a3e' : '#2c5841';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    // Subtle checkerboard pixel grass texture
    ctx.fillStyle = biome === 'forest' ? '#357947' : '#33654a';
    if ((tx + ty) % 2 === 0) {
      ctx.fillRect(x + 2, y + 2, 4, 2);
      ctx.fillRect(x + 10, y + 10, 4, 2);
    }
    if (rnd > 0.72) {
      ctx.fillStyle = '#489657';
      ctx.fillRect(x + Math.floor(rnd * 10) + 2, y + 4, 2, 3);
      ctx.fillRect(x + Math.floor(rnd * 10) + 4, y + 5, 2, 2);
    }
    if (rnd > 0.91 && biome === 'forest') {
      // Tiny wildflower
      ctx.fillStyle = rnd > 0.96 ? '#fde047' : '#f472b6';
      ctx.fillRect(x + 6, y + 8, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 7, y + 7, 1, 1);
    }
    return;
  }

  if (tile === 'path') {
    ctx.fillStyle = biome === 'forest' ? '#7c6549' : '#655c54';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = biome === 'forest' ? '#937857' : '#7a6f64';
    ctx.fillRect(x + 2, y + 2, 5, 4);
    ctx.fillRect(x + 9, y + 8, 5, 5);
    ctx.fillStyle = biome === 'forest' ? '#635039' : '#504942';
    ctx.fillRect(x + 8, y + 3, 4, 3);
    ctx.fillRect(x + 2, y + 10, 4, 3);
    return;
  }

  if (tile === 'stone_floor') {
    const base = biome === 'sanctum' ? '#3b4252' : '#4a5568';
    const hi = biome === 'sanctum' ? '#4c566a' : '#5b687d';
    const lo = biome === 'sanctum' ? '#2e3440' : '#353e4d';
    ctx.fillStyle = base;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = hi;
    ctx.fillRect(x + 1, y + 1, 6, 6);
    ctx.fillRect(x + 9, y + 9, 6, 6);
    ctx.fillStyle = lo;
    ctx.fillRect(x, y + 7, TILE_SIZE, 1);
    ctx.fillRect(x + 7, y, 1, TILE_SIZE);
    if (rnd > 0.86) {
      ctx.fillStyle = '#3f6e4b';
      ctx.fillRect(x + 2, y + 12, 3, 2);
    }
    return;
  }

  if (tile === 'dark_floor') {
    ctx.fillStyle = '#1f2633';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#283142';
    ctx.fillRect(x + 1, y + 1, 14, 14);
    ctx.fillStyle = '#161b24';
    ctx.fillRect(x + 14, y, 2, TILE_SIZE);
    ctx.fillRect(x, y + 14, TILE_SIZE, 2);
    if ((tx + ty) % 3 === 0) {
      ctx.fillStyle = '#2f3a4f';
      ctx.fillRect(x + 4, y + 4, 8, 8);
    }
    return;
  }

  if (tile === 'water') {
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    const wave = Math.floor(time * 3 + tx * 0.7 + ty * 0.5) % 4;
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(x, y + 2, TILE_SIZE, 12);
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(x + ((wave * 3) % 10) + 1, y + 4, 5, 1);
    ctx.fillRect(x + ((12 - wave * 3) % 10) + 2, y + 11, 4, 1);
    return;
  }

  if (tile === 'bridge') {
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(x, y + 1, TILE_SIZE, TILE_SIZE - 2);
    ctx.fillStyle = '#8b5a2b';
    for (let px = 0; px < 16; px += 4) {
      ctx.fillRect(x + px, y + 2, 3, TILE_SIZE - 4);
    }
    ctx.fillStyle = '#4a2e14';
    ctx.fillRect(x, y + 1, TILE_SIZE, 2);
    ctx.fillRect(x, y + TILE_SIZE - 3, TILE_SIZE, 2);
    return;
  }

  if (tile === 'spikes') {
    ctx.fillStyle = '#353e4d';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#1e242e';
    ctx.fillRect(x + 2, y + 2, 12, 12);
    // Metal spikes
    const offsets = [
      [3, 3], [9, 3],
      [3, 9], [9, 9],
    ];
    for (const [ox, oy] of offsets) {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(x + ox + 1, y + oy, 2, 4);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(x + ox + 1, y + oy, 1, 2);
      ctx.fillStyle = '#475569';
      ctx.fillRect(x + ox, y + oy + 3, 4, 1);
    }
    return;
  }

  if (tile === 'wall') {
    const top = biome === 'sanctum' ? '#4c566a' : '#64748b';
    const face = biome === 'sanctum' ? '#2e3440' : '#475569';
    const dark = '#1e293b';
    ctx.fillStyle = dark;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = top;
    ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, 9);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x + 2, y + 2, 5, 3);
    ctx.fillRect(x + 9, y + 2, 5, 3);
    ctx.fillStyle = face;
    ctx.fillRect(x + 1, y + 10, TILE_SIZE - 2, 5);
    if (rnd > 0.78) {
      ctx.fillStyle = biome === 'sanctum' ? '#38bdf8' : '#4d7c0f';
      ctx.fillRect(x + 6, y + 11, 3, 2);
    }
    return;
  }

  if (tile === 'tree') {
    // Grass base
    ctx.fillStyle = '#265934';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    // Trunk
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(x + 6, y + 11, 4, 5);
    // Canopy shadow
    ctx.fillStyle = '#143820';
    ctx.fillRect(x + 1, y + 3, 14, 10);
    // Main foliage
    ctx.fillStyle = '#1e522e';
    ctx.fillRect(x + 2, y + 1, 12, 10);
    // Highlights
    ctx.fillStyle = '#2d7a43';
    ctx.fillRect(x + 3, y + 2, 9, 6);
    ctx.fillStyle = '#47a45a';
    ctx.fillRect(x + 4, y + 2, 5, 3);
    return;
  }
}

export function drawProp(ctx: CanvasRenderingContext2D, prop: WorldProp, time: number) {
  if (prop.broken) return;
  const x = Math.round(prop.x);
  const y = Math.round(prop.y - (prop.z || 0));

  switch (prop.kind) {
    case 'pressure_plate': {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x + 1, y + 1, 14, 14);
      ctx.fillStyle = prop.active ? '#0ea5e9' : '#64748b';
      ctx.fillRect(x + 2, y + (prop.active ? 3 : 2), 12, 11);
      ctx.fillStyle = prop.active ? '#7dd3fc' : '#94a3b8';
      ctx.fillRect(x + 4, y + (prop.active ? 5 : 4), 8, 7);
      break;
    }

    case 'pot': {
      if (!prop.carried) {
        ctx.fillStyle = 'rgba(0,0,0,0.32)';
        ctx.fillRect(x + 3, Math.round(prop.y) + 12, 10, 3);
      }
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(x + 3, y + 4, 10, 10);
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(x + 4, y + 5, 8, 8);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(x + 5, y + 6, 3, 5);
      // Rim
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(x + 4, y + 2, 8, 3);
      ctx.fillStyle = '#431407';
      ctx.fillRect(x + 5, y + 2, 6, 1);
      break;
    }

    case 'bush': {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(x + 2, y + 12, 12, 3);
      ctx.fillStyle = '#14532d';
      ctx.fillRect(x + 2, y + 3, 12, 11);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(x + 3, y + 4, 10, 8);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(x + 4, y + 4, 5, 4);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(x + 10, y + 7, 2, 2);
      ctx.fillRect(x + 5, y + 9, 2, 2);
      break;
    }

    case 'bomb_flower': {
      if (!prop.carried) {
        ctx.fillStyle = 'rgba(0,0,0,0.32)';
        ctx.fillRect(x + 3, Math.round(prop.y) + 12, 10, 3);
      }
      // Leaves
      ctx.fillStyle = '#15803d';
      ctx.fillRect(x + 2, y + 10, 12, 4);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(x + 3, y + 9, 4, 3);
      ctx.fillRect(x + 9, y + 9, 4, 3);
      // Bomb bulb (flashes fast when fuse active)
      const flash = prop.fuseTimer !== undefined && prop.fuseTimer > 0 && Math.floor(prop.fuseTimer * 14) % 2 === 0;
      ctx.fillStyle = flash ? '#fef08a' : '#1e293b';
      ctx.fillRect(x + 4, y + 3, 8, 8);
      ctx.fillStyle = flash ? '#ffffff' : '#334155';
      ctx.fillRect(x + 5, y + 4, 3, 3);
      // Glowing ember fuse
      ctx.fillStyle = Math.floor(time * 10) % 2 === 0 ? '#f97316' : '#facc15';
      ctx.fillRect(x + 7, y + 1, 2, 3);
      break;
    }

    case 'torch_stand': {
      if (!prop.carried) {
        ctx.fillStyle = 'rgba(0,0,0,0.32)';
        ctx.fillRect(x + 4, Math.round(prop.y) + 12, 8, 3);
      }
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x + 6, y + 6, 4, 8);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(x + 5, y + 5, 6, 3);
      // Flame
      const f = Math.floor(time * 12) % 3;
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(x + 5, y + 1, 6, 5);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(x + 6 + (f === 1 ? 1 : 0), y + (f === 2 ? 0 : 1), 4, 4);
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(x + 7, y + 3, 2, 2);
      break;
    }

    case 'push_block': {
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(x + 1, y + 13, 14, 3);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x + 1, y + 1, 14, 14);
      ctx.fillStyle = '#475569';
      ctx.fillRect(x + 2, y + 2, 12, 12);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x + 2, y + 2, 12, 4);
      // Glowing rune symbol
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x + 6, y + 6, 4, 4);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(x + 7, y + 7, 2, 2);
      break;
    }

    case 'brazier': {
      ctx.fillStyle = 'rgba(0,0,0,0.36)';
      ctx.fillRect(x + 2, y + 12, 12, 3);
      ctx.fillStyle = '#334155';
      ctx.fillRect(x + 3, y + 6, 10, 8);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x + 2, y + 5, 12, 3);
      if (prop.active) {
        const flick = Math.floor(time * 11) % 3;
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(x + 4, y, 8, 6);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(x + 5 + (flick === 1 ? 1 : 0), y + 1, 5, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 7, y + 3, 2, 2);
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x + 4, y + 4, 8, 2);
      }
      break;
    }

    case 'crystal_switch': {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + 3, y + 12, 10, 3);
      ctx.fillStyle = '#475569';
      ctx.fillRect(x + 3, y + 9, 10, 5);
      const isA = !!prop.active;
      ctx.fillStyle = isA ? '#0284c7' : '#dc2626';
      ctx.fillRect(x + 5, y + 2, 6, 8);
      ctx.fillStyle = isA ? '#7dd3fc' : '#fca5a5';
      ctx.fillRect(x + 6, y + 3, 2, 5);
      break;
    }

    case 'toggle_gate': {
      const raised = !prop.active;
      if (!raised) {
        // Recessed flat pegs
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x + 2, y + 2, 12, 12);
        ctx.fillStyle = prop.gateGroup === 'A' ? '#075985' : '#7f1d1d';
        ctx.fillRect(x + 4, y + 4, 8, 8);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x + 1, y + 13, 14, 3);
        ctx.fillStyle = prop.gateGroup === 'A' ? '#0284c7' : '#dc2626';
        ctx.fillRect(x + 1, y + 1, 14, 13);
        ctx.fillStyle = prop.gateGroup === 'A' ? '#38bdf8' : '#f87171';
        ctx.fillRect(x + 3, y + 2, 10, 5);
      }
      break;
    }

    case 'cracked_wall': {
      ctx.fillStyle = '#334155';
      ctx.fillRect(x, y, 16, 16);
      ctx.fillStyle = '#475569';
      ctx.fillRect(x + 1, y + 1, 14, 10);
      // Cracks
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x + 7, y + 2, 2, 5);
      ctx.fillRect(x + 5, y + 6, 3, 2);
      ctx.fillRect(x + 8, y + 8, 2, 6);
      ctx.fillRect(x + 3, y + 11, 4, 2);
      break;
    }

    case 'locked_gate': {
      if (prop.active) {
        // Open floor threshold
        ctx.fillStyle = '#334155';
        ctx.fillRect(x, y + 12, 16, 4);
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, 16, 16);
        // Iron bars
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x + 2, y + 1, 2, 14);
        ctx.fillRect(x + 7, y + 1, 2, 14);
        ctx.fillRect(x + 12, y + 1, 2, 14);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(x + 1, y + 5, 14, 2);
        // Padlock rune
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x + 6, y + 6, 4, 5);
      }
      break;
    }

    case 'chest': {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + 2, y + 12, 12, 3);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x + 2, y + 4, 12, 10);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(x + 3, y + 5, 10, 8);
      if (prop.active) {
        // Opened
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(x + 3, y + 6, 10, 4);
      } else {
        // Gold trim
        ctx.fillStyle = '#facc15';
        ctx.fillRect(x + 2, y + 7, 12, 2);
        ctx.fillRect(x + 7, y + 7, 2, 4);
      }
      break;
    }

    case 'star_piece': {
      const bob = Math.round(Math.sin(time * 5) * 2);
      ctx.fillStyle = 'rgba(250, 204, 21, 0.28)';
      ctx.fillRect(x + 3, y + 12, 10, 3);
      // Radiant yellow/cyan Guardian-style star piece
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x + 6, y + 2 + bob, 4, 11);
      ctx.fillRect(x + 2, y + 6 + bob, 12, 4);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(x + 7, y + 3 + bob, 2, 9);
      ctx.fillRect(x + 4, y + 7 + bob, 8, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 7, y + 6 + bob, 2, 2);
      break;
    }

    case 'signpost': {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x + 5, y + 12, 6, 3);
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(x + 7, y + 8, 2, 6);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(x + 2, y + 2, 12, 7);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(x + 3, y + 3, 10, 5);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(x + 4, y + 4, 8, 1);
      ctx.fillRect(x + 4, y + 6, 6, 1);
      break;
    }

    case 'portal': {
      const pulse = Math.sin(time * 5) * 1.5;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x + 1, y + 1, 14, 14);
      if (prop.active) {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(x + 2, y + 2, 12, 12);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x + 4, y + 4, 8, 8);
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(x + 6 + Math.round(pulse * 0.5), y + 6, 4, 4);
      } else {
        ctx.fillStyle = '#334155';
        ctx.fillRect(x + 3, y + 3, 10, 10);
      }
      break;
    }

    case 'heart_drop': {
      const bob = Math.round(Math.sin(time * 6) * 1.5);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(x + 5, y + 12, 6, 2);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x + 4, y + 5 + bob, 3, 3);
      ctx.fillRect(x + 9, y + 5 + bob, 3, 3);
      ctx.fillRect(x + 4, y + 7 + bob, 8, 3);
      ctx.fillRect(x + 6, y + 10 + bob, 4, 2);
      ctx.fillStyle = '#fecaca';
      ctx.fillRect(x + 5, y + 6 + bob, 1, 1);
      break;
    }

    case 'gem_drop': {
      const bob = Math.round(Math.sin(time * 6 + x) * 1.5);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x + 5, y + 12, 6, 2);
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(x + 5, y + 4 + bob, 6, 7);
      ctx.fillStyle = '#c4b5fd';
      ctx.fillRect(x + 6, y + 5 + bob, 2, 4);
      break;
    }
  }
}

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  time: number
) {
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  const moving = Math.abs(player.vx) > 4 || Math.abs(player.vy) > 4;
  const walkBob = moving ? (Math.floor(player.animTime * 10) % 2 === 0 ? -1 : 0) : 0;

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.36)';
  ctx.fillRect(x + 2, y + 13, 12, 3);

  // Dash ghost afterimage
  if (player.dashTimer > 0) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.fillRect(x - player.dashDirX * 5 + 3, y - player.dashDirY * 5 + 2, 10, 12);
  }

  // Blink if invulnerable
  if (player.invulnTimer > 0 && player.hitFlash <= 0 && Math.floor(time * 20) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  const flash = player.hitFlash > 0;

  // Flowing royal blue cape
  const capeSway = moving ? (Math.floor(player.animTime * 12) % 2 === 0 ? 1 : -1) : 0;
  ctx.fillStyle = flash ? '#ffffff' : '#1d4ed8';
  if (player.dir === 'up') {
    ctx.fillRect(x + 3, y + 6 + walkBob, 10, 7);
    ctx.fillStyle = flash ? '#ffffff' : '#3b82f6';
    ctx.fillRect(x + 4, y + 7 + walkBob, 8, 5);
  } else {
    ctx.fillRect(x + 2 + capeSway, y + 7 + walkBob, 12, 6);
  }

  // Boots
  ctx.fillStyle = flash ? '#ffffff' : '#334155';
  const stepL = moving && Math.floor(player.animTime * 10) % 2 === 0 ? -1 : 0;
  const stepR = moving && Math.floor(player.animTime * 10) % 2 === 1 ? -1 : 0;
  ctx.fillRect(x + 4, y + 12 + stepL, 3, 3);
  ctx.fillRect(x + 9, y + 12 + stepR, 3, 3);

  // Armor torso
  ctx.fillStyle = flash ? '#ffffff' : '#94a3b8';
  ctx.fillRect(x + 4, y + 7 + walkBob, 8, 6);
  ctx.fillStyle = flash ? '#ffffff' : '#e2e8f0';
  ctx.fillRect(x + 5, y + 8 + walkBob, 6, 3);

  // Helmet / Head (chibi proportions)
  ctx.fillStyle = flash ? '#ffffff' : '#64748b';
  ctx.fillRect(x + 3, y + 1 + walkBob, 10, 7);
  ctx.fillStyle = flash ? '#ffffff' : '#cbd5e1';
  ctx.fillRect(x + 4, y + 1 + walkBob, 8, 5);
  // Gold crest
  ctx.fillStyle = flash ? '#ffffff' : '#facc15';
  ctx.fillRect(x + 7, y + walkBob, 2, 2);

  // Visor & Face
  if (player.dir !== 'up') {
    ctx.fillStyle = flash ? '#ffffff' : '#0f172a';
    const vx = player.dir === 'left' ? x + 3 : player.dir === 'right' ? x + 7 : x + 4;
    const vw = player.dir === 'down' ? 8 : 6;
    ctx.fillRect(vx, y + 4 + walkBob, vw, 3);
    // Bright eyes
    ctx.fillStyle = flash ? '#ffffff' : '#38bdf8';
    if (player.dir === 'down') {
      ctx.fillRect(x + 5, y + 5 + walkBob, 2, 1);
      ctx.fillRect(x + 9, y + 5 + walkBob, 2, 1);
    } else if (player.dir === 'left') {
      ctx.fillRect(x + 4, y + 5 + walkBob, 2, 1);
    } else {
      ctx.fillRect(x + 10, y + 5 + walkBob, 2, 1);
    }
  }

  // Held sword when not carrying
  if (!player.carryingId && player.attackTimer <= 0) {
    ctx.fillStyle = flash ? '#ffffff' : '#facc15';
    if (player.dir === 'left') {
      ctx.fillRect(x + 1, y + 8 + walkBob, 3, 2);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(x - 2, y + 5 + walkBob, 3, 3);
    } else if (player.dir === 'right') {
      ctx.fillRect(x + 12, y + 8 + walkBob, 3, 2);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(x + 15, y + 5 + walkBob, 3, 3);
    } else if (player.dir === 'down') {
      ctx.fillRect(x + 12, y + 9 + walkBob, 2, 4);
    }
  }

  // Sword slash arc!
  if (player.attackTimer > 0) {
    drawSwordSlash(ctx, player);
  }

  ctx.globalAlpha = 1;
}

function drawSwordSlash(ctx: CanvasRenderingContext2D, player: PlayerState) {
  const cx = Math.round(player.x + player.w / 2);
  const cy = Math.round(player.y + player.h / 2);
  const heavy = player.comboStep === 2;
  const radius = heavy ? 22 : 17;

  let startAngle = 0;
  let endAngle = Math.PI;
  if (player.dir === 'down') {
    startAngle = 0.15 * Math.PI;
    endAngle = 0.85 * Math.PI;
  } else if (player.dir === 'up') {
    startAngle = 1.15 * Math.PI;
    endAngle = 1.85 * Math.PI;
  } else if (player.dir === 'left') {
    startAngle = 0.65 * Math.PI;
    endAngle = 1.35 * Math.PI;
  } else {
    startAngle = -0.35 * Math.PI;
    endAngle = 0.35 * Math.PI;
  }

  ctx.save();
  ctx.lineWidth = heavy ? 5 : 3.5;
  ctx.strokeStyle = heavy ? '#facc15' : '#38bdf8';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 2, startAngle + 0.15, endAngle - 0.15);
  ctx.stroke();
  ctx.restore();
}

export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) {
  const x = Math.round(enemy.x);
  const y = Math.round(enemy.y);
  const flash = enemy.hitFlash > 0;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x + 2, y + enemy.h - 2, enemy.w - 4, 3);

  // Windup exclamation indicator!
  if (enemy.state === 'windup') {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + Math.floor(enemy.w / 2) - 1, y - 9, 2, 5);
    ctx.fillRect(x + Math.floor(enemy.w / 2) - 1, y - 3, 2, 2);
  } else if (enemy.state === 'stunned') {
    const sx = Math.round(Math.sin(time * 10) * 4);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(x + Math.floor(enemy.w / 2) + sx - 1, y - 6, 2, 2);
    ctx.fillRect(x + Math.floor(enemy.w / 2) - sx - 1, y - 6, 2, 2);
  }

  if (enemy.kind === 'slime') {
    const squash = enemy.state === 'windup' ? 3 : Math.round(Math.sin(enemy.animTime * 8) * 1.5);
    ctx.fillStyle = flash ? '#ffffff' : '#15803d';
    ctx.fillRect(x + 2, y + 4 + squash, 12, 10 - squash);
    ctx.fillStyle = flash ? '#ffffff' : '#22c55e';
    ctx.fillRect(x + 3, y + 5 + squash, 10, 7 - squash);
    ctx.fillStyle = flash ? '#ffffff' : '#86efac';
    ctx.fillRect(x + 4, y + 6 + squash, 3, 2);
    // Eyes
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 5, y + 8 + squash, 2, 2);
    ctx.fillRect(x + 9, y + 8 + squash, 2, 2);
  } else if (enemy.kind === 'goblin') {
    const bob = Math.floor(enemy.animTime * 9) % 2;
    ctx.fillStyle = flash ? '#ffffff' : '#3f6212';
    ctx.fillRect(x + 4, y + 7 + bob, 8, 7);
    // Leather vest
    ctx.fillStyle = flash ? '#ffffff' : '#78350f';
    ctx.fillRect(x + 4, y + 8 + bob, 8, 4);
    // Head + ears
    ctx.fillStyle = flash ? '#ffffff' : '#65a30d';
    ctx.fillRect(x + 3, y + 2 + bob, 10, 6);
    ctx.fillRect(x + 1, y + 4 + bob, 2, 2);
    ctx.fillRect(x + 13, y + 4 + bob, 2, 2);
    // Red bandana
    ctx.fillStyle = flash ? '#ffffff' : '#dc2626';
    ctx.fillRect(x + 3, y + 2 + bob, 10, 2);
    // Eyes
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(x + 5, y + 5 + bob, 2, 2);
    ctx.fillRect(x + 9, y + 5 + bob, 2, 2);
    // Dagger
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(x + (enemy.dir === 'left' ? 0 : 13), y + 8 + bob, 3, 2);
  } else if (enemy.kind === 'fire_imp') {
    const hover = Math.round(Math.sin(time * 7 + x) * 2);
    // Wings
    ctx.fillStyle = flash ? '#ffffff' : '#7f1d1d';
    ctx.fillRect(x + 1, y + 4 + hover, 3, 5);
    ctx.fillRect(x + 12, y + 4 + hover, 3, 5);
    // Body
    ctx.fillStyle = flash ? '#ffffff' : '#dc2626';
    ctx.fillRect(x + 4, y + 3 + hover, 8, 10);
    // Horns
    ctx.fillStyle = '#facc15';
    ctx.fillRect(x + 4, y + 1 + hover, 2, 2);
    ctx.fillRect(x + 10, y + 1 + hover, 2, 2);
    // Glowing eyes
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(x + 5, y + 6 + hover, 2, 2);
    ctx.fillRect(x + 9, y + 6 + hover, 2, 2);
    if (enemy.state === 'windup') {
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(x + 6, y + 11 + hover, 4, 4);
    }
  } else if (enemy.kind === 'skeleton') {
    const bob = Math.floor(enemy.animTime * 8) % 2;
    // Armor & bones
    ctx.fillStyle = flash ? '#ffffff' : '#475569';
    ctx.fillRect(x + 3, y + 7 + bob, 10, 7);
    ctx.fillStyle = flash ? '#ffffff' : '#e2e8f0';
    ctx.fillRect(x + 4, y + 1 + bob, 8, 6);
    // Helm horns
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x + 2, y + 2 + bob, 2, 3);
    ctx.fillRect(x + 12, y + 2 + bob, 2, 3);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + 5, y + 4 + bob, 2, 2);
    ctx.fillRect(x + 9, y + 4 + bob, 2, 2);
  } else if (enemy.kind === 'boss_warden') {
    const bob = enemy.state === 'stunned' ? 2 : Math.floor(Math.sin(time * 4) * 1.5);
    // Massive 32x32 stone golem warden
    ctx.fillStyle = flash ? '#ffffff' : '#1e293b';
    ctx.fillRect(x + 3, y + 4 + bob, 26, 25);
    ctx.fillStyle = flash ? '#ffffff' : '#475569';
    ctx.fillRect(x + 5, y + 5 + bob, 22, 22);
    // Mossy stone crown & shoulders
    ctx.fillStyle = flash ? '#ffffff' : '#64748b';
    ctx.fillRect(x + 2, y + 8 + bob, 6, 12);
    ctx.fillRect(x + 24, y + 8 + bob, 6, 12);
    ctx.fillStyle = '#4d7c0f';
    ctx.fillRect(x + 6, y + 4 + bob, 8, 3);
    ctx.fillRect(x + 22, y + 8 + bob, 5, 3);
    //Glowing core crystal
    const coreColor = enemy.armorBroken
      ? '#facc15'
      : enemy.state === 'windup'
        ? '#ef4444'
        : '#38bdf8';
    ctx.fillStyle = flash ? '#ffffff' : coreColor;
    ctx.fillRect(x + 12, y + 13 + bob, 8, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 14, y + 15 + bob, 3, 3);
    // Boss eyes
    ctx.fillStyle = enemy.armorBroken ? '#94a3b8' : '#ef4444';
    ctx.fillRect(x + 10, y + 8 + bob, 3, 2);
    ctx.fillRect(x + 19, y + 8 + bob, 3, 2);
  }

  // Mini HP bar above damaged non-boss enemies
  if (enemy.kind !== 'boss_warden' && enemy.hp < enemy.maxHp) {
    const bw = enemy.w;
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y - 4, bw, 3);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + 1, y - 3, Math.round((bw - 2) * ratio), 1);
  }
}

export function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
  const x = Math.round(proj.x);
  const y = Math.round(proj.y);
  if (proj.kind === 'fireball') {
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(x - 4, y - 4, 8, 8);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(x - 2, y - 2, 4, 4);
  } else if (proj.kind === 'boulder') {
    ctx.fillStyle = '#334155';
    ctx.fillRect(x - 5, y - 5, 10, 10);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x - 4, y - 4, 6, 5);
  } else if (proj.kind === 'shockwave') {
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, proj.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
