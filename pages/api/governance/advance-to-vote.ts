import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../../lib/mongoclient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { ObjectId } from 'mongodb';

const FRYBOT_API_URL = 'http://host.docker.internal:3002';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
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
  const { vote_id, voting_days } = req.body;

  if (!vote_id) {
    res.status(400).json({ message: 'vote_id is required' });
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

    if (vote.status !== 'discussion') {
      res.status(400).json({ 
        message: 'Vote must be in discussion status to advance to voting',
        current_status: vote.status
      });
      return;
    }

    // Calculate voting end date (default 7 days)
    const votingDuration = voting_days || 7;
    const voteStart = new Date();
    const voteEnd = new Date(voteStart.getTime() + votingDuration * 24 * 60 * 60 * 1000);

    // Call the bot API to announce voting is open
    const botResponse = await fetch(`${FRYBOT_API_URL}/api/governance/announce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FRYBOT_API_KEY}`
      },
      body: JSON.stringify({
        proposal_id: vote._id.toString(),
        title: vote.title,
        action: 'vote_open',
        thread_id: vote.discussion_thread_id,
        voting_end: voteEnd.toISOString(),
        options: vote.votes.map((v: any, idx: number) => ({
          option: idx.toString(),
          title: v.title,
          description: v.description
        }))
      })
    });

    if (!botResponse.ok) {
      const errorData = await botResponse.json().catch(() => ({}));
      console.error('Bot API error:', errorData);
      // Continue anyway - voting can proceed even if Discord notification fails
    }

    // Update the vote document
    await collection.updateOne(
      { _id: new ObjectId(vote_id) },
      {
        $set: {
          status: 'vote',
          current: true,
          end_date: voteEnd,
          vote_start: voteStart
        }
      }
    );

    res.status(200).json({
      message: 'Successfully advanced to voting phase',
      end_date: voteEnd,
      status: 'vote'
    });
  } catch (error) {
    console.error('Error advancing to vote:', error);
    res.status(500).json({ message: 'Error advancing to voting phase' });
  }
}
