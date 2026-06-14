'use client';

import { useState } from 'react';
import { GasFee } from '../lib/gasfee-schema';
import GasFeeTable from '../app/tables/table-gasfee';
import HistoryFilter from './history-filter';

export default function FryWorldHistory() {
  const [fryPrice, setFryPrice] = useState(0);

  return (
    <HistoryFilter<GasFee>
      apiEndpoint="/api/gasfee-history"
      pageSize={20}
      responseDataKey="gasFees"
      showTotalIncome
      onDataLoaded={(result) => {
        if (result.fryPrice !== undefined) {
          setFryPrice(result.fryPrice);
        }
      }}
    >
      {(gasFees) => <GasFeeTable gasFees={gasFees} fryPrice={fryPrice} />}
    </HistoryFilter>
  );
}
