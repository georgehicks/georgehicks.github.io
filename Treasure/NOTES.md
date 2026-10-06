# Treasuring — build notes

Built from `Treasuring_With_You_Design.docx` (spec) plus the author's later direction. Name is provisional: the
folder is `Treasure/`, the title is in `index.html`, `manifest.json` and the wordmark.

## Where this differs from the spec (author's direction wins)
- **No tray.** Seven little buckets stay in a dock at the bottom: Hands, My part, Thanks (a treasure chest),
  Spirit, Hold, Pray, Lies. Grab a caught drop and drag it to one (or tap a bucket while holding). The short prayer
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
