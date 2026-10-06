import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSheet, ranked, progress } from '../src/data.js';

const wrap = data => `/*O_o*/\ngoogle.visualization.Query.setResponse(${JSON.stringify(data)});`;

test('sheet rows preserve zero, normalize decimal comma, skip blank names and tolerate missing cells', () => {
  const entries = parseSheet(wrap({ status: 'ok', table: { rows: [
    { c: [{ v: ' Wyjazd A ' }, { v: '12,5' }, { v: 0 }] },
    { c: [{ v: 'Wyjazd B' }] },
    { c: [null, { v: 999 }] }
  ] } }));
  assert.deepEqual(entries, [{ name: 'Wyjazd A', points: 12.5, tasks: 0 }, { name: 'Wyjazd B', points: 0, tasks: 0 }]);
});

test('dense ranking matches PHP, including ties and negative scores', () => {
  const input = [{ name: 'C', points: -1 }, { name: 'B', points: 10 }, { name: 'A', points: 10 }, { name: 'D', points: 0 }];
  assert.deepEqual(ranked(input).map(({ name, place }) => [name, place]), [['A', 1], ['B', 1], ['D', 2], ['C', 3]]);
  assert.equal(input[0].name, 'C');
});

test('private sheet, invalid response and Google errors do not become empty rankings', () => {
  for (const text of ['<html>Sign in</html>', wrap({ status: 'error' }), wrap({ status: 'ok' })]) assert.throws(() => parseSheet(text));
});

test('progress respects twelve tasks and remains within the track', () => {
  assert.equal(progress(6), 50);
  assert.equal(progress(12), 100);
  assert.equal(progress(20), 100);
  assert.equal(progress(-1), 0);
  assert.equal(progress('invalid'), 0);
});
