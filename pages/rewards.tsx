import {
  Card,
  Text,
  Title,
  Flex,
  TabPanel,
  TabPanels,
  TabGroup,
  TabList,
  Tab
} from '@tremor/react';
import clientPromise from '../lib/mongoclient';
import RewardProductsTable from '../app/tables/table-reward-products';
import { getSession } from 'next-auth/react';
import { Product } from '../lib/products-schema';
import { FryToken } from '../lib/tokens-schema';
import RewardHistory from '../components/reward-history';

export default function RewardsPage({
  products,
  tokens,
  enabled
}: {
  products: Product[];
  tokens: FryToken[];
  enabled: boolean;
}) {
  return (
    <main className="p-4 md:p-10 mx-auto max-w-8xl bg-gray-950">
      <Title className="text-white">Reward Management & Review</Title>
      <TabGroup>
        <TabList className="mt-8">
          <Tab>Rewards Options</Tab>
          <Tab>Rewards History</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Flex flexDirection="row" className="mt-6">
              <div className="mt-5">
                <Text className="text-gray-300">{products?.length} products found!</Text>
              </div>
            </Flex>

            <Card className="mt-6 bg-gray-900 border-gray-700">
              <RewardProductsTable
                products={products}
                enabled={enabled}
                tokens={tokens}
              />
            </Card>
          </TabPanel>
          <TabPanel>
            <RewardHistory tokens={tokens} />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </main>
  );
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);

  try {
    const client = await clientPromise;
    const db = client.db('main');

    const products = await db.collection('products').find({}).toArray();
    const config = await db.collection('configs').findOne({ name: 'rewards' });
    const tokens = await db.collection('tokens').find({}).toArray();
    return {
      props: {
        products: JSON.parse(JSON.stringify(products)),
        tokens: JSON.parse(JSON.stringify(tokens)),
        enabled: config?.enabled
      }
    };
  } catch (e) {
    console.error(e);
    return {
      props: { error: 'Failed to fetch data' }
    };
  }
}
