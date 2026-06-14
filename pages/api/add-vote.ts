import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongoclient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  const testMode = process.env.NEXT_PUBLIC_DAO_TEST === 'true' ? true : false;
  // Check if user is authenticated and is an admin
  if (
    (!session || !session.user.admin || !session.user.owner) &&
    process.env.NODE_ENV !== 'development'
  ) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const client = await clientPromise;
  const db = client.db('main');
  const collection = db.collection(testMode ? 'test-dao' : 'dao');

  if (req.method === 'PUT') {
    const data: {
      title: string;
      description: string;
      options: { title: string; description: string }[];
      category?: string;
      discussion_days?: number;
    } = req.body;
    const { title, description, options, category, discussion_days } = data;

    try {
      // Get the next sequence number
      const maxSequence = await collection
        .find({ sequence_number: { $exists: true } })
        .sort({ sequence_number: -1 })
        .limit(1)
        .toArray();
      
      const nextSequenceNumber = maxSequence.length > 0 
        ? (maxSequence[0].sequence_number || 0) + 1 
        : 1;

      await collection.insertOne({
        title: title,
        total_votes: 0,
        createdAt: new Date(),
        current: false,
        description: description,
        votes: options.map((option, index) => {
          return {
            option: index.toString(),
            description: option.description,
            title: option.title,
            votes: 0,
            different_people: []
          };
        }),
        // New governance fields
        category: category || 'governance',
        discussion_days: discussion_days || 30,
        type: 'fip',
        status: 'draft',
        vote_version: 'v1',
        sequence_number: nextSequenceNumber
      });

      res.status(200).json({ message: 'Vote added successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error adding vote' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
