import { readFile, mkdir, cp, writeFile, rm } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fields = ['season', 'year', 'spreadsheetId', 'sheetName', 'range', 'totalTasks', 'refreshSeconds'];
const overrides = { SEASON: 'season', YEAR: 'year', SPREADSHEET_ID: 'spreadsheetId', SHEET_NAME: 'sheetName', SHEET_RANGE: 'range', TOTAL_TASKS: 'totalTasks', REFRESH_SECONDS: 'refreshSeconds' };

export function validateConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Konfiguracja musi być obiektem JSON.');
  const unknown = Object.keys(input).filter(key => !fields.includes(key));
  if (unknown.length) throw new Error(`Nieznane ustawienia: ${unknown.join(', ')}.`);
  const config = Object.fromEntries(fields.map(key => [key, input[key]]));
  if (!['winter', 'summer'].includes(config.season)) throw new Error('season musi wynosić winter lub summer.');
  for (const [key, min, max] of [['year', 2000, 2100], ['totalTasks', 1, 10000], ['refreshSeconds', 30, 86400]]) {
    config[key] = Number(config[key]);
    if (!Number.isInteger(config[key]) || config[key] < min || config[key] > max) throw new Error(`${key} musi być liczbą całkowitą od ${min} do ${max}.`);
  }
  if (typeof config.spreadsheetId !== 'string' || !/^[a-zA-Z0-9_-]{20,}$/.test(config.spreadsheetId)) throw new Error('Wpisz poprawny spreadsheetId: sam identyfikator z adresu arkusza, bez URL.');
  if (typeof config.sheetName !== 'string' || !config.sheetName.trim()) throw new Error('sheetName nie może być puste.');
  config.sheetName = config.sheetName.trim();
  if (typeof config.range !== 'string' || !/^[A-Z]+[1-9]\d*:[A-Z]+(?:[1-9]\d*)?$/.test(config.range)) throw new Error('range musi być zakresem A1, np. B2:E, bez nazwy zakładki.');
  return config;
}

export async function loadConfig(env = process.env) {
  const configPath = resolve(root, env.SITE_CONFIG || 'site.config.json');
  let input;
  try { input = JSON.parse(await readFile(configPath, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') throw new Error('Brak konfiguracji. Skopiuj site.config.example.json do site.config.json i wpisz ustawienia.');
    throw new Error(`Nie można odczytać konfiguracji: ${error.message}`);
  }
  for (const [variable, key] of Object.entries(overrides)) {
    if (env[variable] !== undefined) input[key] = env[variable];
  }
  return validateConfig(input);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export async function build(configInput, destination = join(root, 'dist')) {
  const config = validateConfig(configInput);
  const summer = config.season === 'summer';
  const edition = `${summer ? 'HAL' : 'HAZ'} ${config.year}`;
  const format = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 });
  const scale = ['Start', ...[.25, .5, .75].map(fraction => format.format(config.totalTasks * fraction)), `${summer ? 'Port' : 'Meta'} · ${config.totalTasks}`];
  const values = {
    THEME_COLOR: summer ? '#215f54' : '#07566a',
    EDITION: edition,
    FAVICON: summer ? '/assets/mayflower-ship.png' : '/favicon.svg',
    SEASON: config.season,
    BRAND_MARK: summer ? '<img class="brand-mark" src="/assets/mayflower-ship.png" width="43" height="43" alt="">' : '<span class="brand-mark" aria-hidden="true">⚑</span>',
    SEASON_NAME: summer ? 'Harcerska akcja letnia' : 'Harcerska akcja zimowa',
    HEADING: summer ? 'Kurs na gotowość do wyjazdu' : 'Kierunek: gotowość do wyjazdu',
    INTRO: summer ? 'Im więcej zrealizowanych zadań, tym dalej płynie statek.' : 'Im więcej zrealizowanych zadań, tym dalej jedzie narciarz.',
    TOTAL_TASKS: config.totalTasks,
    DESTINATION: summer ? 'do portu' : 'do mety',
    SCALE: scale.map(text => `<span>${escapeHtml(text)}</span>`).join(''),
    REFRESH_SECONDS: config.refreshSeconds,
    ASSET_CREDIT: summer ? '<small class="credits">Ikona statku: <a href="https://www.flaticon.com/authors/umeicon">Umeicon</a> / <a href="https://www.flaticon.com/free-icon/mayflower-ship_8823135">Flaticon</a></small>' : ''
  };
  const template = await readFile(join(root, 'src/index.html'), 'utf8');
  const raw = new Set(['BRAND_MARK', 'SCALE', 'ASSET_CREDIT']);
  const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Nieznane pole szablonu: ${key}`);
    return raw.has(key) ? values[key] : escapeHtml(values[key]);
  });
  // Recreate the output so a previous deployment's season or assets cannot leak in.
  await rm(destination, { recursive: true, force: true });
  await mkdir(join(destination, 'assets'), { recursive: true });
  for (const file of ['app.js', 'data.js', 'styles.css', 'favicon.svg']) await cp(join(root, 'src', file), join(destination, file));
  for (const file of ['background4.jpg', summer ? 'mayflower-ship.png' : 'skier.gif']) await cp(join(root, 'src/assets', file), join(destination, 'assets', file));
  await writeFile(join(destination, 'index.html'), html);
  // Only the validated, explicitly allowed public settings are included.
  await writeFile(join(destination, 'config.js'), `export default ${JSON.stringify(config, null, 2)};\n`);
  return { edition, destination };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { edition } = await build(await loadConfig());
    console.log(`Gotowe: ${edition} → dist/`);
  } catch (error) {
    console.error(`Błąd budowania: ${error.message}`);
    process.exitCode = 1;
  }
}
