# Flow Space migration notes

This milestone intentionally uses a compatibility layer: the UI can keep its current array-oriented handlers while data is physically stored in Firestore subcollections.

## Why
A direct rewrite of every task interaction at the same time as moving Firestore would create a high risk of lost or duplicated data. The compatibility layer lets us verify the new storage model first.

## One-time owner migration
At first login after deploying this version:
1. user profile is ensured;
2. owner's company is ensured;
3. legacy `users/{uid}` arrays are copied to `companies/{uid}/...`;
4. migration marker is written;
5. legacy source remains untouched.

## Invited users
Invites are now server-side. `companyInvites/{email}` is not readable/writable from the browser. At login, `/api/invites` verifies the Firebase ID token and email before creating membership.

## Rollback
Because the legacy source document is not deleted, the old code/data remain available as a rollback source until you explicitly perform the cleanup milestone.
