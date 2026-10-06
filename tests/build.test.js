import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, loadConfig, validateConfig } from '../scripts/build.mjs';
import { sheetUrl, progress } from '../src/data.js';

const winter = { id: 'haz27', season: 'winter', year: 2027, spreadsheetId: 'abcdefghijklmnopqrstuv', sheetName: 'Punktacja', range: 'B2:E', totalTasks: 16 };
const summer = { ...winter, id: 'hal26', season: 'summer', year: 2026, spreadsheetId: 'zyxwvutsrqponmlkjihgfe', totalTasks: 12 };
const catalog = { refreshSeconds: 90, actions: [summer, winter] };
const embedded = html => JSON.parse(html.match(/<script id="site-config" type="application\/json">(.*?)<\/script>/s)[1]);

async function withOutput(run) {
  const directory = await mkdtemp(join(tmpdir(), 'grywalizacja-build-'));
  try { await run(directory); }
  finally { await rm(directory, { recursive: true, force: true }); }
}

test('root shows latest action regardless of list order; archive has its own sheet and season', () => withOutput(async directory => {
  await build(catalog, directory);
  const home = await readFile(join(directory, 'index.html'), 'utf8');
  const haz = await readFile(join(directory, 'akcje/haz27/index.html'), 'utf8');
  const hal = await readFile(join(directory, 'akcje/hal26/index.html'), 'utf8');
  assert.equal(home, haz);
  assert.deepEqual(embedded(home), { ...winter, refreshSeconds: 90 });
  assert.deepEqual(embedded(hal), { ...summer, refreshSeconds: 90 });
  assert.match(home, /HAZ 2027/);
  assert.match(home, /16 zadań/);
  assert.match(home, /<span>4<\/span><span>8<\/span><span>12<\/span>/);
  assert.match(home, /href="\/" aria-current="page">HAZ27/);
  assert.match(hal, /href="\/akcje\/hal26\/" aria-current="page">HAL26/);
  assert.match(hal, /HAL 2026/);
  assert.match(hal, /Umeicon/);
  assert.doesNotMatch(home, /Umeicon/);
  for (const html of [home, hal]) {
    assert.match(html, /github.com\/pawelmarczuk\/okret-haz25/);
    assert.match(html, /Odświeżanie co 90 s/);
    assert.doesNotMatch(html, /\{\{/);
    const appFile = html.match(/<script type="module" src="\/(app\.[a-f0-9]+\.js)">/)[1];
    const js = await readFile(join(directory, appFile), 'utf8');
    assert.match(js, /querySelector\('#site-config'\)/);
    const dataFile = js.match(/from '\.\/(data\.[a-f0-9]+\.js)'/)[1];
    assert.ok((await readFile(join(directory, dataFile), 'utf8')).length > 0);
  }
  const assets = await readdir(join(directory, 'assets'));
  assert.ok(assets.includes('mayflower-ship.png'));
  assert.ok(assets.includes('skier.gif'));
}));

test('adding HAL27 makes it the homepage and retains HAZ27 and HAL26 at stable addresses', () => withOutput(async directory => {
  const newAction = { ...summer, id: 'hal27', year: 2027 };
  await build({ ...catalog, actions: [winter, newAction, summer] }, directory);
  assert.equal(embedded(await readFile(join(directory, 'index.html'), 'utf8')).id, 'hal27');
  assert.equal(embedded(await readFile(join(directory, 'akcje/haz27/index.html'), 'utf8')).spreadsheetId, winter.spreadsheetId);
  assert.equal(embedded(await readFile(join(directory, 'akcje/hal26/index.html'), 'utf8')).spreadsheetId, summer.spreadsheetId);
}));

test('rebuild removes an explicitly removed action and its seasonal asset', () => withOutput(async directory => {
  await build(catalog, directory);
  await build({ ...catalog, actions: [winter] }, directory);
  assert.deepEqual(await readdir(join(directory, 'akcje')), ['haz27']);
  assert.equal((await readdir(join(directory, 'assets'))).includes('mayflower-ship.png'), false);
}));

test('embedded settings cannot break out of the JSON script element', () => withOutput(async directory => {
  const sheetName = '</script><script>alert(1)</script>';
  await build({ ...catalog, actions: [{ ...winter, sheetName }] }, directory);
  const html = await readFile(join(directory, 'index.html'), 'utf8');
  assert.ok(!html.includes(sheetName));
  assert.equal(embedded(html).sheetName, sheetName);
}));

test('invalid settings, duplicates, traversal IDs and unexpected keys block publication', () => {
  for (const bad of [{ id: '../bad' }, { season: 'autumn' }, { totalTasks: 0 }, { spreadsheetId: 'https://docs.google.com/' }, { range: 'B2' }, { API_KEY: 'do-not-publish' }]) {
    assert.throws(() => validateConfig({ ...catalog, actions: [{ ...winter, ...bad }] }));
  }
  assert.throws(() => validateConfig({ ...catalog, actions: [] }));
  assert.throws(() => validateConfig({ ...catalog, actions: [winter, winter] }));
  assert.throws(() => validateConfig({ ...catalog, actions: [winter, { ...winter, id: 'other' }] }));
  assert.throws(() => validateConfig({ ...catalog, refreshSeconds: 1 }));
  assert.throws(() => validateConfig({ ...catalog, API_KEY: 'secret' }));
});

test('explicit catalog is loaded; old single-season environment cannot override an action', () => withOutput(async directory => {
  const path = join(directory, 'settings.json');
  await writeFile(path, JSON.stringify(catalog));
  const result = await loadConfig({ SITE_CONFIG: path, SEASON: 'summer' });
  assert.equal(result.actions[0].id, 'haz27');
  assert.equal(result.actions[0].season, 'winter');
}));

test('sheet and progress use selected action settings', () => {
  const url = sheetUrl({ ...winter, sheetName: 'Punkty lato & zima' });
  assert.equal(url.searchParams.get('sheet'), 'Punkty lato & zima');
  assert.equal(url.searchParams.get('range'), 'B2:E');
  assert.ok(sheetUrl(summer).pathname.includes(summer.spreadsheetId));
  assert.equal(progress(8, 16), 50);
});
