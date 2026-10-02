# With (Immanuel Prayer) — build notes

Built from `DESIGN.md` (read as the spec) in the same stack and style as `IAmHere/`. Nothing is committed or published.

## Re-syncs and decisions made while building

1. **Content re-synced after the pastoral review (three times).** The "What's in the way?" section went from the original 24 cards, to a four-group list with HOLD cards, to the current **six cards plus "The close"**. `content.json` now follows the current `DESIGN.md`: the six sheet cards, **Common questions** (four cards from `parked/objection-cards-full-draft.md`, never offered by the sheet), the **Care page "When it's heavy"** (seven sections, `gated: true`), the **four-question Test** with the new response rules, the **Standing check** ("Three things to look at, when you're ready" plus the fourth question), the two **Keep notes**, the **"no picturing required"** note, the new **Daily "A decision"** prompt, the church-and-counselor line (first-launch note and foot of What's in the way?), and the Case step 6 and How He speaks "quiet thought" test line that changed in `DESIGN.md`. Parked cards are not in the main flow.
2. **Name and icon.** The author chose the name **With** and the icon `icon-options/with.svg`, now copied to `icon.svg` (maskable-safe: full-bleed navy square, glyph inside the safe zone). Display name is "With" in the manifest (`name`, `short_name`), `<title>`, `apple-mobile-web-app-title`, headers, Settings and About. The manifest description reads "Immanuel prayer, a prayer aid: …" so the app can be found. The folder was renamed from `ImmanuelPrayer/` to `With/` on 2026-10-02. First-launch note and About explain the name once: "With. God with us (Immanuel, Matthew 1:23)." The service worker cache is `with-vN` (currently `with-v5`); Settings derives the version from it. The `localStorage` keys use the `with.` prefix. (An earlier instruction to leave the placeholder icon pending is superseded by this.)
3. Nothing in `DESIGN.md`, the other apps, `reviews/` or `parked/` was edited. A `with-static` entry (python http.server, port 8791) was added to `.claude/launch.json`; the existing `static` entry is untouched.

## What is built, against the Definition of done tracker

Status words are the tracker's. "Built" means working and tested in the browser pane. Nothing is "Reviewed" or "Verified" yet (those need people and a real iPhone).

| Aspect | Status | Notes |
|---|---|---|
| App shell and PWA | Built | Hash routing, `store` with in-memory fallback, Settings (theme, larger type, reduce motion, breath sound, Guidance Fade/Always/Hide, reminder .ics), light/dark/auto, manifest, service worker (no auto `skipWaiting`, updates apply only on a resting screen; tested live: waits on `#/run`, takes over and reloads on `#/start`), offline reload tested with the server stopped. Version shown in Settings comes from the `CACHE` string. |
| Start and Practice engine | Built | Begin → breath → first question in two taps. Other paths listed quietly with one line each. Continue link, last-session card, first-launch note. Step runner with step counter, autosave (250 ms debounce plus flush on hide/route change), resume (including Healing starting at the ready check), unfinished sessions kept in Review as Unfinished or Resting. Mic button only where `SpeechRecognition`/`webkitSpeechRecognition` exists. Sentence starters. |
| Connected | Built | Breath copied and adapted from IAmHere (bloom, reduced-motion bar, optional tone). One rotating Scripture line (the five in the design), Murray caption, "I'm here. Continue.", and a "just the breath" use with nothing after. |
| Guidance fade | Built | Fade/Always/Hide. Expectation line, coaching, starters, the "own thoughts" note, How did it come? and the Keep notes collapse to a "?" or a small link after 3 completed sessions. Not sure? and Nothing came? are always visible. |
| Quick | Built | bring, ask what to know ("Reach, then listen." is a plain, non-clickable line), ask what to do, Is there more? (loops to Ask Him anything with the Eldredge prompts), Test, Keep. "Nothing yet" is a valid answer. |
| Deeper | Built | Glad memory, appreciation (Not yet holds), welcome, bring and ask, Test, Keep. Back to the glad place on every step after the first. |
| Healing | Built, **gated** | Ready check blocks until breath and glad place are ticked; Stop and rest always visible; rest screen; resume at the ready check; Ask again loops (each pass keeps earlier answers); no limit, no score. |
| Daily | Built | Moment chooser (Other opens Work or chores, Conflict, When you've failed, Ask Him anything), one prompt, Test glance, optional Keep. Shown lighter in Review. |
| Journaling | Built, **gated** | Seven steps (gratitude, bring, the five template lines) then Test and Keep, framed as writing what you perceive. |
| Test, Keep, How did it come? | Built | Four questions, yes/not sure/no, the response rules (no on Scripture or Jesus → set it down plus glad place or break; not sure → hold it lightly; repeated not sure across 3 sessions → rest-and-counselor line). The app never says a feeling proves anything. Keep with next step and the two notes. How did it come? chips link to How He speaks; Review pattern note names one or two ways, no numbers, needs 3 tagged answers. |
| Not sure? sheet | Built | On every step, bottom sheet, returns to the same step with the draft intact. Offers only the six cards (engine rule, tested), never Common questions. |
| What's in the way? | Built, draft | Six cards from `content.json` only (nothing hardcoded), the close (a blank box, written to God, not saved), the care link, standing check and foot line. |
| Common questions | Built | Quiet, browse-only list under More. |
| Why: The Case, Reach of Faith, How He speaks, Witnesses, The Life, Scripture | Built, draft | Case (9 steps plus last screen) and Reach (7 screens plus claims and witnesses) are pagers. Everything is `status: "draft"`. Verses are tappable. |
| Review and export | Built | List, detail, edit Keep, delete one or all (in-app confirm), God answered list and marking, print-styled PDF page, plain text file, copy text, date range, first-save note. |
| References and More | Built | 14 references with plain Amazon links (no affiliate tag), the inspired-by note, the Kraft warfare note. More also holds Safety, Settings, About. |
| Safety | Built | Worrisome text (keywords in `content.json`) shows the 988 line quietly under the box, and on Continue the session stops on a care screen (Stop and rest / Continue). 988 appears only there, on the Safety page, and nowhere else (tested: no card, step or care section contains it). |

Tests: `tests.html`, 104 checks, all passing on the last run.

## How to run and test

- Serve the repo root with any static server, for example `python3 -m http.server 8791` from `/Users/georgehicks/Code/georgehicks.github.io`, then open `http://localhost:8791/With/index.html`. (In the Claude pane, `preview_start` with `with-static`.)
- Tests: open `http://localhost:8791/With/tests.html`. It reads `DESIGN.md` from the same folder to check quotes and the six cards word for word; if that file is not served it skips those two checks.
- **Dev gotcha:** the service worker is cache-first, so during development either bump `CACHE` in `sw.js` or unregister it and clear caches (otherwise the page and even `tests.html` fetches serve old files).
- Hidden switch: Settings → tap the version line five times → "Show all paths and pages" appears. It reveals Healing and Journaling.

## Deviations from DESIGN.md, and why

- **The Care page was removed on 2026-10-02** at the author's direction (care and safety were leading the app and read as overdone). Safety is the Safety page plus the quiet stop screen after a worrisome input. The last draft is in `parked/care-page-draft.md`.
- **Breath is 4 breaths (about 32 s)**, one verse line shown whole rather than split per inhale and exhale (splitting would have meant editing Scripture wording).
- **Not sure? mapping** (which of the six cards each step offers) is my choice, kept in `content.json` (`notSure` on each step).
- **Session data additions:** `at`, `trail`, `round`, `moment`, `nextStep`, `resumeAt` (to resume, loop and back up), `lie` on the lies-and-truth step, and `test` uses the four ids `scripture, jesus, love, trusted`. Answers carry a `round` so Ask again keeps every pass.
- **Journaling's five template lines** ("I see you", "I hear you", "I understand", "I am glad to be with you", "I can do something about it") are shown as step headings because the design names them but gives no other wording. This sits close to the app speaking for God, so it is gated and needs the review the design already calls for.
- **Deeper "heavy" note** is the Safety line reworded ("This app is a poor place for deep trauma work. A trained person is the right help.") instead of "chat-sized tools".
- **Dev-only 404 avoided:** `verses.json` is not fetched unless `meta.versesFile` is true.
- **Gated Healing "Back to the glad place"** from a non-Deeper path saves the work (as Resting for Healing, Unfinished otherwise) and starts Deeper.

## Gaps: wording the design does not supply (all mine, flagged for the author)

- One-line descriptions of Deeper, Healing, Daily, Journaling on the start screen (built from design phrases); "Begin" subline; the home line (built from the Purpose sentence).
- Coaching lines under each prompt (taken from nearest design phrases: "One thing, in your own words", "Write whatever comes, even if slight", "A short box, not a full replay", and so on).
- All plain UI labels: tabs, buttons, Settings, Review, export, dialogs, the reminder offer text, the draft note ("This page is a draft, waiting for pastoral review."), the pending note ("waiting for review by a qualified person").
- Healing "Ask again" option names ("Where is Jesus?", "Give Him the hurt", "Lies and truth", "Another memory").
- The stop screen after a worrisome input uses the 988 line plus the lines in the Safety section.
- Worrisome-input keywords (a plain list in `content.json`), and the "3 tagged answers" threshold for the pattern note.
- Verses in Scripture's "How He speaks" labels: only the ones the design lists under a way.
- **Stories** (The Life): none supplied, none shown. **Witnesses to source** (Bernard, Teresa, etc.): not shown, as designed. **"Why this matters for hearing God"** line on the Scripture page: not supplied. **Samuel's "Speak, Lord" opening line** before the first ask: not added.
- `verses.json` ships the passage text for every reference in the content (143 labels, Berean Standard Bible, public domain, from bible.helloao.org), keyed by the label as written. The popover shows the text and a one-line notice. There is no link out. A test fails if a reference has no text.
- "What's in the way?" cards that have no explicit See link in the design were given one (flagged `seeAssigned: true`).

## Files

`index.html`, `app.js`, `engine.js`, `content.json`, `manifest.json`, `icon.svg` (the author's chosen mark), `sw.js`, `tests.html`, `BUILD_NOTES.md`. Added outside this folder: one entry in `/Users/georgehicks/Code/georgehicks.github.io/.claude/launch.json`.

## Real-iPhone checklist (gate 6; desktop checks do not count)

1. Install to the home screen; launches standalone; icon and name "With" look right; maskable icon is not clipped.
2. Offline: airplane mode, launch, walk Begin → breath → Quick → Test → Keep → Review.
3. Update flow: ship a new `CACHE`, open the installed app, confirm it waits during a session and swaps on a resting screen (Start, Review, More, Settings).
4. Dictation: the mic button appears or not; the keyboard's own dictation key works in every box; nothing breaks when the mic is denied.
5. Keyboard behavior: every step reads well before the keyboard opens, the box is near the top, the page scrolls sensibly when it opens, nothing is pinned near the bottom. Also the tab bar on resting screens.
6. PDF export: "Export PDF" opens a new view (pop-up allowed in an installed app?) and the print dialog offers Save as PDF; text file download and Copy text work; the date range works.
7. Reminder `.ics` downloads and opens in Calendar.
8. Breath animation, tone (sound), reduced motion, Dynamic Type with "Larger type", dark and light.
9. Lock-screen and app-kill mid-step: reopen shows Continue and lands on the same step with the draft intact.
10. Passage popover placement near the edges, and long passages (such as Acts 10 and Matthew 13:1–23) scrolling inside the popover.
11. Storage cleared by Safari: the app opens clean with no errors.

## Gates still open (from DESIGN.md)

Healing review (1), pastoral review of What's in the way?, The Case, Reach (2), Jesus's presence position (3), quote and verse verification (4), ESV licence (5), real-iPhone pass (6), Journaling review (7), clinical review of the Care page and of the quiet-and-breath practice (9). Name and icon (8) are decided.

## Needed from the author

- Wording for the gaps above, especially the start-screen path lines and per-step coaching.
- Scripture text now ships as `verses.json` (Berean Standard Bible, public domain).
- Any stories (with permission).
