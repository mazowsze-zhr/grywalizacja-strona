import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, loadConfig, validateConfig } from '../scripts/build.mjs';
import { sheetUrl, progress } from '../src/data.js';

const config = { season: 'summer', year: 2027, spreadsheetId: 'abcdefghijklmnopqrstuv', sheetName: 'Punktacja', range: 'B2:E', totalTasks: 16, refreshSeconds: 90 };

test('both seasons build from one config; a rebuild removes previous seasonal assets', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'grywalizacja-build-'));
  try {
    for (const season of ['summer', 'winter']) {
      await build({ ...config, season }, directory);
      const html = await readFile(join(directory, 'index.html'), 'utf8');
      const assets = await readdir(join(directory, 'assets'));
      assert.match(html, new RegExp(`${season === 'summer' ? 'HAL' : 'HAZ'} 2027`));
      assert.match(html, /16 zadań/);
      assert.match(html, /<span>4<\/span><span>8<\/span><span>12<\/span>/);
      assert.match(html, /Odświeżanie co 90 s/);
      assert.match(html, /github.com\/pawelmarczuk\/okret-haz25/);
      assert.doesNotMatch(html, /\{\{|class="seasons"|href="\/hal\/"/);
      assert.equal(html.includes('Umeicon'), season === 'summer');
      assert.equal(assets.includes('mayflower-ship.png'), season === 'summer');
      assert.equal(assets.includes('skier.gif'), season === 'winter');
      assert.equal((await readdir(directory)).includes('hal'), false);
      const result = JSON.parse(html.match(/<script id="site-config" type="application\/json">(.*?)<\/script>/s)[1]);
      assert.deepEqual(result, { ...config, season });
      assert.equal((await readdir(directory)).includes('config.js'), false);
      const appFile = html.match(/<script type="module" src="\/(app\.[a-f0-9]+\.js)">/)[1];
      const js = await readFile(join(directory, appFile), 'utf8');
      assert.match(js, /querySelector\('#site-config'\)/);
      assert.doesNotMatch(js, /import config/);
      const dataFile = js.match(/from '\.\/(data\.[a-f0-9]+\.js)'/)[1];
      assert.ok((await readFile(join(directory, dataFile), 'utf8')).length > 0);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('embedded settings cannot break out of the JSON script element', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'grywalizacja-escape-'));
  try {
    const sheetName = '</script><script>alert(1)</script>';
    await build({ ...config, sheetName }, directory);
    const html = await readFile(join(directory, 'index.html'), 'utf8');
    assert.ok(!html.includes(sheetName));
    const embedded = JSON.parse(html.match(/<script id="site-config" type="application\/json">(.*?)<\/script>/s)[1]);
    assert.equal(embedded.sheetName, sheetName);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('invalid settings and unexpected keys fail before publishing', () => {
  for (const bad of [{ season: 'autumn' }, { totalTasks: 0 }, { refreshSeconds: 1 }, { spreadsheetId: 'https://docs.google.com/' }, { range: 'B2' }, { API_KEY: 'do-not-publish' }]) {
    assert.throws(() => validateConfig({ ...config, ...bad }));
  }
});

test('admin environment overrides are applied and validated', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'grywalizacja-config-'));
  try {
    const { writeFile } = await import('node:fs/promises');
    const path = join(directory, 'settings.json');
    await writeFile(path, JSON.stringify(config));
    const result = await loadConfig({ SITE_CONFIG: path, SEASON: 'winter', YEAR: '2028', TOTAL_TASKS: '20' });
    assert.equal(result.season, 'winter');
    assert.equal(result.year, 2028);
    assert.equal(result.totalTasks, 20);
    await assert.rejects(loadConfig({ SITE_CONFIG: path, SEASON: 'invalid' }));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('sheet and progress use hosting settings rather than hardcoded winter values', () => {
  const url = sheetUrl({ ...config, sheetName: 'Punkty lato & zima' });
  assert.equal(url.searchParams.get('sheet'), 'Punkty lato & zima');
  assert.equal(url.searchParams.get('range'), 'B2:E');
  assert.equal(progress(8, 16), 50);
});
