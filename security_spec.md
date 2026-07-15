# Kohartist Security Specification & Threat Model

This document outlines the security architecture, invariants, threat model ("Dirty Dozen" payloads), and test coverage for the Kohartist Free Tipping Platform's Firestore backend.

## 1. Data Invariants

1. **Authentication Boundary**: 
   - Public artist profiles (`/artists/{artistId}`) can be read by anyone, but can only be modified by the authenticated user with matching `uid`.
   - Private artist configurations (`/artists/{artistId}/private/settings`) are strictly private and can only be accessed (read/write) by the owner.
2. **Event Authorization**:
   - Only the artist owning the event can create or modify it (`request.auth.uid == existing().artistId` or `incoming().artistId`).
   - Events have a strict lifecycle. Once marked as `completed`, they cannot be updated back to `active` (Terminal State locking).
3. **Gifted Donations (Tipping System)**:
   - Tips can be created by unauthenticated fans (allowing frictionless support during live events).
   - **The Important Rule (Relational Lock)**: Tips can ONLY be created if the linked `eventId` exists and is `active`.
   - **The Atomicity Invariant**: To prevent "Double-Tipping" or "Phantom Tips", creating a Tip requires a simultaneous atomic batch update that increments the linked event's `currentAmount` by exactly the tip's `amount`.
   - No one (not even the artist) can edit or delete a tip once it is written (Immutable ledger).

---

## 2. The "Dirty Dozen" Payloads

The following malicious payloads must be rejected by the security rules:

### P1: Profile Hijack (Identity Spoofing)
An authenticated user trying to create or edit a public profile for another user's UID.
```json
// Path: /artists/victim_uid
{
  "displayName": "Malicious DJ",
  "bio": "I hijacked your profile",
  "createdAt": "2026-07-15T06:45:00Z"
}
```
*Expected Result: PERMISSION_DENIED (User UID does not match path).*

### P2: Private Info Leak (PII Blanket Test)
A user trying to read another artist's private settings.
```json
// Path: /artists/victim_uid/private/settings
// Attempted GET by "attacker_uid"
```
*Expected Result: PERMISSION_DENIED (Read restricted to owner).*

### P3: Ghost Field Injection (Shadow Update Test)
A user trying to write an un-blueprinted "admin" field in their profile.
```json
// Path: /artists/attacker_uid
{
  "displayName": "Hacker DJ",
  "bio": "Trying to elevate privileges",
  "createdAt": "2026-07-15T06:45:00Z",
  "isAdmin": true
}
```
*Expected Result: PERMISSION_DENIED (Field size/keys check fails).*

