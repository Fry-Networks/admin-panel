import {
  Button,
  Flex,
  NumberInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  Text,
  TableHeaderCell,
  TableRow,
  Callout
} from '@tremor/react';
import { Reduction } from '../../lib/reductions-schema';
import Modal from 'react-modal';
import { modalStyles } from '../../lib/modal-styles';
import { useRef, useState } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import EditReductionModal from '../../components/form-edit-reduction';

export default function ReductionsTable({
  reductions,
  count,
  setReductions,
  setShowIndex
}: {
  reductions: Reduction[];
  count: number;
  setReductions: (redcutions: Reduction[]) => void;
  setShowIndex: (index: number) => void;
}) {
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openDeleteAllModal, setOpenDeleteAllModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [updateSuccess, setUpdateSuccess] = useState('');
  const addMaxDeviceCountRef = useRef<HTMLInputElement>(null);
  const addMinDeviceCountRef = useRef<HTMLInputElement>(null);
  const addReductionRef = useRef<HTMLInputElement>(null);
  const editModalRef = useRef<any>(null);

  const handleCloseAddModal = () => {
    setOpenAddModal(false);
  };

  const handleCloseUpdateModal = () => {
    setOpenEditModal(false);
  };

  const handleCloseDeleteModal = () => {
    // console.log('Selected Index: ' + selectedIndex);
    setOpenDeleteModal(false);
    // window.location.reload();
  };

  const handleCloseDeleteAllModal = () => {
    // console.log('Selected Index: ' + selectedIndex);
    setOpenDeleteAllModal(false);
    // window.location.reload();
  };

  const handleAddSubmit = async (e: any) => {
    e.preventDefault();

    const addMaxDeviceCount = parseInt(
      addMaxDeviceCountRef.current?.value || '0',
      10
    );
    const addMinDeviceCount = parseInt(
      addMinDeviceCountRef.current?.value || '0',
      10
    );
    const addReduction = parseInt(addReductionRef.current?.value || '0', 10);

    if (
      addMinDeviceCount === undefined ||
      addMaxDeviceCount === undefined ||
      addReduction === undefined
    ) {
      // console.log('There is an error in form data of Add Redudction');
      return;
    }

    const addReductionData = {
      minDeviceCount: addMinDeviceCount,
      maxDeviceCount: addMaxDeviceCount,
      reduction: addReduction
    };

    try {
      // console.log('Add Reduction: ', addReductionData);

      const response = await fetch('/api/add-reduction', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addReductionData)
      });

      if (!response.ok) {
        setUpdateSuccess('error');
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }

      const result = await response.json();
      // console.log(`Add Reduction: ${result}`);
      setUpdateSuccess('added reduction');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3000);
      const updateReductions = [
        ...reductions,
        {
          minDeviceCount: addMinDeviceCount,
          maxDeviceCount: addMaxDeviceCount,
          reduction: addReduction
        } as Reduction
      ];
      setReductions(updateReductions);
    } catch (error) {
      // console.log(error);
    }
    handleCloseAddModal();
  };

  const handleEditSubmit = async (e: any) => {
    e.preventDefault();

    const updateMaxDeviceCount =
      editModalRef.current?.getValues().maxDeviceCount;
    const updateMinDeviceCount =
      editModalRef.current?.getValues().minDeviceCount;
    const updateReduction = editModalRef.current?.getValues().reduction;

    if (
      updateMaxDeviceCount === undefined ||
      updateMinDeviceCount === undefined ||
      updateReduction === undefined
    ) {
      // console.log('There is an error in form data of Add Redudction');
      return;
    }

    const updateReductionData = {
      index: selectedIndex,
      updatedData: {
        minDeviceCount: updateMinDeviceCount,
        maxDeviceCount: updateMaxDeviceCount,
        reduction: updateReduction
      }
    };

    try {
      // console.log('Update Reduction: ' + updateReductionData);

      const response = await fetch('/api/update-reduction', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateReductionData)
      });

      if (!response.ok) {
        setUpdateSuccess('error');
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success === false) {
        setUpdateSuccess('error');
        throw new Error(`Error occured during action: ${result.message}`);
      }
      setUpdateSuccess(result.message);
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3000);
      const updatedReductions = [...reductions];
      updatedReductions[selectedIndex] = {
        ...updatedReductions[selectedIndex],
        minDeviceCount: updateMinDeviceCount,
        maxDeviceCount: updateMaxDeviceCount,
        reduction: updateReduction
      } as Reduction;
      if (selectedIndex > 0) {
        updatedReductions[selectedIndex - 1] = {
          ...updatedReductions[selectedIndex - 1],
          maxDeviceCount: updateMinDeviceCount - 1
        } as Reduction;
      }

      if (selectedIndex < updatedReductions.length - 1) {
        updatedReductions[selectedIndex + 1] = {
          ...updatedReductions[selectedIndex + 1],
          minDeviceCount: updateMaxDeviceCount + 1
        } as Reduction;
      }
      setReductions(updatedReductions);
    } catch (err) {
      // console.log(err);
    }
    handleCloseUpdateModal();
  };

  const handleDeleteReduction = async () => {
    // console.log(`Delete ${selectedIndex} reduction!`);

    try {
      const response = await fetch('/api/delete-reduction', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ index: selectedIndex })
      });

      if (!response.ok) {
        setUpdateSuccess('error'); // Reset success state
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success === false) {
        throw new Error(`${result.message}`);
      }
      setUpdateSuccess(result.message);
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3000);
      const updateReductions = reductions.filter((_, index) => {
        return index !== selectedIndex;
      });

      if (updateReductions[selectedIndex]) {
        updateReductions[selectedIndex] = {
          ...updateReductions[selectedIndex],
          minDeviceCount: reductions[selectedIndex].minDeviceCount
        } as Reduction;
      }
      setReductions(updateReductions);
      setSelectedIndex(0);
    } catch (error) {
      setUpdateSuccess('error');
      // console.log('Error: ' + error);
    }
    handleCloseDeleteModal();
  };

  const handleDeleteAllReduction = async () => {
    // console.log(`Delete all reductions!`);

    try {
      const response = await fetch('/api/delete-all-reductions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        setUpdateSuccess('error'); // Reset success state
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      setUpdateSuccess(result.message);
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3000);
      setReductions([] as Reduction[]);
      setShowIndex(-1);
      setSelectedIndex(0);
    } catch (error) {
      setUpdateSuccess('error');
      // console.log('Error: ' + error);
    }
    handleCloseDeleteAllModal();
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
          Error occured during action!
        </Callout>
      )}
      <Flex flexDirection="row" className="justify-center gap-3 mt-6">
        <Text>
          {`Registered Device Count: `} <strong>{count}</strong>
        </Text>
        <Button onClick={() => setOpenAddModal(true)}>Add Reduction</Button>
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
          <TableHeaderCell>Min Device Count</TableHeaderCell>
          <TableHeaderCell>Max Device Count</TableHeaderCell>
          <TableHeaderCell>Reduction(%)</TableHeaderCell>
          <TableHeaderCell>Overall Reduction(%)</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableHead>
        <TableBody>
          {Array.isArray(reductions) &&
            reductions?.map((reduction, index) =>
              count > reduction.minDeviceCount &&
              count <= reduction.maxDeviceCount ? (
                <TableRow className="bg-green-100" key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <Text>{reduction.minDeviceCount}</Text>
                  </TableCell>
                  <TableCell>
                    <Text>{reduction.maxDeviceCount}</Text>
                  </TableCell>
                  <TableCell>
                    <Text>{reduction.reduction}</Text>
                  </TableCell>
                  <TableCell>{getTotalReduction(reductions, index)}</TableCell>
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
                    <Button
                      variant="secondary"
                      className="text-yellow-700 border-yellow-700 hover:bg-yellow-50 hover:text-yellow-700 ml-1"
                      onClick={() => {
                        setShowIndex(index);
                      }}
                    >
                      Apply
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <Text>{reduction.minDeviceCount}</Text>
                  </TableCell>
                  <TableCell>
                    <Text>{reduction.maxDeviceCount}</Text>
                  </TableCell>
                  <TableCell>
                    <Text>{reduction.reduction}</Text>
                  </TableCell>
                  <TableCell>{getTotalReduction(reductions, index)}</TableCell>
                  <TableCell>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedIndex(index);
                        editModalRef.current?.setValues({
                          minDeviceCount: reduction.minDeviceCount,
                          maxDeviceCount: reduction.maxDeviceCount,
                          reduction: reduction.reduction
                        });
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
                    <Button
                      variant="secondary"
                      className="text-orange-700 border-orange-700 hover:bg-orange-50 hover:text-orange-700 ml-1"
                      onClick={() => {
                        setShowIndex(index);
                      }}
                    >
                      Apply
                    </Button>
                  </TableCell>
                </TableRow>
              )
            )}
        </TableBody>
      </Table>
      <Modal
        isOpen={openAddModal}
        closeTimeoutMS={500}
        style={modalStyles}
        contentLabel="Add Reduction"
      >
        <Flex flexDirection="col">
          <h2>
            <strong>Add Reduction</strong>
          </h2>
        </Flex>

        <form onSubmit={handleAddSubmit}>
          <div className="mt-4">
            <label>Min device count:</label>
            <NumberInput
              disabled={true}
              defaultValue={
                reductions.length
                  ? reductions[reductions.length - 1].maxDeviceCount + 1
                  : 0
              }
              min={
                reductions.length
                  ? reductions[reductions.length - 1].maxDeviceCount + 1
                  : 0
              }
              ref={addMinDeviceCountRef}
            />
          </div>
          <div className="mt-4">
            <label>Max device count:</label>
            <NumberInput
              defaultValue={
                reductions.length
                  ? reductions[reductions.length - 1].maxDeviceCount + 2
                  : 1
              }
              min={
                reductions.length
                  ? reductions[reductions.length - 1].maxDeviceCount + 2
                  : 1
              }
              ref={addMaxDeviceCountRef}
            />
          </div>
          <div className="mt-4">
            <label>Reduction:</label>
            <NumberInput
              defaultValue={0}
              min={0}
              max={100 - getTotalReduction(reductions)}
              ref={addReductionRef}
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
        isOpen={openDeleteModal}
        closeTimeoutMS={500}
        style={modalStyles}
        contentLabel="Delete Reduction"
      >
        <Flex flexDirection="col" className="gap-2">
          <h2>
            <strong>Delete Reduction</strong>
          </h2>
          <Text>Do you really want to delete this reduction?</Text>
          <div>
            <Flex>
              <Button
                className="mr-2"
                variant="primary"
                onClick={() => handleDeleteReduction()}
              >
                Yes
              </Button>
              <Button onClick={() => handleCloseDeleteModal()}>No</Button>
            </Flex>
          </div>
        </Flex>
      </Modal>
      <Modal
        isOpen={openDeleteAllModal}
        closeTimeoutMS={500}
        style={modalStyles}
        contentLabel="Delete Reduction"
      >
        <Flex flexDirection="col" className="gap-2">
          <h2>
            <strong>Delete All Reductions</strong>
          </h2>
          <Text>Do you really want to delete all reductions?</Text>
          <div>
            <Flex>
              <Button
                className="mr-2"
                variant="primary"
                onClick={() => handleDeleteAllReduction()}
              >
                Yes
              </Button>
              <Button onClick={() => handleCloseDeleteAllModal()}>No</Button>
            </Flex>
          </div>
        </Flex>
      </Modal>
      {reductions.length > 0 && (
        <EditReductionModal
          ref={editModalRef}
          reductions={reductions}
          selectedIndex={selectedIndex}
          openEditModal={openEditModal}
          handleEditSubmit={handleEditSubmit}
          handleCloseUpdateModal={handleCloseUpdateModal}
          customStyles={modalStyles}
        />
      )}
    </div>
  );
}

export function getTotalReduction(
  reductions: Reduction[] = [],
  index?: number
): number {
  if (reductions.length === 0) {
    return 0;
  }

  let totalReduction: number = 0;

  for (
    let i = 0;
    i <= (index !== undefined ? index : reductions.length - 1);
    i++
  ) {
    totalReduction =
      totalReduction +
      Math.floor(((100 - totalReduction) * reductions[i].reduction) / 100);
    // console.log(totalReduction);
  }

  return totalReduction;
}

