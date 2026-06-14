import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '../../../../lib/mongoclient';
import { ensureObjectId } from '../../../../lib/announcements-server';
import { parseDateInput } from '../../../../lib/announcements-utils';

const HIGH_PRIORITY_THRESHOLD = 80;

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
      res
        .status(400)
        .json({ message: 'Archived announcements cannot be published' });
      return;
    }

    const { publishAt, expiresAt, confirmHighPriority } = req.body ?? {};
    const now = new Date();

    const requestedPublishAt = parseDateInput(publishAt) ?? now;
    const effectivePublishAt =
      requestedPublishAt < now ? now : requestedPublishAt;
    const requestedExpiry = parseDateInput(expiresAt);
    const expiryProvided =
      req.body && Object.prototype.hasOwnProperty.call(req.body, 'expiresAt');

    if (
      expiryProvided &&
      requestedExpiry &&
      requestedExpiry <= effectivePublishAt
    ) {
      res
        .status(400)
        .json({ message: 'Expiry must be after the publish timestamp' });
      return;
    }

    const requiresConfirmation =
      (existing.priority ?? 0) >= HIGH_PRIORITY_THRESHOLD ||
      existing.variant === 'error' ||
      existing.variant === 'critical';

    if (requiresConfirmation && !confirmHighPriority) {
      res.status(412).json({
        message:
          'Publishing high-priority or critical announcements requires explicit confirmation'
      });
      return;
    }

    const status = effectivePublishAt > now ? 'scheduled' : 'published';

    const updateDoc: Record<string, unknown> = {
      status,
      publish_at: effectivePublishAt,
      updated_at: now,
      updated_by: session.user.email ?? ''
    };

    if (expiryProvided) {
      updateDoc.expires_at = requestedExpiry;
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
    console.error('Publish announcement error:', error);
    res.status(500).json({ message: 'Failed to publish announcement' });
  }
}
