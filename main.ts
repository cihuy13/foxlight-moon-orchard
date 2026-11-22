// Foxlight — The Moon Orchard, entry program (Node 22, stdlib only).
//
// What it hands in: the static game under game/, the three real
// screenshots under screenshots/, and a dossier.json that the vendored
// make.fun library builds from exactly those files. The grader runs this
// program twice in a read-only directory and expects byte-identical
// output, so it writes only under the output directory and reads only
// files beside itself. Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps for this bounty: the text cap shapes the dossier,
// the rest only refuse an entry the scorer would refuse, so passing them
// here makes this program fail in the same places the scorer would.
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handIn() {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
  const shotsDir = join(outputDir, 'screenshots');
  mkdirSync(shotsDir, { recursive: true });
  if (existsSync(join(repoRoot, 'screenshots'))) {
    cpSync(join(repoRoot, 'screenshots'), shotsDir, { recursive: true });
  }
  const dossier = buildDossier(outputDir, dossierCaps);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  const shotCount = readdirSync(shotsDir).length;
  console.log(`Foxlight handed in: ${shotCount} screenshot(s), dossier ${dossier.length} bytes.`);
}

handIn();
