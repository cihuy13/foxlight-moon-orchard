// Keyboard + mouse input. Movement is WASD or arrows; Shift sneaks,
// Space is Shadow Slip, E interacts, Q throws smoke, R douses a lamp,
// C or click throws a pebble, P or Esc pauses, M mutes.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SLIP = 4;
export const ACTION_SMOKE = 8;
export const ACTION_DOUSE = 16;
export const ACTION_INTERACT = 32;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let click = null;
  let muted = false;

  function keyOf(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }
  window.addEventListener('keydown', (event) => {
    const k = keyOf(event);
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) event.preventDefault();
    if (event.repeat) return;
    keys.add(k);
    if (k === ' ' || k === 'Enter') actions |= ACTION_CONFIRM;
    if (k === 'p' || k === 'Escape') actions |= ACTION_PAUSE;
    if (k === ' ') actions |= ACTION_SLIP;
    if (k === 'q') actions |= ACTION_SMOKE;
    if (k === 'r') actions |= ACTION_DOUSE;
    if (k === 'e') actions |= ACTION_INTERACT;
    if (k === 'm') muted = !muted;
  });
  window.addEventListener('keyup', (event) => keys.delete(keyOf(event)));
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    click = {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  });
  window.addEventListener('blur', () => keys.clear());

  function direction() {
    let x = 0;
    let y = 0;
    if (keys.has('a') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('d') || keys.has('ArrowRight')) x += 1;
    if (keys.has('w') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('s') || keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) { x *= 0.7071; y *= 0.7071; }
    // Shift sneaks (slow, quiet); walking is the fast, noisy default.
    return { x, y, sneak: keys.has('Shift') };
  }
  function takeActions() {
    const a = actions;
    actions = 0;
    return a;
  }
  function takeClick() {
    const c = click;
    click = null;
    return c;
  }
  return { direction, takeActions, takeClick, isMuted: () => muted, keys };
}
