import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text
} from '@tremor/react';
import Link from 'next/link';
import { webUser } from '../../lib/webusers-model';
import { User } from '../../lib/users-schema';
import { Device } from '../../lib/devices-schema';
import { AirAccount } from '../../lib/air_accounts';
import { Fragment } from 'react';
export default function WaterAccountsTable({ accounts }: { accounts: any[] }) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Type</TableHeaderCell>
          <TableHeaderCell>Data</TableHeaderCell>
          <TableHeaderCell>Devices</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {accounts.map((account) => (
          <TableRow key={account.id}>
            <TableCell>{account.api_type}</TableCell>
            <TableCell>
            {[
    { key: 'API Key', value: account?.api_key },
    { key: 'Read Key', value: account?.read_key },
    { key: 'Main', value: account?.show },
  ].filter(item => Boolean(item.value)).map((item, index, arr) => (
    <Fragment key={index}>
      <span>{item.key}: {item.value}</span>
      {index < arr.length - 1 && <br />}
    </Fragment>
  ))}
            </TableCell>
            <TableCell>
              <Text>{account.devices?.length ?? "No devices"}</Text>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
