import { FryToken } from '../lib/tokens-schema';
import { Reward } from '../lib/reward-schema';
import RewardsTable from '../app/tables/table-rewards';
import HistoryFilter from './history-filter';

export default function RewardHistory({ tokens }: { tokens: FryToken[] }) {
  return (
    <HistoryFilter<Reward>
      apiEndpoint="/api/reward-history"
      pageSize={30}
      responseDataKey="rewards"
    >
      {(rewards) => <RewardsTable rewards={rewards} tokens={tokens} />}
    </HistoryFilter>
  );
}
