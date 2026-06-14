import { getSession } from 'next-auth/react';
import clientPromise from '../lib/mongoclient';
import { Card, TabGroup, TabPanel, TabPanels, Title } from '@tremor/react';
import { FryToken } from '../lib/tokens-schema';
import TokensTable from '../app/tables/table-tokens';
import { useEffect, useState } from 'react';

export default function TokenPage({ tokens }: { tokens: FryToken[] }) {
  const [localTokens, setLocalTokens] = useState<FryToken[]>(tokens);

  useEffect(() => {
    setLocalTokens(tokens);
  }, [tokens]);

  const setTokens = (tokens: FryToken[]) => {
    setLocalTokens(tokens);
  };
  return (
    <main className="p-4 md:p-10 mx-auto max-w-8xl bg-gray-950">
      <Title className="text-white">Fry tokens</Title>
      <TabGroup>
        <TabPanels>
          <TabPanel>
            <Card className="bg-gray-900 border-gray-700">
              <TokensTable tokens={localTokens} setTokens={setTokens} />
            </Card>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </main>
  );
}
export async function getServerSideProps(context: any) {
  const session = await getSession(context);

  if (!session || !session.user?.owner) {
    return {
      props: {
        error: 'Unauthroized access'
      }
    };
  }

  try {
    const client = await clientPromise;
    const db = client.db('main');

    const tokens = await db.collection('tokens').find({}).toArray();

    if (!tokens) {
      return {
        props: {
          tokens: []
        }
      };
    } else {
      return {
        props: {
          tokens: JSON.parse(
            JSON.stringify(
              tokens.map((token) => {
                return {
                  name: token.name,
                  asset_id: token.asset_id
                };
              })
            )
          )
        }
      };
    }
  } catch (error) {
    console.error('Tokens info fetch error: ' + error);
    return {
      props: {}
    };
  }
}
