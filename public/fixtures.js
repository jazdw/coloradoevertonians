// Fills the "Next matches" list from /api/fixtures. The block stays hidden if anything fails.
(async () => {
  const box = document.getElementById('fixtures');
  try {
    const res = await fetch('/api/fixtures');
    if (!res.ok) return;
    const { games } = await res.json();
    if (!games || !games.length) return;

    const tz = 'America/Denver';
    const day = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' });
    const time = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

    box.querySelector('.fixture-list').replaceChildren(...games.map(g => {
      const when = new Date(g.kickoff);
      const li = document.createElement('li');
      li.className = 'fixture';
      const whenEl = document.createElement('span');
      whenEl.className = 'fixture-when';
      whenEl.append(el('strong', day.format(when)), el('small', time.format(when)));
      const teams = el('span', `${g.home} v ${g.away}`);
      teams.className = 'fixture-teams';
      const comp = el('span', g.home === 'Everton' ? `${g.competition} · Home` : `${g.competition} · Away`);
      comp.className = 'fixture-comp';
      teams.append(comp);
      li.append(whenEl, teams);
      return li;
    }));
    box.hidden = false;
  } catch {
    // leave the block hidden
  }

  function el(tag, text) {
    const n = document.createElement(tag);
    n.textContent = text;
    return n;
  }
})();
