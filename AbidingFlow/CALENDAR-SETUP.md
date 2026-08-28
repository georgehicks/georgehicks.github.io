# AbidingFlow — Calendar import (ICS)

Pulls today's timed events from one or more published `.ics` calendar feeds into
the Today view's day timeline. Settings → **Calendar import (ICS)**: paste one
feed URL **per line**, a proxy URL, then tap **Pull appointments now**. Events
from all listed calendars are merged (duplicates collapsed) and refreshed on
each pull — the day timeline's own hour notes are untouched.

If you already deployed the Cloudflare Worker proxy for FocusFlow, **reuse it
as-is** — it's restricted by calendar host, not by app, so the same worker URL
works here too. Skip straight to step 3.

## 1. Get your calendar's .ics URL
- **Outlook / M365:** Outlook on the web → Settings → Calendar → Shared calendars →
  **Publish a calendar** → choose the calendar, set permission to **"Can view all details"**
  (so you get titles, not just busy), then copy the **ICS** link.
- **Google Calendar:** Google Calendar → hover the calendar → ⋮ → **Settings and sharing** →
  **Integrate calendar** → copy the **Secret address in iCal format**.
- **iCloud:** use the calendar's public/private `.ics` address.

> The published URL is a **secret** — anyone with it can read your calendar. You can
> regenerate/unpublish it any time from the same screen.

## 2. You need a CORS proxy
Calendar feeds don't send CORS headers, so the browser can't fetch them directly.

- **Quick test only:** `https://corsproxy.io/?url=` — works, but your calendar
  data passes through a third party. **Don't leave a work calendar pointed at it.**
- **Proper (private) option — your own Cloudflare Worker** (free, ~2 min):

### Deploy the Worker
1. Sign in at <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Create Worker**.
2. Name it, **Deploy**, then **Edit code** and paste:

```js
export default {
  async fetch(request) {
    const cors = { 'Access-Control-Allow-Origin': '*' };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const target = new URL(request.url).searchParams.get('url');
    if (!target) return new Response('Missing url', { status: 400, headers: cors });
    if (!/^https:\/\/(outlook\.office365\.com|calendar\.google\.com)\//.test(target))
      return new Response('Forbidden host', { status: 403, headers: cors });
    const upstream = await fetch(target, { headers: { 'User-Agent': 'AbidingFlow' } });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, 'Content-Type': 'text/calendar; charset=utf-8' }
    });
  }
};
```

3. **Deploy.** Copy the worker URL (e.g. `https://your-worker.yourname.workers.dev`).
4. In AbidingFlow, set the **proxy URL** to that address with `/?url=` on the end.

## 3. Use it
Paste your feed URL(s) and the proxy into Settings → Calendar import, tap
**Pull appointments now**. Appointments show as chips on the matching hour rows
in Today's day timeline.

## Notes & limits
- Only **timed events for today** are imported (all-day events are skipped);
  overnight events are clamped to the day.
- Recurring meetings are expanded automatically.
- Pulling is manual — tap the button when you want a refresh. There's no
  auto-pull toggle here (kept deliberately simple); ask if you want one added.
- Appointments aren't included in JSON backups — they're re-pulled from the
  feed each day, not something you'd want to restore from a stale export.
