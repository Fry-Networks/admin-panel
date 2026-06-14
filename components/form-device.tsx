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
import { addDevice } from './server-util';
export default function DeviceForm({ products }: { products: any[] }) {
  const [deviceType, setDeviceType] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [order, setOrder] = useState('');
  const [byod, setByod] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  return (
    <div>
      <Text className="mb-4">
        Select a device type and a user, click submit to generate a key
      </Text>
      <SearchSelect
        className="mb-4 ml-10"
        placeholder="Select a device type..."
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
          placeholder="Email"
          onValueChange={(value) => setSelectedUser(value)}
          value={selectedUser}
        />
      ) : (
        ''
      )}
      {selectedUser ? (
        <TextInput
          className="mb-4 ml-10"
          placeholder="Order"
          onValueChange={(value) => setOrder(value)}
          value={order}
        />
      ) : (
        ''
      )}
      {order ? (
        <TextInput
          className="mb-4 ml-10"
          placeholder="Byod (leave empty if not byod)"
          onValueChange={(value) => setByod(value)}
          value={byod}
        />
      ) : (
        ''
      )}

      {order ? (
        <Button
          className="ml-10"
          style={{
            backgroundColor: 'RGB(73, 197, 105)'
          }}
          loading={isLoading}
          loadingText="Sending to server..."
          onClick={async () => {
            setIsLoading(true);
            const res = await addDevice({
              email: selectedUser,
              id: deviceType,
              order,
              byod
            });
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
