import { sheetUrl, parseSheet, ranked, progress } from './data.js';
import config from './config.js';

const TOTAL_TASKS = config.totalTasks;

const refresh = document.querySelector('#refresh');
const status = document.querySelector('#status');
const error = document.querySelector('#error');
const format = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 });
const summer = config.season === 'summer';
let loading = false;
let hasData = false;
let previousData = '';

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function render(entries) {
  const tracks = document.createDocumentFragment();
  for (const entry of entries) {
    const row = element('div', 'track-row');
    const name = element('div', 'track-name', entry.name);
    const lane = element('div', 'lane');
    lane.setAttribute('role', 'img');
    lane.setAttribute('aria-label', `${entry.name}: ${format.format(entry.tasks)} z ${TOTAL_TASKS} zadań`);
    const marker = element('div', summer ? 'marker ship' : 'marker skier');
    marker.style.left = `${progress(entry.tasks, TOTAL_TASKS)}%`;
    const img = element('img');
    img.src = summer ? '/assets/mayflower-ship.png' : '/assets/skier.gif';
    img.alt = '';
    img.width = summer ? 38 : 34;
    img.height = summer ? 38 : 34;
    marker.append(img);
    lane.append(marker);
    row.append(name, lane, element('span', 'tasks', `${format.format(entry.tasks)}/${TOTAL_TASKS}`));
    tracks.append(row);
  }
  document.querySelector('#tracks').replaceChildren(tracks);
  const ranking = document.createDocumentFragment();
  for (const entry of ranked(entries)) {
    const row = element('tr', entry.place <= 3 ? `podium podium-${entry.place}` : '');
    row.append(element('td', 'place', String(entry.place)), element('td', 'team', entry.name), element('td', 'points', format.format(entry.points)));
    ranking.append(row);
  }
  document.querySelector('#ranking').replaceChildren(ranking);
}

async function update() {
  if (loading) return;
  loading = true;
  refresh.disabled = true;
  error.hidden = true;
  status.textContent = 'Pobieranie punktacji…';
  try {
    const response = await fetch(sheetUrl(config), { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const entries = parseSheet(await response.text());
    const serialized = JSON.stringify(entries);
    if (serialized !== previousData) {
      render(entries);
      previousData = serialized;
    }
    hasData = true;
    document.querySelector('#results').hidden = entries.length === 0;
    const time = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    status.textContent = entries.length ? `Wyjazdy: ${entries.length} · Odczyt: ${time}` : 'W arkuszu nie ma jeszcze punktacji.';
  } catch {
    error.textContent = hasData
      ? 'Nie udało się odświeżyć punktacji. Wyświetlamy ostatnio pobrane dane. Spróbuj ponownie za chwilę.'
      : 'Nie udało się pobrać punktacji. Sprawdź połączenie i spróbuj ponownie. Arkusz organizatorów musi być dostępny do odczytu przez link.';
    error.hidden = false;
    status.textContent = hasData ? 'Dane mogą być nieaktualne' : 'Brak połączenia z punktacją';
  } finally {
    loading = false;
    refresh.disabled = false;
  }
}

refresh.addEventListener('click', update);
setInterval(() => { if (!document.hidden) update(); }, config.refreshSeconds * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
update();
