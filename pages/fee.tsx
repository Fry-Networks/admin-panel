import { MongoClient } from 'mongodb';
import { GetServerSideProps } from 'next';
import clientPromise from '../lib/mongoclient';
import { Fee } from '../lib/fee-schema';
import {
  Button,
  Card,
  DatePicker,
  Flex,
  TabGroup,
  TabPanel,
  TabPanels,
  TextInput,
  Text,
  Title,
  TabList,
  Tab
} from '@tremor/react';
import { getSession } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/router';
import FeesTable from '../app/tables/table-fees';
import ByodHistory from '../components/byod-history';
import FryWorldHistory from '../components/fryworld-history';
import { FryToken } from '../lib/tokens-schema';

export default function FeePage({
  fees = [],
  totalFee,
  totalCount,
  currentPage,
  tokens
}: {
  fees: Fee[];
  totalFee: number;
  totalCount: number;
  currentPage: number;
  tokens: FryToken[];
}) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [minerKey, setMinerKey] = useState('');
  const router = useRouter();

  const onFilterClicked = () => {
    const queryParams: Record<string, any> = {};

    if (startDate) queryParams.startDate = startDate.toISOString();
    if (endDate) queryParams.endDate = endDate.toISOString();
    if (minerKey) queryParams.minerKey = minerKey;

    queryParams.page = 1;

    router.push({
      pathname: '/fee',
      query: queryParams
    });
  };

  const onPageChange = (newPage: number) => {
    router.push({
      pathname: '/fee',
      query: {
        ...router.query,
        page: newPage
      }
    });
  };

  const totalPages = Math.ceil(totalCount / 20);

  return (
    <main className="p-4 md:p-10 mx-auto max-w-8xl bg-gray-950">
      <Title className="text-white">Income</Title>
      <TabGroup className="mt-3">
        <TabList>
          <Tab>Reward</Tab>
          <Tab>Byod</Tab>
          <Tab>fry.farm</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Card className="bg-gray-900 border-gray-700">
              <Flex
                flexDirection="row"
                className="gap-3 mb-1"
              >
                <Flex flexDirection="row" className="gap-2">
                  <Text className="no-wrap-text text-gray-300">Start&nbsp;Date:</Text>
                  <DatePicker onValueChange={(value) => setStartDate(value)} />
                </Flex>

                <Flex flexDirection="row" className="gap-2">
                  <Text className="text-gray-300">End&nbsp;Date: </Text>
                  <DatePicker onValueChange={(value) => setEndDate(value)} />
                </Flex>

                <TextInput
                  placeholder="Please input miner key to filter"
                  value={minerKey}
                  className="bg-gray-800 border-gray-600 text-white"
                  onValueChange={(value) => setMinerKey(value)}
                />
                <Button className="bg-red-500 hover:bg-red-600 border-0" onClick={onFilterClicked}>Filter</Button>
              </Flex>

              <Flex justifyContent="center" className="mt-5">
                <Title className="text-white">{`Calculated Fee: $${Number(totalFee).toLocaleString(
                  'en-US',
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )} (USD)`}</Title>
              </Flex>
              <FeesTable fees={fees} tokens={tokens} />
            </Card>

            <Flex justifyContent="center" className="mt-4">
              <Button
                className="bg-gray-700 hover:bg-gray-600 border-0"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
              >
                Previous
              </Button>
              <Text className="mx-2 text-gray-300">
                {currentPage} of {totalPages}
              </Text>
              <Button
                className="bg-gray-700 hover:bg-gray-600 border-0"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
              >
                Next
              </Button>
            </Flex>
          </TabPanel>
          <TabPanel>
            <ByodHistory />
          </TabPanel>
          <TabPanel>
            <FryWorldHistory />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </main>
  );
}

const getNextDay = (endDate: Date): Date => {
  const nextDay = new Date(endDate);
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  if (!session || !session.user) {
    return {
      props: {
        fees: [],
        totalCount: 0,
        currentPage: 1
      }
    };
  }
  const { startDate, endDate, minerKey, page = 1 } = context.query;
  const pageSize = 20;
  const skip = (Number(page) - 1) * pageSize;

  const client: MongoClient = await clientPromise;
  const db = client.db('main');
  const collection = db.collection('reward-boosts');
  let query: Record<string, any> = {};

  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate as string),
      $lte: getNextDay(new Date(endDate as string))
    };
  } else if (startDate) {
    query.createdAt = {
      $gte: new Date(startDate as string)
    };
  } else if (endDate) {
    query.createdAt = {
      $lte: getNextDay(new Date(endDate as string))
    };
  }

  if (minerKey) {
    query = {
      ...query,
      $or: [
        {
          miner_key: {
            $regex: minerKey,
            $options: 'i'
          }
        },
        {
          address: {
            $regex: minerKey,
            $options: 'i'
          }
        }
      ]
    };
  }

  const totalCount = await collection.countDocuments({ ...query });

  const totalFeeResult = await collection
    .aggregate([
      {
        $match: {
          ...query,
          asset_id: { $ne: '2681521901' },
          price: { $gt: 0 },
          // Exclude NaN fee_amount values (NaN fails all numeric comparisons)
          $or: [{ fee_amount: { $gte: 0 } }, { fee_amount: { $lt: 0 } }]
        }
      },
      {
        $project: {
          totalValue: { $multiply: ['$fee_amount', '$price'] }
        }
      },
      { $group: { _id: null, totalFee: { $sum: '$totalValue' } } }
    ])
    .toArray();

  const totalFee = totalFeeResult.length > 0 ? totalFeeResult[0].totalFee : 0;

  const rewards = await collection
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .toArray();

  const tokens = await db.collection('tokens').find({}).toArray();

  return {
    props: {
      fees: JSON.parse(JSON.stringify(rewards)),
      totalFee,
      totalCount,
      currentPage: Number(page),
      tokens: JSON.parse(JSON.stringify(tokens))
    }
  };
};
