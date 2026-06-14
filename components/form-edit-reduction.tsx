import { Button, Flex, NumberInput } from '@tremor/react';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import Modal from 'react-modal';
import { getTotalReduction } from '../app/tables/table-reductions';
import { Reduction } from '../lib/reductions-schema';

interface EditReductionModalProps {
  reductions: Reduction[];
  selectedIndex: number;
  openEditModal: boolean;
  handleEditSubmit: (e: any) => void;
  handleCloseUpdateModal: () => void;
  customStyles: any;
}

const EditReductionModal = forwardRef(
  (
    {
      reductions,
      selectedIndex,
      openEditModal,
      handleEditSubmit,
      handleCloseUpdateModal,
      customStyles
    }: EditReductionModalProps,
    ref
  ) => {
    const [minDeviceCount, setMinDeviceCount] = useState<number>(0);
    const [maxDeviceCount, setMaxDeviceCount] = useState<number>(1);
    const [reduction, setReduction] = useState<number>(0);

    useEffect(() => {
      if (reductions.length && selectedIndex >= 0) {
        setMinDeviceCount(reductions[selectedIndex].minDeviceCount || 0);
        setMaxDeviceCount(reductions[selectedIndex].maxDeviceCount || 0);
        setReduction(reductions[selectedIndex].reduction || 0);
      }
    }, [reductions, selectedIndex]);

    useImperativeHandle(ref, () => ({
      getValues: () => ({
        minDeviceCount,
        maxDeviceCount,
        reduction
      }),
      setValues: (values: {
        minDeviceCount: number;
        maxDeviceCount: number;
        reduction: number;
      }) => {
        setMinDeviceCount(values.minDeviceCount);
        setMaxDeviceCount(values.maxDeviceCount);
        setReduction(values.reduction);
      }
    }));
    return (
      <Modal
        isOpen={openEditModal}
        closeTimeoutMS={500}
        style={customStyles}
        contentLabel="Edit Modal"
      >
        <Flex flexDirection="col">
          <h2>
            <strong>Edit Reductions</strong>
          </h2>
        </Flex>

        <form onSubmit={handleEditSubmit}>
          <div className="mt-4">
            <label>Min device count:</label>
            <NumberInput
              value={minDeviceCount}
              onValueChange={(value) => {
                setMinDeviceCount(value);
                if (maxDeviceCount <= value) {
                  setMaxDeviceCount(value + 1);
                }
              }}
              min={
                selectedIndex > 0
                  ? reductions[selectedIndex - 1].minDeviceCount + 2
                  : 0
              }
              max={
                (selectedIndex < reductions.length - 1 &&
                  reductions[selectedIndex + 1].maxDeviceCount - 2) ||
                Number.MAX_SAFE_INTEGER
              }
            />
          </div>
          <div className="mt-4">
            <label>Max device count:</label>
            <NumberInput
              value={maxDeviceCount}
              onValueChange={(value) => setMaxDeviceCount(value)}
              min={minDeviceCount + 1}
              max={
                selectedIndex < reductions.length - 1
                  ? reductions[selectedIndex + 1].maxDeviceCount - 1
                  : Number.MAX_SAFE_INTEGER
              }
            />
          </div>
          <div className="mt-4">
            <label>Reduction:</label>
            <NumberInput
              value={reduction}
              onValueChange={(value) => setReduction(value)}
              min={0}
              max={
                100 - getTotalReduction() + reductions[selectedIndex].reduction
              }
            />
          </div>
          <Flex flexDirection="col" className="mt-4">
            <div>
              <Button type="submit" className="mr-2" variant="primary">
                Update
              </Button>
              <Button onClick={handleCloseUpdateModal} type="button">
                Close
              </Button>
            </div>
          </Flex>
        </form>
      </Modal>
    );
  }
);

EditReductionModal.displayName = 'EditReductionModal';

export default EditReductionModal;
