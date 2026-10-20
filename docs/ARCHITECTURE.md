# Life OS v2 — architecture and operations

**2026-10-21 status:** the missing `test:rules` script is connected, formatting and type checks pass, 59 ordinary tests and 9 dedicated emulator rules tests pass, and the normal static build succeeds. See [latest verification](QA_2026-10-21.md). CLI Google login succeeded but the configured project's management lookup failed; actual app OAuth, deployed rules and two-device sync remain unverified. The 2026-10-18 addendum below is historical where these statuses differ.

Foundation reviewed: 2026-10-16; working-copy addendum: 2026-10-18. This document describes the new `src/lib/life-os` foundation. The old `src/lib/firebase/client.ts`, Supabase helpers, and legacy components describe an earlier application. They must not be reused for authentication or synchronization: email strings are not authentication credentials. The current [handover](../PROJECT_HANDOVER.md) and [dated snapshot](HANDOVER_SNAPSHOT_2026-10-18.md) describe the latest uncommitted work and its verification limits.

## Working-copy addendum — 2026-10-18

- New `backup.ts` strictly inspects v1 universal JSON backups and v2 backups. The provider exposes preview metadata and a session-only approval token bound to the same File, active scope and unchanged record versions. Changing file, cancelling or switching owner invalidates approval.
- Changed legacy records preserve the existing version and create a deterministic review memory containing a validated import snapshot. This avoids silently overwriting edits or double-counting finance/health aggregates. Repeated changes deduplicate and deleted records are not resurrected. Vault copies remain encrypted.
- The exact v1 backup includes seven arrays: essentialInfo, financialLogs, assets, encryptedVault, workout1RM, healthMetrics and archivedDiaries. Photos, general memos, pull-up sets and routines were never included in that exporter; use explicit same-origin legacy import for those supported records.
- New `scroll-lock.ts` reference-counts body scroll locks so drawer/modal overlaps restore the original style only after the final owner releases it. Shared Modal adds dirty-close confirmation, safe focus restoration and VisualViewport-aware sizing. These are UI protections, not persistent draft recovery.
- Workout duration remains **minutes** in storage; the UI now accepts separate minutes/seconds and converts with `minutes + seconds / 60`.
- `firebase.rules-test.json` and `tests/firestore-rules.integration.mjs` target only a synthetic loopback emulator. CI currently calls a missing `test:rules` package script: wiring and execution remain unfinished. Normal `npm test` does not execute that integration file.
- Latest local typecheck and 59 ordinary tests passed. Five source/test files still fail formatting, the latest complete build is pending, and actual OAuth/Firestore/iPhone/two-device verification is not complete. Consult the dated snapshot rather than interpreting implementation as deployment evidence.

## Product boundaries

Life OS is a private record system for daily plans, reflection, exercise, finances, useful information, reading, family memories, and long-term goals. The same responsive application runs in desktop and mobile browsers. The web application does not read Apple Health, iPhone albums, Google Docs, or a password manager without an explicit import or a separately authorized integration. A browser application cannot silently access those accounts or device databases.

The default is a clearly labelled fictional demo. Switching to a personal workspace creates an empty local guest workspace. Signing in opens a separate Firebase UID workspace. Demo and guest data are **never automatically uploaded to a signed-in account**. Moving data requires the explicit JSON export/import workflow.

## Modules and responsibilities

