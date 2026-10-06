export function sheetUrl(config) {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/gviz/tq`);
  url.search = new URLSearchParams({ sheet: config.sheetName, range: config.range, headers: '0', tqx: 'out:json' });
  return url;
}

export function number(value) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

// Parse Google's JSON wrapper as data; never execute spreadsheet content.
export function parseSheet(text) {
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
  if (!match) throw new Error('Nieprawidłowa odpowiedź arkusza.');
  const response = JSON.parse(match[1]);
  if (response.status !== 'ok' || !Array.isArray(response.table?.rows)) throw new Error('Arkusz nie udostępnił punktacji.');
  return response.table.rows.flatMap(({ c }) => {
    const name = String(c?.[0]?.v ?? '').trim();
    return name ? [{ name, points: number(c?.[1]?.v), tasks: number(c?.[2]?.v) }] : [];
  });
}

export function ranked(entries) {
  let place = 0;
  let previous;
  return [...entries].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'pl')).map(entry => {
    if (entry.points !== previous) place += 1;
    previous = entry.points;
    return { ...entry, place };
  });
}

export function progress(tasks, totalTasks = 12) {
  return Math.max(0, Math.min(100, number(tasks) / totalTasks * 100));
}
