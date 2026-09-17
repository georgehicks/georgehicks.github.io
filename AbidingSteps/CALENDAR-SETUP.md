# AbidingSteps — Calendar import (ICS)

Pulls events from one or more published `.ics` calendar feeds into the day bar,
the next-appointment line, and the day-plan tray — for whichever day you have
selected, not just today. Settings → **Calendar (ICS)**: paste one feed URL
**per line**, a proxy URL (usually needed — see below), then tap **Pull
calendar now**. Events from all listed calendars are merged (duplicates
collapsed) and take over completely from the built-in demo events the moment
a pull ever succeeds.

**If you already deployed the Cloudflare Worker proxy for FocusFlow, reuse it
as-is** — it's restricted by calendar host, not by app, so the same worker URL
works here too. Skip straight to step 3.

## 1. Get your calendar's .ics URL
- **Outlook / M365:** Outlook on the web → Settings → Calendar → Shared calendars →
  **Publish a calendar** → choose the calendar, set permission to **"Can view all details"**
  (so you get titles, not just busy), then copy the **ICS** link.
  (If "Publish a calendar" is missing, your admin disabled it — this route won't work.)
- **Google Calendar:** Google Calendar → hover the calendar → ⋮ → **Settings and sharing** →
  **Integrate calendar** → copy the **Secret address in iCal format** (a
  `https://calendar.google.com/calendar/ical/.../basic.ics` URL).
- **iCloud:** use the calendar's public/private `.ics` address.

> The published URL is a **secret** — anyone with it can read your calendar. You can
> regenerate/unpublish it any time from the same screen.

## 2. You need a CORS proxy
Calendar feeds don't send CORS headers, so the browser can't fetch them directly. This
has nothing to do with Firebase or any cloud sync — it's a separate, small proxy that
fetches the feed on your behalf and adds the missing header.

- **Quick test only:** put `https://corsproxy.io/?url=` in the Proxy field. Works, but your
  calendar data passes through a third party — **don't leave a work calendar pointed at it.**
- **Proper (private) option — your own Cloudflare Worker** (free, ~2 min):

### Deploy the Worker
1. Sign in at <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Create Worker**.
2. Name it (e.g. `abidingsteps-cal`), **Deploy**, then **Edit code** and paste:

```js
export default {
  async fetch(request) {
    const cors = { 'Access-Control-Allow-Origin': '*' };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const target = new URL(request.url).searchParams.get('url');
    if (!target) return new Response('Missing url', { status: 400, headers: cors });
    // Restrict to your calendar hosts so this isn't an open proxy:
    if (!/^https:\/\/(outlook\.office365\.com|calendar\.google\.com)\//.test(target))
      return new Response('Forbidden host', { status: 403, headers: cors });
    const upstream = await fetch(target, { headers: { 'User-Agent': 'AbidingSteps' } });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, 'Content-Type': 'text/calendar; charset=utf-8' }
    });
  }
};
```

3. **Deploy.** Copy the worker URL (e.g. `https://abidingsteps-cal.yourname.workers.dev`).
4. In AbidingSteps, set the **proxy URL** to that address with `/?url=` on the end:
   `https://abidingsteps-cal.yourname.workers.dev/?url=`

(The host check restricts it to `outlook.office365.com` and `calendar.google.com`. Add more
hosts to that regex if you point it at other calendar providers, e.g. iCloud.)

## 3. Use it
Paste your feed URL(s) and the proxy into Settings → Calendar (ICS), tap
**Pull calendar now**. The status line reports how many events were imported
from how many calendars, or which ones failed.

## Notes & limits
- All-day events are skipped (there's no hour-of-day to place them on the bar).
- Overnight events are clamped/split across the days they actually span.
- Recurring meetings are expanded automatically for a several-week window
  around today.
- Pulling is manual — tap the button when you want a refresh. There's no
  auto-pull toggle here (kept deliberately simple); ask if you want one added.
- The imported events aren't included in any backup/export — they're re-pulled
  from the feed, not something you'd want to restore from a stale copy.
