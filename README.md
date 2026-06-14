# FRY Admin Panel

## Overview
- Internal Next.js 13 admin console for FRY Networks operations teams.
- Surfaces MongoDB data from multiple databases—`main` (operations), `weather` (telemetry), and the consolidated `creds` collections that hold miner credentials across air/energy/water/hardware/camera/radiation—to manage users, devices, sensors, pricing, and governance.
- Integrates with Algorand via `algosdk` to verify stakes, refund tokens, and audit on-chain history.
- All privileged actions flow through server-side API routes under `pages/api`, guarded by NextAuth GitHub SSO roles (`admin`, `owner`, `mods`).

## Tech Stack
- **UI**: Next.js pages router, React 18, TypeScript, Tremor + Tailwind styling, Headless UI modals.
- **Auth**: NextAuth GitHub provider with the MongoDB adapter (`webusers`, `webaccounts`, `websessions`, `webverificationtokens` collections).
- **Data**: MongoDB Atlas accessed with the official driver (`lib/mongoclient`) and Mongoose schemas for typing (`lib/*-schema.ts`).
- **Blockchain**: Algorand mainnet (Algonode algod + indexer REST endpoints) using mnemonics stored in env vars.
- **Tooling**: Prettier (project config in `package.json`), PM2 process definition (`ecosystem.config.js`), Tailwind/Tremor utility classes.

## Directory Guide
- `pages/`: Next.js pages. Top-level routes (e.g. `devices.tsx`, `rewards.tsx`) render admin screens; `pages/api/*` hosts all mutation/read APIs.
- `app/`: Shared layout (`layout.tsx`), navigation (`navbar.tsx`), loading state, and Tremor-based table views reused across pages.
- `components/`: Form modals and utilities (device/user forms, DAO vote modals, history panels).
- `lib/`: Mongoose schemas, helper types, and shared utilities (`connect.ts`, `mongoclient.ts`, `utils.tsx` for REST helpers).
- `globals.css`, `app/css/*`: Styling, including Tremor overrides and device table animations.
- `ecosystem.config.js`: Production PM2 definition (`npm start` with `NODE_ENV=production` on port `3008` from `package.json`).

## Data & Integrations
- **MongoDB**: Primary datasets live in the `main` database (`users`, `devices`, `products`, `tokens`, `rewards`, `reward-boosts`, `reductions`, `configs`, `byods`, `dao`, `dao-stakes`, `created-tokens`, `refund-history`, `blacklist-devices`). Device credentials now live in the dedicated `creds` database, split by miner family (`air`, `energy`, `weather`, `radiation`, `water`, `hardware`, `camera`), with `creds.hardware` covering nodes, AEM/AI Edge, bandwidth, decibel, and satellite miners. Telemetry and historical sensor data continue to reside in their vertical databases (`weather` for atmospheric feeds, plus `air`, `water`, `energy` for measurement archives). See `AGENTS.md` for field-level documentation.
- **Algorand**: `pages/api/stake-device.ts` and `pages/api/refund-device.ts` call Algonode algod/indexer endpoints to validate transactions, manage staking metadata, and issue token refunds.
- **External REST**: `lib/utils.addDevice` posts to `http://frynetworks.ddns.net:3006/adddevice` using the `BASE_API_KEY` to provision miners in Fry's backend.

## Environment Variables
Set these in `.env` (or `.env.local` when running locally):

| Variable | Purpose |
| --- | --- |
| `NEXTAUTH_URL` | Absolute URL served to NextAuth (e.g. `https://admin.frynetworks.com/`). |
| `NEXTAUTH_SECRET` | Secret for session/JWT signing. |
| `GITHUB_ID` / `GITHUB_SECRET` | GitHub OAuth credentials for production. |
| `GITHUB_ID_DEV` / `GITHUB_SECRET_DEV` | GitHub OAuth credentials for development environments. |
| `MONGO_URI` | MongoDB connection string (cluster hosts `main`, `weather`, `air`, `water`, `energy`, `creds`). |
| `BASE_API_KEY` | Token for Fry device provisioning service (`lib/utils.addDevice`). |
| `ADMIN_PASSWORD` | Legacy helper (not referenced in current code; keep in sync if reused elsewhere). |
| `NEXT_PUBLIC_DAO_TEST` | `"true"` routes DAO APIs to `test-dao` / `test-dao-stakes` collections instead of production. |
| `STAKE_MNEMONIC` | Algorand mnemonic for the stake-distribution account (used as sender address). |
| `STAKE_REKEY` | Mnemonic for the staking account’s current signing key (after rekeying). |
| `REWARD_MNEMONIC` | Algorand mnemonic for the rewards account (sender address). |
| `REWARD_REKEY` | Mnemonic for the rewards account’s current signing key (after rekeying). |

> **Tip:** Keep encrypted copies of the mnemonics and rotate the *_REKEY secrets whenever you rekey those accounts. Without the rekey mnemonics refunds will fail signature validation.

## Getting Started
1. Install dependencies: `npm install`
2. Copy `.env` (or create `.env.local`) with the variables above.
3. Boot the dev server: `npm run dev` (runs on port `3000`).
4. Lint before committing: `npm run lint`
5. Production build: `npm run build` then `npm run start -p 3008`

