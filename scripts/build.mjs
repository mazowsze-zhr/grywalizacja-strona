import { readFile, mkdir, cp, writeFile, rm } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const actionFields = ['id', 'season', 'year', 'spreadsheetId', 'sheetName', 'range', 'totalTasks'];

export function validateConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Konfiguracja musi być obiektem JSON.');
  const unknown = Object.keys(input).filter(key => !['actions', 'refreshSeconds'].includes(key));
  if (unknown.length) throw new Error(`Nieznane ustawienia: ${unknown.join(', ')}.`);
  const refreshSeconds = Number(input.refreshSeconds);
  if (!Number.isInteger(refreshSeconds) || refreshSeconds < 30 || refreshSeconds > 86400) throw new Error('refreshSeconds musi być liczbą całkowitą od 30 do 86400.');
  if (!Array.isArray(input.actions) || !input.actions.length) throw new Error('Dodaj co najmniej jedną akcję do actions.');
  const ids = new Set();
  const editions = new Set();
  const actions = input.actions.map(action => {
    if (!action || typeof action !== 'object' || Array.isArray(action)) throw new Error('Akcja musi być obiektem JSON.');
    const extra = Object.keys(action).filter(key => !actionFields.includes(key));
    if (extra.length) throw new Error(`Nieznane ustawienia akcji: ${extra.join(', ')}.`);
    const config = Object.fromEntries(actionFields.map(key => [key, action[key]]));
    if (typeof config.id !== 'string' || !/^[a-z][a-z0-9-]{1,39}$/.test(config.id)) throw new Error('id akcji musi być krótką nazwą z małych liter, cyfr i myślników, np. haz27.');
    if (ids.has(config.id)) throw new Error(`Powtórzony id akcji: ${config.id}.`);
    ids.add(config.id);
    if (!['winter', 'summer'].includes(config.season)) throw new Error('season musi wynosić winter lub summer.');
    for (const [key, min, max] of [['year', 2000, 2100], ['totalTasks', 1, 10000]]) {
      config[key] = Number(config[key]);
      if (!Number.isInteger(config[key]) || config[key] < min || config[key] > max) throw new Error(`${key} musi być liczbą całkowitą od ${min} do ${max}.`);
    }
    const edition = `${config.year}-${config.season}`;
    if (editions.has(edition)) throw new Error(`Powtórzony sezon i rok: ${edition}.`);
    editions.add(edition);
    if (typeof config.spreadsheetId !== 'string' || !/^[a-zA-Z0-9_-]{20,}$/.test(config.spreadsheetId)) throw new Error('Wpisz poprawny spreadsheetId: sam identyfikator z adresu arkusza, bez URL.');
    if (typeof config.sheetName !== 'string' || !config.sheetName.trim()) throw new Error('sheetName nie może być puste.');
    config.sheetName = config.sheetName.trim();
    if (typeof config.range !== 'string' || !/^[A-Z]+[1-9]\d*:[A-Z]+(?:[1-9]\d*)?$/.test(config.range)) throw new Error('range musi być zakresem A1, np. B2:E, bez nazwy zakładki.');
    return config;
  });
  // Summer follows winter within the same calendar year. Array order is irrelevant.
  actions.sort((a, b) => b.year - a.year || Number(b.season === 'summer') - Number(a.season === 'summer'));
  return { refreshSeconds, actions };
}

