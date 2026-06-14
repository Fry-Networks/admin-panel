import mongoose from 'mongoose';
export const rewardSchema = new mongoose.Schema({
  no: Number,
  miner_key: String,
  status: String,
  asset_id: String,
  amount: Number,
  createdAt: Date
});
export interface Reward extends mongoose.Document {
  no: number;
  miner_key: string;
  status: string;
  asset_id: string;
  amount: number;
  createdAt: Date;
}

const RewardModel = (mongoose.models.fee ||
  mongoose.model<Reward>('rewards', rewardSchema)) as mongoose.Model<Reward>;

export default RewardModel;
