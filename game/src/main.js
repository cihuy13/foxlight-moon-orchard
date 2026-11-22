// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. Screens:
// title, play, paused, game over, win.
// ?seed=N fixes patrol jitter. ?shot=start|play|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_OVER, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_SLIP, ACTION_SMOKE, ACTION_DOUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
let worldMap = world.levelForShots().map;

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* storage can be off */ }
}
function syncMap() { worldMap = world.levelForShots().map; }

function runShot(name) {
  const scene = stageShot(name, world);
  syncMap();
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, { map: worldMap });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let pending = 0;
  let pendingClick = null;

  function announce(message) { status.textContent = message; }
  function startGame() {
    world.reset();
    syncMap();
    accumulator = 0;
    pending = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Sneak past the wardens.');
  }
  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) { best = world.state.score; saveBest(best); }
    announce(won ? `Unseen! Score ${world.state.score}.` : `Caught. Score ${world.state.score}. Best ${best}.`);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // Read actions exactly once per frame; confirm/pause act here, the rest
    // ride into the next world step so a tap is never eaten by the loop.
    const actions = input.takeActions();
    const click = input.takeClick();
    if (click) pendingClick = click;
    pending |= actions;
    if (pending & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      pending = 0;
      startGame();
    } else if (pending & ACTION_PAUSE && screen === SCREEN_PLAY) {
      pending = 0;
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (pending & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      pending = 0;
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        const dir = input.direction();
        const stepActions = pending;
        pending = 0;
        const ev = world.step(STEP, dir.x, dir.y, {
          sneak: dir.sneak,
          slip: !!(stepActions & ACTION_SLIP),
          smoke: !!(stepActions & ACTION_SMOKE),
          douse: !!(stepActions & ACTION_DOUSE),
          pebble: pendingClick !== null,
          pebbleX: pendingClick ? pendingClick.x : undefined,
          pebbleY: pendingClick ? pendingClick.y : undefined,
        });
        pendingClick = null;
        syncMap();
        accumulator -= STEP;
        if (screen === SCREEN_TITLE) break;
        if (ev & EVENT_WIN) { endGame(true); break; }
        if (ev & EVENT_OVER) { endGame(false); break; }
      }
    } else accumulator = 0;
    renderer.draw(world.state, screen, best, { map: worldMap });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });
  announce('Foxlight. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
