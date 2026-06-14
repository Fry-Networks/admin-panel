import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '../../lib/mongoclient';
import { Reduction } from '../../lib/reductions-schema';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user.admin || !session.user.owner) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (req.method !== 'PUT') {
    res
      .status(405)
      .json({ success: false, message: 'Only PUT method is allowed' });
    return;
  }

  const { index, updatedData } = req.body;
  if (typeof index !== 'number' || index < 0 || !updatedData) {
    res.status(400).json({ success: false, message: 'Invalid index value' });
    return;
  }

  const client = await clientPromise;

  try {
    const db = client.db('main');
    const collection = db.collection('reductions');

    const targetDocument = await collection
      .find()
      .sort({ _id: 1 })
      .skip(index)
      .limit(1)
      .toArray();


    if (targetDocument.length === 0) {
      res.status(404).json({
        success: false,
        message: `No document found at index: ${index}`
      });
      return;
    }

    const updateResult = await collection.updateOne(
      { _id: targetDocument[0]._id },
      {
        $set: {
          minDeviceCount: updatedData.minDeviceCount,
          maxDeviceCount: updatedData.maxDeviceCount,
          reduction: updatedData.reduction
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      res.status(500).json({
        success: false,
        message: `Reduction update failed`
      });
      return;
    }


    if (index > 0) {
      const prevDocument = await collection
        .find()
        .sort({ _id: 1 })
        .skip(index - 1)
        .limit(1)
        .toArray();

      if (prevDocument.length === 0) {
        res.status(404).json({
          success: false,
          message: `No document found at index: ${index - 1}`
        });
      }

      if (updatedData.minDeviceCount != prevDocument[0].maxDeviceCount) {
        const updateResult = await collection.updateOne(
          { _id: prevDocument[0]._id },
          {
            $set: {
              maxDeviceCount: updatedData.minDeviceCount - 1
            }
          }
        );

        if (updateResult.modifiedCount === 0) {
          res.status(500).json({
            success: false,
            message: `Reduction update failed`
          });
          return;
        }

      }
    }

    const documentCount = await collection.countDocuments();
    if (index < documentCount - 1) {
      const nextDocument = await collection
        .find()
        .sort({ _id: 1 })
        .skip(index + 1)
        .limit(1)
        .toArray();

      if (nextDocument.length === 0) {
        res.status(404).json({
          success: false,
          message: `No document found at index: ${index - 1}`
        });
      }

      if (nextDocument[0].minDeviceCount !== updatedData.maxDeviceCount) {
        const updateResult = await collection.updateOne(
          { _id: nextDocument[0]._id },
          {
            $set: {
              minDeviceCount: updatedData.maxDeviceCount + 1
            }
          }
        );

        if (updateResult.modifiedCount === 0) {
          res.status(500).json({
            success: false,
            message: `Reduction update failed`
          });
          return;
        }
      }
    }

    res.status(200).json({ success: true, message: `Reduction updated` });
  } catch (err: unknown) {
    console.error('Error deleting or updating data:', err);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: (err as Error).message || 'Unknown error'
    });
  }
}
