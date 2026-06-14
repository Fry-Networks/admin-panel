import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '../../../../lib/mongoclient';
import { ensureObjectId } from '../../../../lib/announcements-server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.admin) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    res.status(400).json({ message: 'Announcement id is required' });
    return;
  }

  let announcementId;
  try {
    announcementId = ensureObjectId(id);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
    return;
  }

  const client = await clientPromise;
  const db = client.db('main');
  const collection = db.collection('announcements');

  try {
    const existing = await collection.findOne({ _id: announcementId });
    if (!existing) {
      res.status(404).json({ message: 'Announcement not found' });
      return;
    }

    if (existing.status === 'archived') {
      res.status(200).json(JSON.parse(JSON.stringify(existing)));
      return;
    }

    const now = new Date();
    const forceRemove = req.body?.forceRemove ?? true;

    const updateDoc: Record<string, unknown> = {
      status: 'archived',
      updated_at: now,
      updated_by: session.user.email ?? ''
    };

    if (forceRemove) {
      updateDoc.expires_at = now;
    }

    await collection.updateOne(
      { _id: announcementId },
      {
        $set: updateDoc
      }
    );

    const updated = await collection.findOne({ _id: announcementId });
    res.status(200).json(JSON.parse(JSON.stringify(updated)));
  } catch (error) {
    console.error('Archive announcement error:', error);
    res.status(500).json({ message: 'Failed to archive announcement' });
  }
}
