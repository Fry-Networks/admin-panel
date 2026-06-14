# AGENTS Reference

This document captures the operational knowledge needed when jumping back into the FRY admin panel: MongoDB layout, API entry points, and blockchain touchpoints. Pair it with `README.md` for the high-level project overview.

## Auth & Roles
- Authentication runs through NextAuth GitHub SSO with the MongoDB adapter.
- Session objects include role booleans: `admin`, `owner`, `mods`. These flags live on the `main.webusers` records (even though the adapter accepts extra fields beyond the simple schema in `lib/webusers-model.ts`).
- Route guards:
  - `admin` — baseline access.
  - `mods` / `owner` — required for staking, refunds, device deletions, and other high-risk actions.
  - `owner` — exclusive access to tokens, DAO management, pricing changes, reward toggles, blacklisting.
- NextAuth stores supporting data in `main.webusers`, `main.webaccounts`, `main.websessions`, and `main.webverificationtokens`.

## MongoDB Databases

### Database: `main`

`main` holds the core operational datasets.

#### Collection: `webusers` (+ related adapter collections)
- **Purpose**: NextAuth user directory.
- **Key fields**: `name`, `username`, `email`, `image`, `admin`, `owner`, `mods`, `createdAt`, `updatedAt`.
- **Writers**: NextAuth adapter during sign-in or manual seeding.
- **Readers**: Authentication middleware (`pages/_app.tsx`), any role-based guard.
- **Notes**: Ensure `admin` is true for every admin-panel account; add `owner`/`mods` booleans manually in MongoDB when promoting users.

#### Collection: `users`
- **Purpose**: FRY end-user metadata used across staking/device flows.
- **Key fields**: `email`, `address`, `name.{first,last,full}`, `byod.licenses[]`, `byod.payments[]`.
- **Writers**: `POST /api/add-user`, `POST /api/remove-user` (delete), `lib/utils.getMongoUser` (sync email/address), external ingestion pipelines.
- **Readers**: `pages/users.tsx`, `components/form-device.tsx` indirectly via search, `lib/utils.tsx`.
- **Notes**: `byod` subdocument is kept in sync with the dedicated `byods` collection by background services.

#### Collection: `devices`
- **Purpose**: Inventory of miner devices tied to FRY users.
- **Key fields**: `miner_key`, `email`, `name`, `order`, `byod`, `is_registered`, `address`, `created_at`, `registered_at`, `verified`, `staked` (`type`, `amount`, `asset_id`, `time`, `txId`), `registration` (amount/asset/time), `node` (amount/asset/time).
- **Writers**:
  - `POST /api/add-device` — creates device keyed to a product.
  - `POST /api/change-device` — swaps SKU/miner key (generates a new key).
  - `POST /api/stake-device` — records staking metadata.
  - `POST /api/unstake-device` — clears staking fields.
  - `POST /api/delete-device` — removes the document.
  - `POST /api/unregister-device` — resets registration fields and `is_registered`.
  - `POST /api/blacklist-device` — moves the document to `blacklist-devices`.
- **Readers**: `pages/devices.tsx`, `components/table-device.tsx`, `pages/reduction.tsx` (registered count), refund API (validation).
- **Notes**: Miner keys are `PRODUCTKEY-{32 char}` uppercase strings. Device creation also triggers a provisioning call through `lib/utils.addDevice`.

#### Collection: `blacklist-devices`
- **Purpose**: Archive of devices removed via the blacklist flow.
- **Writers**: `POST /api/blacklist-device`.
- **Readers**: `pages/blacklist.tsx`.
- **Notes**: Contains the original `devices` document; no additional fields added.

#### Collection: `products`
- **Purpose**: Wix product catalog plus reward/stake configuration.
- **Key fields**: `wix_id`, `name`, `key`, `reward.unverified`, `reward.verified`, `reward.stake.{stake_one,stake_two,register,node}`, `reward.tokens.{staked,reward,register,node}`, `created_at`.
- **Writers**: `PUT /api/edit-product` (updates nested reward/token info).
- **Readers**: `pages/rewards.tsx`, `pages/stakes.tsx`, `pages/devices.tsx` (product list), `pages/reduction.tsx`.
- **Notes**: Device creation resolves the product by `_id` and derives the miner prefix from `key`.

