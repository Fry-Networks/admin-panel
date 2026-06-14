import {
  Card,
  Text,
  Title,
  Button,
  Flex
} from '@tremor/react';
import Search from '../components/search';
import clientPromise from '../lib/mongoclient';
import DevicesTable from '../app/tables/table-device';
import { useMemo, useState } from 'react';
import { Device } from '../lib/devices-schema';
import { getSession } from 'next-auth/react';
import '../app/css/devices.css';
import DeviceForm from '../components/form-device';
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react';
import ChangeDeviceForm from '../components/change-device';
import { FryToken } from '../lib/tokens-schema';

export default function DevicesPage({
  devices = [],
  products,
  tokens = [],
  searchParams = {}
}: {
  devices: Device[];
  searchParams: any;
  tokens: FryToken[];
  products: any[];
}) {
  const [sortOrder, setSortOrder] = useState('asc');

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const sortDevices = (devices: Device[]) => {
    return devices.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  };

  const sortedDevices = useMemo(
    () => sortDevices(devices),
    [devices, sortOrder]
  );

  return (
    <main className="p-4 md:p-10 mx-auto max-w-8xl bg-gray-950">
      <Title className="text-white">Devices</Title>

      <TabGroup>
        <TabList className="mt-8">
          <Tab>List</Tab>
          <Tab>Add Device</Tab>
          <Tab>Update Device</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Flex alignItems="end" flexDirection="row" className="mt-6">
              <Search />
            </Flex>
            <Button className="mt-4 bg-red-500 hover:bg-red-600 border-0" onClick={toggleSortOrder}>
              Toggle Sort Order
            </Button>
            <Text className="mt-4 text-gray-300">
              {sortedDevices.length} devices matching your search
            </Text>
            <Card className="mt-6 bg-gray-900 border-gray-700">
              <DevicesTable devices={sortedDevices} tokens={tokens} />
            </Card>
          </TabPanel>
          <TabPanel>
            <DeviceForm products={products} />
          </TabPanel>
          <TabPanel>
            <ChangeDeviceForm products={products} />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </main>
  );
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  if (!session || !session.user?.admin) {
    return {
      props: { error: 'Unauthorized access' }
    };
  }

  try {
    const client = await clientPromise;
    let products;
    const db = client.db('main');

    const searchParams = context.query;
    const searchTerm = searchParams.q || '';

    const query =
      searchTerm.length > 0
        ? {
            $or: [
              { order: { $regex: searchTerm, $options: 'i' } },
              { byod: { $regex: searchTerm, $options: 'i' } },
              { email: { $regex: searchTerm, $options: 'i' } },
              { miner_key: { $regex: searchTerm, $options: 'i' } }
            ]
          }
        : {};

    const devices = await db
      .collection('devices')
      .find(query)
      .limit(100)
      .toArray();
    const tokens = await db.collection('tokens').find({}).toArray();
    if (!products) {
      products = await db.collection('products').find({}).toArray();
    }
    return {
      props: {
        devices: JSON.parse(JSON.stringify(devices)),
        products: JSON.parse(JSON.stringify(products)),
        tokens: JSON.parse(JSON.stringify(tokens)),
        searchParams
      }
    };
  } catch (e) {
    console.error(e);
    return {
      props: { error: 'Failed to fetch data' }
    };
  }
}
