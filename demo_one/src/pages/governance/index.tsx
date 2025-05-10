import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from '@umijs/max';
import { Card, Timeline, Typography, Button, Avatar, List, Input, Space, Drawer, Progress, Tag, Modal, Form, message } from 'antd';
import { FileTextOutlined, MessageOutlined, UserOutlined, SendOutlined, RightOutlined, PlusOutlined, UserAddOutlined } from '@ant-design/icons';

import { nostrService } from '@/services/nostr';
import { eventAPIService, Event as NostrEvent } from '@/services/eventAPI';
import { usePrivy } from '@privy-io/react-auth';
import { Relay } from '@ai-chen2050/nostr-tools';
// Assuming these paths are correct relative to your project structure and how they are resolved
// Note: Direct .js imports might lead to TS warnings if no .d.ts files are present
import { toNostrEvent as toNostrEventGov } from '../../../node_modules/@ai-chen2050/nostr-tools/lib/esm/cip/cip01/governance.js';
import { serializeEvent } from '../../../node_modules/@ai-chen2050/nostr-tools/lib/esm/pure.js';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Proposal {
  id: string;
  title: string;
  content: string;
  author: string;
  timestamp: string;
  status: 'active' | 'passed' | 'rejected';
  votes: {
    for: number;
    against: number;
  };
  comments: Comment[];
  voters: Voter[];
  originalCreatedAt?: number;
}

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

interface Voter {
  id: string;
  name: string;
  vote: 'for' | 'against';
  timestamp: string;
  votingPower: number;
  content?: string;
}