## Authentication & Roles
- GitHub SSO via NextAuth. New admins are inserted into `main.webusers` with role flags: `admin` (general access), `owner` (tier-1 operations, blockchain actions, DAO management), `mods` (device lifecycle helpers).
- The global navbar is always rendered; `ProtectedComponent` (in `pages/_app.tsx`) restricts content to authenticated admins. Owners are required for high-risk screens (DAO, refunds, blacklisting, token management).

## Feature Overview
- **Users (`/users`)**: Searchable list of `main.users`, add users (email/address/name), delete users.
- **Devices (`/devices`)**: Manage `main.devices`. Supports miner creation, changing device SKU, stake verification, unstaking, refunds, blacklisting, and unregistering devices. Requires owner/mod privileges for risky paths.
- **Blacklist (`/blacklist`)**: View `main.blacklist-devices` populated via the “Blacklist” action in Devices.
- **BYOD (`/byod`)**: Audit Bring-Your-Own-Device licenses and payments (`main.byods`). Adds licenses, toggles usage, resets payment flags.
- **Tokens (`/token`)**: CRUD for reward/stake asset metadata (`main.tokens`). Owners only.
- **Stakes (`/stakes`)**: Configure per-product staking rewards (`main.products`). Splits “normal” vs “node/edge” kits, edits reward/stake matrices.
- **Rewards (`/rewards`)**: Toggle the global reward config (`main.configs`), edit per-product payout settings, inspect reward history (`main.rewards`).
- **Reduction (`/reduction`)**: Manage volume-based reduction brackets (`main.reductions`) and view affected products.
- **Crypto Income (`/fee`)**: Filter `main.reward-boosts`, review BYOD (`/api/byod-history`) and FryWorld (`/api/fryworld-history`) payment histories with USD aggregates.
- **Prices (`/prices`)**: Maintain service pricing (`main.prices`), including asset mapping to FRY tokens or Algo.
- **DAO (`/dao`)**: Create/choose/stop/delete votes (`main.dao`) and review staking participation (`main.dao-stakes` or test equivalents).
- **Weather / Air / Water / Energy**: Read-only portals that marry telemetry databases (`weather`, `air`, `water`, `energy`) with credential sets from the consolidated `creds.*` collections for device drill-downs.

## API & Data Flow
- Server-side rendered pages call `clientPromise` in `getServerSideProps` to load MongoDB data.
- Mutations are compartmentalised in Next.js API routes (e.g. `/api/add-device`, `/api/refund-device`); each validates the NextAuth session and writes to MongoDB or Algorand as needed.
- `components/server-util.ts` hosts browser-side wrappers that call these APIs.
- Refer to `AGENTS.md` for a route-by-route breakdown, collection usage, and field-level documentation.

## Blockchain Operations
- `pages/api/stake-device.ts` uses the Algorand indexer to confirm transactions (`getTxCompletedDate`), then stores staking details in `main.devices` (`staked`, `registration`, `node` sub-documents).
- `pages/api/refund-device.ts` builds ASA transfers with `algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject`, signs with the mnemonic from `STAKE_REKEY` or `REWARD_REKEY`, and records success in `main.refund-history`. Original `*_MNEMONIC` values continue to provide the sender address; rekey secrets provide the valid signing keys.
- All Algorand calls target Algonode (HTTPS, port 443). Update env values if you swap infrastructure.

## External Services
- Miner creation (`components/form-device.tsx`) posts to Fry Networks’ provisioning API (`http://frynetworks.ddns.net:3006/adddevice`) with the `BASE_API_KEY`. This call is fire-and-forget; MongoDB is still the source of truth for the UI.

## Deployment Notes
- Production run command: `npm run build && npm run start -p 3008`.
- Docker/Compose is the primary production runtime (`Dockerfile` + `docker-compose.yml`).
- Ensure environment files include the new `*_REKEY` keys before shipping — refunds will fail otherwise.

## 1Password Integration
- Secrets live in the `AdminPanel` vault inside an item also named `AdminPanel`. Fields present: `OP_SERVICE_ACCOUNT_TOKEN`, `NEXTAUTH_SECRET`, `GITHUB_ID`, `GITHUB_SECRET`, `GITHUB_ID_DEV`, `GITHUB_SECRET_DEV`, `MONGO_URI`, `BASE_API_KEY`, `ADMIN_PASSWORD`, `STAKE_MNEMONIC`, `REWARD_MNEMONIC`, `STAKE_REKEY`, `REWARD_REKEY`. Optional: `MAX_REFUND_AMOUNT` (increase or lower the per-transaction refund ceiling; defaults to 500000 if absent).
- Docker/Compose runtime injection: the container reads `/run/secrets/op_service_account_token` as root in `docker-entrypoint.sh`, exports `OP_SERVICE_ACCOUNT_TOKEN`, then drops privileges to `appuser` and runs `op run -- npm start`.
- Create the token file on the host (example path in `docker-compose.yml`): `/etc/opt/adminpanel/op_service_account_token`. Keep it root-only (`root:root`, `0400`).
- For manual non-container runs, export `OP_SERVICE_ACCOUNT_TOKEN` and execute commands with `op run -- ...` so `op://...` environment references resolve at runtime.

## Housekeeping
- Formatting: run Prettier (`npx prettier --write .`) to match the repo config (2-space indent, single quotes).
- No automated tests exist; smoke test critical flows (auth, devices, refunds, DAO) manually after significant changes.
- Keep `AGENTS.md` current when collections or API behaviour changes—it is the companion data dictionary for engineers on-call.
