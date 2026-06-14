import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '../../lib/mongoclient';
import algosdk, { Indexer } from 'algosdk';

const token = '';
const tokenToSend = { 'X-API-Key': token };
const indexer = new Indexer(
  tokenToSend,
  'https://mainnet-idx.algonode.cloud/',
  443
);

export const getTxCompletedDate = async (
  txId: string
): Promise<Date | undefined> => {
  try {
    const response = await indexer.lookupTransactionByID(txId).do();

    const timestamp = response.transaction['roundTime'];
    if (!timestamp) {
      return undefined;
    }

    const txDate = new Date(timestamp * 1000);

    return new Date(timestamp * 1000);
  } catch (error) {
    console.error('Error fetching transaction: ', error);
  }

  return undefined;
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

  const { miner_key, action, stake_type, amount, asset_id, txId } = req.body;
  const updateData: any = {};

  const client = await clientPromise;

  const txCompletedDate = await getTxCompletedDate(txId);

  try {
    const db = client.db('main');
    const collection = db.collection('devices');
    let result;
    const txnDate = await getTxCompletedDate(txId);

    if (!txnDate || amount <= 0) {
      res.status(501).json({ message: 'Get transaction time failed' });
      return;
    }

    if (action === 'verification') {
      result = await collection.updateOne(
        { miner_key: miner_key },
        {
          $set: {
            verified: true,
            'staked.type': stake_type,
            'staked.amount': amount,
            'staked.time': await getTxCompletedDate(txId),
            'staked.txId': txId,
            'staked.asset_id': asset_id
          }
        }
      );
    } else if (action === 'registration') {
      result = await collection.updateOne(
        { miner_key: miner_key },
        {
          $set: {
            'registration.amount': amount,
            'registration.time': await getTxCompletedDate(txId),
            'registration.txId': txId,
            'registration.asset_id': asset_id
          }
        }
      );
    } else if (action === 'node') {
      result = await collection.updateOne(
        { miner_key: miner_key },
        {
          $set: {
            'node.amount': amount,
            'node.time': await getTxCompletedDate(txId),
            'node.txId': txId,
            'node.asset_id': asset_id
          }
        }
      );
    } else {
      result = undefined;
    }

    if (!result || result.matchedCount === 0) {
      res.status(501).json({ message: 'Failed to update database' });
      return;
    }

    res.status(200).json({ message: 'Updated the database successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
}
