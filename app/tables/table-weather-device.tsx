import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
  Button
} from '@tremor/react';
import { deviceData } from '../../lib/weather_accounts';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
export default function WeatherDevicesTable({
  devicesData
}: {
  devicesData: deviceData[];
}) {
  const [displayData, setDisplayData] = useState<deviceData[]>(devicesData);

  useEffect(() => {
    // Log the new data
    // console.log('Updated devicesData:', devicesData);
    // Update the state to trigger re-render
    setDisplayData(devicesData);
  }, [devicesData]);

  const router = useRouter();
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Type</TableHeaderCell>
          <TableHeaderCell>MAC Addr</TableHeaderCell>
          <TableHeaderCell>Coords</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {displayData?.filter((device) => device).
          map((device) => (
            <TableRow key={device.deviceMAC}>
              <TableCell>{device.infos.name}</TableCell>
              <TableCell>
                <Text>{device.type}</Text>
              </TableCell>
              <TableCell>
                <Text>{device.deviceMAC}</Text>
              </TableCell>
              <TableCell>
                <Text>
                  {device.infos.coords.lat}, {device.infos.coords.lon}
                </Text>
              </TableCell>
              <TableCell>
                <Button
                  onClick={() =>
                    router.push(`/weather/devices/${device.deviceMAC}`)
                  }
                  variant="secondary"
                >
                  Show Data
                </Button>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
