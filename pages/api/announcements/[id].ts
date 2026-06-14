import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '../../../lib/mongoclient';
import { ensureObjectId } from '../../../lib/announcements-server';
import { validateAnnouncementPayload } from '../../../lib/announcements-utils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  if (req.method === 'GET') {
    try {
      const doc = await collection.findOne({ _id: announcementId });
      if (!doc) {
        res.status(404).json({ message: 'Announcement not found' });
        return;
      }
      res.status(200).json(JSON.parse(JSON.stringify(doc)));
    } catch (error) {
      console.error('Announcement fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch announcement' });
    }
    return;
  }

  if (req.method === 'PUT') {
    try {
      const existing = await collection.findOne({ _id: announcementId });
      if (!existing) {
        res.status(404).json({ message: 'Announcement not found' });
        return;
      }

      if (existing.status === 'archived') {
        res
          .status(400)
          .json({ message: 'Archived announcements cannot be modified' });
        return;
      }

      const { title, body, variant, priority, publishAt, expiresAt, cta } =
        req.body ?? {};

      const updates = validateAnnouncementPayload(
        { title, body, variant, priority, publishAt, expiresAt, cta },
        {
          requireTitle: false,
          requireBody: false,
          allowStatusChange: false,
          currentPublishAt: existing.publish_at ?? null
        }
      );

      if (!Object.keys(updates).length) {
        res.status(400).json({ message: 'No changes requested' });
        return;
      }

      if (existing.status === 'published') {
        const allowed = new Set(['body', 'cta', 'expires_at']);
        const blocked = Object.keys(updates).filter(
          (field) => !allowed.has(field)
        );
        if (blocked.length) {
          res.status(400).json({
            message:
              'Published announcements can only update body, CTA, or expiry'
          });
          return;
        }
      }

      if (
        updates.publish_at &&
        existing.status !== 'draft' &&
        existing.status !== 'scheduled'
      ) {
        res.status(400).json({
          message: 'Publish date can only be modified for drafts or scheduled'
        });
        return;
      }

      if (
        updates.publish_at &&
        existing.status === 'scheduled' &&
        updates.publish_at <= new Date()
      ) {
        res.status(400).json({
          message:
            'Scheduled announcements must publish in the future. Use publish action to go live.'
        });
        return;
      }

      const updateDoc: Record<string, unknown> = {
        updated_at: new Date(),
        updated_by: session.user.email ?? ''
      };

      if (updates.title !== undefined) updateDoc.title = updates.title;
      if (updates.body !== undefined) updateDoc.body = updates.body;
      if (updates.variant !== undefined) updateDoc.variant = updates.variant;
      if (updates.priority !== undefined)
        updateDoc.priority = updates.priority;
      if ('publish_at' in updates) updateDoc.publish_at = updates.publish_at;
      if ('expires_at' in updates) updateDoc.expires_at = updates.expires_at;
      if (updates.cta !== undefined) updateDoc.cta = updates.cta;

      await collection.updateOne(
        { _id: announcementId },
        { $set: updateDoc }
      );

      const updated = await collection.findOne({ _id: announcementId });
      res.status(200).json(JSON.parse(JSON.stringify(updated)));
    } catch (error) {
      const statusCode =
        (error as Error & { statusCode?: number }).statusCode ?? 500;
      res.status(statusCode).json({ message: (error as Error).message });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
