import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '../../lib/mongoclient';

interface RedcutionData {
  minDeviceCount: number;
  maxDeviceCount: number;
  reduction: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user.admin || !session.user.owner) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const client = await clientPromise;
  const db = client.db('main');

  try {
    const collections = await db
      .listCollections({ name: 'reductions' })
      .toArray();
    const collectionExists = collections.length > 0;

    if (!collectionExists) {
      await db.createCollection('reductions');
    }

    const collection = db.collection('reductions');

    if (req.method === 'PUT') {
      if (typeof req.body !== 'object' || req.body === null) {
        res.status(400).json({ message: 'Invalid request body format' });
        return;
      }
      const { minDeviceCount, maxDeviceCount, reduction } =
        req.body as RedcutionData;

      if (
        typeof minDeviceCount !== 'number' ||
        typeof maxDeviceCount !== 'number' ||
        typeof reduction !== 'number'
      ) {
        res.status(400).json({ message: 'Invalid input data' });
        return;
      }

      const result = await collection.insertOne({
        minDeviceCount,
        maxDeviceCount,
        reduction
      });

      res.status(200).json({ message: 'Data inserted successfully', result });
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Add Reduction Error: ', error);
    res.status(500).json({ message: 'Internal Server Error', error });
  }
}
