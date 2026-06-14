import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongoclient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mongoose from 'mongoose';
import { Vote } from '../../lib/vote-schema';

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
      id: string;
      title: string;
      description: string;
      options: { title: string; description: string }[];
    } = req.body;
    const { id, title, description, options } = data;


    try {
      let updatingVote = (await collection.findOne({
        _id: new mongoose.Types.ObjectId(id)
      })) as Vote;


      updatingVote.title = title;
      updatingVote.description = description;
      for (let i = 0; i < updatingVote.votes.length; i++) {
        updatingVote.votes[i].title = options[i].title;
        updatingVote.votes[i].description = options[i].description;
      }


      const result = await collection.updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        {
          $set: {
            title: updatingVote.title,
            description: updatingVote.description,
            votes: updatingVote.votes
          }
        }
      );

      res.status(200).json({ message: 'Vote added successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error adding vote' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
