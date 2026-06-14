import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '../../lib/mongoclient';

const FRY_DECIMALS = 6;
const MICRO_DIVISOR = Math.pow(10, FRY_DECIMALS); // 1,000,000

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
    const db = client.db('frystaking');
    const collection = db.collection('gasFee');

    // Fetch FRY 2.0 price from main database (asset_id: 2485314946)
    const FRY2_ASSET_ID = '2485314946';
    const mainDb = client.db('main');
    const priceDoc = await mainDb.collection('prices').findOne({
      asset_id: FRY2_ASSET_ID
    });
    const fryPrice = priceDoc?.price || 0;

    const { startDate, endDate, filterString, page = 1, limit = 20 } = req.body;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const query: Record<string, any> = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        const parsedEndDate = new Date(endDate as string);
        parsedEndDate.setDate(parsedEndDate.getDate() + 1);
        query.createdAt.$lte = parsedEndDate;
      }
    }

    if (filterString) {
      query.$or = [
        { userId: { $regex: filterString, $options: 'i' } },
        { txId: { $regex: filterString, $options: 'i' } }
      ];
    }

    const totalCount = await collection.countDocuments(query);

    const totalSumResult = await collection
      .aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalGasAmount: { $sum: '$gasAmount' }
          }
        }
      ])
      .toArray();

    const totalGasAmountMicro = totalSumResult.length > 0 ? totalSumResult[0].totalGasAmount : 0;
    const totalFeesFry = totalGasAmountMicro / MICRO_DIVISOR;
    const totalFeesUsd = totalFeesFry * fryPrice;

    const gasFees = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .toArray();

    res.status(200).json({
      success: true,
      totalCount,
      totalPaymentSum: totalFeesUsd,  // Keep for backwards compat with history-filter
      totalFeesFry,
      totalFeesUsd,
      fryPrice,
      gasFees: JSON.parse(JSON.stringify(gasFees))
    });
  } catch (error) {
    console.error(`GasFee History Error: ${error}`);
    res.status(500).json({ message: 'Internal Error' });
  }
}
