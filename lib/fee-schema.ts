import mongoose from 'mongoose';
// Reward boost ledger schema (server-side only).
export const feeSchema = new mongoose.Schema({
  reward_no: [Number],
  miner_key: String,
  address: String,
  fee_amount: Number,
  asset_id: String,
  price: Number,
  createdAt: { type: Date },
  txID: String
});
export interface Fee extends mongoose.Document {
  miner_key: string;
  address: string;
  rewards_no: number[];
  fee_amount: number;
  asset_id: string;
  price: number;
  createdAt: Date;
  txID: string;
}

const FeeModel = (mongoose.models.fee ||
  mongoose.model<Fee>('reward-boosts', feeSchema)) as mongoose.Model<Fee>;

export default FeeModel;
