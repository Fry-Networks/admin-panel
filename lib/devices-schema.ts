import mongoose, { mongo } from 'mongoose';
export const devicesSchema = new mongoose.Schema({
  user_id: mongoose.Schema.Types.ObjectId,
  miner_key: String,
  name: String,
  is_registered: { type: Boolean, default: false },
  email: String,
  order: String,
  registered_at: Date,
  created_at: { type: Date, default: Date.now }
});
export interface Device extends mongoose.Document {
  user_id: mongoose.Schema.Types.ObjectId | string;
  miner_key: string;
  name: string;
  address: string;
  is_registered: boolean;
  registered_at: Date;
  created_at: string;
  order: string;
  byod?: string;
  email: string;
  verified: boolean;
  registration?: {
    asset_id: string;
    amount: number;
  };
  node?: {
    asset_id: string;
    amount: number;
  };
}

const DeviceModel = (mongoose.models.device ||
  mongoose.model<Device>('device', devicesSchema)) as mongoose.Model<Device>;

export default DeviceModel;
