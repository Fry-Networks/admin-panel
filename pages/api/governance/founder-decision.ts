import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../../lib/mongoclient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { ObjectId } from 'mongodb';

const FRYBOT_API_URL = 'http://host.docker.internal:3002';

const VALID_DECISIONS = ['approved', 'vetoed', 'returned'] as const;
type FounderDecision = typeof VALID_DECISIONS[number];

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
  const { cfip_id, decision, reason } = req.body;

  if (!cfip_id) {
    res.status(400).json({ message: 'cfip_id is required' });
    return;
  }

  if (!decision) {
    res.status(400).json({ message: 'decision is required' });
    return;
  }

  if (!VALID_DECISIONS.includes(decision as FounderDecision)) {
    res.status(400).json({ 
      message: `Invalid decision. Must be one of: ${VALID_DECISIONS.join(', ')}` 
    });
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db('main');
    const collection = db.collection(testMode ? 'test-dao' : 'dao');

    const cfip = await collection.findOne({ _id: new ObjectId(cfip_id) });

    if (!cfip) {
      res.status(404).json({ message: 'cFIP not found' });
      return;
    }

    if (cfip.type !== 'cfip') {
      res.status(400).json({ message: 'This endpoint is only for cFIP proposals' });
      return;
    }

    if (cfip.status !== 'founder_review') {
      res.status(400).json({ 
        message: 'cFIP must be in founder_review status',
        current_status: cfip.status
      });
      return;
    }

    // Determine new status based on decision
    let newStatus: string;
    let notifyAction: string;

    switch (decision) {
      case 'approved':
        newStatus = 'approved';
        notifyAction = 'cfip_approved';
        break;
      case 'vetoed':
        newStatus = 'vetoed';
        notifyAction = 'cfip_vetoed';
        break;
      case 'returned':
        newStatus = 'discussion';
        notifyAction = 'cfip_returned';
        break;
      default:
        newStatus = cfip.status;
        notifyAction = '';
    }

    // Call the bot API to notify about the decision
    if (notifyAction) {
      const botResponse = await fetch(`${FRYBOT_API_URL}/api/governance/announce`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FRYBOT_API_KEY}`
        },
        body: JSON.stringify({
          proposal_id: cfip._id.toString(),
          title: cfip.title,
          action: notifyAction,
          thread_id: cfip.discussion_thread_id,
          reason: reason || '',
          decision: decision
        })
      });

      if (!botResponse.ok) {
        const errorData = await botResponse.json().catch(() => ({}));
        console.error('Bot API error:', errorData);
        // Continue anyway - the decision should be recorded even if notification fails
      }
    }

    // Create status history entry
    const historyEntry = {
      from: 'founder_review',
      to: newStatus,
      decision: decision,
      reason: reason || '',
      at: new Date(),
      by: session?.user?.email || 'unknown'
    };

    // Update the cFIP document
    await collection.updateOne(
      { _id: new ObjectId(cfip_id) },
      {
        $set: {
          status: newStatus,
          founder_decision: decision,
          founder_decision_reason: reason || '',
          founder_decision_at: new Date(),
          founder_decision_by: session?.user?.email || 'unknown'
        },
        $push: {
          status_history: historyEntry
        } as any
      }
    );

    res.status(200).json({
      message: `cFIP ${decision} successfully`,
      new_status: newStatus,
      decision: decision
    });
  } catch (error) {
    console.error('Error processing founder decision:', error);
    res.status(500).json({ message: 'Error processing founder decision' });
  }
}
