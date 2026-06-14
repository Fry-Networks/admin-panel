import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '../../lib/mongoclient';
import { Price } from '../../lib/price-schema';

export interface PriceData {
  no: number;
  projectName: string;
  price: number;
  assetId: string;
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
    const collections = await db.listCollections({ name: 'prices' }).toArray();
    const collectionExists = collections.length > 0;

    if (!collectionExists) {
      await db.createCollection('prices');
    }

    const collection = db.collection('prices');

    if (req.method !== 'POST') {
      res
        .status(405)
        .json({ message: 'Not allowed method to manage tokens database' });
      return;
    }

    if (typeof req.body !== 'object' || req.body === null) {
      res.status(400).json({ message: 'Invalid request body format' });
      return;
    }

    const { no, projectName, price, assetId } = req.body as PriceData;

    const result = await collection.updateOne(
      { no: no },
      {
        $set: {
          project_name: projectName,
          price: price,
          asset_id: assetId
        }
      }
    );

    if (!result) {
      res.status(200).json({
        status: 'error',
        message: 'Failed to edit price information to database'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: `Success to edit price of ${projectName} to the database`
    });
  } catch (error) {
    console.error('Edit price error: ' + error);
    res.status(500).json({ message: 'Internal server error', error });
  }
}
