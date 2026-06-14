import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import type { Sort } from 'mongodb';
import clientPromise from '../../../lib/mongoclient';
import {
  validateAnnouncementPayload,
  parseDateInput
} from '../../../lib/announcements-utils';

function parsePagination(value: unknown, defaultValue: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultValue;
  }
  return Math.floor(parsed);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.admin) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const client = await clientPromise;
  const db = client.db('main');
  const collection = db.collection('announcements');

  if (req.method === 'GET') {
    try {
      const {
        page = '1',
        pageSize = '20',
        status,
        search,
        publishedFrom,
        publishedTo,
        includeArchived,
        sort = 'priority',
        direction = 'desc'
      } = req.query;

      const pageNumber = Math.max(parsePagination(page, 1), 1);
      const limit = Math.min(parsePagination(pageSize, 20), 100);
      const skip = (pageNumber - 1) * limit;

      const filter: Record<string, unknown> = {};

      if (typeof status === 'string' && status.trim()) {
        const statusList = status
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        if (statusList.length) {
          filter.status = { $in: statusList };
        }
      } else if (!includeArchived) {
        filter.status = { $ne: 'archived' };
      }

      if (typeof search === 'string' && search.trim()) {
        const q = search.trim();
        filter.$or = [
          { title: { $regex: q, $options: 'i' } },
          { body: { $regex: q, $options: 'i' } }
        ];
      }

      const publishFrom = parseDateInput(publishedFrom);
      const publishTo = parseDateInput(publishedTo);
      if (publishFrom || publishTo) {
        filter.publish_at = {};
        if (publishFrom) {
          (filter.publish_at as Record<string, unknown>).$gte = publishFrom;
        }
        if (publishTo) {
          (filter.publish_at as Record<string, unknown>).$lte = publishTo;
        }
      }

      const sortDirection: 1 | -1 = direction === 'asc' ? 1 : -1;
      const sortSpec: Sort =
        sort === 'updated_at'
          ? { updated_at: sortDirection }
          : sort === 'publish_at'
          ? { publish_at: sortDirection, priority: -1 }
          : { priority: sortDirection, publish_at: -1, created_at: -1 };

      const [items, total] = await Promise.all([
        collection
          .find(filter)
          .sort(sortSpec)
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(filter)
      ]);

      res.status(200).json({
        items: JSON.parse(JSON.stringify(items)),
        total,
        page: pageNumber,
        pageSize: limit
      });
    } catch (error) {
      console.error('Announcements list error:', error);
      res.status(500).json({ message: 'Failed to load announcements' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const { title, body, variant, priority, publishAt, expiresAt, cta } =
        req.body ?? {};

      const validated = validateAnnouncementPayload(
        {
          title,
          body,
          variant,
          priority,
          publishAt,
          expiresAt,
          cta
        },
        {
          requireTitle: true,
          requireBody: true,
          allowStatusChange: false
        }
      );

      const now = new Date();
      let publishAtValue = validated.publish_at ?? null;
      const expiresAtValue = validated.expires_at ?? null;
      const status =
        publishAtValue && publishAtValue > now ? 'scheduled' : 'draft';

      if (status === 'scheduled' && !publishAtValue) {
        publishAtValue = now;
      }

      const doc = {
        title: validated.title!,
        body: validated.body!,
        variant: validated.variant ?? 'info',
        priority: validated.priority ?? 0,
        status,
        publish_at: publishAtValue,
        expires_at: expiresAtValue,
        cta: validated.cta ?? null,
        audience: 'all',
        created_at: now,
        updated_at: now,
        created_by: session.user?.email ?? '',
        updated_by: session.user?.email ?? ''
      };

      const result = await collection.insertOne(doc);

      res.status(201).json({
        message: 'Announcement created',
        id: result.insertedId.toString(),
        announcement: { ...doc, _id: result.insertedId }
      });
    } catch (error) {
      const statusCode =
        (error as Error & { statusCode?: number }).statusCode ?? 500;
      res.status(statusCode).json({ message: (error as Error).message });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