#### Collection: `tokens`
- **Purpose**: Registry of Algorand asset IDs used in staking/rewards.
- **Key fields**: `name`, `asset_id`.
- **Writers**: `PUT /api/add-token`, `PUT /api/update-token`, `DELETE /api/delete-token`, `DELETE /api/delete-all-tokens`.
- **Readers**: Rewards/Stakes/Devices/Fee pages, refund modal (asset picker).
- **Notes**: Supports both ASA IDs and the sentinel `'11111111111'` for Algo-only flows.

#### Collection: `prices`
- **Purpose**: Service pricing matrix.
- **Key fields**: `no`, `project_name`, `price`, `asset_id`, `isUSD`.
- **Writers**: `POST /api/add-price`, `POST /api/edit-price`.
- **Readers**: `pages/prices.tsx`.

#### Collection: `reductions`
- **Purpose**: Volume-based reward reduction brackets.
- **Key fields**: `minDeviceCount`, `maxDeviceCount`, `reduction`.
- **Writers**: `PUT /api/add-reduction`, `PUT /api/update-reduction`, `DELETE /api/delete-reduction`, `DELETE /api/delete-all-reductions`.
- **Readers**: `pages/reduction.tsx`.
- **Notes**: Update/delete routes adjust neighboring brackets to keep device-count ranges continuous.

#### Collection: `configs`
- **Purpose**: Misc feature toggles (currently only `name: "rewards"`).
- **Key fields**: `enabled`, `multiplier`.
- **Writers**: `PUT /api/update-rewards-enabled`, `PUT /api/update-multiplier`.
- **Readers**: `pages/rewards.tsx`, `pages/stakes.tsx`.

#### Collection: `rewards`
- **Purpose**: Reward distribution ledger (historical payouts).
- **Key fields**: `no`, `miner_key`, `status`, `asset_id`, `amount`, `createdAt`.
- **Writers**: External reward processor (not in this repo).
- **Readers**: `/api/reward-history` (pagination + filtering), `components/reward-history`.

#### Collection: `reward-boosts`
- **Purpose**: Crypto income tracking (fee multipliers, USD totals).
- **Key fields**: `reward_no`, `miner_key`, `address`, `fee_amount`, `asset_id`, `price`, `txID`, `createdAt`.
- **Writers**: External accounting job.
- **Readers**: `pages/fee.tsx` (filters, pagination).

#### Collection: `refund-history`
- **Purpose**: Audit log for manual refunds.
- **Key fields**: `type` (`stake` or `reward`), `address`, `amount`, `assetId`, `txId`, `confirmer` (admin email), `createAt`.
- **Writers**: `POST /api/refund-device`.
- **Readers**: (Not surfaced yet; use Mongo for forensic review).

#### Collection: `byods`
- **Purpose**: Bring-Your-Own-Device program tracking.
- **Key fields**: `email`, `licenses[{ license, used }]`, `payments[{ date, price }]`, `address`, `algo`, `fry`, metadata like `adder`.
- **Writers**: `PUT /api/add-license`, `PUT /api/edit-license-use`, `PUT /api/reset-user-payments`, BYOD automated ingestion.
- **Readers**: `pages/byod.tsx`, `/api/byod-history`.

#### Collection: `created-tokens`
- **Purpose**: FryWorld token creation ledger.
- **Key fields**: `address`, `asset_id`, `price`, `txId`, `createdAt`.
- **Writers**: External FryWorld service.
- **Readers**: `/api/fryworld-history`, `components/fryworld-history`.

