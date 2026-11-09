// Runs the game regression test and saves what it played as the new baseline.
// Only run this when a change is meant to alter how games play out (see REGRESSION-TESTING.md).
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const baselineFile = path.join(root, 'src', 'app', 'regression', 'regression-baseline.ts');

const result = spawnSync(process.execPath, [
  path.join(root, 'node_modules', '@angular', 'cli', 'bin', 'ng'), 'test',
  '--include=src/app/regression/game-regression.spec.ts',
  '--watch=false', '--browsers=ChromeHeadless', '--progress=false'
], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const output = (result.stdout || '') + (result.stderr || '');
const match = output.match(/REGRESSION_HASHES=(\[[^\]]*\])/);
if (!match) {
  console.error(output.slice(-4000));
  console.error('\nThe regression test did not report its fingerprints, so the baseline was not changed.');
  process.exit(1);
}

const hashes = JSON.parse(match[1]);
const lines = hashes.map((hash, index) => `    '${hash}'${index < hashes.length - 1 ? ',' : ''}`);
fs.writeFileSync(baselineFile, [
  "// One fingerprint per seeded game in game-regression.spec.ts. Written by `npm run regression:baseline`; don't edit by hand.",
  'export const REGRESSION_BASELINE: string[] = [',
  ...lines,
  '];',
  ''
].join('\r\n'));
console.log(`Saved ${hashes.length} game fingerprints to ${path.relative(root, baselineFile)}`);
