# Treasuring — build notes

Built from `Treasuring_With_You_Design.docx` (spec) plus the author's later direction. Name is provisional: the
folder is `Treasure/`, the title is in `index.html`, `manifest.json` and the wordmark.

## Where this differs from the spec (author's direction wins)
- **No tray.** Seven little buckets stay in a dock at the bottom: Release, My part, Thanks (a treasure chest),
  Insight, Hold, Intercede, Lies. Grab a caught drop and drag it to one (or tap a bucket while holding). The short prayer
  flashes as the item lands; the full line also previews while you drag over a bucket.
- **Lies bin** (`Jesus, I put this lie down.`) is an addition to the six strings in section 3, spoken to Jesus.
  Not allowed for a person or a thanks. For an authored thought it says what the thought was (lie or true) and why.
  It never penalizes.
- **Let's pray now** (Pray bucket): a drifting cloud of words for a chosen person from People. Tapping a word says
  `Father, in Jesus' name, I claim {word} for {name}.` ("Father," added so every prayer names who is addressed.)
  A person who drops can also be sent there with `Father, I pray for {name} now.` Words are a sixth list ("Prayer words").
- "Understanding" opens when you drop on Spirit; an uncaught drop goes into the Spirit's bucket and waits there.
- "My part" uses one-tap phrases plus "None today" so the keyboard is rarely needed; "Write my own…" puts a
  single-line field at the top of the screen.
- After 4 uncaught drops in a row the drops rest (not a penalty; queue is kept).
- A remembered "today's part" on a person shows as a reminder when that person is caught (spec open item 2).

## Not verified
- Real iPhone behavior (touch drag, keyboard). Only desktop-pane testing so far.

## Tests
Open `tests.html` (engine rules from section 12). Version bump = `CACHE` in `sw.js` only.

## Insight screen (Understanding) options
Beyond the Father lines, three lines spoken to the Lord/Jesus (additions to section 3):
- `Jesus, this isn't from you.` clears the item; for a true authored thought it explains gently. Offers "Ask what is true instead".
- `Lord, what do you want me to know about this?` asks, then offers ways to record what came (a word, a verse, a picture),
  written by the person; the app never writes God's words. Shows a test-it reminder (1 John 4:1). Asking alone does not clear the item.
- `Lord, what do you want me to do about this?` offers one-tap parts or "Nothing yet" (keeps it waiting).

## Uncaught drops
An uncaught drop passes by and fades. It is NOT sent to Insight (author's direction, overriding spec section 7/8).
It is recorded in Noticed as "passed by". Insight holds only what the person sends there on purpose.

## First run
A four-step "How it works" opens once on first launch (and from the ? button and Settings): place your heart, catch what drops,
give it to a bucket (with a one-line key to all seven), no pressure. Until the first catch, a cue under the stage says "Tap the drop to catch it."

## Home Screen help
Settings has "Add to Home Screen" (iPhone and Android steps, detected by platform; hidden once running installed).
After the first full sitting a one-line dismissible reminder appears once (`installDone` in settings).

## Memory, not history
The Noticed screen is now "Recently" (Settings → Recently). The app keeps only the last dispatch per item (`last`: line + date) and the words last
prayed per person (`prayed`: replaced each Intercede visit), shown as "Last prayed: peace, healing · 3 days ago" in Intercede. `offers` is a 20-entry scratch,
not a log. Older logs migrate into `last`/`prayed` on first load and are trimmed. No tallies, streaks or ranks.

## Fears and Can do
- **Fears** are their own kind of drop ("a fear"). Each can carry a *lie that may be underneath* (picked once from `LIES` in content.js; seeded fears come with one).
  Sent to Insight, a fear shows: the lie ("may be a lie"), the truth with its Scripture reference (cited, not quoted), and one small thing to do.
  Dropped on the Lies bin, the same teaching flashes. A fear with no lie named shows "Name the lie underneath"; nothing is invented.
  Wording is "may be underneath", never a diagnosis: some fears are real and point to a part to do.
- **Can do** is a list of simple things for today. It replaces the fixed choices under "My part" (falls back to the built-in set if emptied).
  It does not drop on screen.
- Both are managed in Settings > Lists (tabs: Fears, Can do). Existing installs get the starter lists on first load.

## Can-do reminders drop only after a caught fear
Setting: Settings > Reminders of things I can do (Off by default; "After a fear"). Never in the random pool, never any other time.
The can-do that follows is shaped as that fear's antidote: your own Can do item tagged to the fear's lie ("For" button in Lists),
else the small thing written for that lie (LIES[].can), else (no lie named) one of yours at random.
Dropped on My part it sets today's part directly. Release and Thanks work; Lies refuses ("A reminder is not a lie.").