const Governance = () => {
  const { subspaceId } = useParams<{ subspaceId: string }>();
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [newComment, setNewComment] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isCreateProposalModalVisible, setIsCreateProposalModalVisible] = useState(false);
  const [createProposalForm] = Form.useForm();
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoadingProposals, setIsLoadingProposals] = useState<boolean>(false);

  // State for Create Post Modal
  const [isCreatePostModalVisible, setIsCreatePostModalVisible] = useState(false);
  const [createPostForm] = Form.useForm();
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // State for Comment Submission
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [proposalComments, setProposalComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);

  // State for Voting
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  // State to hold fetched vote counts for the selected proposal's detailed view
  const [detailedVoteCounts, setDetailedVoteCounts] = useState<{ for: number; against: number } | null>(null);
  // State to hold fetched voter details for the drawer
  const [detailedVoters, setDetailedVoters] = useState<Voter[]>([]);

  const { signMessage, user, login, authenticated } = usePrivy();
  const [mpcPublicKey, setMpcPublicKey] = useState<string | null>(null);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const inviterAddress = searchParams.get('inviter');

  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
  const [isProcessingInvite, setIsProcessingInvite] = useState(false);

  useEffect(() => {
    const connectRelay = async () => {
      try {
        // TODO: Consider moving relayURL to a config file
        const relayURL = 'wss://events.teeml.ai';
        // console.log('Connecting to relay for governance...');
        const relayInstance = await Relay.connect(relayURL);
        // console.log(`Connected to ${relayInstance.url} for governance`);
        nostrService.setRelay(relayInstance);
        console.log('Relay set successfully in nostrService for governance');
      } catch (error) {
        console.error('Failed to connect to relay for governance:', error);
        message.error('Failed to connect to relay services. Proposal functionality may be limited.');
      }
    };
    connectRelay();

    // Cleanup function (optional, depends on nostrService behavior)
    return () => {
      // console.log('Disconnecting relay from governance page...');
      // nostrService.disconnect(); // Be cautious if other components rely on this singleton connection
    };
  }, []);

  useEffect(() => {
    if (authenticated && user) {
      const embeddedWallet = user.linkedAccounts.findLast(account => account.type === 'wallet');
      if (embeddedWallet) {
        setMpcPublicKey(embeddedWallet.address);
        // console.log('MPC Wallet Address for Governance:', embeddedWallet.address);
      } else {
        setMpcPublicKey(null);
        // console.log('No MPC wallet found for the user.');
      }
    } else {
      setMpcPublicKey(null);
    }
  }, [user, authenticated]);

  useEffect(() => {
    const fetchProposalsForTimeline = async () => {
      if (!subspaceId) {
        // console.log('Subspace ID not available, clearing proposals.');
        setProposals([]);
        return;
      }
      setIsLoadingProposals(true);
      try {
        // console.log(`Fetching proposals for subspace: ${subspaceId}, kind: 30301`);
        const events: NostrEvent[] = await eventAPIService.queryEvents({
          kinds: [30301],
          sid: [subspaceId],
        });
        // console.log('Fetched raw events for timeline:', events);

        const mappedProposals: Proposal[] = events
          .map(event => {
            let title = 'Untitled Proposal';
            let description = '';
            try {
              if (event.content) {
                const contentObj = JSON.parse(event.content);
                title = contentObj.title || title;
                description = contentObj.description || '';
              }
            } catch (e) {
              console.error('Failed to parse event content for proposal:', event.content, e);
            }
            
            const idToUse = event.id; // Always use the event's own ID as the proposal ID

            return {
              id: idToUse,
              title: title,
              content: description, 
              author: event.pubkey,
              timestamp: new Date(event.created_at * 1000).toLocaleString(),
              status: 'active' as 'active' | 'passed' | 'rejected', // Default status, API doesn't provide this for this query
              votes: { for: 0, against: 0 }, // Default, not from this API
              comments: [], // Default, not from this API
              voters: [], // Default, not from this API
              originalCreatedAt: event.created_at,
            };
          })
          .sort((a, b) => (b.originalCreatedAt || 0) - (a.originalCreatedAt || 0)); // Sort descending

        // console.log('Mapped and sorted proposals:', mappedProposals);
        setProposals(mappedProposals.map(({ originalCreatedAt, ...rest }) => rest as Proposal));
      } catch (error) {
        console.error('Failed to fetch or process proposals:', error);
        message.error('Failed to load proposals.');
        setProposals([]);
      } finally {
        setIsLoadingProposals(false);
      }
    };

    fetchProposalsForTimeline();
  }, [subspaceId]);

  // Function to fetch comments for a given proposalId
  const fetchCommentsForProposal = async (proposalId: string) => {
    if (!subspaceId) return;
    setIsLoadingComments(true);
    try {
      // console.log(`Fetching comments for proposal: ${proposalId} in subspace: ${subspaceId}`);
      const events: NostrEvent[] = await eventAPIService.queryEvents({
        kinds: [30300], // Kind for posts/comments
        sid: [subspaceId],
        "#parent": [proposalId], // Query for posts whose parent is the proposalId
      });
      // console.log('Fetched raw comment events:', events);

      const mappedComments: Comment[] = events
        .map(event => ({
          id: event.id,
          author: event.pubkey,
          content: event.content,
          timestamp: new Date(event.created_at * 1000).toLocaleString(),
          // Add originalCreatedAt for sorting if needed, then remove before setting state
          // originalCreatedAt: event.created_at 
        }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Sort newest first

      // console.log('Mapped and sorted comments:', mappedComments);
      setProposalComments(mappedComments);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      message.error('Failed to load comments for the proposal.');
      setProposalComments([]); // Clear comments on error
    } finally {
      setIsLoadingComments(false);
    }
  };

  // Function to fetch and count votes for a given proposalId
  const fetchProposalVotes = async (proposalId: string, currentSubspaceId: string) => {
    if (!currentSubspaceId) return { counts: { for: 0, against: 0 }, voters: [] };
    // console.log(`Fetching votes for proposal: ${proposalId} in subspace: ${currentSubspaceId}`);
    try {
      const voteEvents: NostrEvent[] = await eventAPIService.queryEvents({
        kinds: [30302], // Kind for vote events
        sid: [currentSubspaceId],
        "#proposal_id": [proposalId], // Query for votes targeting this proposal_id
      });
      // console.log('Fetched raw vote events:', voteEvents);

      let forVotes = 0;
      let againstVotes = 0;
      const votersList: Voter[] = [];

      voteEvents.forEach(event => {
        const voteTag = event.tags.find(tag => tag[0] === 'vote');
        let voteChoice: 'for' | 'against' | null = null;

        if (voteTag && voteTag.length > 1) {
          if (voteTag[1].toLowerCase() === 'yes') {
            forVotes++;
            voteChoice = 'for';
          } else if (voteTag[1].toLowerCase() === 'no') {
            againstVotes++;
            voteChoice = 'against';
          }
          // TODO: Handle 'abstain' or other vote types if necessary
        }

        if (voteChoice) { // Only add to voters list if a valid vote choice was found
          votersList.push({
            id: event.id,
            name: event.pubkey, // Using pubkey as name for now
            vote: voteChoice,
            timestamp: new Date(event.created_at * 1000).toLocaleString(),
            votingPower: 1, // Placeholder voting power
            content: event.content || '' // Add the vote content
          });
        }
      });
      
      // Sort voters by timestamp, newest first
      votersList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // console.log(`Votes for ${proposalId}: For - ${forVotes}, Against - ${againstVotes}`);
      // console.log('Processed voters list:', votersList);
      return { counts: { for: forVotes, against: againstVotes }, voters: votersList };
    } catch (error) {
      console.error('Failed to fetch proposal votes:', error);
      message.error('Failed to load votes for the proposal.');
      return { counts: { for: 0, against: 0 }, voters: [] }; // Return default on error
    }
  };

  // Effect to fetch comments and votes when selectedProposal changes
  useEffect(() => {
    if (selectedProposal && subspaceId) {
      fetchCommentsForProposal(selectedProposal.id);
      // Fetch votes and update the detailedVoteCounts state
      const getVotesAndVoters = async () => {
        // setIsLoadingProposals(true); // Consider a specific isLoadingVotes state if needed
        const result = await fetchProposalVotes(selectedProposal.id, subspaceId);
        setDetailedVoteCounts(result.counts);
        setDetailedVoters(result.voters);
        // setIsLoadingProposals(false);
      };
      getVotesAndVoters();
    } else {
      setProposalComments([]); // Clear comments if no proposal is selected
      setDetailedVoteCounts(null); // Clear detailed votes
      setDetailedVoters([]); // Clear detailed voters
    }
  }, [selectedProposal, subspaceId]);

  const handleProposalClick = (proposal: Proposal) => {
    setSelectedProposal(proposal);
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) {
      message.error('Comment cannot be empty.');
      return;
    }
    if (!authenticated) {
      message.info('Please log in to comment.');
      login();
      return;
    }
    if (!mpcPublicKey) {
      message.error('MPC Public Key is not available. Please ensure your wallet is connected.');
      return;
    }
    if (!subspaceId) {
      message.error('Subspace ID is missing. Cannot submit comment.');
      return;
    }
    if (!selectedProposal) {
      message.error('No proposal selected to comment on.');
      return;
    }

    setIsSubmittingComment(true);
    try {
      const commentContent = newComment.trim();
      const parentId = selectedProposal.id; // Use proposal id as parentHash for the comment
      const contentType = 'text'; // Test value, or make this 'markdown' if comments support it
      console.log('parentId', parentId);
      // 1. Create post event structure for the comment
      const rawCommentEvent = await nostrService.createPost({
        subspaceID: subspaceId,
        content: commentContent,
        parentHash: parentId,
        contentType: contentType,
      });

      // 2. Prepare event for signing
      const eventForSigning = toNostrEventGov(rawCommentEvent);
      eventForSigning.pubkey = mpcPublicKey.slice(2);

      const messageToSign = serializeEvent(eventForSigning);

      // 3. Request user signature
      const signature = await signMessage(messageToSign);
      if (!signature) {
        throw new Error('Failed to get signature from user for comment.');
      }

      // 4. Publish comment using nostrService.publishPost
      await nostrService.publishPost(
        rawCommentEvent,
        mpcPublicKey.slice(2),
        signature.slice(2)
      );

      message.success('Comment posted successfully!');
      setNewComment(''); // Clear comment input
      // TODO: Refresh comments for the selectedProposal or update local state
      // For example, optimistic update or re-fetch:
      // fetchCommentsForProposal(selectedProposal.id);
      if (selectedProposal) { // Ensure selectedProposal is not null
        fetchCommentsForProposal(selectedProposal.id); // Refresh comments after posting new one
      }

    } catch (error: any) {
      console.error('Failed to submit comment:', error);
      message.error(`Failed to submit comment: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCreateProposalOpen = () => {
    if (!authenticated) {
      message.info('Please log in to create a proposal.');
      login(); // Prompt Privy login
      return;
    }
    if (!mpcPublicKey) {
      message.info('No wallet found. Please ensure your wallet is connected and accessible via Privy.');
      // Optionally, provide guidance or rely on Privy's UI post-login for wallet setup.
      return;
    }
    if (!subspaceId) {
      message.error('Subspace ID is missing. Cannot create a proposal.');
      return;
    }
    setIsCreateProposalModalVisible(true);
  };

  const handleCreateProposalCancel = () => {
    setIsCreateProposalModalVisible(false);
    createProposalForm.resetFields();
  };

  const handleCreateProposalSubmit = async () => {
    if (!subspaceId) {
      message.error('Subspace ID is missing. Cannot submit proposal.');
      return;
    }
    if (!mpcPublicKey) {
      message.error('MPC Public Key is not available. Please ensure your wallet is connected.');
      return;
    }

    try {
      const values = await createProposalForm.validateFields();
      setIsSubmittingProposal(true);

      const proposalDetails = {
        title: values.title,
        description: values.content 
      };
      const contentString = JSON.stringify(proposalDetails);

      // 1. Create propose event structure
      // console.log('1. Creating Nostr propose event structure...');
      const rawProposeEvent = await nostrService.createPropose({
        subspaceID: subspaceId,
        content: contentString,
      });
      // console.log('2. Raw Propose Event created:', JSON.stringify(rawProposeEvent, null, 2));

      // 2. Prepare event for signing
      // console.log('3. Preparing event for signing...');
      const eventForSigning = toNostrEventGov(rawProposeEvent);
      eventForSigning.pubkey = mpcPublicKey.slice(2); // Use Nostr compatible pubkey (no 0x)
      // nostr-tools' finalizeEventBySig usually sets created_at, but ensure it if needed before serializeEvent
      // For now, assume serializeEvent and finalizeEventBySig handle it.
      
      const messageToSign = serializeEvent(eventForSigning);
      // console.log('4. Message to sign:', messageToSign);
      // console.log('   Event for signing structure:', JSON.stringify(eventForSigning, null, 2));


      // 3. Request user signature via Privy
      // console.log('5. Requesting signature via Privy...');
      const signature = await signMessage(messageToSign);
      // console.log('6. Signature received:', signature);

      if (!signature) {
        throw new Error('Failed to get signature from user.');
      }

      // 4. Publish proposal
      // console.log('7. Publishing proposal via nostrService.PublishPropose...');
      await nostrService.PublishPropose(
        rawProposeEvent,      // Pass the original event structure from createPropose
        mpcPublicKey.slice(2), // Nostr compatible pubkey
        signature.slice(2)     // Nostr compatible signature (no 0x)
      );
      
      message.success('Proposal submitted successfully!');
      setIsCreateProposalModalVisible(false);
      createProposalForm.resetFields();
      // TODO: Optionally, refresh the proposals list here
      
    } catch (error: any) {
      console.error('Failed to create proposal:', error);
      message.error(`Failed to create proposal: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  // Handlers for Create Post Modal
  const handleCreatePostOpen = () => {
    if (!authenticated) {
      message.info('Please log in to create a post.');
      login(); // Prompt Privy login
      return;
    }
    if (!mpcPublicKey) {
      message.info('No wallet found. Please ensure your wallet is connected and accessible via Privy.');
      return;
    }
    if (!subspaceId) {
      message.error('Subspace ID is missing. Cannot create a post.');
      return;
    }
    setIsCreatePostModalVisible(true);
  };

  const handleCreatePostCancel = () => {
    setIsCreatePostModalVisible(false);
    createPostForm.resetFields();
  };

  const handleCreatePostSubmit = async () => {
    if (!subspaceId) {
      message.error('Subspace ID is missing. Cannot submit post.');
      return;
    }
    if (!mpcPublicKey) {
      message.error('MPC Public Key is not available. Please ensure your wallet is connected.');
      return;
    }

    try {
      const values = await createPostForm.validateFields();
      setIsSubmittingPost(true);

      const postContentString = values.content; // Content is already a string from TextArea

      // 1. Create post event structure using nostrService.createPost
      // console.log('1. Creating Nostr post event structure...');
      const rawPostEvent = await nostrService.createPost({
        subspaceID: subspaceId,
        content: postContentString,
        contentType: 'markdown', // Defaulting to markdown as per nostr.ts example
        parentHash: '', // Explicitly adding parentHash for root posts
      });
      // console.log('2. Raw Post Event created:', JSON.stringify(rawPostEvent, null, 2));

      // 2. Prepare event for signing (similar to proposal flow)
      // console.log('3. Preparing post event for signing...');
      const eventForSigning = toNostrEventGov(rawPostEvent); // Using toNostrEventGov as it handles events from the same CIP library
      eventForSigning.pubkey = mpcPublicKey.slice(2); // Use Nostr compatible pubkey (no 0x)
      // nostr-tools' finalizeEventBySig usually sets created_at, but ensure it if needed before serializeEvent

      const messageToSign = serializeEvent(eventForSigning);
      // console.log('4. Post message to sign:', messageToSign);
      // console.log('   Post event for signing structure:', JSON.stringify(eventForSigning, null, 2));

      // 3. Request user signature via Privy
      // console.log('5. Requesting signature for post via Privy...');
      const signature = await signMessage(messageToSign);
      // console.log('6. Signature for post received:', signature);

      if (!signature) {
        throw new Error('Failed to get signature from user for post.');
      }

      // 4. Publish post using the new nostrService.publishSignedPost method
      // console.log('7. Publishing post via nostrService.publishSignedPost...');
      await nostrService.publishPost(
        rawPostEvent,          // Pass the original event structure from createPost
        mpcPublicKey.slice(2), // Nostr compatible pubkey (no 0x)
        signature.slice(2)     // Nostr compatible signature (no 0x)
      );
      
      message.success('Post submitted successfully!');
      setIsCreatePostModalVisible(false);
      createPostForm.resetFields();
      // TODO: Optionally, refresh posts list here if you are displaying posts on this page
      
    } catch (error: any) {
      console.error('Failed to create post:', error);
      message.error(`Failed to create post: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Handler for submitting a vote
  const handleVoteSubmit = async (voteChoice: 'yes' | 'no' | 'abstain') => {
    if (!authenticated) {
      message.info('Please log in to vote.');
      login();
      return;
    }
    if (!mpcPublicKey) {
      message.error('MPC Public Key is not available. Please ensure your wallet is connected.');
      return;
    }
    if (!subspaceId) {
      message.error('Subspace ID is missing. Cannot submit vote.');
      return;
    }
    if (!selectedProposal) {
      message.error('No proposal selected to vote on.');
      return;
    }

    setIsSubmittingVote(true);
    try {
      // console.log(`Submitting vote: ${voteChoice} for proposal: ${selectedProposal.id}`);

      // 1. Create vote event structure
      const rawVoteEvent = await nostrService.createVote({
        subspaceID: subspaceId,
        targetId: selectedProposal.id,
        vote: voteChoice,
        content: '' // Empty content as requested
      });
      // console.log('Raw vote event:', JSON.stringify(rawVoteEvent, null, 2));

      // 2. Prepare event for signing
      const eventForSigning = toNostrEventGov(rawVoteEvent);
      eventForSigning.pubkey = mpcPublicKey.slice(2);
      // console.log('Vote event for signing:', JSON.stringify(eventForSigning, null, 2));

      const messageToSign = serializeEvent(eventForSigning);
      // console.log('Message to sign for vote:', messageToSign);

      // 3. Request user signature
      const signature = await signMessage(messageToSign);
      if (!signature) {
        throw new Error('Failed to get signature from user for vote.');
      }
      // console.log('Signature for vote received:', signature);

      // 4. Publish vote
      await nostrService.publishVote(
        rawVoteEvent,
        mpcPublicKey.slice(2),
        signature.slice(2)
      );

      message.success(`Successfully voted '${voteChoice}'!`)
      // TODO: Refresh proposal data to update vote counts or optimistically update UI.
      // For now, a simple console log or perhaps re-fetch proposals might be needed.
      // fetchProposalsForTimeline(); // This would refetch all proposals
      // Or, more targeted, fetch and update just the selectedProposal's vote counts if possible.
      if (selectedProposal && subspaceId) {
        fetchProposalVotes(selectedProposal.id, subspaceId).then(result => {
          setDetailedVoteCounts(result.counts);
          setDetailedVoters(result.voters);
        });
      }

    } catch (error: any) {
      console.error('Failed to submit vote:', error);
      message.error(`Failed to submit vote: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const totalVotes = selectedProposal && detailedVoteCounts ? 
    detailedVoteCounts.for + detailedVoteCounts.against : 
    (selectedProposal ? selectedProposal.votes.for + selectedProposal.votes.against : 0);
  
  const forPercentage = totalVotes ? 
    Math.round(((detailedVoteCounts?.for ?? selectedProposal?.votes.for ?? 0) / totalVotes) * 100) : 0;
  
  const againstPercentage = totalVotes ? 
    Math.round(((detailedVoteCounts?.against ?? selectedProposal?.votes.against ?? 0) / totalVotes) * 100) : 0;

  const displayForVotes = detailedVoteCounts?.for ?? selectedProposal?.votes.for ?? 0;
  const displayAgainstVotes = detailedVoteCounts?.against ?? selectedProposal?.votes.against ?? 0;

  // Add new useEffect for handling invite
  useEffect(() => {
    const handleInvite = async () => {
      if (!inviterAddress || !mpcPublicKey || !subspaceId) return;
      
      try {
        setIsProcessingInvite(true);
        // 1. 创建邀请事件
        const inviteEvent = await nostrService.createInvite({
          subspaceID: subspaceId,
          inviteePubkey: inviterAddress, // 使用邀请人的地址
          content: "Invited by " + inviterAddress,
          rules: "default"
        });
        console.log('inviteEvent', inviteEvent);

        // 2. 转换为 Nostr 事件
        const nostrEvent = toNostrEventGov(inviteEvent);
        console.log('nostrEvent', nostrEvent);

        // 3. 设置 pubkey
        nostrEvent.pubkey = mpcPublicKey.slice(2);
        console.log('pubkey set:', nostrEvent.pubkey);

        // 4. 序列化事件
        const messageToSign = serializeEvent(nostrEvent);
        console.log('messageToSign:', messageToSign);

        // 5. 签名
        const signature = await signMessage(messageToSign);
        console.log('signature:', signature);

        // 6. 发布
        const signedEvent = await nostrService.publishInvite(
          inviteEvent,
          mpcPublicKey.slice(2),
          signature.slice(2)
        );
        console.log('signedEvent:', signedEvent);

        message.success('Successfully joined the subspace!');
      } catch (error) {
        console.error('Error processing invite:', error);
        message.error('Failed to process invite');
      } finally {
        setIsProcessingInvite(false);
      }
    };

    if (inviterAddress && mpcPublicKey) {
      handleInvite();
    }
  }, [inviterAddress, mpcPublicKey, subspaceId]);

  const handleInviteClick = () => {
    if (!mpcPublicKey) {
      message.error('Please connect your wallet first');
      return;
    }
    setIsInviteModalVisible(true);
  };

  const handleInviteModalCancel = () => {
    setIsInviteModalVisible(false);
  };

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/governance/${subspaceId}?inviter=${mpcPublicKey}`;
    navigator.clipboard.writeText(inviteLink);
    message.success('Invite link copied to clipboard!');
  };

  return (
    <div className="p-6">
      <div className="flex gap-6">
        {/* Left timeline */}
        <div className="w-80 flex-shrink-0">
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Proposals Timeline
                <div>
                  <Button 
                    icon={<PlusOutlined />} 
                    onClick={handleCreateProposalOpen} 
                    type="text" 
                    title="Create Proposal"
                  />
                  <Button 
                    icon={<MessageOutlined />} 
                    onClick={handleCreatePostOpen} 
                    type="text" 
                    title="Create Post"
                    style={{ marginLeft: 8 }}
                  />
                  <Button 
                    icon={<UserAddOutlined />} 
                    onClick={handleInviteClick} 
                    type="text" 
                    title="Invite Member"
                    style={{ marginLeft: 8 }}
                  />
                </div>
              </div>
            } 
            className="h-full"
          >
            <Timeline
              pending={isLoadingProposals ? "Loading proposals..." : undefined}
              items={proposals.map(proposal => ({
                color: proposal.status === 'active' ? 'blue' : 
                       proposal.status === 'passed' ? 'green' : 'red',
                children: (
                  <div 
                    className="cursor-pointer hover:bg-gray-50 p-2 rounded"
                    onClick={() => handleProposalClick(proposal)}
                  >
                    <Text strong>{proposal.title}</Text>
                    <br />
                    <Text type="secondary" className="text-sm">
                      {proposal.timestamp}
                    </Text>
                  </div>
                ),
              }))}
            />
          </Card>
        </div>

        {/* Middle proposal details */}
        <div className="flex-1">
          {selectedProposal ? (
            <Card>
              <div className="mb-6">
                <Title level={2}>{selectedProposal.title}</Title>
                <Space className="mb-4">
                  <Avatar icon={<UserOutlined />} />
                  <Text>{selectedProposal.author}</Text>
                  <Text type="secondary">{selectedProposal.timestamp}</Text>
                </Space>
                <Paragraph>{selectedProposal.content}</Paragraph>
                
                {/* Voting statistics - Integrated into main card */}
                <div style={{ marginTop: 24, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={5} style={{ margin: 0 }}>Voting Status</Title>
                    <Button type="link" onClick={() => setDrawerVisible(true)}>
                      View Voting Details
                    </Button>
                  </div>

                  {/* Single combined progress bar */}
                  <Progress 
                    percent={100} // Full bar
                    success={{ percent: forPercentage, strokeColor: '#52c41a' }} // Green for 'For' votes
                    strokeColor="#ff4d4f" // Red for 'Against' votes (the remainder)
                    format={() => ''} // Hide default percentage text on the bar
                    style={{ marginBottom: 8 }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text type="success">For: {displayForVotes} ({forPercentage}%)</Text>
                    <Text type="danger">Against: {displayAgainstVotes} ({againstPercentage}%)</Text>
                  </div>
                  
                  <div>
                    <Text strong>Total Votes: {totalVotes}</Text>
                  </div>
                </div>

                {/* Voting buttons */}
                <Space className="mb-6">
                  <Button 
                    type="primary"
                    onClick={() => handleVoteSubmit('yes')}
                    loading={isSubmittingVote}
                    disabled={isSubmittingVote} // Disable while submitting
                  >
                    Vote For
                  </Button>
                  <Button 
                    danger 
                    onClick={() => handleVoteSubmit('no')}
                    loading={isSubmittingVote}
                    disabled={isSubmittingVote} // Disable while submitting
                  >
                    Vote Against
                  </Button>
                  {/* Optional: Abstain button 
                  <Button 
                    onClick={() => handleVoteSubmit('abstain')}
                    loading={isSubmittingVote}
                    disabled={isSubmittingVote}
                  >
                    Abstain
                  </Button>
                  */}
                </Space>

                {/* Comments section */}
                <div className="mt-8">
                  <Title level={4}>Comments</Title>
                  <List
                    className="mb-6"
                    itemLayout="horizontal"
                    dataSource={proposalComments}
                    loading={isLoadingComments}
                    renderItem={comment => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<Avatar icon={<UserOutlined />} />}
                          title={
                            <Space>
                              <Text strong>{comment.author}</Text>
                              <Text type="secondary">{comment.timestamp}</Text>
                            </Space>
                          }
                          description={comment.content}
                        />
                      </List.Item>
                    )}
                  />

                  <div className="mt-4">
                    <TextArea
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      rows={4}
                      className="mb-2"
                    />
                    <Button 
                      type="primary" 
                      icon={<SendOutlined />}
                      onClick={handleCommentSubmit}
                      loading={isSubmittingComment}
                    >
                      Post Comment
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="text-center py-12">
                <FileTextOutlined className="text-4xl mb-4" />
                <Title level={4}>Select a proposal to view details</Title>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Voting details drawer */}
      <Drawer
        title="Voting Details"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={400}
      >
        {selectedProposal && (
          <div className="space-y-6">
            <div>
              <Title level={4}>Voters</Title>
              <List
                dataSource={detailedVoters}
                renderItem={voter => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={
                        <Space>
                          <Text strong>{voter.name}</Text>
                          <Tag color={voter.vote === 'for' ? 'success' : 'error'}>
                            {voter.vote === 'for' ? 'For' : 'Against'}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={2}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>{voter.timestamp}</Text>
                          {voter.content && <Paragraph style={{ marginTop: 4, fontSize: '13px' }}>{voter.content}</Paragraph>}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          </div>
        )}
      </Drawer>

      {/* Create Proposal Modal */}
      <Modal
        title="Create New Proposal"
        open={isCreateProposalModalVisible}
        onOk={handleCreateProposalSubmit}
        onCancel={handleCreateProposalCancel}
        okText="Submit Proposal"
        cancelText="Cancel"
        confirmLoading={isSubmittingProposal}
      >
        <Form form={createProposalForm} layout="vertical" name="create_proposal_form">
          <Form.Item
            name="title"
            label="Proposal Title"
            rules={[{ required: true, message: 'Please input the title of your proposal!' }]}
          >
            <Input placeholder="Enter proposal title" />
          </Form.Item>
          <Form.Item
            name="content"
            label="Proposal Description"
            rules={[{ required: true, message: 'Please describe your proposal!' }]}
          >
            <TextArea rows={4} placeholder="Explain your proposal in detail" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Post Modal */}
      <Modal
        title="Create New Post"
        open={isCreatePostModalVisible}
        onOk={handleCreatePostSubmit}
        onCancel={handleCreatePostCancel}
        okText="Submit Post"
        cancelText="Cancel"
        confirmLoading={isSubmittingPost}
      >
        <Form form={createPostForm} layout="vertical" name="create_post_form">
          <Form.Item
            name="content"
            label="Post Content"
            rules={[{ required: true, message: 'Please write something for your post!' }]}
          >
            <TextArea rows={4} placeholder="What's on your mind?" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Invite Modal */}
      <Modal
        title="Invite Member"
        open={isInviteModalVisible}
        onCancel={handleInviteModalCancel}
        footer={[
          <Button key="copy" type="primary" onClick={copyInviteLink}>
            Copy Invite Link
          </Button>,
          <Button key="close" onClick={handleInviteModalCancel}>
            Close
          </Button>
        ]}
      >
        <p>Share this link with the member you want to invite:</p>
        <Input.TextArea
          value={`${window.location.origin}/governance/${subspaceId}?inviter=${mpcPublicKey}`}
          readOnly
          autoSize
          style={{ marginTop: 16 }}
        />
      </Modal>

      {/* Processing Invite Modal */}
      <Modal
        title="Processing Invite"
        open={isProcessingInvite}
        footer={null}
        closable={false}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Progress type="circle" percent={100} status="active" />
          <p style={{ marginTop: 16 }}>Processing your invitation...</p>
        </div>
      </Modal>
    </div>
  );
};

export default Governance;
