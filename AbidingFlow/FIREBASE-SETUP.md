# AbidingFlow — Firebase setup

AbidingFlow shares the same Firebase project as FocusFlow (Sync)
(`focusflowgeorge`) — same config, same Google sign-in, same authorized
domains. Nothing to create. It writes to its own `abidingflow_users`
collection so the two apps' data never overlap, even though they share
a project and quota.

## One-time: add a rule for the new collection

Firestore Database → **Rules** tab → the rules should already look like
this from the FocusFlow setup:

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

Add a second `match` block for AbidingFlow's collection and **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /abidingflow_users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Done

Open the app → **Settings tab → Sign in with Google**, same account as
FocusFlow. The Vine streak and all four lists sync across devices
through `abidingflow_users/{your-uid}`; FocusFlow keeps using
`users/{your-uid}` — the two never touch.

### Notes
- Nothing here is a secret — the config values are safe to commit (same as FocusFlow's).
- Quota (50k reads / 20k writes per day, 1 GiB) is shared across both apps and the whole project — plenty for personal use.
- If you ever want AbidingFlow fully isolated (separate quota, separate account requirement), split it into its own Firebase project later and swap `FIREBASE_CONFIG` in `index.html` — the rest of the app doesn't change.
