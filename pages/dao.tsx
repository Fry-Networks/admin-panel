import {
  Card,
  Text,
  Title,
  Button,
  Flex,
  Icon,
  Callout,
  Divider,
  Badge,
  Select,
  SelectItem,
  Textarea
} from '@tremor/react';
import clientPromise from '../lib/mongoclient';
import { useEffect, useState } from 'react';
import { getSession } from 'next-auth/react';
import '../app/css/devices.css';
import { Vote } from '../lib/vote-schema';

import {
  RiCheckboxCircleFill,
  RiDiscordFill,
  RiTimeLine,
  RiArrowRightLine,
  RiWallet3Line,
  RiLink
} from '@remixicon/react';
import ModalCreateVote from '../components/create-vote';
import ModalChooseAsCurrent from '../components/choose-vote';
import ModalVoteStatus from '../components/vote-status';
import ModalEditVote from '../components/edit-vote';
import CreateContractVoteModal from '../components/create-contract-vote';
import { useWallet } from '../lib/use-wallet-compat';
import { fetchVoteBoxOnChain } from '../lib/algod-server';

type ActivationResult = {
  status: 'success' | 'error';
  message: string;
  payload?: {
    id: string;
    end_date: Date;
    super_majority: boolean;
    hidden: boolean;
  };
};

interface ExtendedVote extends Vote {
  discussion_thread_id?: string;
  discussion_start?: Date;
  discussion_end?: Date;
  status?: string;
  category?: string;
  type?: string;
  implementation_status?: string;
  implementation_notes?: string;
  sequence_number?: number;
  contractVoteId?: string;
  contractTxId?: string;
  onChain?: { source: string; tallies: any };
}

interface CFIPReview {
  _id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  sequence_number?: number;
}

const IMPLEMENTATION_STATUSES = [
  { value: 'queued', label: 'Queued' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'verified', label: 'Verified' }
];

