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

## Abide audio + cross (added 2026-09-10)

- **Breathing tone** — Web Audio oscillator (210Hz sine) with gain swelling
  0→0.045→0 over the 8s cycle, an audible stand-in for the Watch's variable
  haptic pulses. Haptics themselves were considered and rejected: the
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
  platform. Settings has a voice picker (`Abide Scripture` section) so the
  user can select whatever's actually best on their device — on their
  iPhone, Safari's on-device voices are meaningfully better, especially if
  "Enhanced"/"Premium" voices are downloaded via iOS Settings → Accessibility
  → Spoken Content → Voices (free, built into iOS). A genuinely natural
  neural voice (ElevenLabs, OpenAI TTS, etc.) is possible but requires a
  paid API — not compatible with "free."
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

## Open / deferred

- Real Web Push implementation (Firebase Cloud Function + VAPID, iOS 16.4+
  Safari-installed PWA requirement) — deferred, designed for above.
- Exact calendar sync mechanics (reuse `AbidingFlow/CALENDAR-SETUP.md` vs.
  rebuild) — not yet decided.
- Onboarding / minimum first-run data — not yet decided.
