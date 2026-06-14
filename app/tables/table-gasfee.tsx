import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge
} from '@tremor/react';
import { GasFee } from '../../lib/gasfee-schema';

const FRY_DECIMALS = 6;
const MICRO_DIVISOR = Math.pow(10, FRY_DECIMALS);

const gasTypeColors: Record<string, string> = {
  stake: 'emerald',
  unstake: 'red',
  claim: 'blue',
  compound: 'purple',
  deposit: 'cyan',
  withdraw: 'orange'
};

const convertFromMicro = (microAmount: number) => {
  if (microAmount === undefined || microAmount === null) return 0;
  return microAmount / MICRO_DIVISOR;
};

const formatFry = (microAmount: number) => {
  const fry = convertFromMicro(microAmount);
  return fry.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }) + ' FRY';
};

const formatUsd = (microAmount: number, fryPrice: number) => {
  const fry = convertFromMicro(microAmount);
  const usd = fry * fryPrice;
  return '$' + usd.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: usd < 0.01 ? 6 : 2
  });
};

export default function GasFeeTable({
  gasFees,
  fryPrice = 0
}: {
  gasFees: GasFee[];
  fryPrice?: number;
}) {
  const truncateString = (str: string, maxLength: number = 12) => {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return `${str.slice(0, 6)}...${str.slice(-4)}`;
  };

  return (
    <div className="mt-5">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Wallet</TableHeaderCell>
            <TableHeaderCell>Fee Amount</TableHeaderCell>
            <TableHeaderCell>USD Value</TableHeaderCell>
            <TableHeaderCell>Base Amount</TableHeaderCell>
            <TableHeaderCell>Fee %</TableHeaderCell>
            <TableHeaderCell>Tx ID</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {gasFees.map((gasFee) => (
            <TableRow key={gasFee._id.toString()}>
              <TableCell>
                {new Date(gasFee.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Badge color={gasTypeColors[gasFee.gasType] || 'gray'}>
                  {gasFee.gasType}
                </Badge>
              </TableCell>
              <TableCell title={gasFee.userId}>
                {truncateString(gasFee.userId)}
              </TableCell>
              <TableCell>{formatFry(gasFee.gasAmount)}</TableCell>
              <TableCell>{formatUsd(gasFee.gasAmount, fryPrice)}</TableCell>
              <TableCell>{formatFry(gasFee.baseAmount)}</TableCell>
              <TableCell>{gasFee.feePercent}%</TableCell>
              <TableCell title={gasFee.txId}>
                {gasFee.txId ? (
                  <a
                    href={`https://explorer.algonode.io/tx/${gasFee.txId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {truncateString(gasFee.txId)}
                  </a>
                ) : (
                  '-'
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
