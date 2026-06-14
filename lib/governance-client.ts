/**
 * Client-side governance helpers for building create_vote transactions.
 * This module runs in the browser - NO Node.js imports allowed.
 */

import algosdk from 'algosdk';
import { sha512_256 } from 'js-sha512';

// Contract constants
export const GOVERNANCE_APP_ID = 3594179146;
export const FRY_ASA_ID = 2485314946;
export const VOTE_BOX_MBR = BigInt(61700);  // ~0.1 ALGO for vote box creation
export const VOTE_BOX_PREFIX = new Uint8Array([0x76]);  // "v"
export const GOVERNANCE_ADMIN_ADDRESS = 'E2F2LT2INE75DBOYHQXTCTOP2PAP5MHAXQRXTTCCXFKHQTVG36DJONBQZE';

// Vote types
export const VOTE_TYPE = {
  TEMP_CHECK: 0,
  FIP: 1,
  CFIP: 2
} as const;

/**
 * Generate vote ID from proposal title using sha512_256.
 * Returns 32-byte hash.
 */
export function makeVoteId(title: string): Uint8Array {
  const encoder = new TextEncoder();
  return new Uint8Array(sha512_256.array(encoder.encode(title)));
}

/**
 * Get ABI method selector (first 4 bytes of sha512_256 of method signature).
 */
export function getMethodSelector(methodSig: string): Uint8Array {
  const encoder = new TextEncoder();
  return new Uint8Array(sha512_256.array(encoder.encode(methodSig)).slice(0, 4));
}

/**
 * Concatenate Uint8Arrays.
 */
function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Encode uint64 as big-endian bytes.
 */
function encodeUint64(value: number | bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  const view = new DataView(bytes.buffer);
  view.setBigUint64(0, BigInt(value), false);
  return bytes;
}

/**
 * Fetch suggested params from local algod proxy.
 */
