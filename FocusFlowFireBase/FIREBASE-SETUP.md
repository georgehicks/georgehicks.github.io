# FocusFlow (Sync) — Firebase setup

This version syncs your data across devices via Firebase. Any Google user can sign in
and gets their **own private** data (isolated by the security rules below). Free on the
Spark plan for normal personal use.

Do these steps once in the [Firebase Console](https://console.firebase.google.com), then
paste the config into `focus-flow.html`.

## 1. Create a project
- Console → **Add project** → name it (e.g. `focusflow`) → you can skip Google Analytics.

## 2. Create the database
- Build → **Firestore Database** → **Create database** → **Production mode** → pick a region.

## 3. Lock it down with rules
- Firestore Database → **Rules** tab → replace everything with this → **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This means: a signed-in user can read/write **only their own** document. Nobody can see
anyone else's data, even though everyone shares the project.

## 4. Enable Google sign-in
- Build → **Authentication** → **Get started**.
- **Sign-in method** tab → **Google** → enable → set a support email → **Save**.

## 5. Authorize your live site
- Authentication → **Settings** → **Authorized domains** → **Add domain** →
  `georgehicks.github.io`. (`localhost` is already there for local testing.)

## 6. Get the web config
- Project settings (gear icon) → **General** → scroll to **Your apps** →
  click the web icon **`</>`** → register an app (nickname only, **don't** enable Hosting).
- Copy the `firebaseConfig` values it shows.

## 7. Paste into the app
- Open `focus-flow.html`, find `const FIREBASE_CONFIG = { ... }` near the top of the
  `<script>`, and fill in `apiKey`, `authDomain`, `projectId`, and `appId`.

## Done
Open the app → **Settings → Cloud Sync → Sign in with Google**. Sign in with the same
Google account on your other device and the data syncs both ways automatically.

### Notes
- The config values are **not secrets** — they're safe to commit. Security comes from the
  rules + sign-in above.
- Free-tier quota (50k reads / 20k writes per day, 1 GiB) is shared across *all* users of
  the project. Fine for personal use; heavy public traffic would need the Blaze plan.
- Data lives on Google's servers (not end-to-end encrypted) — private from other people,
  but readable by Google. That's the trade-off for automatic web sync.
