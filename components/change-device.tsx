import {
  Button,
  SearchSelect,
  SearchSelectItem,
  Text,
  TextInput
} from '@tremor/react';
import { useState } from 'react';
import clientPromise from '../lib/mongoclient';
import { User } from '../lib/users-schema';
import { changeDevice } from './server-util';
import { Device } from '../lib/devices-schema';
export default function ChangeDeviceForm({ products }: { products: any[] }) {
  const [minerKey, setMinerKey] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  return (
    <div>
      <Text className="mb-4">Select the new device type</Text>

      <SearchSelect
        className="mb-4 ml-10"
        placeholder="Select the device type..."
        onValueChange={(value) => setDeviceType(value)}
        value={deviceType}
      >
        {products &&
          products.map((product) => (
            <SearchSelectItem key={product._id} value={product._id}>
              {product.key} - {product.name}
            </SearchSelectItem>
          ))}
      </SearchSelect>
      {deviceType ? (
        <TextInput
          className="mb-4 ml-10"
          placeholder="Miner Key"
          onValueChange={(value) => setMinerKey(value)}
          value={minerKey}
        />
      ) : (
        ''
      )}

      {minerKey ? (
        <Button
          className=""
          style={{
            backgroundColor: 'RGB(73, 197, 105)'
          }}
          loading={isLoading}
          loadingText="Sending to server..."
          onClick={async () => {
            setIsLoading(true);
            const res = await changeDevice(deviceType, minerKey);
            if (res) {
              setStatus('Success');
            } else {
              setStatus('Failed..');
            }
            setIsLoading(false);
          }}
        >
          {status ? status : 'Send to server'}
        </Button>
      ) : (
        ''
      )}
    </div>
  );
}
