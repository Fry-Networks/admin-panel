import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../../lib/mongoclient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { ObjectId } from 'mongodb';

const VALID_STATUSES = ['queued', 'in_progress', 'implemented', 'verified'] as const;
type ImplementationStatus = typeof VALID_STATUSES[number];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }

  const session = await getServerSession(req, res, authOptions);

  if (
    (!session || !session.user.admin || !session.user.owner) &&
    process.env.NODE_ENV !== 'development'
  ) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const testMode = process.env.NEXT_PUBLIC_DAO_TEST === 'true';
  const { vote_id, implementation_status, implementation_notes } = req.body;

  if (!vote_id) {
    res.status(400).json({ message: 'vote_id is required' });
    return;
  }

  if (!implementation_status) {
    res.status(400).json({ message: 'implementation_status is required' });
    return;
  }

  if (!VALID_STATUSES.includes(implementation_status as ImplementationStatus)) {
    res.status(400).json({ 
      message: `Invalid implementation_status. Must be one of: ${VALID_STATUSES.join(', ')}` 
    });
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db('main');
    const collection = db.collection(testMode ? 'test-dao' : 'dao');

    const vote = await collection.findOne({ _id: new ObjectId(vote_id) });

    if (!vote) {
      res.status(404).json({ message: 'Vote not found' });
      return;
    }

    // Create history entry
    const historyEntry = {
      status: implementation_status,
      notes: implementation_notes || '',
      updated_at: new Date(),
      updated_by: session?.user?.email || 'unknown'
    };

    // Update the vote document
    await collection.updateOne(
      { _id: new ObjectId(vote_id) },
      {
        $set: {
          implementation_status: implementation_status,
          implementation_notes: implementation_notes || '',
          implementation_updated_at: new Date()
        },
        $push: {
          implementation_history: historyEntry
        } as any
      }
    );

    res.status(200).json({
      message: 'Implementation status updated successfully',
      implementation_status,
      implementation_notes
    });
  } catch (error) {
    console.error('Error updating implementation status:', error);
    res.status(500).json({ message: 'Error updating implementation status' });
  }
}
