import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth-options';
import { getEventModel } from '@/lib/events/eventModel';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: 'invalid id' });
  }

  try {
    const EventModel = await getEventModel();

    if (req.method === 'GET') {
      // GET leaderboard is public (mirrors dashb behavior).
      const doc = await EventModel.findById(id, { leaderboard: 1, metric: 1 }).lean();
      if (!doc) return res.status(404).json({ success: false, error: 'not found' });
      return res
        .status(200)
        .json({ success: true, leaderboard: (doc as { leaderboard?: unknown[] }).leaderboard ?? [] });
    }

    if (req.method === 'POST') {
      const session = await getServerSession(req, res, authOptions);
      if (!session?.user?.admin) {
        return res.status(403).json({ success: false, error: 'admin required' });
      }

      const event = await EventModel.findById(id);
      if (!event) return res.status(404).json({ success: false, error: 'not found' });

      // Manual metric only for v1.
      if ((event as { metric?: { type?: string } }).metric?.type !== 'manual') {
        return res.status(400).json({ success: false, error: 'manual leaderboard editing requires metric.type=manual' });
      }

      const body = req.body ?? {};
      const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : '';
      const score = typeof body.score === 'number' ? body.score : Number(body.score);
      if (!wallet) return res.status(400).json({ success: false, error: 'wallet required' });
      if (!Number.isFinite(score)) return res.status(400).json({ success: false, error: 'score must be a number' });

      const lb = (event as unknown as { leaderboard: Array<{ wallet: string; score: number; lastCalculated?: Date; source?: string }> }).leaderboard ?? [];
      const idx = lb.findIndex((e) => e.wallet === wallet);
      const entry = {
        wallet,
        score,
        lastCalculated: new Date(),
        source: 'manual' as const,
      };
      if (idx >= 0) {
        lb[idx] = entry;
      } else {
        lb.push(entry);
      }
      (event as unknown as { leaderboard: typeof lb }).leaderboard = lb;
      await event.save();
      return res.status(200).json({ success: true, leaderboard: lb });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, error: 'method not allowed' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return res.status(500).json({ success: false, error: msg });
  }
}
