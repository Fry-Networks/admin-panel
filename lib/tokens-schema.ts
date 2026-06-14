import mongoose from 'mongoose';

export const tokensSchema = new mongoose.Schema({
  name: String,
  asset_id: String
});

export interface FryToken extends mongoose.Document {
  name: string;
  asset_id: string;
}

export const FryTokenModel = mongoose.model<FryToken>('tokens', tokensSchema);
