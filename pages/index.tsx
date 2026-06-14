import {
  Card,
  Title,
  Text,
  Metric,
  Flex,
  Grid,
  Badge,
  List,
  ListItem
} from '@tremor/react';
import { getSession } from 'next-auth/react';
import clientPromise from '../lib/mongoclient';

type DashboardStats = {
  network: { totalDevices: number; verifiedDevices: number; blacklisted: number };
  users: { totalUsers: number; totalByod: number };
  staking: { stakedDevices: number; registeredDevices: number; recentStakes24h: number };
  governance: { activeAnnouncements: number; draftAnnouncements: number; activeVotes: number };
  products: { totalProducts: number };
};

type RecentActivity = {
  type: 'stake' | 'registration';
  minerKey: string;
  amount: number;
  time: string;
};

export default function IndexPage({
  stats,
  recentActivity,
  error
}: {
  stats: DashboardStats | null;
  recentActivity: RecentActivity[];
  error?: string;
}) {
  if (error) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl bg-gray-950">
        <Title className="text-white">FRY Admin Panel</Title>
        <Text className="mt-4 text-red-400">{error}</Text>
      </main>
    );
  }

  const formatNumber = (num: number) => num.toLocaleString();
  
  const truncateKey = (key: string) => {
    if (!key || key.length < 12) return key || 'Unknown';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl bg-gray-950">
      <Title className="text-white">FRY Admin Panel Dashboard</Title>
      
      <Grid numItemsSm={2} numItemsLg={4} className="gap-6 mt-6">
        {/* Network Stats */}
        <Card className="bg-gray-900 border-gray-700">
          <Text className="text-gray-400">Network</Text>
          <Metric className="text-white">{formatNumber(stats?.network.totalDevices ?? 0)}</Metric>
          <Text className="text-gray-400">Total Devices</Text>
          <Flex className="mt-4 space-x-2">
            <Badge color="emerald">{formatNumber(stats?.network.verifiedDevices ?? 0)} verified</Badge>
            {(stats?.network.blacklisted ?? 0) > 0 && (
              <Badge color="red">{stats?.network.blacklisted} blacklisted</Badge>
            )}
          </Flex>
        </Card>

        {/* User Stats */}
        <Card className="bg-gray-900 border-gray-700">
          <Text className="text-gray-400">Users</Text>
          <Metric className="text-white">{formatNumber(stats?.users.totalUsers ?? 0)}</Metric>
          <Text className="text-gray-400">Total Users</Text>
          <Flex className="mt-4">
            <Badge color="blue">{formatNumber(stats?.users.totalByod ?? 0)} BYOD licenses</Badge>
          </Flex>
        </Card>

        {/* Staking Stats */}
        <Card className="bg-gray-900 border-gray-700">
          <Text className="text-gray-400">Staking</Text>
          <Metric className="text-white">{formatNumber(stats?.staking.stakedDevices ?? 0)}</Metric>
          <Text className="text-gray-400">Staked Devices</Text>
          <Flex className="mt-4 space-x-2">
            <Badge color="amber">{formatNumber(stats?.staking.registeredDevices ?? 0)} registered</Badge>
            <Badge color="violet">{stats?.staking.recentStakes24h ?? 0} (24h)</Badge>
          </Flex>
        </Card>

        {/* Governance Stats */}
        <Card className="bg-gray-900 border-gray-700">
          <Text className="text-gray-400">Governance</Text>
          <Metric className="text-white">{stats?.governance.activeVotes ?? 0}</Metric>
          <Text className="text-gray-400">Active Votes</Text>
          <Flex className="mt-4 space-x-2">
            <Badge color="emerald">{stats?.governance.activeAnnouncements ?? 0} announcements</Badge>
            <Badge color="gray">{stats?.governance.draftAnnouncements ?? 0} drafts</Badge>
          </Flex>
        </Card>
      </Grid>

      {/* Recent Activity */}
      <Card className="mt-6 bg-gray-900 border-gray-700">
        <Title className="text-white">Recent Activity (Last 7 Days)</Title>
        {recentActivity.length > 0 ? (
          <List className="mt-4">
            {recentActivity.map((activity, idx) => (
              <ListItem key={idx} className="text-gray-300">
                <span>
                  <Badge color={activity.type === 'stake' ? 'violet' : 'amber'} className="mr-2">
                    {activity.type === 'stake' ? 'Stake' : 'Register'}
                  </Badge>
                  {truncateKey(activity.minerKey)} - {activity.amount.toFixed(2)} FRY
                </span>
                <span className="text-gray-500">{formatDate(activity.time)}</span>
              </ListItem>
            ))}
          </List>
        ) : (
          <Text className="mt-4 text-gray-500">No recent activity</Text>
        )}
      </Card>

      {/* Quick Stats Row */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-6 mt-6">
        <Card className="bg-gray-900 border-gray-700">
          <Flex alignItems="start">
            <div>
              <Text className="text-gray-400">Products</Text>
              <Metric className="text-white">{stats?.products.totalProducts ?? 0}</Metric>
            </div>
          </Flex>
        </Card>
      </Grid>
    </main>
  );
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  if (!session || !session.user?.admin) {
    return {
      props: { error: 'Unauthorized access', stats: null, recentActivity: [] }
    };
  }

  try {
    const client = await clientPromise;
    const db = client.db('main');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalDevices,
      verifiedDevices,
      blacklisted,
      totalUsers,
      totalByod,
      stakedDevices,
      registeredDevices,
      recentStakes24h,
      activeAnnouncements,
      draftAnnouncements,
      activeVotes,
      totalProducts,
      recentStakesData,
      recentRegistrationsData
    ] = await Promise.all([
      db.collection('devices').countDocuments(),
      db.collection('devices').countDocuments({ verified: true }),
      db.collection('devices').countDocuments({ blacklisted: true }),
      db.collection('users').countDocuments(),
      db.collection('byods').countDocuments(),
      db.collection('devices').countDocuments({ 'staked.amount': { $gt: 0 } }),
      db.collection('devices').countDocuments({ 'registration.amount': { $gt: 0 } }),
      db.collection('devices').countDocuments({ 'staked.time': { $gte: oneDayAgo } }),
      db.collection('announcements').countDocuments({ status: 'published' }),
      db.collection('announcements').countDocuments({ status: 'draft' }),
      db.collection('dao').countDocuments({ active: true }),
      db.collection('products').countDocuments(),
      db.collection('devices')
        .find({ 'staked.time': { $gte: sevenDaysAgo }, 'staked.amount': { $gt: 0 } })
        .sort({ 'staked.time': -1 })
        .limit(5)
        .toArray(),
      db.collection('devices')
        .find({ 'registration.time': { $gte: sevenDaysAgo }, 'registration.amount': { $gt: 0 } })
        .sort({ 'registration.time': -1 })
        .limit(5)
        .toArray()
    ]);

    const stats: DashboardStats = {
      network: { totalDevices, verifiedDevices, blacklisted },
      users: { totalUsers, totalByod },
      staking: { stakedDevices, registeredDevices, recentStakes24h },
      governance: { activeAnnouncements, draftAnnouncements, activeVotes },
      products: { totalProducts }
    };

    // Combine and sort recent activity
    const recentActivity: RecentActivity[] = [
      ...recentStakesData.map((d: any) => ({
        type: 'stake' as const,
        minerKey: d.miner_key || '',
        amount: d.staked?.amount || 0,
        time: d.staked?.time?.toISOString() || new Date().toISOString()
      })),
      ...recentRegistrationsData.map((d: any) => ({
        type: 'registration' as const,
        minerKey: d.miner_key || '',
        amount: d.registration?.amount || 0,
        time: d.registration?.time?.toISOString() || new Date().toISOString()
      }))
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5);

    return {
      props: {
        stats: JSON.parse(JSON.stringify(stats)),
        recentActivity: JSON.parse(JSON.stringify(recentActivity))
      }
    };
  } catch (e) {
    console.error(e);
    return {
      props: { error: 'Failed to fetch dashboard data', stats: null, recentActivity: [] }
    };
  }
}
