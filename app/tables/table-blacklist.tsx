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
import { Device } from '../../lib/devices-schema';
import { useEffect, useRef, useState } from 'react';
import Modal from 'react-modal';
import { modalStylesWithMinWidth } from '../../lib/modal-styles';
import { FryToken } from '../../lib/tokens-schema';
import { TimeInput } from '@heroui/date-input';
import { Time } from '@internationalized/date';
import { useSession } from 'next-auth/react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/router';

export default function BlacklistTable({
  devices,
  tokens
}: {
  devices: Device[];
  tokens: FryToken[];
}) {
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | undefined>(
    undefined
  );
  const router = useRouter();

  const { data: session } = useSession();

  const isNodeDevice = (device: Device) => {
    return device.name.includes('Node');
  };

  const isRegistrationStaked = (device: Device) => {
    return device.registration && device.registration.amount > 0;
  };

  const isNodeStaked = (device: Device) => {
    return device.node && device.node.amount > 0;
  };

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    let day = date.getDate().toString().padStart(2, '0');
    let month = (date.getMonth() + 1).toString().padStart(2, '0'); // January is 0
    let year = date.getFullYear();
    let hours = date.getHours().toString().padStart(2, '0');
    let minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  return (
    <div>
      {updateSuccess != '' && updateSuccess != 'error' && (
        <Callout
          className="mt-4"
          title="Success"
          icon={CheckCircleIcon}
          color="teal"
        >
          Successfully {updateSuccess} !
        </Callout>
      )}
      {updateSuccess == 'error' && (
        <Callout
          className="mt-4"
          title="Error"
          icon={CheckCircleIcon}
          color="red"
        >
          Error occured during action!
        </Callout>
      )}
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Miner Key / Byod</TableHeaderCell>
            <TableHeaderCell>Infos</TableHeaderCell>
            <TableHeaderCell>Added on </TableHeaderCell>
            <TableHeaderCell>Order</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Address</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {devices.map((device) => (
            <TableRow key={device.id}>
              <TableCell>{device.name}</TableCell>
              <TableCell>
                <Flex
                  flexDirection="col"
                  justifyContent="start"
                  alignItems="start"
                >
                  <Text>Key: {device.miner_key}</Text>
                  <Text>Byod: {device.byod ?? 'No'}</Text>
                </Flex>
              </TableCell>
              <TableCell>
                <Flex
                  flexDirection="col"
                  justifyContent="start"
                  alignItems="start"
                >
                  <Text>Registered: {device.is_registered ? 'Yes' : 'No'}</Text>
                  <Text>Verified: {device.verified ? 'Yes' : 'No'}</Text>
                  {isNodeDevice(device) && (
                    <>
                      <Text>
                        Registration:{' '}
                        {isRegistrationStaked(device) ? 'Yes' : 'No'}
                      </Text>
                      <Text>
                        Verified: {isNodeStaked(device) ? 'Yes' : 'No'}
                      </Text>
                    </>
                  )}
                </Flex>
              </TableCell>
              <TableCell>
                <Text>
                  {device.created_at
                    ? formatDate(device.created_at)
                    : 'Unknown'}
                </Text>
              </TableCell>
              <TableCell>
                <Text>{device.order}</Text>
              </TableCell>
              <TableCell>
                <Text>{device.email}</Text>
              </TableCell>
              <TableCell>
                <Text>{device.address}</Text>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

