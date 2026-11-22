// Foxlight renderer v2: one canvas, night orchard palette, and the
// readable HUD the top entries share — a big alarm banner, a level header
// bar, loot dots, a goal line, guard roster, minimap, legend, controls.
// The play field carries texture per tile (checker floor, brick hedges,
// grass-blade bushes, dotted gravel), warm lamp pools, dashed patrol
// paths, and callouts that explain the moment: a "?" over a suspicious
// warden, a HIDDEN tag on the fox, an EXIT label once it opens.
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

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
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
          ctx.fillStyle = '#232d3a';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#2e3d4e';
          ctx.fillRect(x, y, TILE, 3);
          ctx.fillStyle = '#1a2230';
          ctx.fillRect(x, y + 13, TILE, 2);
          ctx.fillRect(x, y + 27, TILE, 2);
          ctx.fillRect(x + 19, y, 2, TILE);
        } else if (ch === 'B') {
          ctx.fillStyle = '#12261a';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = '#2f7a3d';
          ctx.lineWidth = 2;
          for (let i = 0; i < 5; i += 1) {
            const bx = x + 6 + i * 7;
            ctx.beginPath();
            ctx.moveTo(bx, y + 34);
            ctx.lineTo(bx + 3, y + 12 + (i % 3) * 4);
            ctx.stroke();
          }
        } else if (ch === 'g') {
          ctx.fillStyle = '#23202a';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#4a4459';
          for (let i = 0; i < 6; i += 1) ctx.fillRect(x + 5 + (i * 6) % 30, y + 6 + (i * 11) % 28, 3, 3);
        } else if (ch === 's') {
          ctx.fillStyle = '#0a0f1e';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#16223d';
          ctx.beginPath(); ctx.arc(x + 20, y + 20, 14, 0, 7); ctx.fill();
        } else {
          ctx.fillStyle = (c + r) % 2 === 0 ? '#141d16' : '#111a13';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          ctx.fillRect(x + ((c * 7 + r * 13) % 28), y + ((c * 11 + r * 5) % 28), 2, 2);
        }
      }
    }
  }

  function drawWorld(state, level) {
    drawTiles(state, level);
    // Moonlight from the top-left corner, and fireflies (fixed positions,
    // pulsing with time, so shots are stable).
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
    // Lamp light pools, with a post and a warm bulb.
    for (const lamp of state.lamps) {
      if (lamp.lit) {
        const g = ctx.createRadialGradient(lamp.x, lamp.y, 6, lamp.x, lamp.y, 110);
        g.addColorStop(0, 'rgba(255, 214, 120, 0.22)');
        g.addColorStop(1, 'rgba(255, 214, 120, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 110, 0, 7); ctx.fill();
        ctx.fillStyle = '#3a2f1d';
        ctx.fillRect(lamp.x - 2, lamp.y - 2, 4, 10);
        ctx.fillStyle = '#ffd678';
        ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 6, 0, 7); ctx.fill();
      } else {
        ctx.strokeStyle = '#5a5346';
        ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 5, 0, 7); ctx.stroke();
      }
    }
    // Dashed patrol paths, so the wardens' routes read at a glance.
    ctx.strokeStyle = 'rgba(232, 220, 192, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    for (const g of state.guards) {
      ctx.beginPath();
      g.way.forEach(([col, row], i) => {
        const px = col * TILE + TILE / 2;
        const py = row * TILE + TILE / 2;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Exit hatch: locked red until the relic is taken, then green and open.
    ctx.fillStyle = state.exitOpen ? '#37d67a' : '#8a2f2f';
    ctx.fillRect(state.exit.x - 17, state.exit.y - 17, 34, 34);
    ctx.strokeStyle = '#07130c';
    ctx.lineWidth = 2;
    ctx.strokeRect(state.exit.x - 17, state.exit.y - 17, 34, 34);
    ctx.fillStyle = '#07130c';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.exitOpen ? 'EXIT' : 'LOCK', state.exit.x, state.exit.y + 4);
    if (state.exitOpen) {
      ctx.fillStyle = '#37d67a';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('EXIT — GO!', state.exit.x, state.exit.y < 80 ? state.exit.y + 32 : state.exit.y - 24);
    }
    ctx.textAlign = 'left';
    // Loot coins, bigger, with a shine.
    for (const loot of state.loots) {
      if (loot.taken) continue;
      ctx.fillStyle = '#ffd34d';
      ctx.beginPath(); ctx.arc(loot.x, loot.y, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff3c0';
      ctx.beginPath(); ctx.arc(loot.x - 2, loot.y - 2, 2.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#7a5b00';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', loot.x, loot.y + 4);
      ctx.textAlign = 'left';
    }
    // The relic: a glowing star.
    for (const r of state.relicTiles) {
      if (state.relicTaken) continue;
      const glow = ctx.createRadialGradient(r.x, r.y, 4, r.x, r.y, 36);
      glow.addColorStop(0, 'rgba(232, 244, 255, 0.4)');
      glow.addColorStop(1, 'rgba(232, 244, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(r.x, r.y, 36, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8f4ff';
      star(ctx, r.x, r.y, 11);
      ctx.fill();
      ctx.fillStyle = '#3a6ea5';
      ctx.beginPath(); ctx.arc(r.x, r.y, 4, 0, 7); ctx.fill();
    }
    // Camera cones (teal), then guard cones (amber, red when hunting).
    for (const cam of state.cameras) cone(ctx, cam.x, cam.y, cam.angle, CAMERA.range, CAMERA.halfAngle, 'rgba(64, 224, 208, 0.20)');
    for (const g of state.guards) cone(ctx, g.x, g.y, g.facing, GUARD.range, GUARD.halfAngle, g.suspicion >= 75 ? 'rgba(255, 70, 60, 0.30)' : 'rgba(255, 176, 66, 0.26)');
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
    // Guards: bigger wardens, facing wedge, suspicion bar, name, and a
    // "?" / "!" callout when they grow suspicious.
    for (const g of state.guards) {
      ctx.fillStyle = g.state === 'SEARCHING' ? '#ff5040' : g.state === 'SUSPICIOUS' ? '#ffb042' : '#c8a06a';
      ctx.beginPath(); ctx.arc(g.x, g.y, 13, 0, 7); ctx.fill();
      ctx.strokeStyle = '#0b1220';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x + Math.cos(g.facing) * 18, g.y + Math.sin(g.facing) * 18); ctx.stroke();
      ctx.fillStyle = '#0b1220';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(g.state === 'PATROL' ? '?' : '!', g.x, g.y + 4);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#222';
      ctx.fillRect(g.x - 15, g.y - 26, 30, 4);
      ctx.fillStyle = g.suspicion >= 75 ? '#ff5040' : '#ffb042';
      ctx.fillRect(g.x - 15, g.y - 26, 30 * (g.suspicion / 100), 4);
      ctx.fillStyle = '#e8dcc0';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(g.name, g.x, g.y - 31);
      ctx.textAlign = 'left';
      if (g.state !== 'PATROL') {
        ctx.fillStyle = '#fff8e0';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('What was that?', g.x + 22, g.y - 18);
      }
    }
    // Player: the fox — bigger, orange, ears and a white-tipped tail.
    const p = state.player;
    if (state.slipTimer > 0) {
      ctx.fillStyle = 'rgba(180, 220, 255, 0.25)';
      ctx.beginPath(); ctx.arc(p.x, p.y, 24, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#ff8c2e';
    ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(p.x - 9, p.y - 8); ctx.lineTo(p.x - 13, p.y - 20); ctx.lineTo(p.x - 2, p.y - 13); ctx.fill();
    ctx.beginPath(); ctx.moveTo(p.x + 9, p.y - 8); ctx.lineTo(p.x + 13, p.y - 20); ctx.lineTo(p.x + 2, p.y - 13); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(p.x - Math.cos(p.facing) * 12, p.y - Math.sin(p.facing) * 12, 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#0b1220';
    ctx.beginPath(); ctx.arc(p.x + Math.cos(p.facing) * 5, p.y + Math.sin(p.facing) * 5, 3.5, 0, 7); ctx.fill();
    if (p.hidden) {
      ctx.fillStyle = '#37d67a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HIDDEN', p.x, p.y + 26);
      ctx.textAlign = 'left';
    }
  }

  function bar(x, y, w, label, value, color) {
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(x, y, w, 38);
    ctx.fillStyle = '#8fa3bf';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 8, y + 14);
    ctx.fillStyle = '#1a2436';
    ctx.fillRect(x + 8, y + 21, w - 16, 9);
    ctx.fillStyle = color;
    ctx.fillRect(x + 8, y + 21, (w - 16) * Math.max(0, Math.min(1, value)), 9);
  }

  function drawHeader(state) {
    ctx.fillStyle = 'rgba(5, 8, 16, 0.88)';
    ctx.fillRect(0, 0, HUD_X, 36);
    ctx.fillStyle = '#f5c542';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(state.levelName, 14, 24);
    ctx.fillStyle = '#e8dcc0';
    ctx.font = '13px sans-serif';
    ctx.fillText(`◆  OBJECTIVE: steal the ${state.objective}, then reach the exit`, 360, 24);
    ctx.fillStyle = '#8fa3bf';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`TIME ${Math.floor(state.elapsed / 60)}:${String(Math.floor(state.elapsed % 60)).padStart(2, '0')}`, HUD_X - 14, 24);
    ctx.textAlign = 'left';
  }

  function drawHUD(state, best) {
    const x = HUD_X + 12;
    const w = 1280 - HUD_X - 24;
    ctx.fillStyle = '#0a0e18';
    ctx.fillRect(HUD_X, 0, 1280 - HUD_X, 720);
    ctx.fillStyle = '#f5c542';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('FOXLIGHT', x, 32);
    ctx.fillStyle = '#8fa3bf';
    ctx.font = '11px sans-serif';
    ctx.fillText('THE MOON ORCHARD', x, 48);
    // Big alarm banner: the state of the night, at a glance.
    const alarmColor = state.alarm === 'HUNTED' ? '#ff5040' : state.alarm === 'UNEASY' ? '#ff7a3c' : state.alarm === 'WARY' ? '#ffb042' : '#37d67a';
    ctx.fillStyle = alarmColor;
    ctx.fillRect(x, 58, w, 34);
    ctx.fillStyle = '#0a0e18';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`${state.alarm}${state.detection >= 35 ? '  ?' : ''}`, x + 10, 82);
    ctx.fillStyle = '#e8dcc0';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(state.levelName, x, 110);
    ctx.fillStyle = '#8fa3bf';
    ctx.font = '11px sans-serif';
    ctx.fillText(`OBJECTIVE: steal the ${state.objective}`, x, 126);
    ctx.fillText(`LOOT ${state.loot}/${state.lootTotal}  ${'●'.repeat(state.loot)}${'○'.repeat(state.lootTotal - state.loot)}   SCORE ${state.score}   BEST ${Math.max(best, state.score)}`, x, 142);
    ctx.fillText(`GOAL  ${state.exitOpen ? 'EXIT OPEN — GO!' : 'NOT YET'}   SPOTTED ${state.strikes}/3`, x, 158);
    bar(x, 168, w, `DETECTION  ${state.detection >= 75 ? 'SPOTTED!' : state.detection >= 35 ? 'SUSPICIOUS ?' : 'CALM'}`, state.detection / 100, state.detection >= 75 ? '#ff5040' : '#ffb042');
    bar(x, 212, w, `ALARM  ${state.alarm}`, state.detection / 100, '#ff7a5c');
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(x, 256, w, 52);
    ctx.fillStyle = '#8fa3bf';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`VISIBILITY  ${state.visibility}`, x + 8, 274);
    ctx.fillText(`NOISE  ${state.noise}`, x + 8, 292);
    ctx.fillText(`GHOST +${500} IF UNSEEN    STRIKES ${'●'.repeat(state.strikes)}${'○'.repeat(3 - state.strikes)}  (3 = FAIL)`, x + 8, 306);
    ctx.fillStyle = '#8fa3bf';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('GUARDS', x, 330);
    ctx.font = '12px sans-serif';
    state.guards.forEach((g, i) => {
      const d = Math.round(Math.hypot(g.x - state.player.x, g.y - state.player.y) / 40);
      ctx.fillStyle = g.state === 'SEARCHING' ? '#ff5040' : g.state === 'SUSPICIOUS' ? '#ffb042' : '#e8dcc0';
      ctx.fillText(`${g.name}  ${g.state}  ${d}m`, x, 348 + i * 17);
    });
    const gy = 348 + state.guards.length * 17 + 10;
    ctx.fillStyle = '#8fa3bf';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('TACTICAL MAP', x, gy);
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
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('LEGEND', x, ly);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#e8dcc0';
    ctx.fillText('Amber cone = guard sight   Teal cone = camera', x, ly + 16);
    ctx.fillText('Bush = hidden   Shadow pool = dark   Gravel = loud', x, ly + 32);
    ctx.fillText('Lamp (R douse)   Smoke (Q)   Pebble (click) distracts', x, ly + 48);
    ctx.fillStyle = '#8fa3bf';
    ctx.font = 'bold 11px sans-serif';
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
      drawHeader(state);
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
    drawHeader(state);
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
