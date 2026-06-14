import { useState, useEffect } from 'react';
import {
  Button,
  Callout,
  Dialog,
  DialogPanel,
  Divider,
  NumberInput,
  Select,
  SelectItem,
  Text,
  Title
} from '@tremor/react';
import { RiCloseLine, RiWallet3Line, RiAlertLine } from '@remixicon/react';
import algosdk from 'algosdk';
import { useWallet } from '../lib/use-wallet-compat';
import {
  buildCreateVoteGroup,
  fetchSuggestedParams,
  checkVoteExistsOnChain,
  makeVoteId,
  voteIdToHex,
  submitRawTransactions,
  waitForConfirmationJson,
  GOVERNANCE_ADMIN_ADDRESS,
  VOTE_TYPE
} from '../lib/governance-client';

interface CreateContractVoteProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  vote: {
    id: string;
    title: string;
    description: string;
    optionsCount: number;
  };
  onSuccess?: () => void;
}

const VOTE_TYPE_OPTIONS = [
  { value: VOTE_TYPE.TEMP_CHECK, label: 'Temp Check' },
  { value: VOTE_TYPE.FIP, label: 'FIP (Fry Improvement Proposal)' },
  { value: VOTE_TYPE.CFIP, label: 'cFIP (Community FIP)' }
];

