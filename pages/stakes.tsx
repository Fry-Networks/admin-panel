import {
  Card,
  Text,
  Title,
  Flex,
  TabPanel,
  TabPanels,
  TabGroup
} from '@tremor/react';
import clientPromise from '../lib/mongoclient';
import { useEffect, useState } from 'react';
import { getSession } from 'next-auth/react';
import { Product } from '../lib/products-schema';
import { FryToken } from '../lib/tokens-schema';
import StakeProductsTable from '../app/tables/table-stake-products';

export default function StakesPage({
  products,
  tokens
}: {
  products: Product[];
  tokens: FryToken[];
}) {
  const [normalProducts, setNormalProducts] = useState<Product[]>([]);
  const [nodeProducts, setNodeProducts] = useState<Product[]>([]);
  useEffect(() => {
    const nodes = products.filter((product) => {
      const name = product.name.toLowerCase();
      return name.includes('node') || name.includes('edge');
    });

    const normals = products.filter((product) => {
      const name = product.name.toLowerCase();
      return !name.includes('node') && !name.includes('edge');
    });

    setNormalProducts(normals);
    setNodeProducts(nodes);
  }, [products, tokens]);
  return (
    <main className="p-4 md:p-10 mx-auto max-w-8xl bg-gray-950">
      <Title className="text-white">Wix Products</Title>
      <TabGroup>
        <TabPanels>
          <TabPanel>
            <Flex flexDirection="row" className="mt-6">
              <div className="mt-5">
                <Text className="text-gray-300">{products?.length} products found!</Text>
              </div>
            </Flex>

            <Card className="mt-6 bg-gray-900 border-gray-700">
              <StakeProductsTable
                products={normalProducts}
                tokens={tokens}
                node={false}
              />
            </Card>

            <Card className="mt-6 bg-gray-900 border-gray-700">
              <StakeProductsTable
                products={nodeProducts}
                tokens={tokens}
                node={true}
              />
            </Card>
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
