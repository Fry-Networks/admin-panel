import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '../../lib/mongoclient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.admin) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db('main');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalDevices,
      verifiedDevices,
      blacklisted,
      totalUsers,
      totalByod,
      stakedDevices,
      registeredDevices,
      recentStakes24h,
      activeAnnouncements,
      draftAnnouncements,
      activeVotes,
      totalProducts
    ] = await Promise.all([
      db.collection('devices').countDocuments(),
      db.collection('devices').countDocuments({ verified: true }),
      db.collection('devices').countDocuments({ blacklisted: true }),
      db.collection('users').countDocuments(),
      db.collection('byods').countDocuments(),
      db.collection('devices').countDocuments({ 'staked.amount': { $gt: 0 } }),
      db.collection('devices').countDocuments({ 'registration.amount': { $gt: 0 } }),
      db.collection('devices').countDocuments({ 'staked.time': { $gte: oneDayAgo } }),
      db.collection('announcements').countDocuments({ status: 'published' }),
      db.collection('announcements').countDocuments({ status: 'draft' }),
      db.collection('dao').countDocuments({ active: true }),
      db.collection('products').countDocuments()
    ]);

    res.status(200).json({
      network: { totalDevices, verifiedDevices, blacklisted },
      users: { totalUsers, totalByod },
      staking: { stakedDevices, registeredDevices, recentStakes24h },
      governance: { activeAnnouncements, draftAnnouncements, activeVotes },
      products: { totalProducts }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to load dashboard stats' });
  }
}
