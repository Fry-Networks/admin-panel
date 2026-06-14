import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth-options';
import { getEventModel } from '@/lib/events/eventModel';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.admin) {
    return res.status(403).json({ success: false, error: 'admin required' });
  }

  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: 'invalid id' });
  }

  const body = req.body ?? {};
  const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : '';
  const score =
    body.score === undefined || body.score === null
      ? undefined
      : Number(body.score);
  const prizeTxId =
    typeof body.prizeTxId === 'string' && body.prizeTxId.trim().length > 0
      ? body.prizeTxId.trim()
      : undefined;

  if (!wallet) {
    return res.status(400).json({ success: false, error: 'wallet required' });
  }

  try {
    const EventModel = await getEventModel();
    const declaredBy = session.user?.email ?? session.user?.name ?? 'admin';
    const winner: Record<string, unknown> = {
      wallet,
      declaredAt: new Date(),
      declaredBy,
    };
    if (Number.isFinite(score)) winner.score = score;
    if (prizeTxId) winner.prizeTxId = prizeTxId;

    const doc = await EventModel.findByIdAndUpdate(
      id,
      { winner, status: 'ended' },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ success: false, error: 'not found' });
    return res.status(200).json({ success: true, event: doc });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return res.status(500).json({ success: false, error: msg });
  }
}
