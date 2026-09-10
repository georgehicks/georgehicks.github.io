# AbidingSteps — Design Sketch

Status: pre-build design sketch, not yet implemented. Captures decisions from
design conversation on 2026-09-10. Treat field names/shapes as a working
draft — expect this to shift once we start building against it.

## Design goal (why this exists)

Low-friction navigation through the day for a time-blind ADHD brain, done
"with God" rather than as pure secular productivity. Guide rails toward good
behavior, guardrails against getting stuck/lost, gentle tethers to stay
engaged — never a rigid system that gets abandoned because it fought reality.
Rigid fixed-interval timers (classic Pomodoro) have been hard to adopt in
practice; variable, task-matched session lengths with easy after-the-fact
correction are the working bet instead. See the ADHD-research discussion
(time blindness, hyperfocus interruption cost) that validated this direction.

## Data model

### Outcome
The core unit of work — either an open-ended regimen or a thing with a
finish line. Deliberately NOT a single "task" type; conflating directive and
deliverable shapes was identified early as a trap.

```
Outcome {
  id
  type: 'directive' | 'deliverable'
  title
  roleTag?: 'relationships' | 'resources' | 'reach' | 'reality'  // flat tag, not a tree
  status: 'active' | 'complete' | 'archived'   // directives never reach 'complete'
  createdAt
  completedAt?                // deliverable only
  notes?
  autoOverrun?: boolean       // per-outcome override of the global default
  timeBudget?: {
    targetMinutes: number
    period: 'week' | 'total'  // 'total' = lifetime cap, never resets
    accumulatedMinutes: number
  }
  subOutcomes: SubOutcome[]   // one level deep, no further nesting
}

SubOutcome {
  id
  outcomeId
  title
  completedAt?
  notes?
}
```

### Segment — the boundary-timeline (the actual time-tracking model)

Reality drifts from the tool. Rather than storing start+end per entry (which
makes manual correction fiddly and produces silent gaps/overlaps), each
segment stores only a **start boundary**; its end is implicitly the next
segment's start (or "now" for the currently-open one). Fixing history means
dragging a boundary or retagging a segment — not editing two numbers.

```
Segment {
  id
  startAt: timestamp          // the only stored boundary
  kind: 'work' | 'break' | 'interruption'
  outcomeId?                  // null until tagged (e.g. fresh interruption guess)
  subOutcomeId?
  chunkTargetMinutes?         // the chip size chosen at start, 'work' only
  guessedDuration?            // minutes, set by the fast interrupt-timer picker
  note?                       // typed or voice-transcribed
  flagged: boolean            // true = unresolved gap/overlap, surfaced for cleanup
}
// derived: endAt = next segment's startAt (or now); durationMinutes = endAt - startAt
```

### CalendarEvent (read-only, synced)

