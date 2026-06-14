import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth-options';
import { getEventModel } from '@/lib/events/eventModel';

const ALLOWED_PATCH_FIELDS = [
  'name',
  'description',
  'status',
  'startDate',
  'endDate',
  'prize',
  'metric',
  'bannerImage',
  'ctaLink',
  'audience',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.admin) {
    return res.status(403).json({ success: false, error: 'admin required' });
  }

  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: 'invalid id' });
  }

  try {
    const EventModel = await getEventModel();

    if (req.method === 'GET') {
      const doc = await EventModel.findById(id).lean();
      if (!doc) return res.status(404).json({ success: false, error: 'not found' });
      return res.status(200).json({ success: true, event: doc });
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const body = req.body ?? {};
      const update: Record<string, unknown> = {};
      for (const f of ALLOWED_PATCH_FIELDS) {
        if (body[f] !== undefined) {
          update[f] =
            f === 'startDate' || f === 'endDate'
              ? new Date(body[f])
              : body[f];
        }
      }
      if (Object.keys(update).length === 0) {
        return res.status(400).json({ success: false, error: 'no updatable fields provided' });
      }
      const doc = await EventModel.findByIdAndUpdate(id, update, { new: true }).lean();
      if (!doc) return res.status(404).json({ success: false, error: 'not found' });
      return res.status(200).json({ success: true, event: doc });
    }

    if (req.method === 'DELETE') {
      // Soft-cancel rather than hard-delete: preserves history.
      const doc = await EventModel.findByIdAndUpdate(
        id,
        { status: 'cancelled' },
        { new: true }
      ).lean();
      if (!doc) return res.status(404).json({ success: false, error: 'not found' });
      return res.status(200).json({ success: true, event: doc });
    }

    res.setHeader('Allow', 'GET, PATCH, PUT, DELETE');
    return res.status(405).json({ success: false, error: 'method not allowed' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return res.status(500).json({ success: false, error: msg });
  }
}
