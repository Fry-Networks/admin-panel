import mongoose from 'mongoose';
export const fryworldSchema = new mongoose.Schema({
  address: String,
  asset_id: String,
  price: Number,
  txId: String,
  createdAt: Date
});
export interface FryWrold extends mongoose.Document {
  address: string;
  asset_id: string;
  price: number;
  txId: string;
  createdAt: Date;
}

const FryWorldModel = (mongoose.models.fee ||
  mongoose.model<FryWrold>(
    'created-tokens',
    fryworldSchema
  )) as mongoose.Model<FryWrold>;

export default FryWorldModel;
