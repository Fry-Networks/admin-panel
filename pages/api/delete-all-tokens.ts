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
    res.status(405).json({ message: 'Unauthorized user account' });
    return;
  }

  const client = await clientPromise;

  try {
    const db = client.db('main');
    const collection = db.collection('tokens');
    const result = await collection.deleteMany({});

    if (result.deletedCount !== undefined && result.deletedCount > 0) {
      res.status(200).json({
        success: true,
        message: `Deleted ${result.deletedCount} tokens from database`
      });
    } else {
      res.status(200).json({
        success: false,
        message: `Failed to delete all tokens from database`
      });
    }
  } catch (error) {
    console.error('Error deleting all data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: (error as Error).message
    });
  }
}
