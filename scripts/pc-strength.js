// Measures how well the PC plays by simulating thousands of rounds without showing them.
//   npm run strength                     the PC against random play, and against itself
//   npm run strength -- --against HEAD   also compares the PC now with the PC in a git commit (HEAD, main~3, a hash ...)
//   npm run strength -- --rounds 5000    fewer rounds for a quicker, rougher answer (default 20000)
// See "Measuring strength" in PC-STRATEGY.md.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const folder = path.join(root, 'src', 'app', 'regression');
const reportSpec = path.join(folder, 'pc-strength-report.tmp.spec.ts');
const againstBrain = path.join(folder, 'pc-brain-against.tmp.ts');

const arg = name => {
  const index = process.argv.indexOf('--' + name);
  return index > 0 ? process.argv[index + 1] : undefined;
};
const rounds = Number(arg('rounds') || 20000);
const against = arg('against');

if (against) {
  const old = spawnSync('git', ['show', against + ':src/app/pc-brain.ts'], { cwd: root, encoding: 'utf8' });
  if (old.status !== 0) {
    console.error(old.stderr);
    console.error('Could not read src/app/pc-brain.ts at ' + against + '.');
    process.exit(1);
  }
  // it lives one folder down from the real pc-brain.ts, so its own imports move up a folder
  fs.writeFileSync(againstBrain, old.stdout.replace(/from '\.\//g, "from '../"));
}

const matchups = [
  ['random', 'RANDOM_BRAIN', 'random', 'RANDOM_BRAIN'],
  ['PC', 'pc', 'random', 'RANDOM_BRAIN'],
  ['random', 'RANDOM_BRAIN', 'PC', 'pc'],
  ['PC', 'pc', 'PC', 'pc']
].concat(against ? [
  [against, 'before', against, 'before'],
  ['PC', 'pc', against, 'before'],
  [against, 'before', 'PC', 'pc']
] : []);

fs.writeFileSync(reportSpec, [
  '// Written and deleted by scripts/pc-strength.js',
  "import * as pc from '../pc-brain';",
  against ? "import * as before from './pc-brain-against.tmp';" : '',
  "import { measure, RANDOM_BRAIN } from './pc-strength';",
  "import { seededRandom } from './seeded-random';",
  '',
  "describe('PC strength report', () => {",
  "  it('measures every matchup', () => {",
  '    // every row starts from the same random numbers, so two identical PCs score exactly the same',
  '    let random = seededRandom(1);',
  "    spyOn(Math, 'random').and.callFake(() => random());",
  '    const rows = [',
  ...matchups.map(([callerName, caller, defenderName, defenders]) =>
    `      (random = seededRandom(1), measure('${callerName}', ${caller}, '${defenderName}', ${defenders}, ${rounds})),`),
  '    ];',
  "    console.warn('PC_STRENGTH=' + JSON.stringify(rows));",
  '    expect(rows.length).toBeGreaterThan(0);',
  '  }, 3600000);',
  '});',
  ''
].join('\n'));

let output = '';
try {
  console.log(`Playing ${rounds} rounds for each of ${matchups.length} matchups ...`);
  const result = spawnSync(process.execPath, [
    path.join(root, 'node_modules', '@angular', 'cli', 'bin', 'ng'), 'test',
    '--include=src/app/regression/pc-strength-report.tmp.spec.ts',
    '--watch=false', '--browsers=ChromeHeadless', '--progress=false'
  ], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  output = (result.stdout || '') + (result.stderr || '');
} finally {
  [reportSpec, againstBrain].forEach(file => fs.existsSync(file) && fs.unlinkSync(file));
}

const match = output.match(/PC_STRENGTH=(\[[^\]]*\])/);
if (!match) {
  console.error(output.slice(-4000));
  console.error('\nThe strength report did not finish.');
  process.exit(1);
}
const rows = JSON.parse(match[1]);
const pad = (text, width) => String(text).padEnd(width);
console.log('\n' + pad('Caller', 14) + pad('Defenders', 14) + pad('Caller wins', 13) + pad('Caller points', 15)
  + pad('Defender points', 17) + 'Caller 7 of trump');
rows.forEach(row => console.log(pad(row.caller, 14) + pad(row.defenders, 14) + pad(row.callerWinPercent.toFixed(2) + '%', 13)
  + pad(row.callerAveragePoints.toFixed(2), 15) + pad(row.defenderAveragePoints.toFixed(2), 17)
  + (row.callerAverageSevenCents >= 0 ? '+' : '') + row.callerAverageSevenCents.toFixed(3) + '¢'));
console.log(`\n${rounds} rounds per row, the same deals in every row. The 7 of trump column is what it paid the caller per round,`
  + ' from both defenders together.');