#### Collection: `dao` / `dao-stakes`
- **Purpose**: DAO proposal metadata (`dao`) and staking participation (`dao-stakes`).
- **Key fields (`dao`)**: `title`, `description`, `votes[{ option, title, description, votes, different_people[] }]`, `total_votes`, `current`, `deleted`, `hidden`, `super_majority`, `end_date`, timestamps.
- **Key fields (`dao-stakes`)**: `voteTitle`, `voteOption`, `address`, stake amount, transaction references (populated by staking backend).
- **Writers**: `PUT /api/add-vote`, `PUT /api/edit-vote`, `PUT /api/choose-vote`, `PUT /api/stop-vote`, `PUT /api/delete-vote`. `dao-stakes` populated externally.
- **Readers**: `pages/dao.tsx`, `/api/get-vote-status`.
- **Notes**: Setting `NEXT_PUBLIC_DAO_TEST="true"` toggles all DAO routes to `test-dao` / `test-dao-stakes`.

### Database: `creds`

`creds` centralises every device credential record (API keys, MAC addresses, app keys, IMEIs, etc.) and splits them by miner family to keep access boundaries tight.

#### Collection: `air`
- **Purpose**: Credentials for air-quality sensors and services (PurpleAir, Ambient, Ecowitt, Pebble, etc.).
- **Key fields**: `api_type`, `api_key`, `app_key`, `read_key`, `sensor`, `owner`, `imei`, `token`, `devices[]`, geolocation hints.
- **Consumers**: Air accounts page (via server routes) and automation interacting with air-quality miners.

#### Collection: `weather`
- **Purpose**: Weather station credentials (Ecowitt, Davis, and similar integrations).
- **Key fields**: `api_key`, `app_key`, `token`, `deviceMAC`, station metadata (`name`, coordinates), optional ingestion flags.
- **Consumers**: Weather Accounts/Devices pages for credential lookups.

#### Collection: `water`
- **Purpose**: Water-quality miner credentials (Ecowitt pools, iopool probes, etc.).
- **Key fields**: `api_key`, `app_key`, `token`, `walletAddress`/`iopool_id`, device identifiers.
- **Consumers**: Water accounts view and payout automation.

#### Collection: `energy`
- **Purpose**: Energy miner credentials (Ecowitt energy monitors, Shelly devices).
- **Key fields**: `api_key`, `app_key`, `token`, `address`, device serials.
- **Consumers**: Energy accounts module and downstream ingestion services.

#### Collection: `radiation`
- **Purpose**: Radiation-sensing hardware credentials (API keys, sensor MACs, deployment metadata).
- **Key fields**: `api_key`, `sensor_id`, `location`, `mac`, device descriptors.
- **Consumers**: Radiation monitoring pipelines and hardware provisioning.

#### Collection: `hardware`
- **Purpose**: Credentials for FRY-owned hardware fleets—nodes, AEM/AI Edge miners, bandwidth miners, decibel miners, satellite miners.
- **Key fields**: `miner_type`, `miner_key`, `mac`, `imei`, `api_key`, staking/credential payloads.
- **Consumers**: Devices page actions, hardware provisioning, staking workflows.

#### Collection: `camera`
- **Purpose**: Credentials and endpoints for camera-based integrations.
- **Key fields**: `api_key`, `stream_url`, `device_id`, auth metadata.
- **Consumers**: Camera ingest services and any future UI exposing camera feeds.

### Database: `weather`
- **Credentials**: Account/API metadata now lives in `creds.weather`; see above for field coverage.
- **Collection `weathers`**: Time-series measurements (MongoDB time-series collection).
  - Fields: `timestamp`, `temperature`, `humidity`, numerous sensor channels (`humidity1-10`, `temp1f-10f`, `soiltemp*`, `soilhum*`, `batt*`), `metadata.deviceMAC`, `metadata.location`.
  - Readers: `pages/weather/devices/[mac].tsx`.
  - Writers: Weather ingestion service (outside this repo).

### Databases: `air`, `water`, `energy`
- These vertical databases retain historical telemetry and ingestion buffers for their respective miner families. Any account or credential records previously stored here have been migrated into `creds.air`, `creds.water`, and `creds.energy`.
- UI pages still read from the telemetry stores for raw measurement data while resolving credentials from the `creds` database.

