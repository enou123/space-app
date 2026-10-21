'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {refreshSnapshot} = require('../scripts/refresh-iss.cjs');
const NOW = Date.parse('2026-10-22T00:00:00.000Z');
const DAY = 86_400_000;
const orbit = {
  URL: 'https://example.invalid/iss', DAY, MAX_AGE: 3 * DAY,
  validate(raw) {
    if (Number(raw?.elements?.NORAD_CAT_ID) !== 25544) throw new Error('Bad NORAD ID');
    const epoch = Date.parse(raw.elements.EPOCH + 'Z');
    if (!Number.isFinite(epoch) || !Number.isFinite(Date.parse(raw.fetchedAt))) throw new Error('Bad timestamp');
    return {epoch};
  },
  state(data, now) {return Math.abs(now - data.epoch) <= 3 * DAY ? {position: [0,0,0]} : null;},
};
const newElements = {NORAD_CAT_ID: 25544, EPOCH: '2026-10-21T23:00:00.000'};
const cached = {elements: {NORAD_CAT_ID: 25544, EPOCH: '2026-10-21T12:00:00.000'}, fetchedAt: '2026-10-21T12:05:00.000Z'};
const logger = {info() {}, warn() {}};
const ok = elements => ({ok: true, json: async () => [elements]});
function harness(fetcher, previousData) {
  let written = null;
  let reads = 0;
  let waits = [];
  return {
    deps: {orbit, now: NOW, fetcher, logger,
      readFile() {reads++; if (previousData === undefined) throw Error('ENOENT'); return JSON.stringify(previousData);},
      writeFile(_path, content) {written = content;}, delay: async ms => {waits.push(ms);}},
    result: () => ({written, reads, waits}),
  };
}
test('retries transient failures twice and stores new valid data on third attempt', async () => {
  let calls = 0;
  const h = harness(async () => {calls++; if (calls < 3) throw Error('network down'); return ok(newElements);}, cached);
  assert.deepEqual(await refreshSnapshot(h.deps), {source: 'live', attempts: 3});
  assert.equal(calls, 3);
  assert.deepEqual(h.result().waits, [1000, 2000]);
  assert.equal(h.result().reads, 0);
  assert.deepEqual(JSON.parse(h.result().written).elements, newElements);
});
test('uses previous snapshot unchanged when network fails three times', async () => {
  let calls = 0;
  const h = harness(async () => {calls++; throw Error('timeout');}, cached);
  assert.deepEqual(await refreshSnapshot(h.deps), {source: 'previous', attempts: 3});
  assert.equal(calls, 3);
  assert.deepEqual(JSON.parse(h.result().written), cached);
});
test('fails loudly when previous orbital elements are too old', async () => {
  const stale = {...cached, elements: {...cached.elements, EPOCH: '2026-10-15T12:00:00.000'}};
  const h = harness(async () => {throw Error('network down');}, stale);
  await assert.rejects(refreshSnapshot(h.deps), /no valid previous snapshot/);
  assert.equal(h.result().written, null);
});
test('fails loudly when no previous snapshot exists', async () => {
  const h = harness(async () => {throw Error('network down');});
  await assert.rejects(refreshSnapshot(h.deps), /no valid previous snapshot/);
  assert.equal(h.result().written, null);
});
test('rejects invalid previous snapshot instead of reporting false success', async () => {
  const h = harness(async () => {throw Error('network down');}, {...cached, elements: {...cached.elements, NORAD_CAT_ID: 12345}});
  await assert.rejects(refreshSnapshot(h.deps), /no valid previous snapshot/);
});
test('rejects orbital data with a future fetch timestamp', async () => {
  const future = {...cached, fetchedAt: '2026-10-23T12:05:00.000Z'};
  const h = harness(async () => {throw Error('network down');}, future);
  await assert.rejects(refreshSnapshot(h.deps), /no valid previous snapshot/);
});
test('invalid upstream JSON falls back only to a verified previous snapshot', async () => {
  const h = harness(async () => ok({NORAD_CAT_ID: 22}), cached);
  assert.equal((await refreshSnapshot(h.deps)).source, 'previous');
  assert.deepEqual(JSON.parse(h.result().written), cached);
});
test('first-attempt success needs no fallback and no waiting', async () => {
  const h = harness(async () => ok(newElements), cached);
  assert.deepEqual(await refreshSnapshot(h.deps), {source: 'live', attempts: 1});
  assert.equal(h.result().reads, 0);
  assert.deepEqual(h.result().waits, []);
});
