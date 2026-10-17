# Life OS development guide

Read `PROJECT_HANDOVER.md`, `docs/PRODUCT_BRIEF.md`, `docs/ARCHITECTURE.md` and `docs/DESIGN_SYSTEM.md` before substantial changes. This is a personal operating system for recording and retrieving daily life, with a calm, encouraging interface.

## Active implementation

- Entry point: `src/app/page.tsx` → `src/components/life-os/LifeOS.tsx`.
- Current product components: `src/components/life-os/`.
- Current typed persistence/auth/sync/import logic: `src/lib/life-os/`.
- Older components and `src/lib/firebase/client.ts` remain only for historical reference. Do not reintroduce their local-master/email-as-auth paths into v2.
- Use the shared UI primitives and design tokens. Keep Korean UI labels consistent.

## Data and accounts

- Demo, guest and Firebase UID workspaces must remain separate. Never merge them implicitly.
- Save success requires a successful durable local write. Cloud success requires remote acknowledgement.
- Validate local caches, backups and remote records at trust boundaries.
- Preserve deletion tombstones and deterministic per-record conflict resolution.
- Vault metadata and credentials remain encrypted. Never persist or log master passwords, plaintext credentials or decrypted vault objects.
- Preserve old records; use explicit import and verified backups for migrations.
- Do not commit `.env.local`, personal CSVs, backups, tokens or new private user data. The old tracked `sheet1.csv`/`sheet2.csv` are unrelated source artifacts; do not read or modify them for UI examples.

## Layout and verification

- New grid columns use `minmax(0,1fr)`. Flexible text containers use `min-width:0` and intentional long-text wrapping.
- Buttons keep labels together and actions wrap into a separate row when needed.
- Mobile inputs are at least 16px. Preserve safe-area padding, keyboard focus, accessible labels and reduced-motion support.
- Run `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build` for substantive changes. Node.js 24 is the supported development/CI runtime. Use `npm run format` to apply the shared Prettier configuration.
- Verify affected mobile and desktop layouts in the browser. Test long Korean text, unbroken URLs, dialogs and empty states.
- Build and dev servers share Next.js output; do not run builds concurrently with the development server.
- `npm run preview` serves the static `out/` build. `next start` is not compatible with static export.
- Distinguish implemented code from actual OAuth/Firestore deployment and real-device verification. Update the handover and project state with concrete evidence and remaining limitations.

## Git and deployment

Work on a feature branch; the existing master workflow deploys production automatically. Review data migration, Firebase rules and build configuration before release. See `docs/DEPLOYMENT.md`. Never force-push or overwrite remote history as part of routine development.