## API Routes by Concern

### Users & BYOD
- `POST /api/add-user` — insert into `main.users`.
- `POST /api/remove-user` — delete from `main.users`.
- `PUT /api/add-license` — append BYOD license.
- `PUT /api/edit-license-use` — toggle BYOD license `used`.
- `PUT /api/reset-user-payments` — reset `algo`/`fry` flags in BYOD record.
- `POST /api/byod-history` — aggregate BYOD payments (read-only).

### Devices
- `POST /api/add-device` — create device after validating product.
- `POST /api/change-device` — reissue miner key with new product.
- `POST /api/stake-device` — record staking metadata (Algorand indexer lookup).
- `POST /api/unstake-device` — clear staking info.
- `POST /api/refund-device` — perform Algorand ASA refund; log `refund-history`.
- `POST /api/unregister-device` — wipe registration fields.
- `POST /api/delete-device` — remove device.
- `POST /api/blacklist-device` — move to `blacklist-devices`.
- `POST /api/reward-history` — reward list (read-only).

### Tokens & Pricing
- `PUT /api/add-token`, `PUT /api/update-token`, `DELETE /api/delete-token`, `POST /api/delete-all-tokens`.
- `POST /api/add-price`, `POST /api/edit-price`.
- `PUT /api/update-rewards-enabled`, `PUT /api/update-multiplier`.
- `PUT /api/add-reduction`, `PUT /api/update-reduction`, `DELETE /api/delete-reduction`, `POST /api/delete-all-reductions`.

### DAO
- `PUT /api/add-vote`, `PUT /api/edit-vote`, `PUT /api/choose-vote`, `PUT /api/stop-vote`, `PUT /api/delete-vote`.
- `PUT /api/get-vote-status` — fetch per-option stake records (`dao-stakes`).

### Reporting
- `POST /api/fee` (SSR) — `pages/fee.tsx` uses server-side data; no API.
- `POST /api/fryworld-history` — FryWorld payments (`created-tokens`).
- `POST /api/byod-history` — BYOD aggregation (see above).

## Blockchain Workflows
- **Staking (`/api/stake-device`)**:
  - Validates admin session (`owner`/`mods`).
  - Confirms transaction using Algonode indexer (`lookupTransactionByID`) to fetch round time.
  - Writes stake details into the `devices` document under `staked`, `registration`, or `node` depending on action.
- **Unstaking (`/api/unstake-device`)**:
  - Clears the corresponding nested fields on the device document.
- **Refunds (`/api/refund-device`)**:
  - Validates device presence, amount cap (<50,000), and refund type.
  - Chooses the sender mnemonic by refund type:
    - `stake`: `STAKE_MNEMONIC` for address, `STAKE_REKEY` for signing key.
    - `reward`: `REWARD_MNEMONIC` / `REWARD_REKEY`.
  - Fetches ASA decimals via Algonode indexer to scale the amount.
  - Signs with `mnemonicToSecretKey` of the rekey account and submits via Algonode algod.
  - Inserts an audit row into `refund-history`.
- **Environment hygiene**: Ensure rekey mnemonics always correspond to the current `auth-addr` of the staking/reward accounts; rotate immediately after rekey events.

## External Hooks
- `lib/utils.addDevice` sends a POST request to `http://frynetworks.ddns.net:3006/adddevice` with `BASE_API_KEY`, `email`, and the friendly product name. Failure only affects external provisioning — the MongoDB insert still happens.

## Operational Tips
- When altering schemas or adding collections, update both this document and the relevant Mongoose typings in `lib/*-schema.ts`.
- For on-call debugging, inspect:
  - `main.refund-history` for payout issues.
  - `main.devices` for staking or registration mismatches.
  - `main.dao-stakes` vs `dao` when DAO tallies look off.
- Test toggling `NEXT_PUBLIC_DAO_TEST` in `.env` when experimenting with DAO changes to avoid touching production data.
