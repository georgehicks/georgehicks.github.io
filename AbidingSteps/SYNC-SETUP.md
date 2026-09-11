# AbidingSteps — Cloud Sync setup

AbidingSteps always saves to this device's `localStorage` first. Cloud sync is an
optional extra: sign in (Settings → Cloud Sync) and the same data mirrors across devices.
If you're signed out, offline, or the rules below aren't in place, the app keeps working
and just says "still saving on this device".

It reuses FocusFlowFireBase's Firebase project (`focusflowgeorge`), so the Google sign-in
and authorized domain are already set up (see `FocusFlowFireBase/FIREBASE-SETUP.md`).

## One rule to add

AbidingSteps stores its data in its **own** document, `users/{uid}/apps/abidingsteps`,
not FocusFlow's `users/{uid}` doc. FocusFlow overwrites that whole doc on every save,
which would wipe AbidingSteps data (and the reverse).

The existing FocusFlow rule only covers `users/{uid}` itself, not documents nested under
it. In the Firebase Console → Firestore Database → **Rules**, **don't replace your rules**.
Add only this nested `apps` block *inside* the existing `match /users/{userId} { ... }` block,
leave every other `match` block (e.g. `abidingflow_users`) as it is, then **Publish**:

```
      match /apps/{appId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
```

For example, with the FocusFlow and AbidingFlow rules already in place, the result is:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /apps/{appId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    match /abidingflow_users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Until this is published, Settings shows "Cloud sync blocked by Firestore rules" and
everything still saves locally.

## How conflicts are handled
- Every change saves locally right away, then pushes to the cloud about 1 second later.
- Changes from another device apply live. A note you're typing isn't overwritten.
- If you edited offline on a device that has synced before, whichever side changed last wins.
- The first time you sign in on a device that has its own unsynced edits, and the cloud
  already has data, it asks which copy to keep instead of silently replacing one.
- Device-only settings, like the read-aloud voice and the current outcome selection, never sync.
