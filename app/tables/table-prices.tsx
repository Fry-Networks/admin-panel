import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
  Flex,
  Button,
  Select,
  SelectItem,
  NumberInput,
  TextInput,
  DatePicker,
  Callout,
  Title
} from '@tremor/react';

import { Price } from '../../lib/price-schema';
import { FryToken } from '../../lib/tokens-schema';
import { useEffect, useState } from 'react';
import Modal from 'react-modal';
import { modalStylesWithMinWidth } from '../../lib/modal-styles';
import { useRouter } from 'next/router';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

export default function PriceTable({
  prices,
  tokens
}: {
  prices: Price[];
  tokens: FryToken[];
}) {
  const [openEditModal, setOpenEditModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [price, setPrice] = useState(0);
  const [assetId, setAssetId] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [currentPrice, setCurrentPrice] = useState(1);
  const router = useRouter();

  const onEditButton = (no: number) => {
    setCurrentPrice(no);
    setOpenEditModal(true);
  };

  useEffect(() => {
    setProjectName(prices[currentPrice - 1].project_name);
    setPrice(prices[currentPrice - 1].price);
    setAssetId(prices[currentPrice - 1].asset_id);
  }, [currentPrice]);

  const getTokenNameById = (assetId: string) => {
    if (!tokens || tokens.length <= 0) {
      return assetId;
    }

    const token = tokens.find((token) => {
      return token.asset_id === assetId;
    });

    if (!token) {
      return assetId;
    }

    return token?.name;
  };

  const handleEditPrice = async () => {
    let message = '';
    if (!assetId || !projectName || !price) {
      // console.log('Invalid Input');
      return;
    }

    const response = await fetch('api/edit-price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        no: currentPrice,
        projectName,
        price,
        assetId
      })
    });

    if (!response.ok) {
      message = 'error';
    } else {
      const result = await response.json();
      if (result.status !== 'success') {
        message = 'error';
      } else {
        message = result.message;
      }
    }

    setUpdateSuccess(message);
    setTimeout(() => {
      setUpdateSuccess('');
      router.reload();
    }, 3_000);
    setOpenEditModal(false);
  };

  return (
    <div className="mt-5">
      {updateSuccess != '' && updateSuccess != 'error' && (
        <Callout
          className="mt-4"
          title="Success"
          icon={CheckCircleIcon}
          color="teal"
        >
          Successfully {updateSuccess} !
        </Callout>
      )}
      {updateSuccess == 'error' && (
        <Callout
          className="mt-4"
          title="Error"
          icon={CheckCircleIcon}
          color="red"
        >
          Error occured during action!
        </Callout>
      )}
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>No</TableHeaderCell>
            <TableHeaderCell>Project Name</TableHeaderCell>
            <TableHeaderCell>Price(USD/TOKEN)</TableHeaderCell>
            <TableHeaderCell>Payment Token</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {prices.map((price, index) => (
            <TableRow key={index}>
              <TableCell>{price.no}</TableCell>
              <TableCell>{price.project_name}</TableCell>
              <TableCell>{`$${price.price} (${
                price.isUSD ? 'USD' : 'Token'
              })`}</TableCell>
              <TableCell>{getTokenNameById(price.asset_id)}</TableCell>
              <TableCell>
                <Button onClick={() => onEditButton(price.no)}>Edit</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Modal
        isOpen={openEditModal}
        closeTimeoutMS={500}
        style={modalStylesWithMinWidth}
        contentLabel="Delete Reduction"
      >
        <Flex justifyContent="center">
          <Title>Edit Price Modal</Title>
        </Flex>
        <div className="w-full mt-4">
          <label>Project Name</label>
          <TextInput
            placeholder="Please input project name"
            className="mt-2"
            defaultValue={prices[currentPrice - 1].project_name}
            onValueChange={(e) => setProjectName(e)}
          />
        </div>
        <div className="w-full mt-4">
          <label>Price (USD)</label>
          <NumberInput
            placeholder="Please input the price"
            className="mt-2"
            defaultValue={prices[currentPrice - 1].price}
            onValueChange={(e) => setPrice(e)}
          />
        </div>
        <div className="w-full mt-4">
          <label>Asset Id</label>
          <Select
            defaultValue={prices[currentPrice - 1].asset_id}
            onValueChange={(e) => setAssetId(e)}
          >
            <SelectItem key={0} value={'11111111111'}>
              Algo
            </SelectItem>
            {tokens &&
              tokens.map((value, index) => {
                return (
                  <SelectItem key={index + 1} value={value.asset_id}>
                    {value.name}
                  </SelectItem>
                );
              })}
          </Select>
        </div>
        <Flex justifyContent="center" className="gap-3 mt-4">
          <Button onClick={handleEditPrice}>Edit Price</Button>
          <Button onClick={() => setOpenEditModal(false)}>Close</Button>
        </Flex>
      </Modal>
    </div>
  );
}

