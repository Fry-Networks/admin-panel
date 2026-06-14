import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '../../lib/mongoclient';

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
    const collection = db.collection('byods');

    const { startDate, endDate, filterString, page = 1, limit = 20 } = req.body;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Build match conditions for filtering payments
    const matchConditions = [];
    if (startDate) {
      const parsedStartDate = new Date(startDate as string);
      matchConditions.push({ $gte: ['$$payment.date', parsedStartDate] });
    }
    if (endDate) {
      const parsedEndDate = new Date(endDate as string);
      matchConditions.push({ $lte: ['$$payment.date', parsedEndDate] });
    }

    const aggregationPipeline: any[] = [];

    // Apply email filter if filterString exists
    if (filterString) {
      aggregationPipeline.push({
        $match: {
          email: { $regex: filterString, $options: 'i' } // Case-insensitive regex match
        }
      });
    }

    aggregationPipeline.push(
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          address: 1, // Include address field
          licenses: 1, // Include licenses if needed
          payments: {
            $filter: {
              input: '$payments',
              as: 'payment',
              cond: matchConditions.length > 0 ? { $and: matchConditions } : {} // ✅ Fix: If no date filters, keep all payments
            }
          }
        }
      },
      { $unwind: { path: '$payments' } }, // ✅ Fix: Keep documents even if payments is empty
      {
        $facet: {
          totalCount: [{ $count: 'total' }], // Count all filtered records
          totalPaymentSum: [
            {
              $group: {
                _id: null,
                totalSum: { $sum: '$payments.price' }
              }
            }
          ],
          results: [
            { $sort: { 'payments.date': -1 } },
            { $skip: skip }, // Pagination - skip previous pages
            { $limit: limitNumber } // Limit results per page
          ]
        }
      }
    );

    const [data] = await collection.aggregate(aggregationPipeline).toArray();

    const totalCount =
      data.totalCount.length > 0 ? data.totalCount[0].total : 0;
    const totalPaymentSum =
      data.totalPaymentSum.length > 0 ? data.totalPaymentSum[0].totalSum : 0;
    const results = data.results;

    res
      .status(200)
      .json({ success: true, totalCount, totalPaymentSum, results });
  } catch (error) {
    console.error(`Byod Payment History Error: ${error}`);
    res.status(500).json({ message: 'Internal Error' });
  }
}
