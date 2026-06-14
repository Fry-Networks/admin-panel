import {
  Button,
  Dialog,
  DialogPanel,
  Flex,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Title
} from '@tremor/react';
import { useEffect, useState } from 'react';
import Modal from 'react-modal';

export default function ModalVoteStatus({
  isOpen,
  setIsOpen,
  stakeInfo
}: {
  isOpen: boolean;
  setIsOpen: Function;
  stakeInfo: any[];
}) {
  const [optionOneInfo, setOptionOneInfo] = useState<any[]>([]);
  const [optionTwoInfo, setOptionTwoInfo] = useState<any[]>([]);

  useEffect(() => {
    if (stakeInfo.length <= 0) {
      return;
    }

    const oneInfo = stakeInfo.filter((stake) => {
      return stake.voteOption === '0';
    });

    if (oneInfo.length > 0) {
      setOptionOneInfo(oneInfo);
    }

    const twoInfo = stakeInfo.filter((stake) => {
      return stake.voteOption === '1';
    });

    if (twoInfo.length > 0) {
      setOptionTwoInfo(twoInfo);
    }
  }, [stakeInfo]);

  return (
    <Modal
      isOpen={isOpen}
      closeTimeoutMS={500}
      style={customStyles}
      contentLabel="Refund"
    >
      <div className="max-h-[700px]">
        <Flex flexDirection="row-reverse">
          <Button onClick={() => setIsOpen()}>X</Button>
        </Flex>
        <Flex className="mt-2 gap-2" alignItems="start">
          <div className="w-2/4">
            <Title>Option One</Title>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Address</TableHeaderCell>
                  <TableHeaderCell>Votes</TableHeaderCell>
                  <TableHeaderCell>Stakes</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {optionOneInfo.map((info, index) => {
                  return (
                    <TableRow key={index}>
                      <TableCell>{info.address}</TableCell>
                      <TableCell>{info.votes}</TableCell>
                      <TableCell>{info.stakes}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="w-2/4">
            <Title>Option Two</Title>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Address</TableHeaderCell>
                  <TableHeaderCell>Votes</TableHeaderCell>
                  <TableHeaderCell>Stakes</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {optionTwoInfo.map((info, index) => {
                  return (
                    <TableRow key={index}>
                      <TableCell>{info.address}</TableCell>
                      <TableCell>{info.votes}</TableCell>
                      <TableCell>{info.stakes}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Flex>
      </div>
    </Modal>
  );
}

const customStyles = {
  content: {
    backgroundColor: '#111827', // Example background color
    color: '#f9fafb', borderColor: '#374151',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
    minWidth: '320px'
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)' // Example overlay color
  }
};
