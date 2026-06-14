import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '../../lib/mongoclient';

export interface TokenData {
  name: string;
  asset_id: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user.admin || !session.user.owner) {
    res
      .status(401)
      .json({ message: 'User have no authority to manage the tokens' });
    return;
  }

  const client = await clientPromise;
  const db = client.db('main');

  try {
    const collections = await db.listCollections({ name: 'tokens' }).toArray();
    const collectionExists = collections.length > 0;

    if (!collectionExists) {
      await db.createCollection('tokens');
    }

    const collection = db.collection('tokens');

    if (req.method !== 'PUT') {
      res
        .status(405)
        .json({ message: 'Not allowed method to manage tokens database' });
      return;
    }

    if (typeof req.body !== 'object' || req.body === null) {
      res.status(400).json({ message: 'Invalid request body format' });
      return;
    }

    const { name, asset_id } = req.body as TokenData;

    const result = await collection.insertOne({ name, asset_id });
    if (!result) {
      res.status(200).json({
        status: 'error',
        message: 'Failed to add token information to database'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: `Success to add token (${name}) to the database`
    });
  } catch (error) {
    console.error('Add token error: ' + error);
    res.status(500).json({ message: 'Internal server error', error });
  }
}
