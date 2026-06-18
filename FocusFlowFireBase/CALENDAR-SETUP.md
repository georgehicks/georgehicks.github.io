# FocusFlow — Calendar import (ICS)

Pulls today's events from one or more published `.ics` calendar feeds into your appointments.
Settings → **Calendar Import (ICS)**: paste one feed URL **per line** (e.g. work Outlook +
personal Google), (usually) a proxy URL, then tap **Pull appointments now**. Events from all
listed calendars are merged (duplicates collapsed), tagged 📅, and refreshed on each pull;
appointments you add by hand are left alone.

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
Calendar feeds don't send CORS headers, so the browser can't fetch them directly. A small
proxy fetches the feed and adds the header.

- **Quick test only:** put `https://corsproxy.io/?url=` in the Proxy field. Works, but your
  calendar data passes through a third party — **don't leave a work calendar pointed at it.**
- **Proper (private) option — your own Cloudflare Worker** (free, ~2 min):

### Deploy the Worker
1. Sign in at <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Create Worker**.
2. Name it (e.g. `focusflow-cal`), **Deploy**, then **Edit code** and paste:

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
    const upstream = await fetch(target, { headers: { 'User-Agent': 'FocusFlow' } });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, 'Content-Type': 'text/calendar; charset=utf-8' }
    });
  }
};
```

3. **Deploy.** Copy the worker URL (e.g. `https://focusflow-cal.yourname.workers.dev`).
4. In FocusFlow, set the **Proxy URL** to that address with `/?url=` on the end:
   `https://focusflow-cal.yourname.workers.dev/?url=`

(The host check restricts it to `outlook.office365.com` and `calendar.google.com`. Add more
hosts to that regex if you point it at other calendar providers.)

## 3. Use it
- Tap **Pull appointments now**, or tick **Auto-pull when the app opens**.
- On the sync version, the URL/proxy settings sync to your other devices too.

## Notes & limits
- Only **timed events for today** are imported (all-day events are skipped); overnight
  events are clamped to the day.
- Recurring meetings are expanded automatically. Rare cases — a single moved instance of a
  recurring series — may still show at the original time.
- Published feeds update on the provider's own schedule (Microsoft can lag by an hour or so),
  so a brand-new meeting may take a little while to appear.