// Helper functions that accept a reference time to avoid hydration mismatch
function getDaysRemaining(endDate: Date | string | undefined, now: Date | null): number {
  if (!endDate || !now) return 0;
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function isDiscussionEnded(endDate: Date | string | undefined, now: Date | null): boolean {
  if (!endDate || !now) return false;
  return new Date(endDate) <= now;
}

export default function DaoPage({ votes, cfipsForReview }: { votes: ExtendedVote[], cfipsForReview: CFIPReview[] }) {
  const { providers, activeAddress } = useWallet();
  const peraProvider = providers.find(p => p.metadata.id === 'pera');
  
  const [voteList, setVoteList] = useState(votes);
  const [cfipList, setCfipList] = useState(cfipsForReview);
  const [isOpen, setIsOpen] = useState(false);
  const [openModalId, setOpenModalId] = useState<string | null>(null);
  const [openStatusModalId, setOpenStatusModalId] = useState<string | null>(null);
  const [openContractVoteModalId, setOpenContractVoteModalId] = useState<string | null>(null);
  const [stakeInfo, setStakeInfo] = useState([]);
  const [voteSelected, setVoteSelected] = useState<Vote | undefined>(undefined);
  const [activationToast, setActivationToast] = useState<ActivationResult | null>(null);
  const [implementationState, setImplementationState] = useState<{[key: string]: {status: string, notes: string}}>({});
  const [founderDecisionReason, setFounderDecisionReason] = useState<{[key: string]: string}>({});
  
  // Client-side time state to avoid hydration mismatch
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Initialize time only on client to prevent hydration mismatch
  useEffect(() => {
    setCurrentTime(new Date());
  }, []);

  useEffect(() => {
    if (!activationToast) return;
    const timer = setTimeout(() => setActivationToast(null), 4000);
    return () => clearTimeout(timer);
  }, [activationToast]);

  const handleWalletConnect = async () => {
    if (peraProvider) {
      try {
        await peraProvider.connect();
      } catch (err) {
        console.error('Wallet connect error:', err);
      }
    }
  };

  const handleWalletDisconnect = async () => {
    if (peraProvider) {
      try {
        await peraProvider.disconnect();
      } catch (err) {
        console.error('Wallet disconnect error:', err);
      }
    }
  };

  const handleOpenModal = (id: any) => {
    setOpenModalId(id);
  };

  const handleCloseModal = () => {
    setOpenModalId(null);
  };

  const handleCloseStatusModal = () => {
    setOpenStatusModalId(null);
  };

  const handleCloseEditModal = () => {
    setVoteSelected(undefined);
  };

  const handleVoteActivated = (result: ActivationResult) => {
    setActivationToast(result);
    if (result.status === 'success' && result.payload) {
      setVoteList((prevVotes) =>
        prevVotes.map((vote) =>
          vote._id.toString() === result.payload!.id
            ? ({
                ...vote,
                current: true,
                end_date: result.payload!.end_date,
                super_majority: result.payload!.super_majority,
                hidden: result.payload!.hidden
              } as unknown as ExtendedVote)
            : vote
        )
      );
      setOpenModalId(null);
    }
  };

  const handleStop = async (id: any) => {
    const updateData = { id: id };
    const response = await fetch('/api/stop-vote', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    window.location.reload();
  };

  const handleDelete = async (id: any) => {
    const updateData = { id: id };
    const response = await fetch('/api/delete-vote', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    window.location.reload();
  };

  const handleState = async (id: any) => {
    const updateState = { id: id };

    const response = await fetch('/api/get-vote-status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateState)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status} Error: ${result.message}`);
    }

    const stakeInformation = result.data;
    setStakeInfo(stakeInformation);
    setOpenStatusModalId(id);
  };

  const handlePostToDiscord = async (voteId: string) => {
    if (!confirm('Post this vote to Discord? This will start the discussion period.')) {
      return;
    }

    try {
      console.log('[Discord] Starting fetch for vote:', voteId);
      const response = await fetch('/api/governance/post-to-discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_id: voteId })
      });
      console.log('[Discord] Response status:', response.status);

      const result = await response.json();
      console.log('[Discord] Response body:', result);

      if (!response.ok) {
        setActivationToast({ status: 'error', message: result.message || 'Failed to post to Discord' });
        return;
      }

      setActivationToast({ status: 'success', message: 'Successfully posted to Discord' });
      window.location.reload();
    } catch (error) {
      console.error('[Discord] Error:', error);
      setActivationToast({ status: 'error', message: 'Error posting to Discord' });
    }
  };

  const handleAdvanceToVote = async (voteId: string) => {
    if (!confirm('Advance this proposal to voting phase? This will open voting.')) {
      return;
    }

    try {
      const response = await fetch('/api/governance/advance-to-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_id: voteId })
      });

      const result = await response.json();
      if (!response.ok) {
        setActivationToast({ status: 'error', message: result.message || 'Failed to advance to vote' });
        return;
      }

      setActivationToast({ status: 'success', message: 'Successfully advanced to voting phase' });
      window.location.reload();
    } catch (error) {
      setActivationToast({ status: 'error', message: 'Error advancing to vote' });
    }
  };

  const handleUpdateImplementation = async (voteId: string) => {
    const state = implementationState[voteId];
    if (!state?.status) {
      setActivationToast({ status: 'error', message: 'Please select a status' });
      return;
    }

    try {
      const response = await fetch('/api/governance/update-implementation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote_id: voteId,
          implementation_status: state.status,
          implementation_notes: state.notes || ''
        })
      });

      const result = await response.json();
      if (!response.ok) {
        setActivationToast({ status: 'error', message: result.message || 'Failed to update implementation' });
        return;
      }

      setActivationToast({ status: 'success', message: 'Implementation status updated' });
      window.location.reload();
    } catch (error) {
      setActivationToast({ status: 'error', message: 'Error updating implementation' });
    }
  };

  const handleFounderDecision = async (cfipId: string, decision: 'approved' | 'vetoed' | 'returned') => {
    const reason = founderDecisionReason[cfipId] || '';
    
    const actionText = {
      approved: 'approve',
      vetoed: 'veto',
      returned: 'return for revision'
    }[decision];

    if (!confirm(`Are you sure you want to ${actionText} this cFIP?`)) {
      return;
    }

    try {
      const response = await fetch('/api/governance/founder-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cfip_id: cfipId,
          decision: decision,
          reason: reason
        })
      });

      const result = await response.json();
      if (!response.ok) {
        setActivationToast({ status: 'error', message: result.message || 'Failed to process decision' });
        return;
      }

      setActivationToast({ status: 'success', message: `cFIP ${decision} successfully` });
      window.location.reload();
    } catch (error) {
      setActivationToast({ status: 'error', message: 'Error processing decision' });
    }
  };

  const handleContractVoteSuccess = () => {
    window.location.reload();
  };

  return (
    <main className="p-4 md:p-10 mx-auto max-w-8xl bg-gray-950">
      {/* Wallet Connection Header */}
      <Flex justifyContent="end" className="mb-4">
        {!activeAddress ? (
          <Button
            color="blue"
            onClick={handleWalletConnect}
            icon={RiWallet3Line}
            size="sm"
          >
            Connect Pera Wallet
          </Button>
        ) : (
          <Flex className="gap-2" alignItems="center">
            <Badge color="green" className="font-mono">
              {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
            </Badge>
            <Button
              color="gray"
              onClick={handleWalletDisconnect}
              size="xs"
            >
              Disconnect
            </Button>
          </Flex>
        )}
      </Flex>

      {/* cFIP Review Queue Section */}
      {cfipList && cfipList.length > 0 && (
        <>
          <Flex
            alignItems="start"
            justifyContent="start"
            flexDirection="row"
            className="mt-6"
          >
            <Title className="text-white">cFIP Founder Review Queue</Title>
          </Flex>
          <Divider className="border-gray-700" />
          <Flex
            alignItems="start"
            justifyContent="start"
            flexDirection="col"
            className="mt-4 mb-8"
          >
            {cfipList.map((cfip) => (
              <Card key={cfip._id} className="mb-4 mx-4 bg-gray-800 border-amber-600 border-2">
                <Flex flexDirection="col" alignItems="start">
                  <Flex flexDirection="row" alignItems="center" className="mb-2">
                    <Badge color="amber" className="mr-2">cFIP</Badge>
                    {cfip.sequence_number && (
                      <Badge color="gray" className="mr-2">#{cfip.sequence_number}</Badge>
                    )}
                    <Title className="text-white">{cfip.title}</Title>
                  </Flex>
                  <Text className="text-gray-300 mb-4">{cfip.description}</Text>
                  
                  <div className="w-full mb-4">
                    <label className="text-sm text-gray-400 mb-1 block">Decision Reason (optional)</label>
                    <Textarea
                      placeholder="Reason for decision..."
                      value={founderDecisionReason[cfip._id] || ''}
                      onValueChange={(value) => setFounderDecisionReason(prev => ({...prev, [cfip._id]: value}))}
                      className="w-full"
                    />
                  </div>
                  
                  <Flex flexDirection="row" justifyContent="start" className="gap-2">
                    <Button
                      color="green"
                      onClick={() => handleFounderDecision(cfip._id, 'approved')}
                    >
                      Approve
                    </Button>
                    <Button
                      color="red"
                      onClick={() => handleFounderDecision(cfip._id, 'vetoed')}
                    >
                      Veto
                    </Button>
                    <Button
                      color="amber"
                      onClick={() => handleFounderDecision(cfip._id, 'returned')}
                    >
                      Return for Revision
                    </Button>
                  </Flex>
                </Flex>
              </Card>
            ))}
          </Flex>
        </>
      )}

      {cfipList && cfipList.length === 0 && (
        <>
          <Flex
            alignItems="start"
            justifyContent="start"
            flexDirection="row"
            className="mt-6"
          >
            <Title className="text-white">cFIP Founder Review Queue</Title>
          </Flex>
          <Divider className="border-gray-700" />
          <Text className="text-gray-400 mt-4 mb-8 mx-4">No cFIPs awaiting review</Text>
        </>
      )}

      {/* Main Votes Section */}
      <Flex
        alignItems="start"
        justifyContent="start"
        flexDirection="row"
        className="mt-6"
      >
        <Title className="text-white">Votes</Title>

        <button
          type="button"
          className="whitespace-nowrap rounded-tremor-default bg-red-500 px-4 py-2 ml-4 text-center text-tremor-default font-medium text-white shadow-tremor-input hover:bg-red-600"
          onClick={() => setIsOpen(true)}
        >
          Create Vote
        </button>
        <div className="sm:max-w-5xl">
          <ModalCreateVote isOpen={isOpen} setIsOpen={setIsOpen} />
        </div>
      </Flex>
      <Divider className="border-gray-700" />
      {activationToast && (
        <Callout
          className="mt-4"
          title={activationToast.status === 'success' ? 'Success' : 'Error'}
          color={activationToast.status === 'success' ? 'teal' : 'red'}
        >
          {activationToast.message}
        </Callout>
      )}
      <Flex
        alignItems="start"
        justifyContent="start"
        flexDirection="col"
        className="mt-6"
      >
        {voteList ? (
          voteList.map((vote, index) => {
            const daysRemaining = getDaysRemaining(vote.discussion_end, currentTime);
            const discussionEnded = isDiscussionEnded(vote.discussion_end, currentTime);
            const isCompleted = !vote.current && vote.total_votes > 0;
            const hasContractVote = !!vote.contractVoteId;
            
            return (
              <Card key={vote._id.toString()} className="mb-4 mx-4 bg-gray-900 border-gray-700">
                <Flex
                  flexDirection="col"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Flex
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="center"
                    className="flex-wrap gap-2"
                  >
                    {vote.current ? (
                      <Icon
                        color="green"
                        size="xl"
                        icon={RiCheckboxCircleFill}
                      />
                    ) : null}
                    
                    {/* Status Badges */}
                    {vote.status && (
                      <Badge color={
                        vote.status === 'draft' ? 'gray' :
                        vote.status === 'discussion' ? 'blue' :
                        vote.status === 'vote' ? 'green' :
                        vote.status === 'approved' ? 'emerald' :
                        vote.status === 'vetoed' ? 'red' : 'gray'
                      }>
                        {vote.status}
                      </Badge>
                    )}
                    
                    {/* On-Chain Badge */}
                    {hasContractVote && (
                      <Badge color={vote.onChain?.source === 'V2' ? 'emerald' : vote.onChain ? 'amber' : 'cyan'}>
                        <Flex alignItems="center" className="gap-1">
                          <Icon icon={RiLink} size="xs" />
                          {vote.onChain ? `${vote.onChain.source} | Tokens: ${vote.onChain.tallies.totalTokens.join(', ')}` : 'On-Chain'}
                        </Flex>
                      </Badge>
                    )}
                    
                    {vote.category && (
                      <Badge color="purple">{vote.category}</Badge>
                    )}
                    
                    {vote.sequence_number && (
                      <Badge color="gray">#{vote.sequence_number}</Badge>
                    )}
                    
                    <Title className="mb-2 text-white text-2xl">
                      {vote.title}
                    </Title>
                  </Flex>
                  <Text className="mb-5 text-gray-300">{vote.description}</Text>
                  
                  {/* Discussion Period Display */}
                  {vote.discussion_thread_id && vote.status === 'discussion' && (
                    <Flex className="mb-4 gap-2" alignItems="center">
                      <Badge color="blue">
                        <Flex alignItems="center" className="gap-1">
                          <Icon icon={RiTimeLine} size="sm" />
                          {currentTime ? (discussionEnded ? 'Discussion ended' : `${daysRemaining} days remaining`) : 'Loading...'}
                        </Flex>
                      </Badge>
                      <Badge color="indigo">Discussion Active</Badge>
                    </Flex>
                  )}
                  
                  {/* Contract Vote Info */}
                  {hasContractVote && vote.contractTxId && (
                    <div className="mb-4 text-center">
                      <a
                        href={`https://allo.info/tx/${vote.contractTxId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-cyan-400 hover:text-cyan-300 underline"
                      >
                        View on Allo.info
                      </a>
                    </div>
                  )}
                </Flex>

                {vote.votes.map((option, optIdx) => {
                  const isV2 = !!(vote as any).vote_version && (vote as any).vote_version === 'v2' && (vote as any).contractVoteId;
                  const chainTokens = isV2 ? (vote as any).onChain?.tallies?.totalTokens?.[optIdx] : null;
                  const chainVoters = isV2 ? (vote as any).onChain?.tallies?.totalVoters?.[optIdx] : null;
                  return (
                  <div key={option.id || optIdx}>
                    <Title className="text-base text-gray-200">
                      {optIdx + 1}. {option.title}
                    </Title>
                    <Text className="text-gray-400">{option.description}</Text>
                    {isV2 ? (
                      (vote as any).onChain ? (
                        <Text className="text-emerald-400">
                          On-Chain: {Number(chainTokens || 0).toLocaleString()} FRY staked ({Number(chainVoters || 0)} voters)
                        </Text>
                      ) : (
                        <Text className="text-amber-400">On-chain data unavailable</Text>
                      )
                    ) : (
                      <Text className="text-gray-400">Votes: {option.votes}</Text>
                    )}
                  </div>
                  );
                })}
                
                <div className="mt-3 flex flex-row flex-wrap justify-center items-center">
                  {/* Create Contract Vote Button - only shown when no contractVoteId */}
                  {!hasContractVote && (
                    <Button
                      color="cyan"
                      className="mr-3 mb-2"
                      onClick={() => setOpenContractVoteModalId(vote._id.toString())}
                      disabled={!activeAddress}
                      title={!activeAddress ? 'Connect wallet first' : undefined}
                      icon={RiLink}
                    >
                      Create Contract Vote
                    </Button>
                  )}
                  
                  {/* Post to Discord Button */}
                  {!vote.discussion_thread_id && (
                    <Button
                      color="red"
                      className="mr-3 mb-2"
                      onClick={() => {
                        console.log('[Discord] Button clicked, vote._id:', vote._id);
                        handlePostToDiscord(vote._id.toString()).catch(err => {
                          console.error('[Discord] Unhandled error:', err);
                          setActivationToast({ status: 'error', message: 'Error posting to Discord' });
                        });
                      }}
                      icon={RiDiscordFill}
                    >
                      Post to Discord
                    </Button>
                  )}
                  
                  {/* Advance to Vote Button */}
                  {vote.status === 'discussion' && discussionEnded && (
                    <Button
                      color="blue"
                      className="mr-3 mb-2"
                      onClick={() => handleAdvanceToVote(vote._id.toString())}
                      icon={RiArrowRightLine}
                    >
                      Advance to Vote
                    </Button>
                  )}
                  
                  {!vote.current ? (
                    <Button
                      color="green"
                      className="mr-3 mb-2"
                      onClick={() => handleOpenModal(vote._id)}
                    >
                      Activate vote
                    </Button>
                  ) : (
                    <Button
                      color="amber"
                      className="mr-3 mb-2"
                      onClick={() => handleStop(vote._id)}
                    >
                      Stop vote
                    </Button>
                  )}
                  <Button
                    color="red"
                    className="mr-3 mb-2"
                    onClick={() => handleDelete(vote._id)}
                  >
                    Delete
                  </Button>
                  <Button
                    color="green"
                    className="mr-3 mb-2"
                    onClick={() => handleState(vote._id)}
                  >
                    View State
                  </Button>
                  <Button color="purple" className="mb-2" onClick={() => setVoteSelected(vote)}>
                    Edit
                  </Button>
                </div>
                
                {/* Implementation Status Controls for completed votes */}
                {isCompleted && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <Title className="text-sm text-gray-400 mb-2">Implementation Status</Title>
                    <Flex className="gap-4" flexDirection="row" alignItems="end">
                      <div className="flex-1">
                        <Select
                          value={implementationState[vote._id.toString()]?.status || vote.implementation_status || ''}
                          onValueChange={(value) => setImplementationState(prev => ({
                            ...prev,
                            [vote._id.toString()]: { 
                              ...prev[vote._id.toString()], 
                              status: value 
                            }
                          }))}
                          placeholder="Select status"
                        >
                          {IMPLEMENTATION_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Textarea
                          placeholder="Implementation notes..."
                          value={implementationState[vote._id.toString()]?.notes || vote.implementation_notes || ''}
                          onValueChange={(value) => setImplementationState(prev => ({
                            ...prev,
                            [vote._id.toString()]: { 
                              ...prev[vote._id.toString()], 
                              notes: value 
                            }
                          }))}
                          className="h-10"
                        />
                      </div>
                      <Button
                        color="blue"
                        onClick={() => handleUpdateImplementation(vote._id.toString())}
                      >
                        Update
                      </Button>
                    </Flex>
                    {vote.implementation_status && (
                      <Badge 
                        color={
                          vote.implementation_status === 'verified' ? 'green' :
                          vote.implementation_status === 'implemented' ? 'emerald' :
                          vote.implementation_status === 'in_progress' ? 'blue' : 'gray'
                        }
                        className="mt-2"
                      >
                        Current: {vote.implementation_status}
                      </Badge>
                    )}
                  </div>
                )}
                
                <ModalChooseAsCurrent
                  index={index}
                  key={vote._id.toString()}
                  isOpen={openModalId === vote._id.toString()}
                  setIsOpen={(value: boolean) =>
                    value
                      ? setOpenModalId(vote._id.toString())
                      : handleCloseModal()
                  }
                  vote={{ id: vote._id.toString(), title: vote.title }}
                  onActivate={handleVoteActivated}
                />
                <ModalVoteStatus
                  isOpen={openStatusModalId === vote._id.toString()}
                  setIsOpen={handleCloseStatusModal}
                  stakeInfo={stakeInfo}
                />
                <ModalEditVote
                  isOpen={voteSelected?._id === vote._id}
                  setIsOpen={handleCloseEditModal}
                  vote={{ id: vote._id.toString(), vote: voteSelected }}
                  index={index}
                  key={vote._id.toString()}
                />
                <CreateContractVoteModal
                  isOpen={openContractVoteModalId === vote._id.toString()}
                  setIsOpen={(open) => setOpenContractVoteModalId(open ? vote._id.toString() : null)}
                  vote={{
                    id: vote._id.toString(),
                    title: vote.title,
                    description: vote.description,
                    optionsCount: vote.votes?.length || 2
                  }}
                  onSuccess={handleContractVoteSuccess}
                />
              </Card>
            );
          })
        ) : (
          <Text className="text-gray-400">No votes found</Text>
        )}
      </Flex>
    </main>
  );
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);

  const testMode = process.env.NEXT_PUBLIC_DAO_TEST === 'true' ? true : false;

  try {
    const client = await clientPromise;
    const db = client.db('main');
    const collectionName = testMode ? 'test-dao' : 'dao';

    const votes = await db
      .collection(collectionName)
      .find({ deleted: { $ne: true } })
      .toArray();

    // Query for cFIPs awaiting founder review
    const cfipsForReview = await db
      .collection(collectionName)
      .find({ 
        type: 'cfip', 
        status: 'founder_review',
        deleted: { $ne: true }
      })
      .toArray();

    // Enrich votes with live on-chain data for V2 votes
    for (const vote of votes) {
      if ((vote as any).contractVoteId) {
        try {
          (vote as any).onChain = await fetchVoteBoxOnChain((vote as any).contractVoteId);
        } catch (e) {
          console.warn('[dao] on-chain read failed:', e);
        }
      }
    }

    return {
      props: { 
        votes: JSON.parse(JSON.stringify(votes)),
        cfipsForReview: JSON.parse(JSON.stringify(cfipsForReview))
      }
    };
  } catch (e) {
    console.error(e);
    return {
      props: { 
        votes: [],
        cfipsForReview: []
      }
    };
  }
}