export async function fetchSuggestedParams(): Promise<algosdk.SuggestedParams> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3008';
  const response = await fetch(`${baseUrl}/api/algod/v2/transactions/params`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch suggested params: ${response.status}`);
  }
  const data = await response.json();
  
  const lastRound = data['last-round'];
  const genesisHashBase64 = data['genesis-hash'];
  const genesisHashBytes = Uint8Array.from(atob(genesisHashBase64), c => c.charCodeAt(0));

  return {
    fee: data['fee'] ?? 0,
    minFee: data['min-fee'] ?? 1000,
    firstValid: lastRound,
    lastValid: lastRound + 1000,
    genesisID: data['genesis-id'],
    genesisHash: genesisHashBytes,
    flatFee: false
  };
}

export interface CreateVoteParams {
  title: string;
  optionsCount: number;      // 2-8
  endDate: number;           // Unix timestamp (seconds)
  lockDuration: number;      // Seconds tokens are locked after vote ends
  superMajority: number;     // uint8 0-100 (percentage)
  voteType: number;          // 0=temp_check, 1=fip, 2=cfip
  senderAddress: string;
  suggestedParams: algosdk.SuggestedParams;
}

/**
 * Build create_vote transaction group (UNSIGNED).
 * Returns [Payment, AppCall] transactions with group ID assigned.
 * 
 * Contract method: create_vote(byte[32] vote_id, uint8 options_count, uint64 end_date, 
 *                              uint64 lock_duration, uint8 super_majority, uint8 vote_type, pay mbr_payment)
 */
export function buildCreateVoteGroup(params: CreateVoteParams): algosdk.Transaction[] {
  const {
    title,
    optionsCount,
    endDate,
    lockDuration,
    superMajority,
    voteType,
    senderAddress,
    suggestedParams
  } = params;

  // Compute vote ID from title
  const voteId = makeVoteId(title);
  const voteBoxName = concatBytes(VOTE_BOX_PREFIX, voteId);
  const appAddress = algosdk.getApplicationAddress(GOVERNANCE_APP_ID);

  // Transaction 0: Payment for MBR
  const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: senderAddress,
    receiver: appAddress,
    amount: VOTE_BOX_MBR,
    suggestedParams
  });

  // Transaction 1: AppCall with ABI-encoded args
  // Method signature: create_vote(byte[32],uint8,uint64,uint64,uint8,uint8,pay)void
  const methodSelector = getMethodSelector('create_vote(byte[32],uint8,uint64,uint64,uint8,uint8,pay)void');

  const appTxn = algosdk.makeApplicationCallTxnFromObject({
    sender: senderAddress,
    suggestedParams,
    appIndex: GOVERNANCE_APP_ID,
    appArgs: [
      methodSelector,
      voteId,                                    // byte[32] vote_id
      new Uint8Array([optionsCount]),            // uint8 options_count
      encodeUint64(endDate),                     // uint64 end_date
      encodeUint64(lockDuration),                // uint64 lock_duration
      new Uint8Array([superMajority]),           // uint8 super_majority
      new Uint8Array([voteType])                 // uint8 vote_type
    ],
    foreignAssets: [FRY_ASA_ID],
    boxes: [{ appIndex: GOVERNANCE_APP_ID, name: voteBoxName }],
    onComplete: algosdk.OnApplicationComplete.NoOpOC
  });

  // Assign group ID
  algosdk.assignGroupID([payTxn, appTxn]);

  return [payTxn, appTxn];
}

/**
 * Check if a vote box already exists on-chain (idempotency check).
 * Returns true if vote exists, false otherwise.
 */
export async function checkVoteExistsOnChain(voteId: Uint8Array): Promise<boolean> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3008';
  const boxName = concatBytes(VOTE_BOX_PREFIX, voteId);
  const b64Name = btoa(String.fromCharCode.apply(null, Array.from(boxName) as number[]));
  
  try {
    const response = await fetch(
      `${baseUrl}/api/algod/v2/applications/${GOVERNANCE_APP_ID}/box?name=b64:${encodeURIComponent(b64Name)}`,
      { cache: 'no-store' }
    );
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Wait for transaction confirmation using JSON endpoint.
 */
export async function waitForConfirmationJson(
  txId: string,
  maxRounds: number = 8
): Promise<{ confirmedRound: number }> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3008';
  
  const statusRes = await fetch(`${baseUrl}/api/algod/v2/status`, { cache: 'no-store' });
  if (!statusRes.ok) {
    throw new Error(`Failed to fetch algod status: ${statusRes.status}`);
  }
  const statusData = await statusRes.json();
  let currentRound: number = statusData['last-round'];

  for (let attempt = 0; attempt < maxRounds; attempt++) {
    const pendingRes = await fetch(
      `${baseUrl}/api/algod/v2/transactions/pending/${txId}`,
      { cache: 'no-store' }
    );
    if (pendingRes.ok) {
      const pendingData = await pendingRes.json();
      if (pendingData['confirmed-round'] && pendingData['confirmed-round'] > 0) {
        return { confirmedRound: pendingData['confirmed-round'] };
      }
      if (pendingData['pool-error'] && pendingData['pool-error'] !== '') {
        throw new Error(`Transaction rejected: ${pendingData['pool-error']}`);
      }
    }

    await fetch(
      `${baseUrl}/api/algod/v2/status/wait-for-block-after/${currentRound}`,
      { cache: 'no-store' }
    );
    currentRound += 1;
  }

  throw new Error(`Transaction ${txId} not confirmed after ${maxRounds} rounds`);
}

/**
 * Convert vote ID Uint8Array to hex string for storage.
 */

/**
 * Submit signed transactions to the network via local algod proxy.
 */
export async function submitRawTransactions(signedTxns: (Uint8Array | null)[]): Promise<{ txId: string }> {
  const validTxns = signedTxns.filter((txn): txn is Uint8Array => txn !== null);
  if (validTxns.length === 0) throw new Error('No valid signed transactions to submit');
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3008';
  const totalLength = validTxns.reduce((sum, txn) => sum + txn.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const txn of validTxns) {
    combined.set(txn, offset);
    offset += txn.length;
  }

  const response = await fetch(`${baseUrl}/api/algod/v2/transactions`, {
    method: 'POST',
    body: combined,
    headers: { 'Content-Type': 'application/x-binary' }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Transaction submission failed: ${response.status} ${text}`);
  }
  const data = await response.json();
  return { txId: data.txId || data.txid || data.transactionId };
}
export function voteIdToHex(voteId: Uint8Array): string {
  return Array.from(voteId)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string back to vote ID Uint8Array.
 */
export function hexToVoteId(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(matches.map(b => parseInt(b, 16)));
}
