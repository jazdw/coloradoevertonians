// WhatsApp community join: the invite link is never in the page. The visitor passes a
// Cloudflare Turnstile check, the Worker verifies it, and only then returns the link.
(async () => {
  const item = document.getElementById('whatsapp-item');
  const open = document.getElementById('whatsapp-open');
  const panel = document.getElementById('whatsapp-panel');
  const check = panel.querySelector('.whatsapp-check');
  const status = panel.querySelector('.whatsapp-status');
  const join = panel.querySelector('.whatsapp-join');

  let siteKey;
  try {
    const res = await fetch('/api/whatsapp');
    if (!res.ok) return;
    ({ siteKey } = await res.json());
  } catch {
    return;
  }
  if (!siteKey) return;
  item.hidden = false;

  let widget = null;
  open.addEventListener('click', async () => {
    panel.hidden = false;
    open.setAttribute('aria-expanded', 'true');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (widget !== null) return;
    widget = 'loading';
    try {
      await loadTurnstile();
      widget = turnstile.render(check, {
        sitekey: siteKey,
        action: 'whatsapp',
        theme: 'auto',
        callback: verify,
        'error-callback': () => { status.textContent = 'The check could not load. Please refresh and try again.'; },
      });
    } catch {
      widget = null;
      status.textContent = 'The check could not load. Please refresh and try again.';
    }
  });

  async function verify(token) {
    status.textContent = 'Checking…';
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Failed');
      join.href = data.url;
      join.hidden = false;
      check.hidden = true;
      status.textContent = '';
    } catch {
      status.textContent = "Sorry, that didn't work. Please try the check again.";
      turnstile.reset(widget);
    }
  }

  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.append(s);
    });
  }
})();
