// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (score every 8-way move by distance to the target minus
// cone danger, so the fox chases loot, slips past cones and heads for the
// exit), so the frame is what a short game really looks like and the same
// seed always gives the same frame.
import { STEP, FIELD } from './config.js';
import { EVENT_OVER, EVENT_WIN, losClear } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 240;
const SAMPLE = STEP;

function coneDanger(world, x, y) {
  // 0 when no cone reaches the point, up to 1 when a guard stares at it.
  let danger = 0;
  const s = world.state;
  for (const g of s.guards) {
    const dx = x - g.x;
    const dy = y - g.y;
    const d = Math.hypot(dx, dy);
    if (d > 175 || d < 1) continue;
    let a = Math.atan2(dy, dx) - g.facing;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    if (Math.abs(a) < 0.56 && losClear(world.levelForShots(), g.x, g.y, x, y)) danger = Math.max(danger, 1 - d / 200);
  }
  for (const cam of s.cameras) {
    const dx = x - cam.x;
    const dy = y - cam.y;
    const d = Math.hypot(dx, dy);
    if (d > 195 || d < 1) continue;
    let a = Math.atan2(dy, dx) - cam.angle;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    if (Math.abs(a) < 0.48 && losClear(world.levelForShots(), cam.x, cam.y, x, y)) danger = Math.max(danger, 0.8 - d / 260);
  }
  return danger;
}

function autopilot(world, reckless, brave) {
  const s = world.state;
  const p = s.player;
  let target = null;
  if (!s.relicTaken) {
    target = s.relicTiles[0];
  } else {
    target = s.exit;
  }
  let loot = null;
  for (const l of s.loots) {
    if (!l.taken && Math.hypot(l.x - p.x, l.y - p.y) < 220) { loot = l; break; }
  }
  if (loot && !s.relicTaken) target = loot;
  const dirs = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let best = { x: 0, y: 0 };
  let bestScore = -Infinity;
  for (const [dx, dy] of dirs) {
    const nx = Math.max(12, Math.min(FIELD.width - 12, p.x + dx * 26));
    const ny = Math.max(12, Math.min(FIELD.height - 12, p.y + dy * 26));
    const dist = Math.hypot(target.x - nx, target.y - ny);
    const danger = coneDanger(world, nx, ny);
    const weight = reckless ? 40 : brave ? 200 : 420;
    const score = -dist - danger * weight + (dx === 0 && dy === 0 ? -8 : 0);
    if (score > bestScore) { bestScore = score; best = { x: dx, y: dy }; }
  }
  const sneak = coneDanger(world, p.x, p.y) > 0.15;
  return { mx: best.x, my: best.y, sneak };
}

export function stageShot(name, world) {
  world.reset();
  if (name === 'level2' || name === 'level3') {
    // A gameplay moment from night 2 or 3, so the sheet shows the whole
    // campaign instead of a fail overlay.
    world.loadLevel(name === 'level2' ? 1 : 2);
    for (let i = 0; i < 20 / SAMPLE; i += 1) {
      const a = autopilot(world, false, false);
      const ev = world.step(SAMPLE, a.mx, a.my, { sneak: a.sneak });
      if (ev & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.score };
      if (ev & EVENT_OVER) break;
    }
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / SAMPLE; i += 1) world.step(SAMPLE, 0, 0, { sneak: false });
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const reckless = name === 'end';
  // The cover is the tense moment, not a calm walk: the brave autopilot
  // cuts cone edges, and the scene freezes just after a warden grows
  // suspicious with the relic already taken — "?" over the guard, the fox
  // hidden, the exit open.
  const brave = name === 'play';
  const limit = reckless ? END_LIMIT_SECONDS : 30;
  let tense = 0;
  for (let i = 0; i < limit / SAMPLE; i += 1) {
    const a = autopilot(world, reckless, brave);
    const ev = world.step(SAMPLE, a.mx, a.my, { sneak: a.sneak });
    if (ev & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.score };
    if (ev & EVENT_OVER) break;
    if (brave && world.state.relicTaken && world.state.detection >= 35 && world.state.detection < 70) {
      tense += 1;
      if (tense > 3) break;
    } else {
      tense = 0;
    }
  }
  const over = world.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
