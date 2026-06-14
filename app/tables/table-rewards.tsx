import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
  Flex,
  Button,
  Select,
  SelectItem,
  NumberInput,
  TextInput,
  DatePicker,
  Callout
} from '@tremor/react';
import { webUser } from '../../lib/webusers-model';
import { User } from '../../lib/users-schema';
import { useEffect, useRef, useState } from 'react';
import Modal from 'react-modal';
import { modalStylesWithMinWidth } from '../../lib/modal-styles';
import { TimeInput } from '@heroui/date-input';
import { Time } from '@internationalized/date';
import { useSession } from 'next-auth/react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/router';
import { Fee } from '../../lib/fee-schema';
import { FryToken } from '../../lib/tokens-schema';
import { Reward } from '../../lib/reward-schema';

export default function RewardsTable({
  rewards,
  tokens
}: {
  rewards: Reward[];
  tokens: FryToken[];
}) {
  const getTokenNameById = (assetId: string) => {
    if (!tokens || tokens.length <= 0) {
      return assetId;
    }

    const token = tokens.find((token) => {
      return token.asset_id === assetId;
    });

    if (!token) {
      return assetId;
    }

    return token?.name;
  };

  return (
    <div className="mt-5">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Miner Key</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Token Name</TableHeaderCell>
            <TableHeaderCell>Amount</TableHeaderCell>
            <TableHeaderCell>Created Date</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rewards.map((reward) => (
            <TableRow key={reward.id}>
              <TableCell>{reward.miner_key}</TableCell>
              <TableCell>{reward.status}</TableCell>
              <TableCell>{getTokenNameById(reward.asset_id)}</TableCell>
              <TableCell>{reward.amount}</TableCell>
              <TableCell>{new Date(reward.createdAt).toDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

