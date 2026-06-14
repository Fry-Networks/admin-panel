import {
  Button,
  Card,
  DatePicker,
  Flex,
  Text,
  TextInput,
  Title
} from '@tremor/react';
import { useEffect, useState, ReactNode } from 'react';

interface HistoryFilterProps<T> {
  apiEndpoint: string;
  pageSize: number;
  responseDataKey: string;
  showTotalIncome?: boolean;
  onDataLoaded?: (result: any) => void;
  children: (data: T[]) => ReactNode;
}

export default function HistoryFilter<T>({
  apiEndpoint,
  pageSize,
  responseDataKey,
  showTotalIncome = false,
  onDataLoaded,
  children
}: HistoryFilterProps<T>) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [filterString, setFilterString] = useState('');
  const [data, setData] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const onFilterClicked = () => {
    fetchData();
  };

  const fetchData = async () => {
    const queryParams: Record<string, any> = {};

    if (startDate) queryParams.startDate = startDate.toISOString();
    if (endDate) queryParams.endDate = endDate.toISOString();
    if (filterString) queryParams.filterString = filterString;

    queryParams.page = currentPage;

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(queryParams)
    });

    if (response.ok) {
      const result = await response.json();

      if (result.success) {
        setData(result[responseDataKey]);
        setTotalCount(result.totalCount);
        if (showTotalIncome && result.totalPaymentSum !== undefined) {
          setTotal(result.totalPaymentSum);
        }
        if (onDataLoaded) {
          onDataLoaded(result);
        }
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const onPageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      <Card>
        <Flex
          flexDirection="row"
          className="gap-3"
          style={{ marginBottom: '2px' }}
        >
          <Flex flexDirection="row" className="gap-2">
            <Text className="no-wrap-text">Start&nbsp;Date:</Text>
            <DatePicker onValueChange={(value) => setStartDate(value)} />
          </Flex>

          <Flex flexDirection="row" className="gap-2">
            <Text>End&nbsp;Date: </Text>
            <DatePicker onValueChange={(value) => setEndDate(value)} />
          </Flex>

          <TextInput
            placeholder="Please input address or miner key to fillter"
            value={filterString}
            onValueChange={(value) => setFilterString(value)}
          />
          <Button onClick={onFilterClicked}>Filter</Button>
        </Flex>

        {showTotalIncome && (
          <Flex justifyContent="center" className="mt-5">
            <Title>{`Calculated Income: $${Number(total).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })} (USD)`}</Title>
          </Flex>
        )}

        {children(data)}
      </Card>

      <Flex justifyContent="center" className="mt-4">
        <Button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <Text className="mx-2">
          {currentPage} of {totalPages}
        </Text>
        <Button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </Flex>
    </div>
  );
}