export async function loadConfig(env = process.env) {
  const configPath = resolve(root, env.SITE_CONFIG || 'actions.json');
  let input;
  try { input = JSON.parse(await readFile(configPath, 'utf8')); }
  catch (error) { throw new Error(`Nie można odczytać katalogu akcji (${configPath}): ${error.message}`); }
  return validateConfig(input);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function actionLabel(action) {
  return `${action.season === 'summer' ? 'HAL' : 'HAZ'}${String(action.year).slice(-2)}`;
}

function renderPage(catalog, action, template, files) {
  const config = { ...action, refreshSeconds: catalog.refreshSeconds };
  const summer = config.season === 'summer';
  const latest = catalog.actions[0];
  const edition = `${summer ? 'HAL' : 'HAZ'} ${config.year}`;
  const format = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 });
  const scale = ['Start', ...[.25, .5, .75].map(fraction => format.format(config.totalTasks * fraction)), `${summer ? 'Port' : 'Meta'} · ${config.totalTasks}`];
  const navigation = catalog.actions.map(item => {
    const isLatest = item.id === latest.id;
    const href = isLatest ? '/' : `/akcje/${item.id}/`;
    const current = item.id === action.id ? ' aria-current="page"' : '';
    return `<a href="${href}"${current}>${actionLabel(item)}<span>${isLatest ? 'Najnowsza akcja' : 'Archiwum'}</span></a>`;
  }).join('');
  const values = {
    APP_FILE: files.appFile,
    STYLES_FILE: files.stylesFile,
    PUBLIC_CONFIG: JSON.stringify(config).replace(/</g, '\\u003c'),
    THEME_COLOR: summer ? '#215f54' : '#07566a',
    EDITION: edition,
    FAVICON: summer ? '/assets/mayflower-ship.png' : '/favicon.svg',
    SEASON: config.season,
    BRAND_MARK: summer ? '<img class="brand-mark" src="/assets/mayflower-ship.png" width="43" height="43" alt="">' : '<span class="brand-mark" aria-hidden="true">⚑</span>',
    SEASON_NAME: summer ? 'Harcerska akcja letnia' : 'Harcerska akcja zimowa',
    HEADING: summer ? 'Kurs na gotowość do wyjazdu' : 'Kierunek: gotowość do wyjazdu',
    INTRO: summer ? 'Im więcej zrealizowanych zadań, tym dalej płynie statek.' : 'Im więcej zrealizowanych zadań, tym dalej jedzie narciarz.',
    ACTION_NAV: navigation,
    TOTAL_TASKS: config.totalTasks,
    DESTINATION: summer ? 'do portu' : 'do mety',
    SCALE: scale.map(text => `<span>${escapeHtml(text)}</span>`).join(''),
    REFRESH_SECONDS: config.refreshSeconds,
    ASSET_CREDIT: summer ? '<small class="credits">Ikona statku: <a href="https://www.flaticon.com/authors/umeicon">Umeicon</a> / <a href="https://www.flaticon.com/free-icon/mayflower-ship_8823135">Flaticon</a></small>' : ''
  };
  const raw = new Set(['BRAND_MARK', 'SCALE', 'ASSET_CREDIT', 'PUBLIC_CONFIG', 'ACTION_NAV']);
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Nieznane pole szablonu: ${key}`);
    return raw.has(key) ? values[key] : escapeHtml(values[key]);
  });
}

export async function build(configInput, destination = join(root, 'dist')) {
  const catalog = validateConfig(configInput);
  const filename = (name, content, extension) => `${name}.${createHash('sha256').update(content).digest('hex').slice(0, 16)}.${extension}`;
  const dataSource = await readFile(join(root, 'src/data.js'), 'utf8');
  const dataFile = filename('data', dataSource, 'js');
  const appSource = (await readFile(join(root, 'src/app.js'), 'utf8')).replace("'./data.js'", `'./${dataFile}'`);
  const appFile = filename('app', appSource, 'js');
  const stylesSource = await readFile(join(root, 'src/styles.css'), 'utf8');
  const stylesFile = filename('styles', stylesSource, 'css');
  const template = await readFile(join(root, 'src/index.html'), 'utf8');
  await rm(destination, { recursive: true, force: true });
  await mkdir(join(destination, 'assets'), { recursive: true });
  await cp(join(root, 'src/favicon.svg'), join(destination, 'favicon.svg'));
  for (const [file, content] of [[appFile, appSource], [dataFile, dataSource], [stylesFile, stylesSource]]) await writeFile(join(destination, file), content);
  const seasons = new Set(catalog.actions.map(action => action.season));
  const assets = ['background4.jpg'];
  if (seasons.has('summer')) assets.push('mayflower-ship.png');
  if (seasons.has('winter')) assets.push('skier.gif');
  for (const file of assets) await cp(join(root, 'src/assets', file), join(destination, 'assets', file));
  for (const action of catalog.actions) {
    const directory = join(destination, 'akcje', action.id);
    await mkdir(directory, { recursive: true });
    const html = renderPage(catalog, action, template, { appFile, stylesFile });
    await writeFile(join(directory, 'index.html'), html);
    if (action.id === catalog.actions[0].id) await writeFile(join(destination, 'index.html'), html);
  }
  return { latest: actionLabel(catalog.actions[0]), count: catalog.actions.length, destination };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { latest, count } = await build(await loadConfig());
    console.log(`Gotowe: ${count} akcje, domyślnie ${latest} → dist/`);
  } catch (error) {
    console.error(`Błąd budowania: ${error.message}`);
    process.exitCode = 1;
  }
}
