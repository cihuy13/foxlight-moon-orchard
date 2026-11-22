// Foxlight rules and state, with no drawing and no browser in it.
// Tiles, patrols, vision cones, lamps, noise, smoke, pebbles, Shadow Slip,
// detection, strikes, loot, the relic and the exit. step() advances one
// fixed step and returns what happened as bit flags.
import { TILE, COLS, ROWS, FIELD, LEVELS, PLAYER, GUARD, CAMERA, GHOST_BONUS, LOOT_POINTS, RELIC_POINTS } from './config.js';

export const EVENT_LOOT = 1;
export const EVENT_RELIC = 2;
export const EVENT_SPOTTED = 4;
export const EVENT_OVER = 8;
export const EVENT_LEVEL = 16;
export const EVENT_WIN = 32;
export const EVENT_NOISE = 64;

function tileAt(level, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return '#';
  return level.map[row][col];
}
function isWall(level, col, row) { return tileAt(level, col, row) === '#'; }
function tileCenter(col, row) { return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 }; }

export function losClear(level, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 12));
  for (let i = 1; i < steps; i += 1) {
    const x = ax + (dx * i) / steps;
    const y = ay + (dy * i) / steps;
    if (isWall(level, Math.floor(x / TILE), Math.floor(y / TILE))) return false;
  }
  return true;
}
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function coneSees(level, ox, oy, facing, range, half, px, py, vis) {
  const dx = px - ox;
  const dy = py - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return 0;
  if (dist < 18) return 1;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), facing)) > half) return 0;
  if (!losClear(level, ox, oy, px, py)) return 0;
  return (1 - dist / (range * 1.6)) * vis;
}

