
import { Card, Metric, Text, Title, BarList, Flex, Grid, MultiSelect, MultiSelectItem } from '@tremor/react';
// Use pages-router search component for pages directory.
import Search from '../components/search';
import clientPromise from '../lib/mongoclient';
import { getSession } from 'next-auth/react';
import { AirAccount } from '../lib/air_accounts';
import WaterAccountsTable from '../app/tables/table-water-account';


export default function WaterAccountsPage({ accounts, searchParams }: { accounts: any[], searchParams: { q: string } }) {
    const searchTerm = searchParams.q || "";
    const filtered = (searchTerm.length > 0) ? accounts.filter((account) => {
        const contains = (original: string) => {
            if (!searchTerm) return true;
            return original.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return contains(account?.api_key ?? "") || contains(account._id.toString()) || contains(account?.owner ?? "") || contains(account?.imei ?? "") || contains(account?.read_key ?? "") || contains(account?.sensor ?? "");

    }) : accounts;
    //(VPN|OGPS|IGPS|IDB|ODB)



    return (
        <main className="p-4 md:p-10 mx-auto max-w-7xl">
            <Title>Water Accounts</Title>
            <Flex alignItems='end' flexDirection='row' className='mt-6'>
                <Search />
            </Flex>
            <div style={{ marginTop: '20px' }}>
                <Text >
                    {filtered.length} accounts matching your search
                </Text>
            </div>

            <Card className="mt-6">
                <WaterAccountsTable accounts={filtered} />
            </Card>
        </main>
    );

}

export async function getServerSideProps(context: any) {
    const session = await getSession(context);
    if ((!session || !session.user.admin) && process.env.NODE_ENV !== 'development') {
        return {
            props: { error: 'Unauthorized access' },
        };
    }
    try {
        const client = await clientPromise;
        const db = client.db("water");

        const ecowitt_accounts = (await db
            .collection("ecowitt-accounts")
            .find({})
            .toArray()).map((account) => {
                if (account.token) {
                    account.token = account.token.substring(0, 16) + "..."
                }
                if (account.api_key) {
                    account.api_key = account.api_key.substring(0, 16) + "..."
                }
                if (account.app_key) {
                    account.app_key = account.app_key.substring(0, 16) + "..."
                }
                if (account.read_key) {
                    account.read_key = account.read_key.substring(0, 16) + "..."
                }
                account.show = account.walletAddress
                return account;
            });
        const iopool_accounts = (await db
            .collection("iopool_accounts")
            .find({})
            .toArray()).map((account) => {
                if (account.token) {
                    account.token = account.token.substring(0, 16) + "..."
                }
                if (account.api_key) {
                    account.api_key = account.api_key.substring(0, 16) + "..."
                }
                if (account.app_key) {
                    account.app_key = account.app_key.substring(0, 16) + "..."
                }
                if (account.read_key) {
                    account.read_key = account.read_key.substring(0, 16) + "..."
                }
                account.show = account.iopool_id
                return account;
            });
        const accounts = ecowitt_accounts.concat(iopool_accounts);

        const searchParams = context.query;

        return {
            props: { accounts: JSON.parse(JSON.stringify(accounts)), searchParams },
        };
    } catch (e) {
        console.error(e);
    }
}
