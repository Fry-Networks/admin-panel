import {
  Button,
  Callout,
  Flex,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  TextInput
} from '@tremor/react';
import { FryToken } from '../../lib/tokens-schema';
import { useRef, useState } from 'react';
import Modal from 'react-modal';
import { modalStyles } from '../../lib/modal-styles';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

export default function TokensTable({
  tokens,
  setTokens
}: {
  tokens: FryToken[];
  setTokens: (tokens: FryToken[]) => void;
}) {
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openDeleteAllModal, setOpenDeleteAllModal] = useState(false);
  const addTokenNameRef = useRef<HTMLInputElement>(null);
  const addTokenAssetIdRef = useRef<HTMLInputElement>(null);
  const editTokenNameRef = useRef<HTMLInputElement>(null);
  const editTokenAssetIdRef = useRef<HTMLInputElement>(null);
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const handleCloseAddModal = () => {
    setOpenAddModal(false);
  };

  const handleCloseDeleteAllModal = () => {
    setOpenDeleteAllModal(false);
  };

  const handleCloseDeleteModal = () => {
    setOpenDeleteModal(false);
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
  };

  const handleAddSubmit = async (e: any) => {
    e.preventDefault();

    const addTokenName = addTokenNameRef.current?.value;
    const addTokenAssetId = addTokenAssetIdRef.current?.value;

    // console.log(`Name: ${addTokenName}, AssetId: ${addTokenAssetId}`);

    const existingTokens =
      tokens && tokens.length > 0
        ? tokens.find((token) => {
            return token.asset_id === addTokenAssetId;
          })
        : undefined;

    if (existingTokens) {
      setUpdateSuccess('error');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3_000);
      handleCloseAddModal();
      return;
    }

    const addTokenData = {
      name: addTokenName,
      asset_id: addTokenAssetId
    };

    try {
      const response = await fetch('api/add-token', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addTokenData)
      });

      if (!response.ok) {
        setUpdateSuccess('error');
        setTimeout(() => {
          setUpdateSuccess('');
        }, 3_000);
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }

      const result = await response.json();
      if (result.status === 'error') {
        setUpdateSuccess('error');
        setTimeout(() => {
          setUpdateSuccess('');
        }, 3_000);
        throw new Error(`Failed to add new token to database`);
      }

      setUpdateSuccess('New token has been successfully added.');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3_000);

      let updatedTokens =
        tokens && tokens.length > 0
          ? [
              ...tokens,
              {
                name: addTokenName,
                asset_id: addTokenAssetId
              } as FryToken
            ]
          : [
              {
                name: addTokenName,
                asset_id: addTokenAssetId
              } as FryToken
            ];

      setTokens(updatedTokens);
    } catch (error) {
      console.error(error);
    }
    handleCloseAddModal();
  };

  const handleEditSubmit = async (e: any) => {
    e.preventDefault();

    const updateTokenName = editTokenNameRef.current?.value;
    const updateTokenAssetId = editTokenAssetIdRef.current?.value;

    if (
      !updateTokenName ||
      !updateTokenAssetId ||
      updateTokenName.length <= 0 ||
      updateTokenAssetId.length <= 0
    ) {
      setUpdateSuccess('error');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3_000);

      handleCloseEditModal();
    }

    const asset_id = tokens[selectedIndex].asset_id;
    try {
      const response = await fetch('api/update-token', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          asset_id: asset_id,
          update_name: updateTokenName,
          update_assetId: updateTokenAssetId
        })
      });

      if (!response.ok) {
        setUpdateSuccess('error');
        setTimeout(() => {
          setUpdateSuccess('');
        }, 3_000);
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success === true) {
        setUpdateSuccess(result.message);
        setTimeout(() => {
          setUpdateSuccess('');
        }, 3_000);

        const updatedTokens = [...tokens];
        updatedTokens[selectedIndex] = {
          name: updateTokenName,
          asset_id: updateTokenAssetId
        } as FryToken;

        setTokens(updatedTokens);
      } else {
        setUpdateSuccess('error');
        setTimeout(() => {
          setUpdateSuccess('');
        }, 3_000);
        throw new Error(`Failed to update token (${asset_id}) information`);
      }
    } catch (error) {
      console.error(error);
    }

    handleCloseEditModal();
  };

  const handleDeleteAllTokens = async () => {
    try {
      const response = await fetch('api/delete-all-tokens');

      if (!response.ok) {
        setUpdateSuccess('error');
        setTimeout(() => {
          setUpdateSuccess('');
        }, 3_000);

        throw new Error(`HTTP error status: ${response.status} `);
      }

      const result = await response.json();
      // console.log(result);
      if (result.success === true) {
        setUpdateSuccess(result.message);
        setTimeout(() => {
          setUpdateSuccess('');
        }, 3_000);
        const updatedTokens: FryToken[] = [];
        setTokens(updatedTokens);
        setSelectedIndex(0);
      } else {
        setUpdateSuccess('error');
        setTimeout(() => {
          setUpdateSuccess('');
        }, 3_000);

        throw new Error(`Failed to delete all tokens from database`);
      }
    } catch (error) {
      console.error(error);
    }
    handleCloseDeleteAllModal();
  };

  const handleDeleteToken = async () => {
    const asset_id = tokens[selectedIndex].asset_id;

    try {
      const response = await fetch('api/delete-token', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_id: asset_id })
      });

      if (!response.ok) {
        setUpdateSuccess('error');
        setTimeout(() => {
          setUpdateSuccess('');
        }, 3_000);

        throw new Error(`HTTP error status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success === true) {
        setUpdateSuccess(result.message);
        setTimeout(() => {
          setUpdateSuccess('');
        }, 3_000);

        const updateTokens = tokens.filter((_, index) => {
          return index !== selectedIndex;
        });

        setTokens(updateTokens);
        setSelectedIndex(0);
      } else {
        setUpdateSuccess('error');
        setTimeout(() => {
          setUpdateSuccess('');
        }, 3_000);

        throw new Error(`Failed to delete token ${asset_id}`);
      }
    } catch (error) {
      console.error(error);
    }

    handleCloseDeleteModal();
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
          Error occurred during action.
        </Callout>
      )}
      <Flex flexDirection="row" className="justify-center gap-3 mt-6">
        <Button onClick={() => setOpenAddModal(true)}>Add Token</Button>
        <Button
          onClick={() => setOpenDeleteAllModal(true)}
          className="bg-red-500 border-red-500 hover:bg-red-700 hover:border-red-500"
        >
          Delete All
        </Button>
      </Flex>
      <Table className="mt-6">
        <TableHead>
          <TableHeaderCell>No</TableHeaderCell>
          <TableHeaderCell>Token Name</TableHeaderCell>
          <TableHeaderCell>Token Asset ID</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableHead>
        <TableBody>
          {tokens &&
            Array.isArray(tokens) &&
            tokens.map((token, index) => {
              return (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{token.name}</TableCell>
                  <TableCell>{token.asset_id}</TableCell>
                  <TableCell>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedIndex(index);
                        setOpenEditModal(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      className="text-red-700 border-red-700 hover:bg-red-50 hover:text-red-700 ml-1"
                      onClick={() => {
                        setSelectedIndex(index);
                        setOpenDeleteModal(true);
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
      <Modal
        isOpen={openAddModal}
        closeTimeoutMS={500}
        style={modalStyles}
        contentLabel="Add Token"
      >
        <Flex flexDirection="col">
          <h2>
            <strong>Add Token</strong>
          </h2>
        </Flex>
        <form onSubmit={handleAddSubmit}>
          <div className="mt-4">
            <label>Token Name:</label>
            <TextInput
              placeholder="Please enter token name"
              required={true}
              ref={addTokenNameRef}
            />
          </div>
          <div className="mt-4">
            <label>Token Asset Id:</label>
            <TextInput
              placeholder="Please enter token asset id"
              required={true}
              ref={addTokenAssetIdRef}
            />
          </div>
          <Flex flexDirection="col" className="mt-4">
            <div>
              <Button type="submit" className="mr-2" variant="primary">
                Add
              </Button>
              <Button onClick={() => handleCloseAddModal()} type="button">
                Close
              </Button>
            </div>
          </Flex>
        </form>
      </Modal>
      <Modal
        isOpen={openDeleteAllModal}
        closeTimeoutMS={500}
        style={modalStyles}
        contentLabel="Delete all tokens"
      >
        <Flex flexDirection="col" className="gap-2">
          <h2>
            <strong>Delete All Tokens</strong>
          </h2>
          <Text>Do you really want to delete all token information?</Text>
          <div>
            <Flex>
              <Button
                className="mr-2"
                variant="primary"
                onClick={() => handleDeleteAllTokens()}
              >
                Yes
              </Button>
              <Button onClick={() => handleCloseDeleteAllModal()}>No</Button>
            </Flex>
          </div>
        </Flex>
      </Modal>
      <Modal
        isOpen={openDeleteModal}
        closeTimeoutMS={500}
        style={modalStyles}
        contentLabel="Delete Token"
      >
        <Flex flexDirection="col" className="gap-2">
          <h2>
            <strong>Delete Token</strong>
          </h2>
          <Text>Do you really want to delete this token?</Text>
          <div>
            <Flex>
              <Button
                className="mr-2"
                variant="primary"
                onClick={() => handleDeleteToken()}
              >
                Yes
              </Button>
              <Button onClick={() => handleCloseDeleteModal()}>No</Button>
            </Flex>
          </div>
        </Flex>
      </Modal>
      {tokens && tokens.length > 0 && (
        <Modal
          isOpen={openEditModal}
          closeTimeoutMS={500}
          style={modalStyles}
          contentLabel="Edit Token"
        >
          <form onSubmit={handleEditSubmit}>
            <div className="mt-4">
              <label>Token Name:</label>
              <TextInput
                placeholder="Please enter token name"
                required={true}
                ref={editTokenNameRef}
                defaultValue={tokens[selectedIndex].name}
              />
            </div>
            <div className="mt-4">
              <label>Token Asset Id:</label>
              <TextInput
                placeholder="Please enter token asset id"
                required={true}
                ref={editTokenAssetIdRef}
                defaultValue={tokens[selectedIndex].asset_id}
              />
            </div>
            <Flex flexDirection="col" className="mt-4">
              <div>
                <Button type="submit" className="mr-2" variant="primary">
                  Edit
                </Button>
                <Button onClick={() => handleCloseEditModal()} type="button">
                  Close
                </Button>
              </div>
            </Flex>
          </form>
        </Modal>
      )}
    </div>
  );
}

