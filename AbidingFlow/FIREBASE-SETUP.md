# AbidingFlow — Firebase setup

Same pattern as FocusFlow (Sync): your own Firebase project, Google sign-in,
one Firestore document per user, isolated by security rules. Free on the
Spark plan for personal use.

Use a **separate** Firebase project from FocusFlow so the two apps' data
never mixes (e.g. name it `abidingflow`).

## 1. Create a project
- [Firebase Console](https://console.firebase.google.com) → **Add project** → name it `abidingflow` → Google Analytics is optional.

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

## 4. Enable Google sign-in
- Build → **Authentication** → **Get started** → **Sign-in method** → **Google** → enable → set a support email → **Save**.

## 5. Authorize your live site
- Authentication → **Settings** → **Authorized domains** → **Add domain** →
  `georgehicks.github.io`. (`localhost` is already there for local testing.)

## 6. Get the web config
- Project settings (gear icon) → **General** → **Your apps** → web icon `</>` →
  register an app (nickname only, don't enable Hosting) → copy the `firebaseConfig` values.

## 7. Paste into the app
- Open `index.html`, find `const FIREBASE_CONFIG = { ... }` near the top of the
  `<script>`, and fill in `apiKey`, `authDomain`, `projectId`, and `appId`.

## Done
Open the app → **Settings tab → Sign in with Google**. Sign in with the same
Google account on your other device and the four lists (plus the Vine streak)
sync both ways automatically.

### Notes
- The config values are not secrets — safe to commit.
- Free-tier quota (50k reads / 20k writes per day, 1 GiB) is more than enough for personal daily use.
- Data lives on Google's servers (not end-to-end encrypted) — private from other people, readable by Google. Same trade-off as FocusFlow.
