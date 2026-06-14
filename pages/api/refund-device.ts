import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import algosdk, { Indexer, mnemonicToSecretKey } from 'algosdk';
import clientPromise from '../../lib/mongoclient';

const token = '';
const server = 'https://xna-mainnet-api.algonode.cloud/';
const tokenToSend = { 'X-API-Key': token };
const port = 443;
const algodClient = new algosdk.Algodv2(tokenToSend, server, port);

const indexServer = 'https://mainnet-idx.algonode.cloud/';
const indexer = new Indexer(tokenToSend, indexServer, port);

const DEFAULT_MAX_REFUND = 500000;
const parsedCap =
  typeof process.env.MAX_REFUND_AMOUNT === 'string'
    ? Number(process.env.MAX_REFUND_AMOUNT)
    : NaN;
const MAX_REFUND_AMOUNT =
  Number.isFinite(parsedCap) && parsedCap > 0 ? parsedCap : DEFAULT_MAX_REFUND;

// Function to fetch asset decimals
const getAssetDecimals = async (assetId: number): Promise<number | null> => {
  try {
    const assetInfo = await indexer.lookupAssetByID(assetId).do();
    const decimals = assetInfo.asset.params.decimals;
    return decimals;
  } catch (error) {
    console.error(`Failed to fetch asset info for Asset ID ${assetId}:`, error);
    return null;
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (
    !session ||
    !session.user ||
    (session.user.owner === false && session.user.mods === false) ||
    session.user.admin === false
  ) {
    res.status(401).json({ message: 'Unauthorized User' });
    return;
  }

  const { address, amount, refundFrom, assetId, miner_key } = req.body;


  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    res.status(402).json({ message: 'Refund amount must be a positive number' });
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db('main');

    const collectionDevice = db.collection('devices');
    const exists = await collectionDevice.findOne({ miner_key: miner_key });
    if (!exists) {
      res.status(402).json({ message: 'Device not exist' });
      return;
    }

    if (normalizedAmount > MAX_REFUND_AMOUNT) {
      res.status(402).json({
        message: `Refund amount exceeds limit of ${MAX_REFUND_AMOUNT}`
      });
      return;
    }

    if (refundFrom !== 'reward' && refundFrom !== 'stake') {
      res.status(402).json({ message: 'Incorrect refund type' });
      return;
    }

    const isStakeRefund = refundFrom === 'stake';
    const senderMnemonic = isStakeRefund
      ? process.env.STAKE_MNEMONIC
      : process.env.REWARD_MNEMONIC;
    const signerMnemonic = isStakeRefund
      ? process.env.STAKE_REKEY || process.env.STAKE_MNEMONIC
      : process.env.REWARD_REKEY || process.env.REWARD_MNEMONIC; // fall back to legacy secret if no rekey is configured

    if (!senderMnemonic) {
      res.status(403).json({ message: 'Refund address mnemonic missing' });
      return;
    }

    if (!signerMnemonic) {
      res
        .status(403)
        .json({ message: 'Refund signer mnemonic missing (check *_REKEY env)' });
      return;
    }

    const senderAccount = mnemonicToSecretKey(senderMnemonic);
    const signerAccount = mnemonicToSecretKey(signerMnemonic);

    const noteInfo = {
      action: 'Refund',
      type: refundFrom,
      miner_key: miner_key,
      amount: normalizedAmount,
      to: address
    };
    const enc = new TextEncoder();
    const note = enc.encode(JSON.stringify(noteInfo));

    const decimal = await getAssetDecimals(Number(assetId));

    if (!decimal) {
      res.status(403).json({ message: 'Decimal is incorrect' });
      return;
    }

    const from = senderAccount.addr;
    const suggestedParams = await algodClient.getTransactionParams().do();
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: from,
      receiver: address,
      amount: normalizedAmount * Math.pow(10, decimal),
      assetIndex: Number(assetId),
      note: note,
      suggestedParams
    });


    if (!txn) {
      res.status(403).json({ message: 'Failed to make refund transaction' });
      return;
    }

    const signedTxn = txn.signTxn(signerAccount.sk);
    const tx = await algodClient.sendRawTransaction(signedTxn).do();

    if (!tx) {
      res.status(403).json({ message: 'Failed to send refund transaction' });
      return;
    }

    const collection = db.collection('refund-history');
    const result = await collection.insertOne({
      type: refundFrom,
      address: address,
      amount: normalizedAmount,
      assetId: assetId,
      txId: tx.txid,
      confirmer: session.user.email,
      createAt: new Date(Date.now())
    });

    if (!result) {
      res
        .status(200)
        .json({ success: false, message: 'Failed to update refund history' });
      return;
    }

    res
      .status(200)
      .json({ success: true, message: `Success on refunding ${tx.txid}` });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
}
