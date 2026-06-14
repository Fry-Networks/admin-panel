import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
  Button,
  Callout,
  NumberInput,
  TextInput,
  Flex,
  Select,
  SelectItem
} from '@tremor/react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import Modal from 'react-modal';
import { modalStyles } from '../../lib/modal-styles';
import { webUser } from '../../lib/webusers-model';
import { Product, ProductModel } from '../../lib/products-schema';
import { useRef, useState } from 'react';
import ReactModal from 'react-modal';
import { FryToken } from '../../lib/tokens-schema';

export default function RewardProductsTable({
  products,
  tokens,
  enabled
}: {
  products: Product[];
  tokens: FryToken[];
  enabled: boolean;
}) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [globalMultiplier, setGlobalMultiplier] = useState(1);
  const [updateSuccess, setUpdateSuccess] = useState(''); // State to track update success
  const openEditModal = (product: Product) => {
    rewardTokenRef.current = product.reward.tokens?.reward ?? 'none';
    setEditingProduct(product);
  };
  const closeModal = () => {
    setEditingProduct(null);
  };
  const unverifiedRewardRef = useRef<HTMLInputElement>(null);
  const verifiedRewardRef = useRef<HTMLInputElement>(null);
  const rewardTokenRef = useRef<string | null>(null);
  const globalMultiplierRef = useRef<HTMLInputElement>(null);
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    // Ensure editingProduct is not null
    if (!editingProduct) {
      console.error('No product selected for editing');
      return;
    }

    const unverifiedReward = unverifiedRewardRef.current?.value;
    const verifiedReward = unverifiedRewardRef.current?.value;
    const rewardToken = rewardTokenRef.current ?? 'none';

    const updateData = {
      productId: editingProduct.wix_id, // Use the appropriate identifier for the product
      unverifiedReward: unverifiedReward,
      verifiedReward: verifiedReward,
      reward_token: rewardToken
    };

    try {
      // console.log('Updating product:', editingProduct);

      const response = await fetch('/api/edit-product', {
        // Replace with your actual API endpoint
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        setUpdateSuccess('error'); // Reset success state
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      // console.log('Updated product:', result);
      setUpdateSuccess(editingProduct.name); // Set success state to true
      setTimeout(() => {
        window.location.reload();
        setUpdateSuccess('');
      }, 1000); // Reset success state after 3 seconds
    } catch (err) {
      console.error('Error updating product:', err);
    }

    // Reset editing product and close modal
    setEditingProduct(null);
    closeModal();
  };

  const updateMultiplier = async () => {
    try {
      const response = await fetch('/api/update-multiplier', {
        // Replace with your actual API endpoint
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ multiplier: globalMultiplier })
      });

      if (!response.ok) {
        setUpdateSuccess('error'); // Reset success state
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      // console.log('Updated multiplier:', result);
      0;

      setUpdateSuccess('multiplier'); // Set success state to true
      setTimeout(() => {
        window.location.reload();
        setUpdateSuccess('');
      }, 1000); // Reset success state after 3 seconds
    } catch (err) {
      console.error('Error updating multiplier:', err);
    }
  };

  function formatDate(date: Date) {
    date = new Date(date);
    let day = date.getDate().toString().padStart(2, '0');
    let month = (date.getMonth() + 1).toString().padStart(2, '0'); // January is 0
    let year = date.getFullYear();
    let hours = date.getHours().toString().padStart(2, '0');
    let minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  return (
    <div>
      {updateSuccess != '' && updateSuccess != 'error' && (
        <Callout
          className="mt-4"
          title="Success"
          icon={CheckCircleIcon}
          color="teal"
        >
          Successfully updated {updateSuccess} !
        </Callout>
      )}
      {updateSuccess == 'error' && (
        <Callout
          className="mt-4"
          title="Error"
          icon={CheckCircleIcon}
          color="red"
        >
          Error updating product!
        </Callout>
      )}
      <Flex flexDirection="col">
        <Flex flexDirection="row" className="mt-6">
          <NumberInput
            ref={globalMultiplierRef}
            defaultValue={globalMultiplier}
            step={0.01}
            onChange={(e) => setGlobalMultiplier(+e.target.value)}
          />
          <Button
            className="ml-4"
            onClick={() => {
              updateMultiplier();
            }}
          >
            Update multiplier
          </Button>
        </Flex>
        <Button
          className="mt-4"
          color={enabled ? 'red' : 'green'}
          onClick={() => {
            fetch('/api/update-rewards-enabled', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ enabled: !enabled })
            }).then(() => {
              window.location.reload();
            });
          }}
        >
          {enabled ? 'Disable rewards' : 'Enable rewards'}
        </Button>
      </Flex>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Key</TableHeaderCell>
            <TableHeaderCell>Reward Token</TableHeaderCell>
            <TableHeaderCell>Unverified rewards</TableHeaderCell>
            <TableHeaderCell>Verified rewards(1.5x | 3x)</TableHeaderCell>
            <TableHeaderCell>Added on </TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products?.map((product) => (
            <TableRow key={product.wix_id}>
              <TableCell>{product.name}</TableCell>
              <TableCell>
                <Text>{product.key}</Text>
              </TableCell>
              <TableCell>
                {product.reward.tokens?.reward &&
                product.reward.tokens?.reward !== 'none'
                  ? tokens.find(
                      (value) =>
                        value.asset_id === product.reward.tokens?.reward
                    )?.name
                  : 'None'}
              </TableCell>
              <TableCell>
                <Text>{product.reward.unverified}</Text>
              </TableCell>
              <TableCell>
                <Text>{`${
                  Math.round(product.reward.unverified * 100 * 1.5) / 100
                } | ${
                  Math.round(product.reward.unverified * 100 * 3) / 100
                }`}</Text>
              </TableCell>
              <TableCell>
                <Text>
                  {product.created_at
                    ? formatDate(product.created_at)
                    : 'Unknown'}
                </Text>
              </TableCell>
              <TableCell>
                <Button
                  variant="secondary"
                  onClick={() => openEditModal(product)}
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Modal
        isOpen={!!editingProduct}
        onRequestClose={closeModal}
        closeTimeoutMS={500}
        style={modalStyles}
        contentLabel="Edit Product"
      >
        <h2 className="mb-4">
          <strong>Editting</strong> {editingProduct?.name} - (
          {editingProduct?.key})
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <label>Unverified Reward:</label>
            <NumberInput
              ref={unverifiedRewardRef}
              defaultValue={editingProduct?.reward.unverified}
              step={0.01}
            />
          </div>
          <div>
            <label>Reward token type:</label>
            <Select
              defaultValue={editingProduct?.reward.tokens?.reward ?? 'none'}
              onValueChange={(value) => {
                rewardTokenRef.current = value;
              }}
            >
              <SelectItem key={0} value="none">
                None
              </SelectItem>
              {tokens?.map((token, index) => {
                return (
                  <SelectItem key={index + 1} value={token.asset_id}>
                    {token.name}
                  </SelectItem>
                );
              })}
            </Select>
          </div>

          <div className="mb-4 mt-4">
            <Button type="submit" className="mr-2" variant="primary">
              Update
            </Button>
            <Button onClick={closeModal} variant="secondary">
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

