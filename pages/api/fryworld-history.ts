import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '../../lib/mongoclient';

const getNextDay = (endDate: Date): Date => {
  const nextDay = new Date(endDate); // Create a new Date object based on the endDate
  nextDay.setDate(nextDay.getDate() + 1); // Add 1 day to the current date
  return nextDay;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user || !session.user.admin) {
    res.status(401).json({ message: 'Unauthorized user access' });
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db('main');
    const collection = db.collection('created-tokens');

    const { startDate, endDate, filterString, page = 1, limit = 20 } = req.body;


    const pageSize = 20;
    const skip = (Number(page) - 1) * pageSize;

    let query: Record<string, any> = {};

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate as string),
        $lte: getNextDay(new Date(endDate as string))
      };
    } else if (startDate) {
      query.createdAt = {
        $gte: new Date(startDate as string)
      };
    } else if (endDate) {
      query.createdAt = {
        $lte: getNextDay(new Date(endDate as string))
      };
    }

    if (filterString) {
      query = {
        ...query,
        $or: [
          {
            address: {
              $regex: filterString,
              $options: 'i'
            }
          },
          {
            txId: {
              $regex: filterString,
              $options: 'i'
            }
          }
        ]
      };
    }

    const totalCount = await collection.countDocuments({ ...query });


    // 2. Calculate total fee for all documents matching the filters
    const totalFeeResult = await collection
      .aggregate([
        { $match: { ...query } }, // Apply filters
        { $group: { _id: null, totalFee: { $sum: '$price' } } } // Sum the total value
      ])
      .toArray();

    const totalPaymentSum =
      totalFeeResult.length > 0 ? totalFeeResult[0].totalFee : 0;

    const fryworldPayments = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray();

    res
      .status(200)
      .json({ success: true, totalCount, totalPaymentSum, fryworldPayments });
  } catch (error) {
    console.error(`Fry World Payment History Error: ${error}`);
    res.status(500).json({ message: 'Internal Error' });
  }
}