export function createWorld(random) {
  const state = {
    levelIndex: 0, score: 0, best: 0, loot: 0, lootTotal: 0,
    strikes: 0, elapsed: 0, levelElapsed: 0, ghost: true,
    detection: 0, alarm: 'CALM', visibility: 'HIDDEN', noise: 'SILENT',
    noiseLevel: 0, relicTaken: false, exitOpen: false, won: false, over: false,
    slipCooldown: 0, slipTimer: 0, smoke: 3, pebbles: 5,
    message: '', messageTimer: 0, nearMiss: 0,
    player: { x: 0, y: 0, facing: 0, moving: false, sneaking: false, hidden: false },
    guards: [], cameras: [], lamps: [], loots: [], relicTiles: [], exit: { x: 0, y: 0 },
    smokes: [], pebble: null, investigate: null, levelName: '', objective: '',
  };
  let level = LEVELS[0];

  function loadLevel(index) {
    level = LEVELS[index];
    state.levelIndex = index;
    state.levelName = level.name;
    state.objective = level.objective;
    state.levelElapsed = 0;
    state.detection = 0;
    state.alarm = 'CALM';
    state.relicTaken = false;
    state.exitOpen = false;
    state.smokes = [];
    state.pebble = null;
    state.investigate = null;
    state.slipCooldown = 0;
    state.slipTimer = 0;
    const p = tileCenter(level.player.col, level.player.row);
    state.player.x = p.x;
    state.player.y = p.y;
    state.player.facing = -Math.PI / 2;
    const e = tileCenter(level.exit.col, level.exit.row);
    state.exit = { x: e.x, y: e.y };
    state.guards = level.guards.map((g, i) => {
      const s = tileCenter(g.way[0][0], g.way[0][1]);
      return {
        name: g.name, x: s.x, y: s.y, way: g.way, wi: 1, speed: g.speed,
        facing: 0, suspicion: 0, state: 'PATROL', wait: 0,
        jitter: (random() - 0.5) * 0.6, id: i,
      };
    });
    state.cameras = level.cameras.map((c) => {
      const s = tileCenter(c.col, c.row);
      return { x: s.x, y: s.y, base: c.base, sweep: c.sweep, speed: c.speed, angle: c.base, t: random() * 6, exposure: 0 };
    });
    state.lamps = level.lamps.map(([col, row]) => ({ ...tileCenter(col, row), lit: true }));
    state.loots = level.loot.map(([col, row]) => ({ ...tileCenter(col, row), taken: false }));
    state.relicTiles = [];
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (level.map[r][c] === '*') state.relicTiles.push(tileCenter(c, r));
      }
    }
    state.lootTotal = state.loots.length;
    state.loot = 0;
    state.message = `Steal the ${level.objective}, then reach the exit.`;
    state.messageTimer = 4;
  }

  function reset() {
    state.score = 0;
    state.strikes = 0;
    state.elapsed = 0;
    state.ghost = true;
    state.won = false;
    state.over = false;
    state.smoke = 3;
    state.pebbles = 5;
    state.nearMiss = 0;
    loadLevel(0);
  }

  function playerTile() {
    return { col: Math.floor(state.player.x / TILE), row: Math.floor(state.player.y / TILE) };
  }
  function visibilityAt() {
    const t = playerTile();
    const ch = tileAt(level, t.col, t.row);
    if (ch === 'B') return { v: 0.12, label: 'HIDDEN' };
    if (ch === 's') return { v: 0.3, label: 'IN SHADOW' };
    let lit = false;
    for (const lamp of state.lamps) {
      if (lamp.lit && Math.hypot(lamp.x - state.player.x, lamp.y - state.player.y) < 95) { lit = true; break; }
    }
    if (state.slipTimer > 0) return { v: 0.05, label: 'SHADOW SLIP' };
    return lit ? { v: 1, label: 'LIT' } : { v: 0.55, label: 'DIM' };
  }
  function inSmoke(x, y) {
    for (const s of state.smokes) if (Math.hypot(s.x - x, s.y - y) < 55) return true;
    return false;
  }
  function moveCircle(x, y, dx, dy, radius) {
    // Axis-separated movement against hedge walls.
    let nx = x + dx;
    if (!isWall(level, Math.floor((nx + Math.sign(dx) * radius) / TILE), Math.floor(y / TILE))) x = nx;
    let ny = y + dy;
    if (!isWall(level, Math.floor(x / TILE), Math.floor((ny + Math.sign(dy) * radius) / TILE))) y = ny;
    return { x: Math.max(radius, Math.min(FIELD.width - radius, x)), y: Math.max(radius, Math.min(FIELD.height - radius, y)) };
  }

  function step(dt, mx, my, opts) {
    if (state.over || state.won) return 0;
    let events = 0;
    state.elapsed += dt;
    state.levelElapsed += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (state.slipCooldown > 0) state.slipCooldown -= dt;
    if (state.slipTimer > 0) state.slipTimer -= dt;
    for (const s of state.smokes) s.t -= dt;
    state.smokes = state.smokes.filter((s) => s.t > 0);

    const p = state.player;
    const sneaking = !!opts.sneak;
    p.sneaking = sneaking;
    let speed = sneaking ? PLAYER.sneakSpeed : PLAYER.speed;
    const len = Math.hypot(mx, my);
    p.moving = len > 0.01;
    if (p.moving) {
      p.facing = Math.atan2(my, mx);
      const moved = moveCircle(p.x, p.y, (mx / (len || 1)) * speed * dt, (my / (len || 1)) * speed * dt, PLAYER.radius);
      p.x = moved.x;
      p.y = moved.y;
    }
    if (opts.slip && state.slipCooldown <= 0 && p.moving) {
      const dash = moveCircle(p.x, p.y, Math.cos(p.facing) * 95, Math.sin(p.facing) * 95, PLAYER.radius);
      p.x = dash.x;
      p.y = dash.y;
      state.slipCooldown = 4;
      state.slipTimer = 0.9;
    }
    if (opts.smoke && state.smoke > 0) {
      state.smoke -= 1;
      state.smokes.push({ x: p.x, y: p.y, t: 5 });
    }
    if (opts.pebble && state.pebbles > 0 && opts.pebbleX !== undefined) {
      state.pebbles -= 1;
      state.pebble = { x: Math.max(0, Math.min(FIELD.width, opts.pebbleX)), y: Math.max(0, Math.min(FIELD.height, opts.pebbleY)), t: 6 };
      state.investigate = { x: state.pebble.x, y: state.pebble.y, t: 6 };
    }
    if (opts.douse) {
      for (const lamp of state.lamps) {
        if (lamp.lit && Math.hypot(lamp.x - p.x, lamp.y - p.y) < 70) {
          lamp.lit = false;
          state.message = 'Lamp doused — the dark is yours.';
          state.messageTimer = 3;
        }
      }
    }

    // Noise: gravel is loud, sprinting (moving fast, not sneaking) is loud.
    const t = playerTile();
    const surf = tileAt(level, t.col, t.row);
    const movingNoise = !p.moving ? 0 : sneaking ? 8 : surf === 'g' ? 95 : 42;
    state.noiseLevel = movingNoise;
    state.noise = movingNoise === 0 ? 'SILENT' : movingNoise < 20 ? 'SOFT' : movingNoise < 60 ? 'STEPS' : 'LOUD';
    if (movingNoise > 30) {
      for (const g of state.guards) {
        if (Math.hypot(g.x - p.x, g.y - p.y) < GUARD.hearRadius * (movingNoise / 60)) {
          g.suspicion = Math.max(g.suspicion, 45);
          g.state = 'SUSPICIOUS';
          state.investigate = { x: p.x, y: p.y, t: 4 };
          events |= EVENT_NOISE;
        }
      }
    }

    const vis = visibilityAt();
    p.hidden = vis.v <= 0.3 || inSmoke(p.x, p.y);
    state.visibility = inSmoke(p.x, p.y) ? 'IN SMOKE' : vis.label;

    // Guards: patrol, investigate, search. Vision builds suspicion.
    let maxSuspicion = 0;
    for (const g of state.guards) {
      const target = state.investigate && g.suspicion > 30 ? state.investigate : null;
      let tx;
      let ty;
      if (target) {
        tx = target.x;
        ty = target.y;
        if (Math.hypot(g.x - tx, g.y - ty) < 24) {
          g.suspicion = Math.max(0, g.suspicion - 30 * dt);
          if (g.suspicion < 30) state.investigate = null;
        }
      } else {
        const wp = tileCenter(g.way[g.wi][0], g.way[g.wi][1]);
        tx = wp.x;
        ty = wp.y;
        if (Math.hypot(g.x - tx, g.y - ty) < 14) {
          g.wi = (g.wi + 1) % g.way.length;
          g.wait = 0.8;
        }
      }
      if (g.wait > 0) {
        g.wait -= dt;
        g.facing += Math.sin(state.elapsed * 1.2 + g.jitter) * 0.6 * dt;
      } else {
        const dx = tx - g.x;
        const dy = ty - g.y;
        const d = Math.hypot(dx, dy);
        if (d > 1) {
          g.facing = Math.atan2(dy, dx);
          const sp = target ? g.speed * 1.5 : g.speed;
          const moved = moveCircle(g.x, g.y, (dx / d) * sp * dt, (dy / d) * sp * dt, 11);
          g.x = moved.x;
          g.y = moved.y;
        }
      }
      let see = 0;
      if (!inSmoke(p.x, p.y)) {
        see = coneSees(level, g.x, g.y, g.facing, GUARD.range, GUARD.halfAngle, p.x, p.y, vis.v * (sneaking ? 0.6 : 1));
      }
      if (see > 0) {
        g.suspicion = Math.min(100, g.suspicion + see * 55 * dt);
        if (see > 0.55 && g.suspicion > 60 && g.suspicion < 95) state.nearMiss = Math.max(state.nearMiss, Math.round(see * 100));
      } else {
        g.suspicion = Math.max(0, g.suspicion - 14 * dt);
      }
      g.state = g.suspicion >= 75 ? 'SEARCHING' : g.suspicion >= 35 ? 'SUSPICIOUS' : 'PATROL';
      maxSuspicion = Math.max(maxSuspicion, g.suspicion);
    }

    // Cameras: sweeping teal cones build exposure, not suspicion.
    let maxExposure = 0;
    for (const cam of state.cameras) {
      cam.t += dt;
      cam.angle = cam.base + Math.sin(cam.t * cam.speed) * cam.sweep;
      let see = 0;
      if (!inSmoke(p.x, p.y)) see = coneSees(level, cam.x, cam.y, cam.angle, CAMERA.range, CAMERA.halfAngle, p.x, p.y, vis.v);
      if (see > 0) cam.exposure = Math.min(100, cam.exposure + see * 40 * dt);
      else cam.exposure = Math.max(0, cam.exposure - 20 * dt);
      maxExposure = Math.max(maxExposure, cam.exposure);
    }

    state.detection = Math.max(maxSuspicion, maxExposure);
    state.alarm = state.detection >= 75 ? 'HUNTED' : state.detection >= 35 ? 'UNEASY' : state.detection > 0 ? 'WARY' : 'CALM';

    // Spotted: a full meter is one strike, then the fox is sent back to the start.
    if (state.detection >= 100) {
      state.strikes += 1;
      state.ghost = false;
      events |= EVENT_SPOTTED;
      for (const g of state.guards) g.suspicion = 0;
      for (const cam of state.cameras) cam.exposure = 0;
      state.detection = 0;
      if (state.strikes >= 3) {
        state.over = true;
        return events | EVENT_OVER;
      }
      const s = tileCenter(level.player.col, level.player.row);
      p.x = s.x;
      p.y = s.y;
      state.message = `Spotted! Strike ${state.strikes} of 3 — back to the start.`;
      state.messageTimer = 3;
    }

    // Loot, relic, exit.
    for (const loot of state.loots) {
      if (!loot.taken && Math.hypot(loot.x - p.x, loot.y - p.y) < 26) {
        loot.taken = true;
        state.loot += 1;
        state.score += LOOT_POINTS;
        events |= EVENT_LOOT;
      }
    }
    if (!state.relicTaken) {
      for (const r of state.relicTiles) {
        if (Math.hypot(r.x - p.x, r.y - p.y) < 30) {
          state.relicTaken = true;
          state.exitOpen = true;
          state.score += RELIC_POINTS;
          state.message = `${level.relicName} taken — reach the exit, unseen.`;
          state.messageTimer = 4;
          events |= EVENT_RELIC;
          break;
        }
      }
    }
    if (state.exitOpen && Math.hypot(state.exit.x - p.x, state.exit.y - p.y) < 30) {
      if (state.levelIndex < LEVELS.length - 1) {
        if (state.ghost) state.score += GHOST_BONUS;
        loadLevel(state.levelIndex + 1);
        return events | EVENT_LEVEL;
      }
      if (state.ghost) state.score += GHOST_BONUS;
      state.won = true;
      return events | EVENT_WIN;
    }
    return events;
  }

  reset();
  return { state, reset, step, loadLevel, tileAt, losClear, levelForShots: () => level };
}
