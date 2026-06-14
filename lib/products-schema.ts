import mongoose, { mongo } from 'mongoose';
export const productsSchema = new mongoose.Schema({
  wix_id: String,
  name: String,
  key: String,
  reward: {
    unverified: { type: Number, default: 0 },
    verified: { type: Number, default: 0 },
    stake: {
      stake_one: { type: Number, default: 0 },
      stake_two: { type: Number, default: 0 },
      register: { type: Number, default: 0 },
      node: { type: Number, default: 0 },
      // FIP-012: USD amounts for verification stakes
      stake_one_usd: { type: Number, default: 0 },
      stake_two_usd: { type: Number, default: 0 }
    },
    tokens: {
      staked: { type: String },
      reward: { type: String },
      register: { type: String },
      node: { type: String }
    }
  },
  created_at: { type: Date, default: Date.now }
});
export interface Product extends mongoose.Document {
  wix_id: string;
  name: string;
  key: string;
  reward: {
    unverified: number;
    verified: number;
    stake?: {
      stake_one: number;
      stake_two: number;
      node: number;
      register: number;
      // FIP-012: USD amounts for verification stakes
      stake_one_usd?: number;
      stake_two_usd?: number;
    };
    tokens?: {
      stake: string;
      reward: string;
      register: string;
      node: string;
    };
  };
  created_at: Date;
}

export const ProductModel = mongoose.model<Product>('products', productsSchema);
