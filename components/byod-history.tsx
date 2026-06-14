import { ByodUser } from '../lib/byod-schema';
import ByodHistoryTable from '../app/tables/table-byod-history';
import HistoryFilter from './history-filter';

export default function ByodHistory() {
  return (
    <HistoryFilter<ByodUser>
      apiEndpoint="/api/byod-history"
      pageSize={20}
      responseDataKey="results"
      showTotalIncome
    >
      {(byodPayments) => <ByodHistoryTable byodPayments={byodPayments} />}
    </HistoryFilter>
  );
}
