import mongoose from 'mongoose';

export interface ByodUser extends mongoose.Document {
  licenses: { license: string; used: boolean }[];
  payments: { date: Date; price: number };
  address: string;
  email: string;
  algo: boolean;
  fry: boolean;
}
