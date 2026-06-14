import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongoclient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

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
  const collection = db.collection('dao');

  if (req.method === 'PUT') {
    const data: {
      id: string;
      end_date: Date;
      super_majority: boolean;
      hidden: boolean;
    } = req.body;
    const { id, end_date, super_majority, hidden } = data;
    const toDate = new Date(end_date);

    console.log('Selecting vote', id);

    try {
      const previousVote = await collection.findOne({ current: true });
      if (previousVote) {
        await collection.updateOne(
          { _id: previousVote._id },
          { $set: { current: false } }
        );
      }
      await collection.updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: { current: true, end_date: toDate, super_majority, hidden } }
      );

      console.log(`Vote successfully selected by ${session?.user.email}`);
      res.status(200).json({ message: 'Vote added successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error adding vote' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
