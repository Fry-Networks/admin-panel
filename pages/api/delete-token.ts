import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '../../lib/mongoclient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user.admin || !session.user.owner) {
    res.status(405).json({ message: `Unauthorized account` });
    return;
  }

  if (req.method !== 'DELETE') {
    res.status(405).json({ message: `Unallowed method of API` });
    return;
  }

  const { asset_id } = req.body;
  if (typeof asset_id !== 'string' || asset_id.length <= 0) {
    res.status(400).json({ message: `Invalid token information` });
    return;
  }

  const client = await clientPromise;

  try {
    const db = client.db('main');
    const collection = db.collection('tokens');
    const tokenExist = await collection.findOne({ asset_id: asset_id });

    if (!tokenExist) {
      res.status(404).json({ message: `There's not token ${asset_id}` });
      return;
    }

    const result = await collection.deleteOne({ asset_id: asset_id });
    if (result.deletedCount !== undefined && result.deletedCount > 0) {
      res
        .status(200)
        .json({
          success: true,
          message: `Delete token ${asset_id} successfully`
        });
    } else {
      res
        .status(200)
        .json({
          success: false,
          message: `Failed to delete token ${asset_id} successfully`
        });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}
