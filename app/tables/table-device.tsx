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

export default function DevicesTable({
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUnregisterModal, setShowUnregisterModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | undefined>(
    undefined
  );
  const router = useRouter();

  const stakeTerms = ['Verification', 'Registration', 'Node'];
  const refundTerms = ['stake', 'reward'];
  const [stakeTermsValue, setStakeTermsValue] = useState('Verification');
  const [refundTermValue, setRefundTermValue] = useState('stake');
  const [assetId, setAssetId] = useState(
    tokens && tokens.length > 0 ? tokens[0].asset_id : ''
  );
  const [stakeType, setStakeType] = useState('one');
  const [stakeAmount, setStakeAmount] = useState(1);
  const [refundAmount, setRefundAmount] = useState(1);
  const [txId, setTxId] = useState('');
  const [stakeDate, setStakeDate] = useState(new Date(Date.now()));
  const { data: session } = useSession();
  const [errorMessage, setErrorMessage] = useState('');

  const isNodeDevice = (device: Device) => {
    const name = device.name?.toLowerCase() ?? '';
    return name.includes('node');
  };

  const isAemDevice = (device: Device) => {
    const name = device.name?.toLowerCase() ?? '';
    return name.includes('aem') || name.includes('ai edge');
  };

  const isRegistrationStaked = (device: Device) => {
    return device.registration && device.registration.amount > 0;
  };

  const isNodeStaked = (device: Device) => {
    return device.node && device.node.amount > 0;
  };

  //Reset values for Stake Modal
  useEffect(() => {
    if (showRefundModal) {
      return;
    }

    setStakeTermsValue('Verification');
    setStakeType('one');
    setStakeAmount(1);
    setTxId('');
    setRefundAmount(1);
    setRefundTermValue('stake');
    setErrorMessage('');
  }, [showVerifyModal, showUnstakeModal, showRefundModal, showBlacklistModal]);

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    let day = date.getDate().toString().padStart(2, '0');
    let month = (date.getMonth() + 1).toString().padStart(2, '0'); // January is 0
    let year = date.getFullYear();
    let hours = date.getHours().toString().padStart(2, '0');
    let minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  const handleStake = async () => {
    const modifyDevice = { ...selectedDevice };
    let saveData: any = {};

    switch (stakeTermsValue) {
      case 'Verification':
        {
          saveData.action = 'verification';
          saveData.stake_type = stakeType;
        }
        break;
      case 'Registration':
        {
          saveData.action = 'registration';
        }
        break;
      case 'Node':
        {
          saveData.action = 'node';
        }
        break;
    }

    saveData.miner_key = modifyDevice.miner_key;
    saveData.amount = stakeAmount;
    saveData.asset_id = assetId;
    saveData.txId = txId;

    const response = await fetch('api/stake-device', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(saveData)
    });

    if (!response.ok) {
      // console.log('Failed to update data');
      setUpdateSuccess('error');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3_000);
    } else {
      setUpdateSuccess('Update success');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3_000);
      // console.log('Success to update data');
    }
  };

  const handleBlacklist = async () => {
    const aimedDevice = { ...selectedDevice };
    const response = await fetch('api/blacklist-device', {
      method: 'POST',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({ miner_key: aimedDevice.miner_key })
    });

    if (!response.ok) {
      setUpdateSuccess('error');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3_000);
      return;
    }

    const result = await response.json();
    if (!result.success) {
      setUpdateSuccess('error');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3_000);
      return;
    }

    setUpdateSuccess(result.message);
    setTimeout(() => {
      setUpdateSuccess('');
      router.reload();
    }, 3_000);

    setShowBlacklistModal(false);
  };

  const handleDelete = async () => {
    const aimedDevice = { ...selectedDevice };
    const response = await fetch('api/delete-device', {
      method: 'POST',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({ miner_key: aimedDevice.miner_key })
    });

    if (!response.ok) {
      setUpdateSuccess('error');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3_000);
      return;
    }

    const result = await response.json();
    if (!result.success) {
      setUpdateSuccess('error');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3_000);
      return;
    }

    setUpdateSuccess(result.message);
    setTimeout(() => {
      setUpdateSuccess('');
      router.reload();
    }, 3_000);

    setShowDeleteModal(false);
  };

  const handleUnregister = async () => {
    const aimedDevice = { ...selectedDevice };
    const response = await fetch('api/unregister-device', {
      method: 'POST',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({ miner_key: aimedDevice.miner_key })
    });

    if (!response.ok) {
      setUpdateSuccess('error');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3_000);
      return;
    }

    const result = await response.json();
    if (!result.success) {
      setUpdateSuccess('error');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3_000);
      return;
    }

    setUpdateSuccess(result.message);
    setTimeout(() => {
      setUpdateSuccess('');
      router.reload();
    }, 3_000);

    setShowUnregisterModal(false);
  };

  const handleUnstake = async () => {
    const modifyDevice = { ...selectedDevice };
    let saveData: any = {};

    switch (stakeTermsValue) {
      case 'Verification':
        {
          saveData.action = 'verification';
        }
        break;
      case 'Registration':
        {
          saveData.action = 'registration';
        }
        break;
      case 'Node':
        {
          saveData.action = 'node';
        }
        break;
    }

    saveData.miner_key = modifyDevice.miner_key;

    const response = await fetch('api/unstake-device', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(saveData)
    });

    if (!response.ok) {
      // console.log('Failed to update data');
      setUpdateSuccess('error');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3_000);
    } else {
      setUpdateSuccess('Update success');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3_000);
      // console.log('Success to update data');
    }
  };

  const handleRefund = async () => {
    const aimDevice = { ...selectedDevice };

    if (!aimDevice.address || !aimDevice.is_registered) {
      setUpdateSuccess('error');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3_000);
      return;
    }

    const response = await fetch('api/refund-device', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address: aimDevice.address,
        refundFrom: refundTermValue,
        assetId: assetId,
        amount: refundAmount,
        miner_key: aimDevice.miner_key
      })
    });

    let payload: any = {};
    try {
      payload = await response.json();
    } catch (err) {
      payload = {};
    }

    if (!response.ok) {
      setUpdateSuccess('error');
      setErrorMessage(
        payload?.message || `Refund failed with status ${response.status}`
      );
      setTimeout(() => {
        setUpdateSuccess('');
        setErrorMessage('');
      }, 3_000);

      return;
    }

    if (!payload.success) {
      setUpdateSuccess('error');
      setErrorMessage(payload?.message || 'Failed to process refund');
      setTimeout(() => {
        setUpdateSuccess('');
        setErrorMessage('');
      }, 3_000);

      return;
    }

    setUpdateSuccess('Successfully refund specific amount of tokens to user');
    setErrorMessage('');
    setTimeout(() => {
      setUpdateSuccess('');
    }, 3_000);
  };

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
          {errorMessage || 'Error occured during action!'}
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
            {session &&
              session.user &&
              (session.user.owner || session.user.mods) && (
                <TableHeaderCell>Action</TableHeaderCell>
              )}
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
                  {(isNodeDevice(device) || isAemDevice(device)) && (
                    <Text>
                      Staked for Reg:{' '}
                      {isRegistrationStaked(device) ? 'Yes' : 'No'}
                    </Text>
                  )}
                  {isNodeDevice(device) && (
                    <Text>
                      Staked for Node Op: {isNodeStaked(device) ? 'Yes' : 'No'}
                    </Text>
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
              {session &&
                session.user &&
                (session.user.owner || session.user.mods) && (
                  <TableCell>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedDevice(device);
                        setShowVerifyModal(true);
                      }}
                    >
                      Stake
                    </Button>
                    <Button
                      variant="secondary"
                      className="text-yellow-700 border-yellow-700 hover:bg-yellow-50 hover:text-yellow-700 ml-1"
                      onClick={() => {
                        setSelectedDevice(device);
                        setShowUnstakeModal(true);
                      }}
                    >
                      Unstake
                    </Button>
                    <Button
                      variant="secondary"
                      className="text-red-700 border-red-700 hover:bg-red-50 hover:text-red-700 ml-1"
                      onClick={() => {
                        setSelectedDevice(device);
                        setShowRefundModal(true);
                      }}
                    >
                      Refund
                    </Button>
                    {(session.user.owner || session.user.mods) && (
                      <Button
                        variant="secondary"
                        className="text-gray-200 border-gray-700 hover:bg-gray-800 hover:text-gray-200 ml-1"
                        onClick={() => {
                          setSelectedDevice(device);
                          setShowBlacklistModal(true);
                        }}
                      >
                        BlackList
                      </Button>
                    )}
                    {(session.user.owner || session.user.mods) && (
                      <Button
                        variant="secondary"
                        className="text-purple-700 border-purple-700 hover:bg-purple-50 hover:text-purple-700 ml-1"
                        onClick={() => {
                          setSelectedDevice(device);
                          setShowDeleteModal(true);
                        }}
                      >
                        Delete
                      </Button>
                    )}
                    {(session.user.owner || session.user.mods) && (
                      <Button
                        variant="secondary"
                        className="text-green-700 border-green-700 hover:bg-green-50 hover:text-green-700 ml-1"
                        onClick={() => {
                          setSelectedDevice(device);
                          setShowUnregisterModal(true);
                        }}
                      >
                        Unregister
                      </Button>
                    )}
                  </TableCell>
                )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {selectedDevice !== undefined && (
        <>
          <Modal
            isOpen={showVerifyModal}
            closeTimeoutMS={500}
            style={modalStylesWithMinWidth}
            contentLabel="Delete Reduction"
          >
            <Flex flexDirection="col" className="gap-2 w-full">
              <h2>
                <strong>Stake Device</strong>
              </h2>
              <div className="w-full">
                <label>Stake Terms:</label>
                <Select
                  defaultValue={stakeTermsValue}
                  onValueChange={(value) => {
                    setStakeTermsValue(value);
                  }}
                >
                  {stakeTerms.map((value, index) => {
                    return (
                      <SelectItem key={index + 1} value={value}>
                        {value}
                      </SelectItem>
                    );
                  })}
                </Select>
              </div>
              {stakeTermsValue === 'Verification' && (
                <div className="w-full">
                  <label>Stake Type:</label>
                  <Select
                    defaultValue={stakeType}
                    onValueChange={(value) => setStakeType(value)}
                  >
                    <SelectItem key={0} value="one">
                      One
                    </SelectItem>
                    <SelectItem key={1} value="two">
                      Two
                    </SelectItem>
                  </Select>
                </div>
              )}
              {tokens && (
                <div className="w-full">
                  <label>Stake Token:</label>
                  <Select
                    defaultValue={assetId}
                    onValueChange={(value) => {
                      // console.log(value);
                      setAssetId(value);
                    }}
                  >
                    {tokens.map((value, index) => {
                      return (
                        <SelectItem key={index + 1} value={value.asset_id}>
                          {value.name}
                        </SelectItem>
                      );
                    })}
                  </Select>
                </div>
              )}
              <div className="w-full">
                <label>Staking Amount:</label>
                <NumberInput
                  step={1}
                  defaultValue={1}
                  value={stakeAmount}
                  min={1}
                  onValueChange={(value) => setStakeAmount(value)}
                  placeholder="Please input stake amount"
                />
              </div>
              <div className="w-full">
                <label>TxId:</label>
                <TextInput
                  type="text"
                  placeholder="Please input transaction id"
                  value={txId}
                  onValueChange={(value) => setTxId(value)}
                />
              </div>
              <div>
                <Flex className="gap-2">
                  <Button
                    onClick={() => {
                      setShowVerifyModal(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => handleStake()}>Stake</Button>
                </Flex>
              </div>
            </Flex>
          </Modal>
          <Modal
            isOpen={showUnstakeModal}
            closeTimeoutMS={500}
            style={modalStylesWithMinWidth}
            contentLabel="Delete Reduction"
          >
            <Flex flexDirection="col" className="gap-2 w-full">
              <h2>
                <strong>Stake Device</strong>
              </h2>
              <div className="w-full">
                <label>Stake Terms:</label>
                <Select
                  defaultValue={stakeTermsValue}
                  onValueChange={(value) => {
                    setStakeTermsValue(value);
                  }}
                >
                  {stakeTerms.map((value, index) => {
                    return (
                      <SelectItem key={index + 1} value={value}>
                        {value}
                      </SelectItem>
                    );
                  })}
                </Select>
              </div>
              <div>
                <Flex className="gap-2">
                  <Button
                    onClick={() => {
                      setShowUnstakeModal(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => handleUnstake()}>Unstake</Button>
                </Flex>
              </div>
            </Flex>
          </Modal>
          <Modal
            isOpen={showRefundModal}
            closeTimeoutMS={500}
            style={modalStylesWithMinWidth}
            contentLabel="Refund"
          >
            <Flex flexDirection="col" className="gap-2 w-full">
              <h2>
                <strong>Refund to Device</strong>
              </h2>
              <div className="w-full">
                <label>Refund Terms:</label>
                <Select
                  defaultValue={refundTermValue}
                  onValueChange={(value) => {
                    setRefundTermValue(value);
                  }}
                >
                  {refundTerms.map((value, index) => {
                    return (
                      <SelectItem key={index + 1} value={value}>
                        {value}
                      </SelectItem>
                    );
                  })}
                </Select>
              </div>
              {tokens && (
                <div className="w-full">
                  <label>Token:</label>
                  <Select
                    defaultValue={assetId}
                    onValueChange={(value) => {
                      setAssetId(value);
                    }}
                  >
                    {tokens.map((value, index) => {
                      return (
                        <SelectItem key={index + 1} value={value.asset_id}>
                          {value.name}
                        </SelectItem>
                      );
                    })}
                  </Select>
                </div>
              )}
              <div className="w-full">
                <label>Refund Amount:</label>
                <NumberInput
                  step={1}
                  defaultValue={1}
                  value={refundAmount}
                  min={1}
                  onValueChange={(value) => setRefundAmount(value)}
                  placeholder="Please input stake amount"
                />
              </div>
              <div>
                <Flex className="gap-2">
                  <Button
                    onClick={() => {
                      setShowRefundModal(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => handleRefund()}>Refund</Button>
                </Flex>
              </div>
            </Flex>
          </Modal>
          <Modal
            isOpen={showBlacklistModal}
            closeTimeoutMS={500}
            style={modalStylesWithMinWidth}
            contentLabel="BlackList"
          >
            <Flex flexDirection="col" className="gap-2 w-full">
              <h2>
                <strong>Blacklist the device</strong>
              </h2>
              <Text>Do you really want to blacklist current device?</Text>
              <div>
                <Flex className="gap-2">
                  <Button
                    onClick={() => {
                      setShowBlacklistModal(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => handleBlacklist()}>OK</Button>
                </Flex>
              </div>
            </Flex>
          </Modal>
          <Modal
            isOpen={showDeleteModal}
            closeTimeoutMS={500}
            style={modalStylesWithMinWidth}
            contentLabel="Delete Device"
          >
            <Flex flexDirection="col" className="gap-2 w-full">
              <h2>
                <strong>Delete Device</strong>
              </h2>
              <Text>Do you really want to delete current device?</Text>
              <div>
                <Flex className="gap-2">
                  <Button
                    onClick={() => {
                      setShowDeleteModal(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => handleDelete()}>OK</Button>
                </Flex>
              </div>
            </Flex>
          </Modal>
          <Modal
            isOpen={showUnregisterModal}
            closeTimeoutMS={500}
            style={modalStylesWithMinWidth}
            contentLabel="Unregister"
          >
            <Flex flexDirection="col" className="gap-2 w-full">
              <h2>
                <strong>Unregister Device</strong>
              </h2>
              <Text>Do you really want to unregister current device?</Text>
              <div>
                <Flex className="gap-2">
                  <Button
                    onClick={() => {
                      setShowUnregisterModal(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => handleUnregister()}>OK</Button>
                </Flex>
              </div>
            </Flex>
          </Modal>
        </>
      )}
    </div>
  );
}