| Module                      | Responsibility                                                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`                  | Shared record contract, local-date formatting, navigation IDs                                                                            |
| `records.ts`                | Strict record and backup validation, deterministic record merge, workspace isolation, durable acknowledgement versions                   |
| `store.tsx`                 | React provider, persisted local writes, account lifecycle, cross-tab synchronization, actual Google OAuth, per-record cloud transactions |
| `firebase.ts`               | Dedicated named Firebase application, complete environment configuration, no fallback credentials                                        |
| `demo.ts`                   | Fictional examples based on the current local date                                                                                       |
| `legacy.ts`                 | Explicit, read-only import of supported original localStorage formats                                                                    |
| `imports.ts`                | User-selected document/tabular import parsing                                                                                            |
| `vault-crypto.ts`           | Browser cryptography used by the new vault UI                                                                                            |
| `firestore.rules`           | Owner-only UID-scoped access, record validation, no client hard deletion                                                                 |
| `tests/life-store.test.mjs` | Merge, deletion, backup, account isolation, acknowledgement, and validation regression tests                                             |

The UI consumes `LifeProvider` / `useLife`; views never initialize Firebase or write arbitrary localStorage domain keys. The provider reports save failures, configuration gaps, offline state, and synchronization errors through the shared API.

## Record and workspace model

All ordinary records share:

```ts
interface LifeRecord {
  id: string; // cryptographically random UUID for new records
  type:
    | 'task'
    | 'routine'
    | 'diary'
    | 'memory'
    | 'transaction'
    | 'asset'
    | 'workout'
    | 'weight'
    | 'bookmark'
    | 'photo'
    | 'goal'
    | 'vault';
  title: string;
  body: string;
  date: string; // user's local calendar date, YYYY-MM-DD
  updatedAt: string; // ISO UTC with millisecond precision
  deletedAt?: string; // tombstone, same revision as deletion
  data: Record<string, string | number | boolean | string[] | number[] | null>;
}
```

Workout units are explicit: `running.distance` in kilometres, `swimming.distance` in metres, `duration` in minutes, `pullups.sets` in repetitions, strength load in kilograms. Weight measurements use `data.kg`. Money records use integer KRW amounts with explicit income/expense or asset/liability direction; the application is a personal ledger and does not connect to banks.

Browser cache keys are `life-os:v2:workspace:${encodeURIComponent(scope)}` with scopes `demo`, `guest`, and `uid:<Firebase UID>`. Cached envelopes include the scope itself, so a blob copied to another account's key is rejected. Profile email/display name comes from Firebase Auth; an email typed into a form can never select another person's records.

The durable envelope contains records (including tombstones), pending record IDs, and compact acknowledged version tags. The acknowledgement tags prevent another tab with an old queue from reintroducing already completed writes. LocalStorage can contain sensitive ordinary records; do not use a shared browser profile for private data. Logging out removes access from the current view, but intentionally leaves the account's local cache for offline continuation. It does not erase that browser's disk.

## Save and synchronization sequence

1. Validate the complete new record and assign a strictly increasing local timestamp.
2. Re-read the current scope's persisted envelope and merge it with the in-memory state. This catches another tab's latest writes.
3. Persist the merged records and pending queue **before** updating the UI. A quota/security failure rejects the save; the UI must not show it as saved.
4. If authenticated and online, send queued records through a Firestore transaction to `users/{uid}/records/{recordId}`. Compare the local and remote record before writing, so a stale reconnect cannot blindly overwrite a newer remote version.
5. Remove a pending item only after the exact winning revision is acknowledged. Persist the acknowledgement and merge it across tabs.
6. An `onSnapshot` listener merges other devices' records. A cache-only snapshot does not establish successful cloud synchronization. Error states retain local pending writes and retry; network restoration triggers another attempt.
7. Account-switch guards check the current scope and Firebase UID before applying any asynchronous result. Views immediately expose an empty record list while the next account loads.

Merge policy is deterministic last-write-wins per record using `updatedAt`; deletion wins equal-clock ties, then canonical content resolves any remaining tie. Separate records are independent. This is not field-level collaborative editing or a CRDT: simultaneous edits to the same record select one whole-record winner. Device clock skew is a known limitation; timestamps are monotonic relative to all records already observed by that device. The validator rejects impossible dates and timestamps more than 24 hours into the future so malicious imports cannot poison all later edits. A device with a seriously incorrect clock must correct it before synchronizing. Concurrent desktop/mobile edits and large clock changes require live integration testing before a public launch.

Deletes blank the record content and write a tombstone. Other offline devices receive that deletion on reconnect. Client hard deletion is denied by rules; retention/purge, legal account deletion, and erasing all cached browser profiles require a separately designed account-deletion workflow. Do not implement a naive “delete document” button that permits stale devices to resurrect data.

## Firebase setup

1. Create a Firebase project and web app. Copy `.env.local.example` to `.env.local` and fill all six `NEXT_PUBLIC_FIREBASE_*` values. These web identifiers are public; a service-account private key must never be put into a public environment variable.
2. Enable Firebase Authentication's Google provider. Configure the support email and authorized domains for localhost, the staging host, and the final production host. Test on Safari/iPhone as well as desktop; popup blocking must produce a visible error.
3. Create Cloud Firestore in the selected region. Review and deploy the included owner-only rules and indexing exemptions with the Firebase CLI after authenticating to the intended project:

   ```sh
   firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
   ```

4. Rebuild the static Next.js application after changing environment variables: they are embedded at build time. For GitHub Pages configure repository environment secrets/variables and pass them to the **build** job.
5. Test two real Google accounts: account A must never read/write account B's `users/<uid>/records`, and unauthenticated requests must be denied. The app must show permission/configuration errors rather than a false success state.

The project deliberately ships with no active Firebase fallback. Without full configuration, local recording and demo work, while cloud login is unavailable. Local tests and compilation cannot prove that a real Firebase project's OAuth, deployed rules, quotas, and network behavior are configured correctly.

Primary references: [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin), [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions), [Firestore rule conditions](https://firebase.google.com/docs/firestore/security/rules-conditions).

## Security and backup

Owner-only rules are mandatory; public client configuration is not an access control mechanism. Legacy email-address documents are denied by the new rules. A real deployment needs rules-emulator tests with anonymous, owner, and another account, plus actual device verification.

Vault records require encrypted payloads and reject plaintext password/master-password keys at the persistence boundary. Ordinary diary, finance, bookmark, and photo data is **not** end-to-end encrypted by this storage layer. Vault security depends on the browser origin, the cryptography implementation, a strong master password, and keeping decrypted values out of logs and storage. A password lost without an independent recovery mechanism cannot be reset by an operator to decrypt old content.

Version 2 JSON backups have `format: "life-os"`, `version: 2`, export time, a non-identifying workspace category, and validated records including tombstones. Imported files are checked in full before any write. Imports merge records; they do not erase the current workspace. Duplicate IDs, invalid dates, nested or oversized data, incompatible versions, and plaintext vault entries are rejected. Account IDs and profile email are not exported.

Record size is limited to 650KB, backups to 25MB, and a workspace to 10,000 records. Photos are compressed by the UI and stored as small image data URLs in this initial implementation. Browser quotas are substantially smaller than a media service's storage allowance; a quota failure must surface as an error. A release serving large albums should use authenticated object storage and thumbnail records with explicit upload, retention, and deletion policies rather than increasing Firestore document sizes.

The explicit legacy migration reads supported original local keys without modifying them and uses deterministic IDs to avoid reimporting the same source. Unsupported data is reported. Old encrypted vault payloads may be preserved as legacy ciphertext, but the new vault's format is different; they require an explicit master-password conversion or CSV import, and cannot be represented as successfully unlocked new entries. Never upload all `life_os_*` keys blindly: old keys can include plaintext profile identifiers, fabricated presets, and unrelated configuration.

### Audited legacy migration contract

Migration reads **stored browser values only**, never the old components' built-in defaults. Its async photo conversion finishes before a single workspace commit; switching accounts while it runs cancels the import. The Settings result card lists unsupported rows and exceptions without printing private field values.

| Actual legacy key / shape                                                 | New behavior                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `life_os_photos_v2` (also v1), `{url,title,date,folder,tag}`              | Parse ISO or Korean dotted upload dates; preserve folder/tag; JPEG/PNG/WebP data URLs over 120KB are compressed locally. `dataUrl` compatibility alias also accepted. Remote HTTP(S) images become a placeholder plus original link, with no request to that host.                                      |
| `life_os_archived_diaries_v1` array and `life_os_diary_YYYY-MM-DD` object | Accept `{date,text,mood,savedAt}` and `{id,date,title,content,source,updatedAt}`; also `entry_date`/`source_type`. Merge equal date+normalized-body copies across keys, preserve different bodies on the same date. Map numeric moods and great/good/neutral/bad/terrible; preserve original mood text. |
| `life_os_daily_routines_v2`                                               | Preserve title and old completion/streak metadata. No completion date exists in the old shape, so new `completedDates` stays empty; never invent historical dates or a completion today.                                                                                                                |
| `life_os_body_metrics_v2` (also v1)                                       | Preserve weight as kg, literal date, measuredAt, muscle mass, fat ratio, blood pressures, notes, and multiple same-day measurements.                                                                                                                                                                    |
| `life_os_pullup_records_v1`, `life_os_workout_1rm_v1`                     | Preserve sets, literal dates, weights, repetitions, total/max repetitions and stored 1RM. Accept both UI `exercise`/`date`/`calculated1RM` and database `exercise_name`/`logged_date`/`calculated_1rm`. Missing durations remain zero.                                                                  |
| `life_os_financial_logs_v2`                                               | Preserve no-ID same-day rows, merchant, payment method/time, raw text and notes. The original UI records are expenses. Signed original amount is retained as metadata.                                                                                                                                  |
| `life_os_assets_v2`                                                       | Preserve name, original type/sign and net worth. Negative assets/liabilities are normalized to the opposite direction with a positive amount.                                                                                                                                                           |
| `life_os_essential_items_v2`, `life_os_general_memos_v1`                  | Preserve value+memo or content, pinned state and original classification/color metadata; normalize display categories. Old `is_masked` is retained as `legacyMasked`, not represented as encryption.                                                                                                    |
| `life_os_encrypted_vault_v2`                                              | Preserve the old AES ciphertext only. Plain legacy site/username metadata is not copied into the new vault. CSV export from the old app is needed for a usable complete credential migration.                                                                                                           |

Invalid/missing dates on diaries, transactions and dated health records are reported and skipped instead of assigning them to today. Undated notes/assets use the import date; undated photos report that fallback. Malformed JSON, unsupported image formats such as GIF/SVG/HEIC, decode/compression failures and record-size violations are skipped with a visible reason; every original key remains intact. Category/folder list settings, the old monthly-budget setting, old forced-alarm settings and unverified/simulated HealthKit summaries are not converted into records. Empty folders do not create fake photos. These settings remain in the original browser and are explicitly listed when present.

## Verification and release work

Use Node 24 and run:

```sh
npm ci
npm run typecheck
npm test
npm run build
```

The test command uses Node's TypeScript stripping and `--test-isolation=none` so restricted Windows environments do not require spawning a test subprocess. CI runs on pull requests and main/master pushes. The tests prove pure merge/validation behavior; they do not claim to prove real OAuth or Firestore security rules without a configured test project/emulator.

Before accepting paid users, complete actual identity-provider configuration; rules-emulator and two-device sync testing; error monitoring without record contents; App Check/abuse controls and billing alerts; accessibility/device testing; privacy terms and consent; account deletion and recovery policy; storage/retention plans; and backup restoration rehearsals. Subscriptions, native App Store signing/publishing, automatic Google Docs retrieval, automatic Apple Health integration, and bank integrations are not implemented by the local foundation. Keep these requirements visible rather than implying they work in the demo.
