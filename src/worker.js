// Serves /api/fixtures: Everton's next games, parsed from the iCal feed in the
// FIXTURES_ICS_URL secret. Everything else falls through to the static assets.

const CACHE_KEY = 'https://coloradoevertonians.com/__cache/fixtures';
const FRESH_FOR = 6 * 60 * 60 * 1000;   // refetch the feed after 6 hours
const KEEP_FOR = 7 * 24 * 60 * 60;      // keep the last good copy a week, in case FotMob is down
const COUNT = 3;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/fixtures') return fixtures(env, ctx);
    return env.ASSETS.fetch(request);
  },
};

async function fixtures(env, ctx) {
  if (!env.FIXTURES_ICS_URL) return json({ error: 'Fixtures not configured' }, 503);
  const now = Date.now();
  const games = await loadGames(env.FIXTURES_ICS_URL, ctx, now);
  if (!games) return json({ error: 'Fixtures unavailable' }, 502);
  const next = games.filter(g => Date.parse(g.kickoff) > now).slice(0, COUNT);
  return json({ games: next });
}

// Cached parsed games, refreshed when older than FRESH_FOR. Falls back to the
// stale copy if the feed can't be fetched.
async function loadGames(feed, ctx, now) {
  const cache = caches.default;
  const hit = await cache.match(CACHE_KEY);
  const cached = hit ? await hit.json() : null;
  if (cached && now - cached.fetchedAt < FRESH_FOR) return cached.games;

  try {
    const res = await fetch(feed);
    if (!res.ok) throw new Error(`Feed returned ${res.status}`);
    const games = parseIcs(await res.text());
    if (!games.length) throw new Error('Feed had no games');
    const body = JSON.stringify({ fetchedAt: now, games });
    ctx.waitUntil(cache.put(CACHE_KEY, new Response(body, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${KEEP_FOR}` },
    })));
    return games;
  } catch (err) {
    console.error('Fixtures fetch failed:', err.message);
    return cached ? cached.games : null;
  }
}

function parseIcs(text) {
  // Unfold continuation lines (RFC 5545: a line starting with a space continues the previous one)
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const games = [];
  let ev = null, depth = 0;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { ev = {}; depth = 0; continue; }
    if (!ev) continue;
    if (line.startsWith('BEGIN:')) { depth++; continue; }   // skip nested VALARM
    if (line.startsWith('END:') && depth) { depth--; continue; }
    if (line === 'END:VEVENT') {
      const game = toGame(ev);
      if (game) games.push(game);
      ev = null;
      continue;
    }
    if (depth) continue;
    const i = line.indexOf(':');
    if (i > 0) ev[line.slice(0, i).split(';')[0]] = unescape(line.slice(i + 1));
  }
  return games.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

// "⚽️ Everton - Hull City" or "⚽️ Dundee FC - Everton  (0-4)" -> game object
function toGame(ev) {
  const m = /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/.exec(ev.DTSTART || '');
  const teams = (ev.SUMMARY || '').replace(/^[^\p{L}\p{N}]+/u, '').replace(/\s*\(\d+-\d+\)\s*$/, '');
  const [home, away] = teams.split(' - ').map(s => s && s.trim());
  if (!m || !home || !away) return null;
  return {
    kickoff: `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`,
    home,
    away,
    competition: (ev.DESCRIPTION || '').split('\n')[1] || '',
    venue: (ev.LOCATION || '').split(',')[0],
  };
}

function unescape(s) {
  return s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  });
}
