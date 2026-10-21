// Refresh the ISS orbital snapshot. Never fabricate, extend, or silently replace orbital elements.
'use strict';
const fs = require('node:fs');
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 20_000;

// Both live and previously published data must pass the exact same checks.
function validateSnapshot(raw, orbit, now) {
  const data = orbit.validate(raw);
  if (data.epoch > now + orbit.DAY) throw new Error('Orbital epoch is in the future');
  if (Date.parse(raw.fetchedAt) > now + 60_000) throw new Error('Fetch timestamp is in the future');
  if (Math.abs(now - data.epoch) > orbit.MAX_AGE) throw new Error('ISS orbital elements are outside the validity window');
  if (!orbit.state(data, now)) throw new Error('ISS orbital elements failed propagation');
  return data;
}

async function refreshSnapshot({
  orbit,
  outputPath = '/tmp/iss-latest.json',
  previousPath = '/tmp/iss-previous.json',
  fetcher = globalThis.fetch,
  readFile = fs.readFileSync,
  writeFile = fs.writeFileSync,
  delay = ms => new Promise(resolve => setTimeout(resolve, ms)),
  logger = console,
  now = Date.now(),
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
  if (!orbit || typeof fetcher !== 'function') throw new Error('Orbit validator and fetch are required');
  let snapshot = null;
  let lastError = null;
  let attempts = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    attempts = attempt;
    try {
      const response = await fetcher(orbit.URL, {signal: AbortSignal.timeout(timeoutMs)});
      if (!response.ok) throw new Error(`CelesTrak HTTP ${response.status}`);
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('CelesTrak returned an invalid JSON array');
      const elements = rows.find(r => Number(r.NORAD_CAT_ID) === 25544);
      const candidate = {elements, fetchedAt: new Date(now).toISOString()};
      const data = validateSnapshot(candidate, orbit, now);
      snapshot = candidate;
      logger.info(`ISS orbital elements refreshed on attempt ${attempt}; epoch ${new Date(data.epoch).toISOString()}`);
      break;
    } catch (error) {
      lastError = error;
      logger.warn(`ISS fetch attempt ${attempt}/${MAX_ATTEMPTS} failed: ${error.message}`);
      if (attempt < MAX_ATTEMPTS) await delay(1_000 * 2 ** (attempt - 1));
    }
  }

  let source = 'live';
  if (!snapshot) {
    source = 'previous';
    try {
      // Retain both the original elements and fetchedAt; never mark old data as freshly fetched.
      const previous = JSON.parse(readFile(previousPath, 'utf8'));
      const data = validateSnapshot(previous, orbit, now);
      snapshot = previous;
      logger.warn(`CelesTrak unavailable (${lastError?.message}); retaining verified snapshot, epoch ${new Date(data.epoch).toISOString()}`);
    } catch (error) {
      // Failure here is deliberate: no trustworthy in-date ISS orbital data remains.
      throw new Error(`ISS refresh failed after ${MAX_ATTEMPTS} attempts and no valid previous snapshot is available: ${error.message}`, {cause: error});
    }
  }

  writeFile(outputPath, JSON.stringify(snapshot, null, 2) + '\n');
  return {source, attempts};
}

module.exports = {refreshSnapshot, validateSnapshot};
if (require.main === module) {
  const orbit = require('../assets/iss-orbit.js');
  refreshSnapshot({orbit, outputPath: process.argv[2], previousPath: process.argv[3]})
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
