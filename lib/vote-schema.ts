import mongoose from 'mongoose';

export interface Vote extends mongoose.Document {
  end_date: Date;
  total_votes: number;
  createdAt: Date;
  deleted: boolean;
  current: boolean;
  title: string;
  super_majority: boolean;
  description: string;
  votes: [
    {
      id: string;
      option: string;
      description: string;
      title: string;
      votes: number;
      different_people: string[];
    }
  ];
  // Contract vote fields
  contractVoteId?: string;  // hex-encoded 32-byte vote ID
  contractTxId?: string;    // Algorand transaction ID
  startDate?: Date;         // Vote start date (MongoDB only, not on-chain)
  confirmedRound?: number;  // Algorand confirmed round
}

export const voteSchema = new mongoose.Schema({
  end_date: Date,
  total_votes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  deleted: { type: Boolean, default: false },
  super_majority: { type: Boolean, default: false },
  current: { type: Boolean, default: false },
  title: String,
  description: String,
  votes: [
    {
      option: String,
      description: String,
      title: String,
      votes: { type: Number, default: 0 },
      different_people: { type: [String], default: [] }
    }
  ],
  // Contract vote fields
  contractVoteId: { type: String, default: undefined },
  contractTxId: { type: String, default: undefined },
  startDate: { type: Date, default: undefined },
  confirmedRound: { type: Number, default: undefined }
});
