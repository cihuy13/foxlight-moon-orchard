// Foxlight — The Moon Orchard: tuning and level maps. One tile is 40 px.
// The play field is 22 x 18 tiles (880 x 720); the right 400 px are the HUD.
export const TILE = 40;
export const COLS = 22;
export const ROWS = 18;
export const FIELD = { width: 880, height: 720 };
export const HUD_X = 880;
export const STEP = 1 / 60;
export const BEST_KEY = 'foxlight-best';
export const LIVES = 3;

// Legend: # hedge wall, B bush cover, g gravel (loud), s shadow pool (dark),
// L lamp, o loot coin, * relic objective, X exit, P player start.
// Guards and cameras are placed per level below, not in the map strings.
export const LEVELS = [
  {
    name: 'NIGHT 1 — THE MOON ORCHARD',
    objective: 'Moon Pear',
    relicName: 'MOON PEAR',
    map: [
      '######################',
      '#....g....B....g......#',
      '#.B..g..####..g..B....#',
      '#....g..#..#..g....o..#',
      '#.####..#..#..####....#',
      '#....s..#..#..s....B..#',
      '#.B.....#**#.....g....#',
      '#....g..#..#..g....o..#',
      '#.####..#..#..####....#',
      '#....s.......s....B...#',
      '#.B..g..####..g.......#',
      '#....g..#..#..g..o....#',
      '#.####..#..#..####..B.#',
      '#....s..#..#..s.......#',
      '#.B.....#..#.....g....#',
      '#....g.......g....o...#',
      '#..B....s....B........#',
      '######################',
    ],
    player: { col: 2, row: 16 },
    exit: { col: 19, row: 1 },
    guards: [
      { name: 'BRAM', way: [[5, 2], [16, 2], [16, 5], [5, 5]], speed: 52 },
      { name: 'FENNA', way: [[10, 9], [10, 15], [18, 15], [18, 9]], speed: 58 },
      { name: 'CORIN', way: [[3, 12], [8, 12], [8, 16], [3, 16]], speed: 48 },
    ],
    cameras: [{ col: 11, row: 1, base: Math.PI / 2, sweep: 0.9, speed: 0.5 }],
    lamps: [[7, 7], [14, 7], [11, 13]],
    loot: [[18, 3], [18, 7], [17, 11], [17, 15]],
  },
  {
    name: 'NIGHT 2 — THE LANTERN MARKET',
    objective: 'Gilded Lantern',
    relicName: 'GILDED LANTERN',
    map: [
      '######################',
      '#..g....B.....g....o..#',
      '#..####....####....#..#',
      '#..#..#....#..#....#..#',
      '#..#..#..s.#..#..B.#..#',
      '#..####....####....#..#',
      '#..g....B.....g.......#',
      '#..####..#####..####..#',
      '#..#..#..#***#..#..#..#',
      '#..#..#..#...#..#..#..#',
      '#..####..#.#.#..####..#',
      '#..g....B.....g....o..#',
      '#..####....####....#..#',
      '#..#..#..s.#..#..B.#..#',
      '#..#..#....#..#....#..#',
      '#..####....####....#..#',
      '#..g....B.....g.......#',
      '######################',
    ],
    player: { col: 2, row: 16 },
    exit: { col: 19, row: 16 },
    guards: [
      { name: 'MIRA', way: [[4, 1], [17, 1], [17, 6], [4, 6]], speed: 60 },
      { name: 'TOBIN', way: [[4, 11], [17, 11], [17, 16], [4, 16]], speed: 56 },
      { name: 'BRAM', way: [[10, 7], [10, 10], [14, 10], [14, 7]], speed: 50 },
      { name: 'FENNA', way: [[2, 8], [8, 8], [8, 9], [2, 9]], speed: 46 },
    ],
    cameras: [
      { col: 11, row: 6, base: Math.PI / 2, sweep: 1.1, speed: 0.6 },
      { col: 11, row: 12, base: -Math.PI / 2, sweep: 1.1, speed: 0.55 },
    ],
    lamps: [[6, 3], [15, 3], [6, 14], [15, 14]],
    loot: [[19, 1], [19, 11], [2, 6], [19, 6]],
  },
  {
    name: 'NIGHT 3 — THE STARLIGHT GREENHOUSE',
    objective: 'Star Seed',
    relicName: 'STAR SEED',
    map: [
      '######################',
      '#.s....g.....B....s...#',
      '#.####..#####..####...#',
      '#.#..#..#...#..#..#...#',
      '#.#..#...*.#..#..#.o.#',
      '#.#..#..#...#..#..#...#',
      '#.####..#####..####...#',
      '#.g....B.....g....s...#',
      '#.####..#####..####...#',
      '#.#..#..#...#..#..#...#',
      '#.#..#..#.o.#..#..#.B.#',
      '#.#..#..#...#..#..#...#',
      '#.####..#####..####...#',
      '#.s....g.....B....s...#',
      '#.####..#####..####...#',
      '#.#..#..#...#..#..#...#',
      '#.#..#..#.o.#..#..#.o.#',
      '######################',
    ],
    player: { col: 2, row: 1 },
    exit: { col: 19, row: 1 },
    guards: [
      { name: 'CORIN', way: [[3, 7], [18, 7], [18, 13], [3, 13]], speed: 64 },
      { name: 'MIRA', way: [[6, 1], [6, 16], [15, 16], [15, 1]], speed: 62 },
      { name: 'TOBIN', way: [[10, 3], [10, 6], [12, 6], [12, 3]], speed: 54 },
      { name: 'BRAM', way: [[10, 10], [10, 13], [12, 13], [12, 10]], speed: 54 },
      { name: 'FENNA', way: [[2, 9], [8, 9], [8, 11], [2, 11]], speed: 48 },
    ],
    cameras: [
      { col: 11, row: 7, base: 0, sweep: 1.2, speed: 0.7 },
      { col: 5, row: 13, base: Math.PI / 2, sweep: 1.0, speed: 0.6 },
      { col: 17, row: 13, base: -Math.PI / 2, sweep: 1.0, speed: 0.6 },
    ],
    lamps: [[5, 7], [16, 7], [11, 1], [11, 16]],
    loot: [[19, 4], [19, 10], [19, 16], [2, 16]],
  },
];

export const PLAYER = { speed: 132, sneakSpeed: 72, sprintSpeed: 212, radius: 11 };
export const GUARD = { range: 175, halfAngle: 0.56, hearRadius: 150 };
export const CAMERA = { range: 195, halfAngle: 0.48 };
export const GHOST_BONUS = 500;
export const LOOT_POINTS = 100;
export const RELIC_POINTS = 500;
