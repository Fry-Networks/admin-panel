import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../../lib/mongoclient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { ObjectId } from 'mongodb';
import http from 'http';

const ALGOD_PRIMARY = 'http://192.168.9.2:4190';
const ALGOD_FALLBACK = 'https://mainnet-api.4160.nodely.dev';
const GOVERNANCE_APP_ID = 3500693631;
const VOTE_BOX_PREFIX = 0x76;

/**
 * Make HTTP request to ATLAS00 algod.
 */
function algodRequest(path: string): Promise<{ status: number; data: any } | null> {
  return new Promise((resolve) => {
    const url = new URL(ALGOD_PRIMARY + path);
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: 'GET',
      timeout: 5000,
      headers: { 'X-Algo-API-Token': process.env.ALGOD_TOKEN || '' }
    };

    const req = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          resolve({ status: res.statusCode || 500, data });
        } catch {
          resolve({ status: res.statusCode || 500, data: {} });
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

/**
 * Fallback fetch to Nodely.
 */
async function algodFallbackRequest(path: string): Promise<{ status: number; data: any } | null> {
  try {
    const response = await fetch(ALGOD_FALLBACK + path, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      return { status: response.status, data };
    }
    return { status: response.status, data: {} };
  } catch {
    return null;
  }
}

/**
 * Verify transaction is confirmed on-chain.
 */
async function verifyTransactionConfirmed(txId: string): Promise<{ confirmed: boolean; round?: number }> {
  const path = `/v2/transactions/pending/${txId}`;
  
  // Try primary
  let result = await algodRequest(path);
  if (!result) {
    // Try fallback
    result = await algodFallbackRequest(path);
  }
  
  if (!result) {
    return { confirmed: false };
  }
  
  const confirmedRound = result.data['confirmed-round'];
  if (confirmedRound && confirmedRound > 0) {
    return { confirmed: true, round: confirmedRound };
  }
  
  return { confirmed: false };
}

/**
 * Verify vote box exists on-chain.
 */
async function verifyVoteBoxExists(contractVoteIdHex: string): Promise<boolean> {
  // Convert hex to bytes
  const voteIdBytes = Buffer.from(contractVoteIdHex, 'hex');
  // Prepend box prefix
  const boxName = Buffer.concat([Buffer.from([VOTE_BOX_PREFIX]), voteIdBytes]);
  // Base64 encode
  const b64Name = boxName.toString('base64');
  const path = `/v2/applications/${GOVERNANCE_APP_ID}/box?name=b64:${encodeURIComponent(b64Name)}`;
  
  // Try primary
  let result = await algodRequest(path);
  if (!result || result.status !== 200) {
    // Try fallback
    result = await algodFallbackRequest(path);
  }
  
  return result?.status === 200;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Verify admin session
  const session = await getServerSession(req, res, authOptions);
  if (
    (!session || !session.user.admin || !session.user.owner) &&
    process.env.NODE_ENV !== 'development'
  ) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const testMode = process.env.NEXT_PUBLIC_DAO_TEST === 'true';

  // Validate request body
  const { voteDocId, contractVoteId, contractTxId, startDate, endDate } = req.body;

  if (!voteDocId || typeof voteDocId !== 'string') {
    return res.status(400).json({ message: 'voteDocId is required' });
  }
  if (!contractVoteId || typeof contractVoteId !== 'string' || contractVoteId.length !== 64) {
    return res.status(400).json({ message: 'contractVoteId must be a 64-character hex string' });
  }
  if (!contractTxId || typeof contractTxId !== 'string') {
    return res.status(400).json({ message: 'contractTxId is required' });
  }
  if (typeof startDate !== 'number' || startDate <= 0) {
    return res.status(400).json({ message: 'startDate must be a positive Unix timestamp' });
  }
  if (typeof endDate !== 'number' || endDate <= 0) {
    return res.status(400).json({ message: 'endDate must be a positive Unix timestamp' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('main');
    const collection = db.collection(testMode ? 'test-dao' : 'dao');

    // Fetch vote document
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(voteDocId);
    } catch {
      return res.status(400).json({ message: 'Invalid voteDocId format' });
    }

    const vote = await collection.findOne({ _id: objectId });
    if (!vote) {
      return res.status(404).json({ message: 'Vote document not found' });
    }

    // Check if contractVoteId already set (idempotency)
    if (vote.contractVoteId) {
      return res.status(409).json({ 
        message: 'Contract vote already exists for this document',
        existingContractVoteId: vote.contractVoteId,
        existingContractTxId: vote.contractTxId
      });
    }

    // Verify transaction confirmed on-chain
    const txVerification = await verifyTransactionConfirmed(contractTxId);
    if (!txVerification.confirmed) {
      return res.status(400).json({ 
        message: 'Transaction not yet confirmed on-chain',
        txId: contractTxId
      });
    }

    // Verify vote box exists on-chain
    const boxExists = await verifyVoteBoxExists(contractVoteId);
    if (!boxExists) {
      return res.status(400).json({ 
        message: 'Vote box not found on-chain. The transaction may have failed.',
        contractVoteId
      });
    }

    // Update MongoDB - DO NOT set current: true
    await collection.updateOne(
      { _id: objectId },
      {
        $set: {
          contractVoteId,
          contractTxId,
          startDate: new Date(startDate * 1000),
          end_date: new Date(endDate * 1000),
          confirmedRound: txVerification.round
        }
      }
    );

    console.log(`[confirm-contract-vote] Vote ${voteDocId} confirmed on-chain by ${session?.user?.email}`);
    console.log(`  contractVoteId: ${contractVoteId}`);
    console.log(`  contractTxId: ${contractTxId}`);
    console.log(`  confirmedRound: ${txVerification.round}`);

    return res.status(200).json({
      success: true,
      message: 'Contract vote confirmed and saved',
      confirmedRound: txVerification.round
    });

  } catch (error) {
    console.error('[confirm-contract-vote] Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
