export interface GasFee {
  _id: string;
  chainId: string;
  appId: number;
  userId: string;
  gasAmount: number;
  gasType: string;
  feePercent: number;
  feeType: string;
  baseAmount: number;
  baseToken?: string;
  feeToken?: string;
  txId: string;
  usdValue?: number;
  createdAt: Date;
}