export default function CreateContractVoteModal({
  isOpen,
  setIsOpen,
  vote,
  onSuccess
}: CreateContractVoteProps) {
  const { providers, activeAddress, signTransactions } = useWallet();
  const peraProvider = providers.find(p => p.metadata.id === 'pera');
  
  // Form state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [lockDurationDays, setLockDurationDays] = useState<number>(7);
  const [superMajority, setSuperMajority] = useState<number>(50);
  const [voteType, setVoteType] = useState<number>(VOTE_TYPE.FIP);
  
  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);

  // Initialize dates on mount
  useEffect(() => {
    if (isOpen && !startDate) {
      const now = new Date();
      const start = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days after start
      setStartDate(formatDateForInput(start));
      setEndDate(formatDateForInput(end));
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setStatus(null);
      setSuccess(false);
      setTxId(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  function formatDateForInput(date: Date): string {
    return date.toISOString().slice(0, 16);
  }

  const handleConnect = async () => {
    if (peraProvider) {
      try {
        await peraProvider.connect();
      } catch (err: any) {
        setError(err.message || 'Failed to connect wallet');
      }
    }
  };

  const handleDisconnect = async () => {
    if (peraProvider) {
      try {
        await peraProvider.disconnect();
      } catch (err: any) {
        setError(err.message || 'Failed to disconnect wallet');
      }
    }
  };

  const handleSubmit = async () => {
    if (!activeAddress) {
      setError('Please connect your wallet first');
      return;
    }

    if (!startDate || !endDate) {
      setError('Please set start and end dates');
      return;
    }

    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    if (endTimestamp <= startTimestamp) {
      setError('End date must be after start date');
      return;
    }

    if (lockDurationDays < 0 || lockDurationDays > 365) {
      setError('Lock duration must be between 0 and 365 days');
      return;
    }

    if (superMajority < 0 || superMajority > 100) {
      setError('Super majority must be between 0 and 100');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setStatus('Checking if vote already exists on-chain...');

    try {
      // Check if vote already exists
      const voteId = makeVoteId(vote.title);
      const exists = await checkVoteExistsOnChain(voteId);
      if (exists) {
        setError('A vote with this title already exists on-chain');
        setIsProcessing(false);
        return;
      }

      setStatus('Fetching transaction parameters...');
      const suggestedParams = await fetchSuggestedParams();

      setStatus('Building transaction...');
      const lockDurationSeconds = lockDurationDays * 24 * 60 * 60;
      const txns = buildCreateVoteGroup({
        title: vote.title,
        optionsCount: vote.optionsCount,
        endDate: endTimestamp,
        lockDuration: lockDurationSeconds,
        superMajority,
        voteType,
        senderAddress: activeAddress,
        suggestedParams
      });

      setStatus('Please sign in your Pera Wallet...');
      const encodedTxns = txns.map(txn => algosdk.encodeUnsignedTransaction(txn));
      const signedTxns = await signTransactions(encodedTxns);

      setStatus('Submitting transaction to mainnet...');
      const { txId: id } = await submitRawTransactions(signedTxns);
      setTxId(id);

      setStatus('Waiting for on-chain confirmation...');
      const { confirmedRound } = await waitForConfirmationJson(id, 4);

      setStatus('Saving to database...');
      const contractVoteIdHex = voteIdToHex(voteId);
      
      const response = await fetch('/api/governance/confirm-contract-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voteDocId: vote.id,
          contractVoteId: contractVoteIdHex,
          contractTxId: id,
          startDate: startTimestamp,
          endDate: endTimestamp
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to save to database');
      }

      setSuccess(true);
      setStatus(null);
      console.log(`Contract vote created: txId=${id}, round=${confirmedRound}`);

      setTimeout(() => {
        setIsOpen(false);
        onSuccess?.();
      }, 2000);

    } catch (err: any) {
      console.error('Failed to create contract vote:', err);
      setStatus(null);
      if (err.message?.includes('rejected') || err.message?.includes('cancelled')) {
        setError('Transaction was cancelled');
      } else if (err.message?.includes('overspend')) {
        setError('Insufficient ALGO balance for transaction');
      } else {
        setError(err.message || 'Failed to create contract vote');
      }
    }

    setIsProcessing(false);
  };

  const isWrongWallet = activeAddress && activeAddress !== GOVERNANCE_ADMIN_ADDRESS;

  return (
    <Dialog open={isOpen} onClose={() => !isProcessing && setIsOpen(false)} static className="z-[100]">
      <DialogPanel className="max-w-lg bg-gray-900 border border-gray-700 rounded-xl">
        <div className="absolute right-0 top-0 pr-3 pt-3">
          <button
            type="button"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            onClick={() => !isProcessing && setIsOpen(false)}
            disabled={isProcessing}
          >
            <RiCloseLine className="h-5 w-5" />
          </button>
        </div>

        <Title className="text-white">Create Contract Vote</Title>
        <Text className="text-gray-400 mt-1">
          <span className="font-medium text-white">{vote.title}</span>
        </Text>
        <Text className="text-gray-500 text-sm mt-1 line-clamp-2">
          {vote.description}
        </Text>

        <Divider className="border-gray-700" />

        {/* Wallet Connection */}
        <div className="mb-4">
          {!activeAddress ? (
            <Button
              color="blue"
              onClick={handleConnect}
              disabled={isProcessing}
              icon={RiWallet3Line}
              className="w-full"
            >
              Connect Pera Wallet
            </Button>
          ) : (
            <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
              <div>
                <Text className="text-gray-400 text-xs">Connected</Text>
                <Text className="text-white font-mono text-sm">
                  {activeAddress.slice(0, 8)}...{activeAddress.slice(-6)}
                </Text>
              </div>
              <Button
                size="xs"
                color="gray"
                onClick={handleDisconnect}
                disabled={isProcessing}
              >
                Disconnect
              </Button>
            </div>
          )}
        </div>

        {/* Wrong Wallet Warning */}
        {isWrongWallet && (
          <Callout
            title="Wrong Wallet"
            color="amber"
            icon={RiAlertLine}
            className="mb-4"
          >
            Connected wallet is not the governance admin wallet. The transaction will fail on-chain.
          </Callout>
        )}

        {/* Error/Status Messages */}
        {error && (
          <Callout title="Error" color="rose" className="mb-4">
            {error}
          </Callout>
        )}
        {success && (
          <Callout title="Success" color="emerald" className="mb-4">
            Contract vote created on-chain!
            {txId && (
              <a
                href={`https://allo.info/tx/${txId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-1 text-emerald-300 underline"
              >
                View on Allo.info
              </a>
            )}
          </Callout>
        )}
        {status && (
          <Callout title="Processing" color="blue" className="mb-4">
            {status}
          </Callout>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Start Date</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isProcessing || success}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">End Date</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isProcessing || success}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Lock Duration (days)</label>
              <NumberInput
                value={lockDurationDays}
                onValueChange={(v) => setLockDurationDays(v ?? 7)}
                min={0}
                max={365}
                disabled={isProcessing || success}
                className="bg-gray-800 border-gray-600"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Super Majority (%)</label>
              <NumberInput
                value={superMajority}
                onValueChange={(v) => setSuperMajority(v ?? 50)}
                min={0}
                max={100}
                disabled={isProcessing || success}
                className="bg-gray-800 border-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Vote Type</label>
            <Select
              value={voteType.toString()}
              onValueChange={(v) => setVoteType(parseInt(v))}
              disabled={isProcessing || success}
              className="bg-gray-800 border-gray-600"
            >
              {VOTE_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value.toString()}>
                  {opt.label}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="text-sm text-gray-500 space-y-1 pt-2">
            <div className="flex justify-between">
              <span>Options count:</span>
              <span className="text-white">{vote.optionsCount}</span>
            </div>
            <div className="flex justify-between">
              <span>MBR cost:</span>
              <span className="text-white">~0.104 ALGO</span>
            </div>
          </div>
        </div>

        <Divider className="border-gray-700" />

        <div className="flex gap-3">
          <Button
            color="gray"
            className="flex-1"
            onClick={() => setIsOpen(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            color="blue"
            className="flex-1"
            onClick={handleSubmit}
            disabled={isProcessing || success || !activeAddress}
          >
            {isProcessing ? 'Processing...' : 'Create On-Chain Vote'}
          </Button>
        </div>
      </DialogPanel>
    </Dialog>
  );
}
