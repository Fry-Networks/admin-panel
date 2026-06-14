import mongoose, { mongo } from 'mongoose';
export const reductionsSchema = new mongoose.Schema({
  minDeviceCount: Number,
  maxDeviceCount: Number,
  reduction: Number
});
export interface Reduction extends mongoose.Document {
  minDeviceCount: number;
  maxDeviceCount: number;
  reduction: number;
}

export const ReductionModel = mongoose.model<Reduction>(
  'reductions',
  reductionsSchema
);