```
CalendarEvent {
  id
  startAt, endAt
  title
  source: 'google' | 'outlook'
}
```
Rendered as color overlay blocks on the day bar; NOT part of the Segment
timeline (meetings aren't something you clock into/out of the same way).

### Settings

```
Settings {
  autoOverrunDefault: boolean
  overrunBumpMinutes: number = 10
  chunkChipSizes: number[] = [5,10,15,20,30,60,90]
  weekResetDay: 'monday' = default, configurable
  voiceNotesEnabled: boolean
  focusMusic: {
    step:  { enabled: boolean, playlistUrl: string }   // concentration / focus instrumental
    ahead: { enabled: boolean, playlistUrl: string }    // quiet, contemplative instrumental
    abide: { enabled: boolean, playlistUrl: string }    // different flavor — devotional/warm instrumental
  }
}
```

One playlist per mode, each independently enable/disable-able and
re-pointable to a different URL. Ports the existing, working YouTube
IFrame Player pattern from `FocusFlowFireBase/focus-flow.html`
(hidden 2px `YT.Player`, `listType:'playlist'`, `controls:0`) rather than
inventing a new mechanism. On a mode switch: pause-and-resume the same way
that code already pauses during an open tray/input, rather than
stop-and-restart — no reason found to prefer restarting. If a mode's
`enabled` is false, playback stays off entirely in that mode (not just
auto-paused).

**Random start point:** each time playback starts for a mode (entering the
mode, or pressing play), load the playlist paused, read its length via
`player.getPlaylist()`, pick a random index, and `player.playVideoAt(index)`
before ever audibly playing — avoids always opening on track 1. Re-randomize
on every playback start, not just once per day/session.

**Defaults captured so far:**
- `abide.playlistUrl` = `https://www.youtube.com/playlist?list=PLfd0VTIoVYk0ElEwgDLPMkSuIIoZ1LED0`
  ("Abide Reboot" — user's own existing playlist)
- `step.playlistUrl` = `https://www.youtube.com/playlist?list=PLfd0VTIoVYk1UTLrj9ARhBpmhUBkth1Px`
  ("focus" — user's own existing playlist)
- `ahead.playlistUrl` = `https://www.youtube.com/playlist?list=PLfd0VTIoVYk2mLoNsO36ULCr3XZUPwAZw`
  (user's own existing playlist)

All three mode playlists are now set from the user's own existing YouTube
playlists — no fresh playlist creation needed.

## Screens

Three tabs — **Step** (default), **Ahead**, **Settings** — plus a persistent,
always-reachable **Abide** button (not a peer tab; a one-tap "bring me home"
affordance, since needing it usually means you're too scattered to go hunt
for a tab).

### Step — the stack, revised after building the live skeleton

Renamed from "Now" (2026-09-10) — it's the original name from the first
draft of this idea, and it reads better against the app name: AbidingSteps
(the whole journey) is made of individual Steps (the one you're on right
now) — fits the "just the next step, not the whole path" framing that's
been the point all along.

Original spec had timer above outcome (matching the user's first-draft
ordering). Seeing it live flipped that: **outcome must be chosen before
you can act**, and the running-timer state should show *only* the counter
and what you're working on — no competing chips/options once you've
committed. Visual weight is deliberately uneven: the Action block is the
one strong focal point; everything above it (week/date, day bar, outcome
picker once collapsed) is visually subdued.

- **Week strip + date** — 7-day row (Mon–Sun) with today highlighted, past
  days dimmed, so the week's progression is visible at a glance, not just
  today's date in isolation.
- **Day bar** — full day compressed to fit, hour tics, color overlay blocks
  for calendar events (tap → detail popover). **The bar's fill proportion is
  the primary signal, not text** — elapsed hours are dark, remaining hours
  are a strong accent-tinted fill, so passed-vs-left reads at a glance
  without parsing numbers. Passed/left numeric labels are present but small
  and secondary now — an early pass made them bold headline stats, which
  turned out to still be "text you have to read," not a glance. Tapping the
  bar opens the full calendar + upcoming appointments.
- **Outcome picker** — recent/today/other outcomes, quick-add, inline
  mark-complete; sub-outcome selection lives here too now (folded in,
  rather than a separate stack row). Suggestion is light-touch (deadline,
  most time-budget-behind, most recently worked) but never auto-picks.
  **Sits above Action.** Once an outcome (+ optional sub-outcome) is chosen,
  it collapses to a single subdued line — "Working on **X** · change" —
  freeing the space for Action to dominate.
- **Action block** — the chunk timer. Two states, deliberately never both
  visible at once:
  - *Idle* (no outcome yet, or outcome chosen but no length picked): only
    the choice itself — a prompt and the duration chips. Chips are
    disabled/greyed until an outcome is selected (a real guardrail, not
    just ordering — you can't start an unlabeled timer).
  - *Running*: a circular "disappearing wedge" ring (Time Timer-style) whose
    remaining arc drains as the chunk elapses — glanceable without reading
    digits — with the mm:ss shown small in the center, not as dominant type.
    Turns solid red and full on overrun (the alarm state doesn't try to keep
    counting up visually, it just says "over" at a glance; the pulsing red
    card carries the rest). No chips, no picker. This is still the
    strongest visual element on the screen, but the strength comes from the
    ring's motion/color, not from big text — an earlier pass made the
    countdown a large bold number, which was flagged as "too strong on the
    text" for a tool meant to be read at a glance, not parsed.
  On timeout: escalate, don't block —
  1. visual-only state change first
  2. short sound if unacknowledged after ~10-15s
  3. auto-bump the segment by `overrunBumpMinutes` if still unacknowledged,
     and keep going quietly (never hard-stops waiting on you)
  A single large control (Acknowledge/Continue/Switch/Break) resolves the
  alert and doubles as the next-action choice — no separate confirm step.
  "Switch outcome" re-opens the outcome picker. When a calendar event is
  approaching, the same escalation pattern warns ahead of time, then
  **auto-opens this tray at the meeting's actual start** (a meeting is an
  external hard commitment, unlike a self-chosen chunk).
- **Notes** — scoped to whatever outcome (+ sub-outcome) is currently
  selected, not a single global field. Switching outcomes swaps the note
  content (and the placeholder text names the current outcome), so notes
  from one thing never bleed into another. Text field plus a push-to-record mic button (Web Speech API
  where available; typing is always the fallback — iOS Safari specifically
  is unreliable for speech recognition, and this requires the PWA to be
  installed via Safari's "Add to Home Screen," since Chrome on iOS is a
  WebKit skin with no independent install/push capability). Visually
  subdued — below the fold of attention, not competing with Action.

### Ahead (Planning)

- Flat list of Outcomes (no deep hierarchy), filterable by role tag and by
  type (Directive/Deliverable), active/complete/archived.
- **Role tags (locked 2026-09-10):** Roots, Resources, Reach, Reality —
  Covey-style "roles" rather than generic life-area categories, chosen
  because Directives map to a role much more naturally than to a category
  (e.g. "maintain exercise" is *who you are as a steward of your body*, not
  just "Health"). Explicitly a compression of the common "5 F's" framework
  (Faith/Family/Friends/Fitness/Finances) into something tighter and more
  purposeful — every original F lands somewhere:
  - **Roots** ← Faith + Family + Friends. Subtitle when selected: *"Faith,
    Family, Friends, Fellowship."* "Relationships" was the first-pass name
    but rejected — it reads as people-only, whereas Roots naturally carries
    both senses (rooted with people, rooted in God) and ties back to the
    vine/branch imagery Abide is already built on (John 15:4). Faith was
    considered as its own tag but rejected as too ambiguous alone.
  - **Resources** ← Finances. Subtitle: *"Finances, Home, Possessions,
    Stewardship."*
  - **Reality** ← Fitness, plus what 5-F's frameworks usually skip.
    Subtitle: *"Fitness, Health, Work, Obligations."*
  - **Reach** — not from the original 5; replaces a leisure-flavored "Fun/
    Focus" 6th-F with something more purposeful. Subtitle: *"Calling,
    Growth, Career, Influence."*
  Subtitles exist because the user intends to share this app with other
  people, who won't have the "5 F's → 4 R's" derivation in their head —
  each role needs to be self-explanatory at a glance.
  Same lightweight mechanism as before: flat, optional, one tag per
  outcome, used only for filtering — no new structural layer.
- Each row shows time-budget progress where set (`accumulated / target`).
- A star toggle per row is the deliberate "add to today" action — see
  below.
- Create/edit Outcome and its SubOutcomes.
- Full calendar view + upcoming appointments (same surface reachable from
  tapping L2 on Step).

A single music toggle button lives in the topbar (visible from every view,
next to Abide), not buried in Settings — it follows whichever mode's
playlist is current, so one tap plays/pauses regardless of where you are.

### Settings

- **Theme** — live color pickers (native `<input type="color">`) for the
  Step/Ahead/Abide accent colors, wired straight to the `--step`/`--ahead`/
  `--abide` CSS custom properties on `input` (updates as you drag, no
  confirm step). Didn't exist before 2026-09-10; colors were hardcoded.
  Abide's color settled on **sage green** (`#8fbf7a`, up from gold then
  rose) — glows cleanly under the bloom's blur, clearly distinct from
  Step's cyan-teal, and ties directly to the vine/branch imagery in the
  John 15:4 verse itself ("abide in the vine") better than either warm
  alternative did.
- **Day hours** — the compressed day-bar window (default 6:00 AM–10:00 PM)
  is Settings-owned now, not a hardcoded constant. Two native
  `<input type="time">` fields; changing either re-renders the bar, the
  passed/left stats, and the tick labels (now computed dynamically across
  whatever range is set, not fixed "6 9 12 15 18 21" text).
- The whole app's background now carries a soft radial glow tied to
  `--accent` (`color-mix` into the base `--bg`, ~12% strength, positioned
  top-center) — echoes the Abide bloom's warmth across Step and Ahead too,
  rather than leaving the rest of the app flat while only Abide feels
  alive. Transitions smoothly on mode switch.
- Chunk chip sizes editor — **wired**: this is now the one source of truth
  for the chunk-size list; adding/removing a size here updates Step's
  duration chips and the overrun "add time" chips live. Everything else in
  Settings (overrun defaults/bump length, week reset day, voice notes
  toggle, Focus Music enable/URLs, calendar) is still visual-only, not yet
  connected to actual behavior.
- Auto-overrun default + note that it's overridable per-outcome
- Overrun bump minutes
- Week reset day (default Monday — decoupled from Abide, which is anytime)
- Voice notes toggle
- Calendar account connection
- Notifications: **deferred** — real OS/Web Push (for Apple Watch buzz via
  iPhone) is designed for but intentionally not built in the first pass;
  today's behavior matches FocusFlowFireBase's in-page beep/vibrate/visual,
  which the user has confirmed works for their actual usage pattern
  (app kept open/foregrounded during focus sessions).

### Abide (persistent hub, not a tab)

A calm recalibration screen reachable from anywhere: today's tally so far,
a short reflective prompt or verse, and clear paths back into Ahead or Step.
Faith touchpoints (verse/reflection) concentrate here and in Ahead when
setting intentions — deliberately NOT attached to every chunk in Step, so
scripture stays meaningful rather than becoming background noise across
many daily chunks.

**Breath cue (added 2026-09-10):** a self-paced radial "bloom" animation —
8 petals on an 8s cycle (Apple Watch Breathe-style). Loosely inspired by
the Abide meditation app's core pattern — a guided breath set to scripture
instead of a generic mindfulness script — but deliberately scaled down: no
audio, no fixed session length, nothing to complete. You breathe with it as
long as you want and leave whenever ready; the point is recentering in a
few seconds to a couple minutes, not a full meditation session, since a
multi-minute guided practice would be friction in a tool built around
removing friction.

The petal mechanic went through three attempts before landing (accepted by
the user 2026-09-10):
1. Rotate-in-place scaling — read as a pulsing blob/sun, not a mandala.
2. A single shared pivot point (`transform-origin: 50% 100%` on a petal box
   whose bottom edge sits at the group's center) — closer, produced a
   scalloped bloom, but still not quite it.
3. **Final, verified against an actual technical writeup of the real
   animation** (not guessed): a `.breath-bloom` *container* does its own
   scale+rotate pulse (`scale(.15) rotate(180deg)` at rest → `scale(1)
   rotate(0deg)` bloomed, `cubic-bezier(0.5,0,0.5,1)`), while each of 8
   petals *independently* translates from dead-center outward along its
   own fixed angle (`rotate(i*45deg) translateY(0 → -46px)`). Petals stay
   full-size/opacity (no shrinking, no gradient falloff) and blend with
   `mix-blend-mode: screen`, alternating two tints (`--abide` and a
   50%-white-mixed lighter variant) so the overlap brightening at rest is
   real cumulative blend math, not a faked gradient. This is what actually
   produces the flower shape with visible petal edges and brightened
   overlaps, not the earlier attempts.

Noted honestly to the user: this is a solid recreation of the technique
other developers settled on to approximate the real watchOS animation in
CSS — not a pixel-perfect match. The native version likely has per-petal
timing variation and spring-based easing a CSS blend-mode trick won't
fully capture. User accepted current state as good enough — don't
over-invest chasing further fidelity here unless asked again.

**Scripture (revised 2026-09-10):** verses show whole, not split into
fragments — reads naturally instead of racing through half-sentences. Each
verse holds for **3 full breath cycles (24s)** before crossfading to the
next, long enough to actually sit with it rather than skim it. **John 15:4
("Abide in me...") always shows first** when Abide opens — it's this app's
namesake verse — then the rotation moves through the rest of the list in
order (wrapping back to John 15:4 after a full lap, which is fine). The
list lives in Settings, not hardcoded: a plain textarea (`Abide
Scripture`), one whole verse per line as `quote — reference`. Ships with 21
defaults (John 15:4 first, then 20 more on peace/rest/stillness/trust
themes) but a user can edit or replace any or all of them — parsed and
applied live on change, no save button needed. The old separate static
verse block below the animation is gone; the breath caption is now the
single place scripture appears, not a duplicate of it.

**Bottom anchor (2026-09-10):** the tally summary and Continue-to-Ahead/
Continue-to-Step buttons are `position: fixed` at the bottom of the screen
(just above the tab bar), not in normal document flow below the verse.
Two reasons: verses vary a lot in length (John 15:4's full quote vs. a
one-line verse), and without anchoring, everything below would jump up and
down as the caption changes every 24s — distracting in a screen meant to
be calming. Also deliberately subdued (no card background, small muted
text, ghost-style buttons) so the verse and the bloom keep the visual
weight, not the navigation chrome underneath them.

## Tally / day export

Markdown file per day, downloadable from Abide (or Step): a table of
Segments (start–end derived, kind, outcome/sub-outcome, duration) plus a
summary of time-budget progress touched that day (HH:MM target vs actual).
This is a core part of the friction-removal value proposition, not a
nice-to-have — easy review/correction is what keeps the tool trustworthy
enough to keep using.

## Interrupt timer (ad-hoc, unplanned)

Fast entry for an unplanned interruption: drop a `kind: 'interruption'`
segment now with a `guessedDuration` via the same chip set as chunk sizing
(`chunkChipSizes`, +slider to shrink), untagged `outcomeId`. Cleaned up
later same as any other segment — retag, resize the boundary, or merge into
neighboring work.

## Build approach

Clean rebuild of app logic (not a fork of `AbidingFlow/index.html` — the
data model has diverged enough that forking would drag along seed/trouble
assumptions that fight this shape). Port the reusable infrastructure as
modules instead: Firebase config, calendar sync code, and PWA
manifest/service-worker boilerplate from `AbidingFlow/` and
`FocusFlowFireBase/`; the Faithful Steps checklist component if that shape
carries over.

## Abide audio + cross (added 2026-09-10, tone redesigned same day)

- **Breath feedback — NOT a tone.** First built as a 210Hz sine oscillator
  swelling over the 8s cycle — an audible stand-in for the Watch's variable
  haptic pulses. Went through a real debugging saga: reported as silent,
  traced through several dead ends (site-level Chrome sound blocks, muted
  audio, environment differences) before isolating the actual cause with a
  minimal isolated `AudioContext` test in the browser console — Web Audio
  itself worked fine, the bug was the envelope: `exponentialRampToValueAtTime`
  stays near-silent for most of its ramp by design, so even a "working"
  swell was inaudible under normal listening. Fixed that (linear ramp,
  higher peak) — then got clear, blunt feedback that a sustained sine pitch
  reads as "grating" regardless of volume curve, not what was wanted at all.
  **Redesigned from scratch**: no oscillator, no sustained pitch. Now a
  series of short filtered-noise ticks (bandpass ~2200Hz, ~50ms buffer,
  fast attack/decay envelope) — a soft ratchet-like click, not a note.
  Refined three times more the same day on direct feedback. First two
  refinements: ticks needed to move during the bloom's opening/closing and
  go silent at rest (fully closed/open); then the tick *rate* needed to
  track actual animation speed, not be evenly spaced — but both passes
  used **guessed window boundaries and a generic quadratic ease formula**,
  not the real CSS values. Called out directly ("are you tracking with the
  actual animation, or did you just make up the time bounds") — correctly:
  0.3s/3.6s/4.4s/7.7s were invented round numbers.

  **Final version is numerically derived from the actual animation**, not
  guessed: `bloom-spin`'s real timing function is
  `cubic-bezier(0.5, 0, 0.5, 1)`. Because that curve's y1=0/y2=1, its
  output-progress as a function of its own bezier parameter reduces to the
  standard smoothstep `3t²-2t³` independent of x1/x2 — `solveBezierTForY()`
  inverts that via Newton's method for each evenly-spaced *output*
  position, and `bezierX()` maps the result back to the real *time* it
  occurs at (same x1=x2=0.5 as the real CSS). Ticks land at evenly-spaced
  visual *positions*, which naturally clusters them where the curve moves
  fast and spreads them where it's slow — no fabricated silence window;
  verified output: first tick at 0.898s (rest point at t=0 has exactly zero
  velocity), tightening to a 0.168s gap at t=2 (the curve's real
  peak-velocity point, center of each 4s half), widening symmetrically back
  out. Also dropped the bandpass filter's `Q` from 2.5 to 0.7 — narrow Q on
  filtered noise starts to sound like a pitch, which is exactly the
  "frequency tone" character being avoided. Kept deliberately quiet (peak
  gain 0.09 per tick).

  **One more real gap, also called out directly** ("when are you syncing
  the two... sounds like you're just starting it and expecting times to
  line up") — correct again: the audio schedule was never actually
  synchronized to the CSS animation's real clock. `bloom-spin` starts
  whenever the Abide screen renders (the browser's own compositor clock);
  the Tone button can be clicked seconds or minutes later, completely
  decoupled. The code just assumed `audioCtx.currentTime` at click-time
  equaled the visual cycle's t=0 — true only by coincidence. Fixed by
  reading the CSS animation's actual elapsed phase via the Web Animations
  API (`document.querySelector('.breath-bloom').getAnimations()[0]
  .currentTime`) and using it as a wraparound offset for the first
  scheduled batch (`((t - phase) % 8 + 8) % 8` per tick) — verified live:
  caught the real animation at 2.80s into its cycle, and ticks whose phase
  had already passed that cycle correctly deferred to the next one
  (~6-8s delay) while upcoming ones fired within the current cycle. Only
  the first batch needs correcting — every repeat after shares the same 8s
  period as the CSS animation, so alignment holds without re-checking.

  **That assumption was wrong — user reported drift, correctly.** Only the
  *first* batch was phase-corrected; every repeat after that trusted
  `setTimeout(..., 8000)` to stay exactly periodic, which it isn't (event
  loop delays, tab throttling, callback execution time not accounted for
  all compound over repeated cycles). Fixed by calling
  `getBloomPhaseSeconds()` fresh on **every** cycle instead of once, so each
  batch re-anchors to the real animation's ground truth rather than trusting
  the timer to stay in sync. Verified: the CSS animation's own clock (Web
  Animations API) tracked real elapsed time to within 7ms over 17 seconds
  (2+ full cycles) — since the audio now re-reads that ground truth every
  cycle rather than extrapolating from a stale starting point, it can't
  accumulate drift the way it did before. Haptics themselves were considered and rejected: the
  Vibration API has no intensity control even where supported, and **iOS
  Safari doesn't support it at all** — since the user's actual device is an
  iPhone, a haptic version would be silently dead on their real phone.
  Audio works everywhere instead. Toggle button next to the breath caption.
- **Voice (read-aloud)** — Web Speech API (`speechSynthesis`), speaks each
  verse as it's shown. Free, no API cost, but **quality is capped by
  whatever voice engine the device has** — tested in this session's browser
  and it surfaced only `Microsoft David/Mark/Zira`, Windows' old SAPI
  voices, which the user correctly flagged as "machinelike." This isn't a
  bug to fix in code; it's the real ceiling of free browser TTS on this
  platform. Softened what's actually controllable on an utterance — rate 0.82, pitch
  0.92, volume 0.88 (down from just rate 0.85) — but there's a hard ceiling:
  these parameters can't fix a fundamentally robotic underlying voice, only
  picking a better installed voice can. Settings has a voice picker (`Abide Scripture` section) so the
  user can select whatever's actually best on their device — on their
  iPhone, Safari's on-device voices are meaningfully better, especially if
  "Enhanced"/"Premium" voices are downloaded via iOS Settings → Accessibility
  → Spoken Content → Voices (free, built into iOS). A genuinely natural
  neural voice (ElevenLabs, OpenAI TTS, etc.) is possible but requires a
  paid API — not compatible with "free."
  **Windows-specific gotcha confirmed 2026-09-10:** installing a voice via
  Narrator → Settings → Add natural voices does NOT make it appear here —
  those voices are Narrator-exclusive, not exposed through the general SAPI
  list that `speechSynthesis.getVoices()` queries. The path that *would*
  work is Settings → Time & Language → Speech → Manage voices → Add voices
  (a different menu). User decided to just judge voice quality on their
  iPhone instead of chasing this further on Windows.
- **Cross reveal** — a small Latin cross (proper cross shape: longer arm
  below the bar, not a symmetric plus) fades in only at full blossom, in
  the hollow space the petals open up. First pass put it *inside*
  `.breath-bloom`, so it inherited that container's own rotate animation —
  a symmetric plus rotating through 45° reads as an X mid-sweep, which
  looked wrong. Fixed by making it a sibling of `.breath-bloom` (positioned
  absolutely at the same center point within `.breath-wrap`, which is now
  `position: relative`) so it never inherits the bloom's rotation and stays
  upright through the whole cycle.

## How an outcome becomes "today's"

Not specified in the original brief — surfaced as a gap while building the
skeleton ("where is the today choice made?"). Resolved as two paths, no
separate "promote" step needed:

- **Ahead** — a star toggle on each outcome row, for deliberate day-ahead
  planning (morning, or the night before).
- **Step** — picking an outcome from "Other" to work on right now
  automatically moves it into "Today." Choosing to work on it *is* choosing
  it for today; no separate promote action.

Abide nudging the user if today's list is still empty was discussed as a
third path (a guardrail against never planning) but not yet built into the
skeleton — worth adding once Abide has real state to check against.

## prompt()/confirm()/alert() replaced with real modals (2026-09-10)

User hit "outcome add" not working and, fairly, called out that repeated
requests to "make sure everything is working" kept surfacing more gaps.
Root cause: every add/edit/delete flow relied on native `prompt()`/
`confirm()`/`alert()`, which are known to be unreliable or silently
suppressed in installed (standalone) PWAs on iOS — exactly this user's
real test environment. Fixed properly this time, not just the one
reported spot: swept the whole file for every remaining instance and
replaced all of them with real in-page modals —
- `openOutcomeModal({title, name, type, tag, onSave})` — name field +
  Deliverable/Directive and role-tag toggle buttons. Used by: Ahead's "+"
  FAB, Ahead row edit, Step's outcome "+ Add."
- `openTextModal({title, value, inputType, onSave})` — single field.
  Used by: Step's sub-outcome "+ add," Settings' chunk-size "+ add."
- `openConfirmModal({title, message, onOk, okLabel, hideCancel})` — used
  by: Ahead row delete, and repurposed (hideCancel + custom okLabel) for
  the "voice input not supported" notice that used to be an `alert()`.
Zero `prompt()`/`confirm()`/`alert()` calls remain in the file.

While fixing this, found and fixed two more real bugs the new flow
surfaced: (1) creating an outcome from Step's "+ Add" pushed into
`aheadOutcomes` but never called `renderAheadList()`, so it silently
didn't appear in Ahead until some unrelated action re-rendered it; (2)
deleting an outcome that was the *currently selected* one in Step left
the Action block showing "Working on [deleted outcome]" — now clears
selection, re-disables the chunk chips, and reopens the outcome picker.

Also set up a real local server (`python -m http.server` via
`.claude/launch.json`) instead of testing through the sandboxed preview,
per the user's suggestion — confirmed the service worker genuinely
registers and controls the page over real `http://`, which was never
verifiable under the `data:`-origin preview.

## Another unwired-control sweep (2026-09-10)

Found one more real gap while re-checking: **Voice notes toggle** in
Settings had no `id` and no wiring at all — the mic button ignored it
completely. Fixed: unchecking it now actually hides the mic button (and
stops an in-progress recording), checking it restores it.

Checked and confirmed still legitimately deferred, not silently broken:
tapping the day bar itself (not an event block) to open a full calendar
view — that's a whole screen that doesn't exist yet, not a missing click
handler, so it stays on the open/deferred list rather than getting a
half-built stand-in here.

## Maybe targets (added 2026-09-10)

A "maybe target" is a time-budget (or any outcome) you're trying on, not
committing to — "maybe 2 hours this week on journaling" vs. a real
commitment. Matters for an ADHD-focused, guardrail-not-guilt tool
specifically because a committed target you miss creates the shame spiral
that makes people abandon tools like this; a "maybe" target you miss is
just nothing happened, no big deal.

Implemented as a `maybe: boolean` flag on the **Outcome itself** (not
nested under `timeBudget`) — deliberately not a separate someday/maybe
list, since that would be one more place to remember to check, fighting
the low-friction goal. Reuses the existing flat outcome model instead of
adding new structure:
- A dashed circular `?` toggle next to the today-star on each Ahead row.
- Maybe outcomes get a dashed card border, and their budget bar (if any)
  renders as a diagonal-stripe pattern instead of a solid fill — visually
  distinct from a committed target, and deliberately with no "behind
  schedule" framing anywhere.
- **Maybe** is a filter chip alongside the role tags (Roots/Resources/
  Reach/Reality), not a separate control — clicking it shows only
  maybe-flagged outcomes regardless of role, with its own subtitle
  ("Trying these on — no guilt if they don't stick").
- **Maybe outcomes are hidden everywhere else** — not shown under "All" or
  any role filter, only under the explicit Maybe filter. First pass showed
  them mixed into every view, which the user flagged as unwanted clutter:
  "I wouldn't want to see maybe most of the time." Resolved by excluding
  `maybe`-flagged outcomes from every filter except Maybe itself, rather
  than adding a second "include maybe" toggle — one less control to manage.
No explicit "commit" action was built yet (turning a maybe into a real
tracked goal) — discussed as the natural next step but not asked for.

## Outcome management + other dead buttons fixed (2026-09-10)

Flagged: no way to edit, delete, or mark an outcome complete once created.
Broadened to a full sweep for anything else that looked wired but wasn't:

- **Ahead rows** — each now has ✓ (mark complete, Deliverables only —
  Directives never complete, per the data model)/✎ (edit: name, type, role
  tag, via prompts)/× (delete, with a confirm). Completed rows show
  strikethrough + dimmed. `renderAheadList()` is now a real re-render
  function rather than a one-time forEach, so all of this can mutate state
  and redraw.
- **Ahead's "+" FAB** — was completely dead (no click handler at all). Now
  prompts for name/type/role and appends a real new outcome.
- **Step's sub-outcome "+ add" chip** — also dead. Now prompts, adds to
  `subOutcomeMap`, selects it, and re-renders the row.
- **Settings → Auto-overrun toggle + Bump length** — were visual-only.
  Bump length now drives the actual bump amount everywhere (the Continue
  button label updates live too). Auto-overrun, when on, skips the
  visual/sound escalation entirely and silently auto-continues the moment a
  chunk ends — resolves the original ambiguity between "escalate then
  auto-bump" (off) and a true silent auto-overrun (on).

Deliberately left as-is, not silently ignored: **Week reset day** has
nothing to wire yet — there's no real weekly-accumulation state in this
mock to reset, so the control would be cosmetic either way; **Calendar**
and **Focus Music playback** are already honestly labeled/documented as
not-yet-built subsystems, not small missed wires.

## Settings → About (added 2026-09-10)

`APP_VERSION` constant (kept in sync with the `abidingsteps-` cache suffix
in `sw.js`; both at `v2` as of the outcome-management/overrun-wiring pass —
missed bumping them when that work first landed, caught when asked "did
you bump?") shown in Settings, plus a "Check for updates & reload" button — same pattern as AbidingFlow: deletes all
`abidingsteps-*` caches, unregisters service workers, reloads. Exists so a
stale install is visually obvious and fixable without knowing devtools.
Verified the cache-clear logic runs; couldn't verify the final
`location.reload()` in this session's preview pane, which blocks top-frame
navigation to `data:` URLs as a sandbox restriction — not expected to be an
issue once deployed or tested as the real installed PWA.

## Safe-area insets for iOS (added 2026-09-10)

Reported on a real iPhone: the topbar rendered underneath the status
bar/notch (camera, time, battery). `viewport-fit=cover` was already set
(required to access safe-area values at all) but nothing was actually
padding for it. Fixed: `.topbar` gets `padding-top: env(safe-area-inset-top)`
added to its existing padding; `.tabbar` gets `padding-bottom:
env(safe-area-inset-bottom)` for the home-indicator area (same class of
bug, fixed proactively rather than waiting to be told); `main`'s bottom
padding and `.abide-anchor`'s fixed bottom offset both account for the
tabbar potentially growing taller from that inset. Not verifiable in this
desktop preview (env() resolves to 0 with no notch) — needs confirming on
the actual iPhone.

## Optional session length (added 2026-09-10)

Watch-style pattern: pick a duration once, then trust it completely — no
visible countdown, no numbers. Opt-in on top of free-form breathing (still
the default, "Free" chip), not a replacement for it — "no fixed session
length, nothing to complete" was a deliberate earlier design choice for
Abide, so this only adds the option rather than forcing structure on
everyone.

- Duration chips (Free/1m/2m/3m/5m) next to the Tone/Voice toggles.
- Picking a duration reveals a **hyper-subtle** progress track — a 2px
  line at 40% opacity, no numbers, no countdown text, easy to not even
  notice unless you're looking for it. Fills linearly over the chosen
  duration; turns white and stops updating at completion. Does not force
  navigation away or interrupt the breathing/verse cycle in any way — it's
  a quiet background signal, not an alarm.
- Picking "Free" hides the track and resets progress entirely.
- Session state resets whenever Abide is re-entered or a new duration is
  picked (`startBreathSession()` called from `startBreathCue()` and from
  the chip click handler); cleared via `stopBreathSession()` when leaving
  Abide, alongside the existing tone/verse-cycle teardown.
- Verified live: fast-forwarded a 1m session to 55s, confirmed fill at
  ~93.5%, then to completion — fill hit exactly 100% and the `done` state
  applied correctly.

## PWA installability (added 2026-09-10)

Was always the requirement, not optional — built now: `manifest.json`,
`sw.js`, and `icon.svg` (a teal ascending stepping-stone path, brightest
dot = the next step, not the destination), ported from the
AbidingFlow/FocusFlowFireBase pattern (cache name `abidingsteps-v1`,
network-first for the HTML shell, cache-first for everything else).
Registration code is in place and structurally matches the working
AbidingFlow pattern, but **not live-verified** — this session's preview
pane loads over a `data:` origin where `serviceWorker` isn't even present
in `navigator`, since service workers require a secure context (https or
localhost). Needs a real check once deployed to GitHub Pages.

## Open / deferred

- Real Web Push implementation (Firebase Cloud Function + VAPID, iOS 16.4+
  Safari-installed PWA requirement) — deferred, designed for above.
- Exact calendar sync mechanics (reuse `AbidingFlow/CALENDAR-SETUP.md` vs.
  rebuild) — not yet decided.
- Full calendar view (tapping the day bar itself, not an event block) —
  a whole screen that doesn't exist yet.
- Onboarding / minimum first-run data — not yet decided.
