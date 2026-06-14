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
  const { vote_id } = req.body;

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

    if (vote.discussion_thread_id) {
      res.status(400).json({ message: 'Vote already posted to Discord' });
      return;
    }

    // Calculate discussion period
    const discussionDays = vote.discussion_days || 30;
    const discussionStart = new Date();
    const discussionEnd = new Date(discussionStart.getTime() + discussionDays * 24 * 60 * 60 * 1000);

    // Call the bot API to announce the proposal
    const botResponse = await fetch(`${FRYBOT_API_URL}/api/governance/announce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FRYBOT_API_KEY}`
      },
      body: JSON.stringify({
        proposal_id: vote._id.toString(),
        title: vote.title,
        description: vote.description,
        category: vote.category || 'governance',
        type: vote.type || 'fip',
        action: 'new',
        sequence_number: vote.sequence_number,
        options: vote.votes.map((v: any) => ({
          title: v.title,
          description: v.description
        })),
        discussion_days: discussionDays,
        discussion_end: discussionEnd.toISOString()
      })
    });

    if (!botResponse.ok) {
      const errorData = await botResponse.json().catch(() => ({}));
      res.status(500).json({ 
        message: 'Failed to post to Discord', 
        error: errorData.message || botResponse.statusText 
      });
      return;
    }

    const botData = await botResponse.json();

    // Check if bot actually succeeded (it returns 200 even on failure)
    if (!botData.success) {
      console.error('[Discord] Bot returned failure:', botData);
      res.status(500).json({
        message: 'Failed to post to Discord',
        error: botData.reason || 'Unknown error'
      });
      return;
    }

    // Update the vote document with Discord info
    await collection.updateOne(
      { _id: new ObjectId(vote_id) },
      {
        $set: {
          discussion_thread_id: botData.thread_id,
          discussion_message_id: botData.message_id,
          status: 'discussion',
          discussion_start: discussionStart,
          discussion_end: discussionEnd
        }
      }
    );

    res.status(200).json({
      message: 'Successfully posted to Discord',
      thread_id: botData.thread_id,
      discussion_end: discussionEnd
    });
  } catch (error) {
    console.error('Error posting to Discord:', error);
    res.status(500).json({ message: 'Error posting to Discord' });
  }
}
