// Foxlight renderer: one canvas, dark top-down night palette, amber guard
// cones, teal camera cones, and the dense HUD the top entries share —
// DETECTION / ALARM / VISIBILITY / NOISE, loot, ghost bonus, strikes,
// guard roster with range, minimap, legend and controls.
import { TILE, COLS, ROWS, FIELD, HUD_X, GUARD, CAMERA } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;
export const SCREEN_WIN = 4;

function cone(ctx, x, y, facing, range, half, color) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - half, facing + half);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = 1280 * dpr;
    canvas.height = 720 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function drawTiles(state, level) {
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const ch = level.map[r][c];
        const x = c * TILE;
        const y = r * TILE;
        if (ch === '#') {
          ctx.fillStyle = '#1d2b1f';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#2c4a2e';
          ctx.fillRect(x + 2, y + 2, TILE - 4, 8);
        } else if (ch === 'B') {
          ctx.fillStyle = '#12261a';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#1f4d2a';
          ctx.beginPath(); ctx.arc(x + 12, y + 14, 9, 0, 7); ctx.arc(x + 26, y + 22, 10, 0, 7); ctx.fill();
        } else if (ch === 'g') {
          ctx.fillStyle = '#23202a';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#3a3547';
          for (let i = 0; i < 4; i += 1) ctx.fillRect(x + 6 + i * 8, y + 8 + (i % 2) * 18, 4, 3);
        } else if (ch === 's') {
          ctx.fillStyle = '#0a0f1e';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#16223d';
          ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
        } else {
          ctx.fillStyle = (c + r) % 2 === 0 ? '#101a12' : '#0e1710';
          ctx.fillRect(x, y, TILE, TILE);
        }
      }
    }
  }

  function drawWorld(state, level) {
    drawTiles(state, level);
    // Moonlight from the top-left corner, and fireflies that drift over
    // the orchard (fixed positions, pulsing with time, so shots are stable).
    const moon = ctx.createRadialGradient(80, 60, 10, 80, 60, 420);
    moon.addColorStop(0, 'rgba(190, 210, 255, 0.10)');
    moon.addColorStop(1, 'rgba(190, 210, 255, 0)');
    ctx.fillStyle = moon;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const flies = [[120, 300], [260, 140], [420, 420], [560, 200], [700, 360], [180, 560], [480, 600], [760, 140], [340, 260], [620, 520]];
    for (let i = 0; i < flies.length; i += 1) {
      const a = 0.25 + 0.25 * Math.sin(state.elapsed * 1.6 + i * 1.7);
      ctx.fillStyle = `rgba(220, 255, 170, ${a.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(flies[i][0], flies[i][1], 2.5, 0, 7); ctx.fill();
    }
    // Lamp light pools.
    for (const lamp of state.lamps) {
      if (lamp.lit) {
        const g = ctx.createRadialGradient(lamp.x, lamp.y, 6, lamp.x, lamp.y, 95);
        g.addColorStop(0, 'rgba(255, 214, 120, 0.20)');
        g.addColorStop(1, 'rgba(255, 214, 120, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 95, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffd678';
        ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 5, 0, 7); ctx.fill();
      } else {
        ctx.strokeStyle = '#5a5346';
        ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 5, 0, 7); ctx.stroke();
      }
    }
    // Exit: locked (red) until the relic is taken, then green and open.
    ctx.fillStyle = state.exitOpen ? '#37d67a' : '#8a2f2f';
    ctx.fillRect(state.exit.x - 16, state.exit.y - 16, 32, 32);
    ctx.fillStyle = '#07130c';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.exitOpen ? 'EXIT' : 'LOCK', state.exit.x, state.exit.y + 4);
    // Loot and relic.
    for (const loot of state.loots) {
      if (loot.taken) continue;
      ctx.fillStyle = '#ffd34d';
      ctx.beginPath(); ctx.arc(loot.x, loot.y, 7, 0, 7); ctx.fill();
      ctx.fillStyle = '#7a5b00';
      ctx.fillText('$', loot.x, loot.y + 4);
    }
    for (const r of state.relicTiles) {
      if (state.relicTaken) continue;
      const glow = ctx.createRadialGradient(r.x, r.y, 4, r.x, r.y, 34);
      glow.addColorStop(0, 'rgba(232, 244, 255, 0.35)');
      glow.addColorStop(1, 'rgba(232, 244, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(r.x, r.y, 34, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8f4ff';
      ctx.beginPath(); ctx.arc(r.x, r.y, 10, 0, 7); ctx.fill();
      ctx.fillStyle = '#3a6ea5';
      ctx.beginPath(); ctx.arc(r.x, r.y, 5, 0, 7); ctx.fill();
    }
    // Camera cones (teal), then guard cones (amber).
    for (const cam of state.cameras) cone(ctx, cam.x, cam.y, cam.angle, CAMERA.range, CAMERA.halfAngle, 'rgba(64, 224, 208, 0.20)');
    for (const g of state.guards) cone(ctx, g.x, g.y, g.facing, GUARD.range, GUARD.halfAngle, g.suspicion >= 75 ? 'rgba(255, 70, 60, 0.28)' : 'rgba(255, 176, 66, 0.24)');
    // Cameras.
    for (const cam of state.cameras) {
      ctx.fillStyle = '#1c3a3a';
      ctx.fillRect(cam.x - 8, cam.y - 8, 16, 16);
      ctx.fillStyle = '#40e0d0';
      ctx.beginPath(); ctx.arc(cam.x, cam.y, 4, 0, 7); ctx.fill();
      if (cam.exposure > 1) {
        ctx.fillStyle = '#40e0d0';
        ctx.fillRect(cam.x - 14, cam.y - 24, 28 * (cam.exposure / 100), 4);
      }
    }
    // Smoke clouds.
    for (const s of state.smokes) {
      ctx.fillStyle = 'rgba(200, 200, 210, 0.35)';
      ctx.beginPath(); ctx.arc(s.x, s.y, 52, 0, 7); ctx.fill();
    }
    // Pebble.
    if (state.pebble) {
      ctx.strokeStyle = '#ffd34d';
      ctx.beginPath(); ctx.arc(state.pebble.x, state.pebble.y, 12 + Math.sin(state.elapsed * 6) * 3, 0, 7); ctx.stroke();
    }
    // Guards: hooded warden, facing tick, suspicion bar, name.
    for (const g of state.guards) {
      ctx.fillStyle = g.state === 'SEARCHING' ? '#ff5040' : g.state === 'SUSPICIOUS' ? '#ffb042' : '#c8a06a';
      ctx.beginPath(); ctx.arc(g.x, g.y, 11, 0, 7); ctx.fill();
      ctx.strokeStyle = '#0b1220';
      ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x + Math.cos(g.facing) * 16, g.y + Math.sin(g.facing) * 16); ctx.stroke();
      ctx.fillStyle = '#0b1220';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(g.state === 'PATROL' ? '?' : '!', g.x, g.y + 3);
      ctx.fillStyle = '#222';
      ctx.fillRect(g.x - 14, g.y - 24, 28, 4);
      ctx.fillStyle = g.suspicion >= 75 ? '#ff5040' : '#ffb042';
      ctx.fillRect(g.x - 14, g.y - 24, 28 * (g.suspicion / 100), 4);
      ctx.fillStyle = '#e8dcc0';
      ctx.font = '9px sans-serif';
      ctx.fillText(g.name, g.x, g.y - 28);
    }
    // Player: the fox — orange, with a tail tick and a slip glow.
    const p = state.player;
    if (state.slipTimer > 0) {
      ctx.fillStyle = 'rgba(180, 220, 255, 0.25)';
      ctx.beginPath(); ctx.arc(p.x, p.y, 22, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#ff8c2e';
    ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(p.x, p.y - 11); ctx.lineTo(p.x - 5, p.y - 19); ctx.lineTo(p.x + 5, p.y - 19); ctx.fill();
    ctx.fillStyle = '#0b1220';
    ctx.beginPath(); ctx.arc(p.x + Math.cos(p.facing) * 5, p.y + Math.sin(p.facing) * 5, 3, 0, 7); ctx.fill();
  }

  function bar(x, y, w, label, value, color) {
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(x, y, w, 34);
    ctx.fillStyle = '#8fa3bf';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 8, y + 13);
    ctx.fillStyle = '#1a2436';
    ctx.fillRect(x + 8, y + 19, w - 16, 8);
    ctx.fillStyle = color;
    ctx.fillRect(x + 8, y + 19, (w - 16) * Math.max(0, Math.min(1, value)), 8);
  }

  function drawHUD(state, best) {
    const x = HUD_X + 12;
    const w = 1280 - HUD_X - 24;
    ctx.fillStyle = '#0a0e18';
    ctx.fillRect(HUD_X, 0, 1280 - HUD_X, 720);
    ctx.fillStyle = '#f5c542';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('FOXLIGHT', x, 32);
    ctx.fillStyle = '#8fa3bf';
    ctx.font = '11px sans-serif';
    ctx.fillText('THE MOON ORCHARD', x, 48);
    ctx.fillStyle = '#e8dcc0';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(state.levelName, x, 70);
    ctx.fillStyle = '#8fa3bf';
    ctx.font = '11px sans-serif';
    ctx.fillText(`OBJECTIVE: steal the ${state.objective}`, x, 86);
    ctx.fillText(`LOOT ${state.loot}/${state.lootTotal}   SCORE ${state.score}   BEST ${Math.max(best, state.score)}`, x, 102);
    bar(x, 112, w, `DETECTION  ${state.detection >= 75 ? 'SPOTTED!' : state.detection >= 35 ? 'SUSPICIOUS ?' : 'CALM'}`, state.detection / 100, state.detection >= 75 ? '#ff5040' : '#ffb042');
    bar(x, 152, w, `ALARM  ${state.alarm}`, state.detection / 100, '#ff7a5c');
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(x, 192, w, 52);
    ctx.fillStyle = '#8fa3bf';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`VISIBILITY  ${state.visibility}`, x + 8, 208);
    ctx.fillText(`NOISE  ${state.noise}`, x + 8, 226);
    ctx.fillText(`GHOST +${500} IF UNSEEN    STRIKES ${'●'.repeat(state.strikes)}${'○'.repeat(3 - state.strikes)}  (3 = FAIL)`, x + 8, 240);
    ctx.fillStyle = '#8fa3bf';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('GUARDS', x, 264);
    ctx.font = '11px sans-serif';
    state.guards.forEach((g, i) => {
      const d = Math.round(Math.hypot(g.x - state.player.x, g.y - state.player.y) / 40);
      ctx.fillStyle = g.state === 'SEARCHING' ? '#ff5040' : g.state === 'SUSPICIOUS' ? '#ffb042' : '#e8dcc0';
      ctx.fillText(`${g.name}  ${g.state}  ${d}m`, x, 282 + i * 16);
    });
    const gy = 282 + state.guards.length * 16 + 8;
    ctx.fillStyle = '#8fa3bf';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('TACTICAL MAP', x, gy);
    // Minimap: whole level at 1/5 scale.
    const mw = 176;
    const mh = 144;
    const mx = x;
    const my = gy + 8;
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
    ctx.fillStyle = '#101a12';
    ctx.fillRect(mx, my, mw, mh);
    const sx = mw / FIELD.width;
    const sy = mh / FIELD.height;
    ctx.fillStyle = '#37d67a';
    ctx.fillRect(mx + state.exit.x * sx - 3, my + state.exit.y * sy - 3, 6, 6);
    for (const r of state.relicTiles) {
      if (state.relicTaken) continue;
      ctx.fillStyle = '#e8f4ff';
      ctx.fillRect(mx + r.x * sx - 3, my + r.y * sy - 3, 6, 6);
    }
    for (const g of state.guards) {
      ctx.fillStyle = '#ffb042';
      ctx.beginPath(); ctx.arc(mx + g.x * sx, my + g.y * sy, 3, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#ff8c2e';
    ctx.beginPath(); ctx.arc(mx + state.player.x * sx, my + state.player.y * sy, 4, 0, 7); ctx.fill();
    const ly = my + mh + 22;
    ctx.fillStyle = '#8fa3bf';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('LEGEND', x, ly);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#e8dcc0';
    ctx.fillText('Amber cone = guard sight   Teal cone = camera', x, ly + 16);
    ctx.fillText('Bush = hidden   Shadow pool = dark   Gravel = loud', x, ly + 32);
    ctx.fillText('Lamp (R douse)   Smoke (Q)   Pebble (click) distracts', x, ly + 48);
    ctx.fillStyle = '#8fa3bf';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('CONTROLS', x, ly + 68);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#e8dcc0';
    ctx.fillText('WASD / arrows move   SHIFT sneak   SPACE Shadow Slip', x, ly + 84);
    ctx.fillText('E pick up   Q smoke   R douse lamp   P pause   M mute', x, ly + 100);
    ctx.fillStyle = '#8fa3bf';
    ctx.font = '10px sans-serif';
    ctx.fillText(`TIME ${Math.floor(state.elapsed / 60)}:${String(Math.floor(state.elapsed % 60)).padStart(2, '0')}   SMOKE x${state.smoke}   PEBBLES x${state.pebbles}   SLIP ${state.slipCooldown > 0 ? Math.ceil(state.slipCooldown) + 's' : 'READY'}`, x, ly + 118);
    if (state.messageTimer > 0) {
      ctx.fillStyle = '#ffd678';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.message, HUD_X / 2 + 40, 690);
      ctx.textAlign = 'left';
    }
  }

  function draw(state, screen, best, level) {
    ctx.clearRect(0, 0, 1280, 720);
    if (screen === SCREEN_TITLE) {
      drawWorld(state, level);
      drawHUD(state, best);
      ctx.fillStyle = 'rgba(5, 8, 16, 0.82)';
      ctx.fillRect(0, 0, HUD_X, 720);
      ctx.fillStyle = '#f5c542';
      ctx.font = 'bold 52px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FOXLIGHT', 440, 220);
      ctx.fillStyle = '#e8dcc0';
      ctx.font = '19px sans-serif';
      ctx.fillText('THE MOON ORCHARD — a fox, three nights,', 440, 256);
      ctx.fillText('one unseen thief', 440, 282);
      ctx.font = '15px sans-serif';
      ctx.fillStyle = '#8fa3bf';
      ctx.fillText('Sneak past the wardens, steal the Moon Pear,', 440, 322);
      ctx.fillText('and reach the exit unseen.', 440, 344);
      ctx.fillText('Bushes hide you. Gravel betrays you. Lamps can be doused.', 440, 368);
      ctx.fillStyle = '#ffd678';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('Press SPACE or click to begin', 440, 412);
      ctx.fillText('WASD move  •  SHIFT sneak  •  SPACE Shadow Slip', 440, 438);
      ctx.textAlign = 'left';
      return;
    }
    drawWorld(state, level);
    drawHUD(state, best);
    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(5, 8, 16, 0.75)';
      ctx.fillRect(0, 0, HUD_X, 720);
      ctx.fillStyle = '#e8dcc0';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', 440, 360);
      ctx.font = '15px sans-serif';
      ctx.fillText('Press P to keep sneaking.', 440, 390);
      ctx.textAlign = 'left';
    } else if (screen === SCREEN_OVER) {
      ctx.fillStyle = 'rgba(20, 5, 8, 0.82)';
      ctx.fillRect(0, 0, HUD_X, 720);
      ctx.fillStyle = '#ff5040';
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CAUGHT — THREE STRIKES', 440, 330);
      ctx.fillStyle = '#e8dcc0';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Score ${state.score}   Loot ${state.loot}/${state.lootTotal}   Best ${best}`, 440, 366);
      ctx.fillText('Press SPACE to try the orchard again.', 440, 394);
      ctx.textAlign = 'left';
    } else if (screen === SCREEN_WIN) {
      ctx.fillStyle = 'rgba(5, 16, 10, 0.82)';
      ctx.fillRect(0, 0, HUD_X, 720);
      ctx.fillStyle = '#37d67a';
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('UNSEEN — THE ORCHARD IS YOURS', 440, 330);
      ctx.fillStyle = '#e8dcc0';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Score ${state.score}${state.ghost ? '  (ghost bonus +500 included)' : ''}   Loot ${state.loot}/${state.lootTotal}`, 440, 366);
      ctx.fillText('Press SPACE to play again.', 440, 394);
      ctx.textAlign = 'left';
    }
  }

  return { draw, resize };
}
