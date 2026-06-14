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
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (req.method !== 'DELETE') {
    res
      .status(405)
      .json({ success: false, message: 'Only DELETE method is allowed' });
    return;
  }

  const client = await clientPromise;

  try {
    const db = client.db('main');
    const collection = db.collection('reductions');
    const result = await collection.deleteMany({});
    if (result.deletedCount !== undefined && result.deletedCount > 0) {
      res.status(200).json({
        success: true,
        message: `Deleted ${result.deletedCount} reductions`
      });
    } else {
      res
        .status(200)
        .json({ success: false, message: 'No reductions were deleted.' });
    }
  } catch (err) {
    console.error('Error deleting all data:', err);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: (err as Error).message
    });
  }
}
