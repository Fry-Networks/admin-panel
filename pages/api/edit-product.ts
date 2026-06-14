import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongoclient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mongoose from 'mongoose';

interface ProductData {
  productId: string;
  unverifiedReward?: string;
  verifiedReward?: string;
  register_token?: string;
  register_price?: string;
  node_token?: string;
  node_price?: string;
  stake_one?: string;
  stake_two?: string;
  // FIP-012: USD amounts for verification stakes
  stake_one_usd?: string;
  stake_two_usd?: string;
  stake_token?: string;
  reward_token?: string;
}
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  // Check if user is authenticated and is an admin
  if (!session || !session.user.admin || !session.user.owner) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const client = await clientPromise;
  const db = client.db('main');
  const collection = db.collection('products');

  if (req.method === 'PUT') {
    const data: ProductData = req.body;
    const {
      productId,
      unverifiedReward,
      verifiedReward,
      node_token,
      node_price,
      stake_one,
      stake_two,
      stake_one_usd,
      stake_two_usd,
      register_token,
      register_price,
      stake_token,
      reward_token
    } = data;


    const existingProduct = await collection.findOne({
      wix_id: productId
    });

    if (!existingProduct) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    try {
      // Construct an update object
      const updateData: any = {};
      if (register_token !== undefined)
        updateData['reward.tokens.register'] = register_token;
      if (register_price !== undefined)
        updateData['reward.stake.register'] = +register_price;
      if (node_token !== undefined)
        updateData['reward.tokens.node'] = node_token;
      if (node_price !== undefined)
        updateData['reward.stake.node'] = +node_price;
      if (unverifiedReward !== undefined)
        updateData['reward.unverified'] = +unverifiedReward;
      if (verifiedReward !== undefined)
        updateData['reward.verified'] = +verifiedReward;
      if (stake_one !== undefined)
        updateData['reward.stake.stake_one'] = +stake_one;
      if (stake_two !== undefined)
        updateData['reward.stake.stake_two'] = +stake_two;
      // FIP-012: USD amounts for verification stakes
      if (stake_one_usd !== undefined)
        updateData['reward.stake.stake_one_usd'] = +stake_one_usd;
      if (stake_two_usd !== undefined)
        updateData['reward.stake.stake_two_usd'] = +stake_two_usd;
      if (stake_token !== undefined)
        updateData['reward.tokens.stake'] = stake_token;
      if (reward_token !== undefined)
        updateData['reward.tokens.reward'] = reward_token;

      // Update the product in the database
      await collection.updateOne({ wix_id: productId }, { $set: updateData });

      res.status(200).json({ message: 'Product updated successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error updating product' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