### P4: Event Fraud (Unauthorized Creation)
An attacker trying to create an event claiming it belongs to a popular artist.
```json
// Path: /events/fraud_event_1
{
  "artistId": "popular_artist_uid",
  "title": "Malicious Fake Show",
  "type": "live",
  "status": "active",
  "currentAmount": 0,
  "createdAt": "2026-07-15T06:45:00Z",
  "updatedAt": "2026-07-15T06:45:00Z"
}
```
*Expected Result: PERMISSION_DENIED (ArtistId in document does not match authenticated user's uid).*

### P5: Unauthorized Event State Reversal (Terminal State Locking)
An artist attempting to re-activate an event that has already been marked as `completed`.
```json
// Path: /events/completed_event_1
// Existing: status = "completed"
// Incoming: status = "active"
```
*Expected Result: PERMISSION_DENIED (Terminal states cannot be reversed).*

### P6: Event Poisoning (Resource Exhaustion)
An attacker trying to create an event with a 1MB string title.
```json
// Path: /events/poison_event
{
  "artistId": "attacker_uid",
  "title": "A".repeat(1000000), 
  "type": "live",
  "status": "active",
  "currentAmount": 0,
  "createdAt": "2026-07-15T06:45:00Z",
  "updatedAt": "2026-07-15T06:45:00Z"
}
```
*Expected Result: PERMISSION_DENIED (Title length exceeds 100 character limit).*

### P7: Off-Event Tip Creation (Relational sync bypass)
An attacker attempting to send a tip to a completed event.
```json
// Path: /tips/invalid_tip_1
{
  "artistId": "artist_uid",
  "eventId": "completed_event_id",
  "amount": 25,
  "fanName": "Generous Fan",
  "timestamp": "2026-07-15T06:45:00Z"
}
```
*Expected Result: PERMISSION_DENIED (Relational check fails because event's status is not 'active').*

### P8: Negative Tip (Value Poisoning)
A malicious user trying to register a negative tip to drain an artist's statistics.
```json
// Path: /tips/negative_tip_1
{
  "artistId": "artist_uid",
  "eventId": "active_event_id",
  "amount": -50,
  "fanName": "Grinch",
  "timestamp": "2026-07-15T06:45:00Z"
}
```
*Expected Result: PERMISSION_DENIED (Amount must be strictly positive).*

### P9: Ledger Deletion (Immutability Violation)
An artist trying to delete or edit a tip document to cover up transaction history.
```json
// Path: /tips/some_tip_id
// Attempted DELETE or UPDATE
```
*Expected Result: PERMISSION_DENIED (Tips are append-only; update/delete is forbidden).*

### P10: Non-Atomic Tip (Phantom Increment)
An attacker creating a tip document without updating the corresponding event's `currentAmount` in the same transaction.
```json
// Path: /tips/un-batched_tip
{
  "artistId": "artist_uid",
  "eventId": "active_event_id",
  "amount": 5.00,
  "fanName": "Anonymous",
  "timestamp": "2026-07-15T06:45:00Z"
}
// But without the matching batch update on `/events/active_event_id` incrementing `currentAmount` by 5.00.
```
*Expected Result: PERMISSION_DENIED (existsAfter/getAfter atomicity check fails).*

### P11: Temporal Spoofing (Client Time Forgery)
A user setting a manual `createdAt` value far in the future or past instead of the current server time.
```json
// Path: /events/event_1
{
  "artistId": "artist_uid",
  "title": "Time Travel Set",
  "type": "live",
  "status": "active",
  "currentAmount": 0,
  "createdAt": "2025-01-01T00:00:00Z", // Forged
  "updatedAt": "2026-07-15T06:45:00Z"
}
```
*Expected Result: PERMISSION_DENIED (createdAt must strictly match `request.time`).*

### P12: Unbounded Array Exploit
A user attempting to inject long list payloads inside an event or profile to cause resource degradation.
*(We store lists of tips and events as individual sub-collections/root collections to ensure O(1) scalability and prevent O(N) array bloating.)*

---

## 3. Test Runner Schema (firestore.rules.test.ts)

Below is the structured TypeScript skeleton verifying the security assertions using the Firebase JS SDK testing library.

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

describe("Kohartist Security Rules TDD", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "kohartist",
      firestore: {
        rules: await fs.readFile("firestore.rules", "utf8"),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it("should block P1: Profile Hijack (Identity Spoofing)", async () => {
    const aliceDb = testEnv.authenticatedContext("alice_uid").firestore();
    await assertFails(
      setDoc(doc(aliceDb, "artists/bob_uid"), {
        displayName: "Bob Fake Profile",
        createdAt: new Date(),
      })
    );
  });

  it("should block P2: Private Info Leak", async () => {
    const charlieDb = testEnv.authenticatedContext("charlie_uid").firestore();
    await assertFails(getDoc(doc(charlieDb, "artists/bob_uid/private/settings")));
  });

  it("should block P8: Negative Tip", async () => {
    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(anonDb, "tips/negative_tip"), {
        artistId: "bob_uid",
        eventId: "active_event_id",
        amount: -10,
        fanName: "Grinch",
        timestamp: new Date(),
      })
    );
  });
});
```
