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
  SelectItem,
  Title,
  Badge
} from '@tremor/react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import Modal from 'react-modal';
import { modalStyles } from '../../lib/modal-styles';
import { webUser } from '../../lib/webusers-model';
import { Product, ProductModel } from '../../lib/products-schema';
import { useRef, useState } from 'react';
import ReactModal from 'react-modal';
import { FryToken } from '../../lib/tokens-schema';

export default function StakeProductsTable({
  products,
  tokens,
  node
}: {
  products: Product[];
  tokens: FryToken[];
  node: boolean;
}) {
  // console.log('Node ' + node);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [globalMultiplier, setGlobalMultiplier] = useState(1);
  const [updateSuccess, setUpdateSuccess] = useState(''); // State to track update success
  const [stakeMode, setStakeMode] = useState<'usd' | 'token'>('usd');

  // Bulk edit state
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkStakeMode, setBulkStakeMode] = useState<'usd' | 'token'>('usd');
  const bulkStakeOneRef = useRef<HTMLInputElement>(null);
  const bulkStakeTwoRef = useRef<HTMLInputElement>(null);
  const bulkStakeOneUsdRef = useRef<HTMLInputElement>(null);
  const bulkStakeTwoUsdRef = useRef<HTMLInputElement>(null);

  const bulkRegisterTokenRef = useRef<string | null>(null);
  const bulkRegisterUsdRef = useRef<HTMLInputElement>(null);

  const stakeOneRef = useRef<HTMLInputElement>(null);
  const stakeTwoRef = useRef<HTMLInputElement>(null);
  // FIP-012: USD amount refs for verification stakes
  const stakeOneUsdRef = useRef<HTMLInputElement>(null);
  const stakeTwoUsdRef = useRef<HTMLInputElement>(null);
  const stakeTokenRef = useRef<string | null>(null);
  const nodeStakeTokenRef = useRef<string | null>(null);
  const nodeStakeAmountRef = useRef<HTMLInputElement>(null);
  const registerTokenRef = useRef<string | null>(null);
  const registerUSDRef = useRef<HTMLInputElement>(null);

  // Helper to detect if a product is a node
  const isNodeProduct = (key: string) => ['SVN', 'SDN', 'RDN', 'CN'].some(n => key.includes(n));

  // Selection handlers
  const toggleProductSelection = (wixId: string) => {
    setSelectedProducts(prev => 
      prev.includes(wixId) 
        ? prev.filter(id => id !== wixId)
        : [...prev, wixId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.wix_id));
    }
  };

  const selectMiners = () => {
    const minerIds = products
      .filter(p => !isNodeProduct(p.key))
      .map(p => p.wix_id);
    setSelectedProducts(minerIds);
  };

  const selectNodes = () => {
    const nodeIds = products
      .filter(p => isNodeProduct(p.key))
      .map(p => p.wix_id);
    setSelectedProducts(nodeIds);
  };

  // Get checkbox state for header
  const getHeaderCheckboxState = () => {
    if (selectedProducts.length === 0) return 'unchecked';
    if (selectedProducts.length === products.length) return 'checked';
    return 'indeterminate';
  };

  const openEditModal = (product: Product) => {
    stakeTokenRef.current = product.reward.tokens?.stake ?? 'none';
    registerTokenRef.current = product.reward.tokens?.register ?? 'none';
    // Auto-detect mode based on existing data
    const hasUsdValues = (product.reward.stake?.stake_one_usd ?? 0) > 0;
    setStakeMode(hasUsdValues ? 'usd' : 'token');
    setEditingProduct(product);
  };
  const closeModal = () => {
    setEditingProduct(null);
  };

  // Bulk edit handlers
  const openBulkEditModal = () => {
    setBulkStakeMode('usd');
    setBulkEditOpen(true);
  };

  const closeBulkEditModal = () => {
    setBulkEditOpen(false);
    setBulkProgress({ current: 0, total: 0 });
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const total = selectedProducts.length;
    setBulkProgress({ current: 0, total });
    const failedProducts: string[] = [];

    // Get values based on current mode
    let stake_one: number;
    let stake_two: number;
    let stake_one_usd: number;
    let stake_two_usd: number;

    if (bulkStakeMode === 'usd') {
      stake_one_usd = Number(bulkStakeOneUsdRef.current?.value ?? 0);
      stake_two_usd = Number(bulkStakeTwoUsdRef.current?.value ?? 0);
      stake_one = 0;
      stake_two = 0;
    } else {
      stake_one = Number(bulkStakeOneRef.current?.value ?? 0);
      stake_two = Number(bulkStakeTwoRef.current?.value ?? 0);
      stake_one_usd = 0;
      stake_two_usd = 0;
    }

    for (let i = 0; i < selectedProducts.length; i++) {
      const productId = selectedProducts[i];
      const product = products.find(p => p.wix_id === productId);
      
      if (!product) continue;

      const updateData = node
        ? {
            productId,
            register_token: bulkRegisterTokenRef.current !== null
              ? bulkRegisterTokenRef.current
              : product.reward.tokens?.register ?? 'none',
            register_price: bulkRegisterUsdRef.current?.value !== ''
              ? Number(bulkRegisterUsdRef.current?.value)
              : product.reward.stake?.register ?? 0,
            node_token: product.reward.tokens?.node ?? 'none',
            node_price: product.reward.stake?.node ?? 0,
            stake_one,
            stake_two,
            stake_one_usd,
            stake_two_usd,
            stake_token: product.reward.tokens?.stake ?? 'none'
          }
        : {
            productId,
            register_token: bulkRegisterTokenRef.current !== null
              ? bulkRegisterTokenRef.current
              : product.reward.tokens?.register ?? 'none',
            register_price: bulkRegisterUsdRef.current?.value !== ''
              ? Number(bulkRegisterUsdRef.current?.value)
              : product.reward.stake?.register ?? 0,
            stake_one,
            stake_two,
            stake_one_usd,
            stake_two_usd,
            stake_token: product.reward.tokens?.stake ?? 'none'
          };

      try {
        const response = await fetch('/api/edit-product', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          failedProducts.push(product.name);
          console.error(`Failed to update ${product.name}: HTTP ${response.status}`);
        }
      } catch (err) {
        failedProducts.push(product.name);
        console.error(`Error updating ${product.name}:`, err);
      }

      setBulkProgress({ current: i + 1, total });
    }

    // Show result
    if (failedProducts.length > 0) {
      setUpdateSuccess('error');
      console.error('Failed products:', failedProducts);
    } else {
      setUpdateSuccess(`${total} products`);
    }

    // Cleanup and refresh
    setBulkEditOpen(false);
    setSelectedProducts([]);
    setBulkProgress({ current: 0, total: 0 });
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    // Ensure editingProduct is not null
    if (!editingProduct) {
      console.error('No product selected for editing');
      return;
    }

    const registerUSD = registerUSDRef.current?.value;
    const registerToken = registerTokenRef.current ?? 'none';

    const nodeStakeAmount = nodeStakeAmountRef.current?.value;
    const nodeStakeToken = nodeStakeTokenRef.current ?? 'none';

    const stakeToken = stakeTokenRef.current ?? 'none';
    
    // Get values based on current mode, clear the inactive mode
    let stake_one: string | number;
    let stake_two: string | number;
    let stake_one_usd: string | number;
    let stake_two_usd: string | number;

    if (stakeMode === 'usd') {
      // USD mode: keep USD values, clear token values
      stake_one_usd = stakeOneUsdRef.current?.value ?? 0;
      stake_two_usd = stakeTwoUsdRef.current?.value ?? 0;
      stake_one = 0;
      stake_two = 0;
    } else {
      // Token mode: keep token values, clear USD values
      stake_one = stakeOneRef.current?.value ?? 0;
      stake_two = stakeTwoRef.current?.value ?? 0;
      stake_one_usd = 0;
      stake_two_usd = 0;
    }

    const updateData = node
      ? {
          productId: editingProduct.wix_id,
          register_token: registerToken,
          register_price: registerUSD,
          node_token: nodeStakeToken,
          node_price: nodeStakeAmount,
          stake_one,
          stake_two,
          stake_one_usd,
          stake_two_usd,
          stake_token: stakeToken
        }
      : {
          productId: editingProduct.wix_id,
          register_token: registerToken,
          register_price: registerUSD,
          stake_one,
          stake_two,
          stake_one_usd,
          stake_two_usd,
          stake_token: stakeToken
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

  function formatDate(date: Date) {
    date = new Date(date);
    let day = date.getDate().toString().padStart(2, '0');
    let month = (date.getMonth() + 1).toString().padStart(2, '0'); // January is 0
    let year = date.getFullYear();
    let hours = date.getHours().toString().padStart(2, '0');
    let minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  // Helper to format stake value for display
  const formatStakeValue = (product: Product, tier: 'one' | 'two') => {
    const usdValue = tier === 'one' 
      ? product.reward.stake?.stake_one_usd ?? 0
      : product.reward.stake?.stake_two_usd ?? 0;
    const tokenValue = tier === 'one'
      ? product.reward.stake?.stake_one ?? 0
      : product.reward.stake?.stake_two ?? 0;
    
    if (usdValue > 0) {
      return `$${usdValue.toLocaleString()}`;
    }
    return `${tokenValue.toLocaleString()} FRY`;
  };

  // Helper to determine product's stake mode
  const getProductStakeMode = (product: Product): 'usd' | 'token' => {
    return (product.reward.stake?.stake_one_usd ?? 0) > 0 ? 'usd' : 'token';
  };

  // Get selected product names for bulk edit modal
  const getSelectedProductNames = () => {
    return products
      .filter(p => selectedProducts.includes(p.wix_id))
      .map(p => p.name);
  };

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
      <Title>{node === true ? 'Fry Nodes' : 'Fry miners'}</Title>

      {/* Bulk Selection Controls */}
      <div className="flex items-center gap-3 mt-4 mb-2">
        <Button
          variant="secondary"
          size="xs"
          onClick={selectMiners}
        >
          Select Miners
        </Button>
        <Button
          variant="secondary"
          size="xs"
          onClick={selectNodes}
        >
          Select Nodes
        </Button>
        {selectedProducts.length > 0 && (
          <>
            <span className="text-sm text-gray-400">
              {selectedProducts.length} selected
            </span>
            <Button
              variant="primary"
              size="xs"
              onClick={() => setSelectedProducts([])}
            >
              Clear
            </Button>
            <Button
              size="xs"
              onClick={openBulkEditModal}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Edit {selectedProducts.length} products
            </Button>
          </>
        )}
      </div>

      <Table className="mt-2">
        <TableHead>
          <TableRow>
            <TableHeaderCell>
              <input
                type="checkbox"
                checked={getHeaderCheckboxState() === 'checked'}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = getHeaderCheckboxState() === 'indeterminate';
                  }
                }}
                onChange={toggleSelectAll}
                className="w-4 h-4 cursor-pointer"
              />
            </TableHeaderCell>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Key</TableHeaderCell>
            <TableHeaderCell>Register Token</TableHeaderCell>
            <TableHeaderCell>Register Price(USD)</TableHeaderCell>
            {node && (
              <>
                <TableHeaderCell>Node Stake Token</TableHeaderCell>
                <TableHeaderCell>Node Stake Amount(USD)</TableHeaderCell>
              </>
            )}
            <TableHeaderCell>Verify Stake Token</TableHeaderCell>
            <TableHeaderCell>1.5x Verify (24h)</TableHeaderCell>
            <TableHeaderCell>3x Verify (6mo)</TableHeaderCell>
            <TableHeaderCell>Mode</TableHeaderCell>
            <TableHeaderCell>Added on </TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products?.map((product) => (
            <TableRow key={product.wix_id}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product.wix_id)}
                  onChange={() => toggleProductSelection(product.wix_id)}
                  className="w-4 h-4 cursor-pointer"
                />
              </TableCell>
              <TableCell>{product.name}</TableCell>
              <TableCell>
                <Text>{product.key}</Text>
              </TableCell>
              <TableCell>
                {product.reward.tokens?.register &&
                product.reward.tokens?.register !== 'none'
                  ? tokens.find((value) => {
                      return value.asset_id === product.reward.tokens?.register;
                    })?.name
                  : 'None'}
              </TableCell>
              <TableCell>
                <Text>{`${product.reward.stake?.register ?? 0}`}</Text>
              </TableCell>
              {node && (
                <>
                  <TableCell>
                    {product.reward.tokens?.node &&
                    product.reward.tokens?.node !== 'none'
                      ? tokens.find((value) => {
                          return value.asset_id === product.reward.tokens?.node;
                        })?.name
                      : 'None'}
                  </TableCell>
                  <TableCell>
                    <Text>{`${product.reward.stake?.node ?? 0}`}</Text>
                  </TableCell>
                </>
              )}
              <TableCell>
                {product.reward.tokens?.stake &&
                product.reward.tokens?.stake !== 'none'
                  ? tokens.find((value) => {
                      return value.asset_id === product.reward.tokens?.stake;
                    })?.name
                  : 'None'}
              </TableCell>
              <TableCell>
                <Text>{formatStakeValue(product, 'one')}</Text>
              </TableCell>
              <TableCell>
                <Text>{formatStakeValue(product, 'two')}</Text>
              </TableCell>
              <TableCell>
                <Badge color={getProductStakeMode(product) === 'usd' ? 'green' : 'gray'}>
                  {getProductStakeMode(product) === 'usd' ? 'USD' : 'Token'}
                </Badge>
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

      {/* Single Edit Modal */}
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
          <div>
            <label>Register token type:</label>
            <Select
              defaultValue={editingProduct?.reward.tokens?.register ?? 'none'}
              onValueChange={(value) => {
                registerTokenRef.current = value;
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
          <div>
            <label>Register Price (USD):</label>
            <NumberInput
              ref={registerUSDRef}
              defaultValue={editingProduct?.reward.stake?.register ?? 0}
              step={1}
            />
          </div>
          {node && (
            <>
              <div>
                <label>Node Stake token type:</label>
                <Select
                  defaultValue={editingProduct?.reward.tokens?.node ?? 'none'}
                  onValueChange={(value) => {
                    nodeStakeTokenRef.current = value;
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
              <div>
                <label>Node Stake Amount(USD):</label>
                <NumberInput
                  ref={nodeStakeAmountRef}
                  defaultValue={editingProduct?.reward.stake?.node ?? 0}
                  step={1}
                />
              </div>
            </>
          )}

          <div>
            <label>Verify Stake token type:</label>
            <Select
              defaultValue={editingProduct?.reward.tokens?.stake ?? 'none'}
              onValueChange={(value) => {
                stakeTokenRef.current = value;
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

          {/* Stake Mode Toggle */}
          <div className="flex gap-1 mt-4 mb-4">
            <button
              type="button"
              onClick={() => setStakeMode('usd')}
              className={`px-4 py-2 rounded-l-md text-sm font-medium ${
                stakeMode === 'usd'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              USD Peg
            </button>
            <button
              type="button"
              onClick={() => setStakeMode('token')}
              className={`px-4 py-2 rounded-r-md text-sm font-medium ${
                stakeMode === 'token'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              Fixed Token
            </button>
          </div>

          {/* USD Mode Inputs */}
          {stakeMode === 'usd' && (
            <div className="p-3 border border-green-600 rounded bg-green-900/30">
              <p className="text-sm text-green-300 mb-2 font-semibold">USD-Pegged Stakes</p>
              <div>
                <label>1.5x Verify Stake (USD) - 24h Lock:</label>
                <NumberInput
                  ref={stakeOneUsdRef}
                  defaultValue={editingProduct?.reward.stake?.stake_one_usd ?? 0}
                  step={1}
                  min={0}
                />
              </div>
              <div>
                <label>3x Verify Stake (USD) - 6 Month Lock:</label>
                <NumberInput
                  ref={stakeTwoUsdRef}
                  defaultValue={editingProduct?.reward.stake?.stake_two_usd ?? 0}
                  step={1}
                  min={0}
                />
              </div>
            </div>
          )}

          {/* Token Mode Inputs */}
          {stakeMode === 'token' && (
            <div className="p-3 border border-gray-600 rounded bg-gray-800">
              <p className="text-sm text-gray-400 mb-2 font-semibold">Fixed Token Stakes</p>
              <div>
                <label>1.5x Verify Stake ($FRY) - 24h Lock:</label>
                <NumberInput
                  ref={stakeOneRef}
                  defaultValue={editingProduct?.reward.stake?.stake_one ?? 0}
                  step={1}
                />
              </div>
              <div>
                <label>3x Verify Stake ($FRY) - 6 Month Lock:</label>
                <NumberInput
                  ref={stakeTwoRef}
                  defaultValue={editingProduct?.reward.stake?.stake_two ?? 0}
                  step={1}
                />
              </div>
            </div>
          )}

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

      {/* Bulk Edit Modal */}
      <Modal
        isOpen={bulkEditOpen}
        onRequestClose={closeBulkEditModal}
        closeTimeoutMS={500}
        style={modalStyles}
        contentLabel="Bulk Edit Products"
      >
        <h2 className="mb-4">
          <strong>Bulk Edit</strong> - {selectedProducts.length} products
        </h2>
        
        {/* Selected products list */}
        <div className="mb-4 p-2 bg-gray-800 rounded max-h-32 overflow-y-auto">
          <p className="text-sm text-gray-400 mb-1">Selected products:</p>
          <div className="flex flex-wrap gap-1">
            {getSelectedProductNames().map((name, idx) => (
              <span key={idx} className="text-xs bg-gray-700 px-2 py-1 rounded">
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Progress indicator */}
        {bulkProgress.total > 0 && (
          <div className="mb-4 p-3 bg-blue-900/30 border border-blue-600 rounded">
            <p className="text-sm text-blue-300">
              Updating {bulkProgress.current} of {bulkProgress.total} products...
            </p>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <form onSubmit={handleBulkSubmit}>

          {/* Register Fields */}
          <div className="mb-4">
            <label>Register Token:</label>
            <Select
              defaultValue="__nochange__"
              onValueChange={(value) => {
                bulkRegisterTokenRef.current = value === '__nochange__' ? null : value;
              }}
            >
              <SelectItem key="nochange" value="__nochange__">
                No change
              </SelectItem>
              <SelectItem key="none" value="none">
                None
              </SelectItem>
              {tokens?.map((token, index) => (
                <SelectItem key={index + 2} value={token.asset_id}>
                  {token.name}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="mb-4">
            <label>Register Price (USD):</label>
            <NumberInput
              ref={bulkRegisterUsdRef}
              placeholder="Leave empty for no change"
              step={1}
              min={0}
            />
          </div>

          {/* Stake Mode Toggle */}
          <div className="flex gap-1 mt-4 mb-4">
            <button
              type="button"
              onClick={() => setBulkStakeMode('usd')}
              className={`px-4 py-2 rounded-l-md text-sm font-medium ${
                bulkStakeMode === 'usd'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              USD Peg
            </button>
            <button
              type="button"
              onClick={() => setBulkStakeMode('token')}
              className={`px-4 py-2 rounded-r-md text-sm font-medium ${
                bulkStakeMode === 'token'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              Fixed Token
            </button>
          </div>

          {/* USD Mode Inputs */}
          {bulkStakeMode === 'usd' && (
            <div className="p-3 border border-green-600 rounded bg-green-900/30">
              <p className="text-sm text-green-300 mb-2 font-semibold">USD-Pegged Stakes</p>
              <div>
                <label>1.5x Verify Stake (USD) - 24h Lock:</label>
                <NumberInput
                  ref={bulkStakeOneUsdRef}
                  defaultValue={0}
                  step={1}
                  min={0}
                />
              </div>
              <div>
                <label>3x Verify Stake (USD) - 6 Month Lock:</label>
                <NumberInput
                  ref={bulkStakeTwoUsdRef}
                  defaultValue={0}
                  step={1}
                  min={0}
                />
              </div>
            </div>
          )}

          {/* Token Mode Inputs */}
          {bulkStakeMode === 'token' && (
            <div className="p-3 border border-gray-600 rounded bg-gray-800">
              <p className="text-sm text-gray-400 mb-2 font-semibold">Fixed Token Stakes</p>
              <div>
                <label>1.5x Verify Stake ($FRY) - 24h Lock:</label>
                <NumberInput
                  ref={bulkStakeOneRef}
                  defaultValue={0}
                  step={1}
                />
              </div>
              <div>
                <label>3x Verify Stake ($FRY) - 6 Month Lock:</label>
                <NumberInput
                  ref={bulkStakeTwoRef}
                  defaultValue={0}
                  step={1}
                />
              </div>
            </div>
          )}

          <div className="mb-4 mt-4">
            <Button 
              type="submit" 
              className="mr-2 bg-red-500 hover:bg-red-600" 
              variant="primary"
              disabled={bulkProgress.total > 0}
            >
              Apply to All
            </Button>
            <Button 
              onClick={closeBulkEditModal} 
              variant="secondary"
              disabled={bulkProgress.total > 0}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
