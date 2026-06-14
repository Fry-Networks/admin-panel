import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '../../lib/mongoclient';

interface updateTokenData {
  asset_id: string;
  update_name: string;
  update_assetId: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user.admin || !session.user.owner) {
    res.status(405).json({ message: `Unauthorized account` });
    return;
  }

  if (req.method !== 'PUT') {
    res.status(405).json({ message: `Unallowed method of API` });
    return;
  }

  const { asset_id, update_name, update_assetId } = req.body as updateTokenData;

  const client = await clientPromise;

  try {
    const db = client.db('main');
    const collection = db.collection('tokens');

    const result = await collection.updateOne(
      { asset_id: asset_id },
      {
        $set: {
          name: update_name,
          asset_id: update_assetId
        }
      }
    );

    if (result.matchedCount > 0) {
      res.status(200).json({
        success: true,
        message: `Update the token information successfully`
      });
    } else {
      res.status(200).json({
        success: false,
        message: `Update the token ${asset_id} failed`
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}
