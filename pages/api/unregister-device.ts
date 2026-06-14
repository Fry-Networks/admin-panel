import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '../../lib/mongoclient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (
    !session ||
    !session.user ||
    (!session.user.owner && !session.user.mods)
  ) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { miner_key } = req.body;

  if (!miner_key) {
    res.status(400).json({ message: 'Missing miner_key parameter' });
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db('main');
    const collection = db.collection('devices');

    const blacklistDevice = await collection.findOne({ miner_key: miner_key });
    if (!blacklistDevice) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    const fieldsToRemove = Object.keys(blacklistDevice).filter(
      (field) =>
        field !== '_id' &&
        field !== 'uer_id' &&
        field !== 'miner_key' &&
        field !== 'name' &&
        field !== 'created_at' &&
        field !== 'order' &&
        field !== '__v'
    );

    if (fieldsToRemove.length > 0) {
      const unsetObj: Record<string, ''> = {};
      fieldsToRemove.forEach((field) => {
        unsetObj[field] = '';
      });

      const result = await collection.updateOne(
        { miner_key: miner_key },
        { $unset: unsetObj }
      );

      if (result.matchedCount <= 0) {
        res
          .status(200)
          .json({ success: false, message: 'Failed to reset device.' });
        return;
      }
    }

    const result = await collection.updateOne(
      { miner_key: miner_key },
      { $set: { is_registered: false } }
    );

    if (result.matchedCount <= 0) {
      res
        .status(200)
        .json({ success: false, message: 'Failed to unregister device.' });
      return;
    }

    res
      .status(200)
      .json({ success: true, message: 'Success to blacklist the device' });
    return;
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
}
