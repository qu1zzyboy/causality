import React, { useEffect, useState } from "react";
import { Card, Button, Statistic, message } from "antd";
import { FileTextOutlined, MessageOutlined, PlusOutlined } from "@ant-design/icons";
import { history } from '@umijs/max';
import { eventAPIService } from '@/services/eventAPI';
import { nostrService } from "@/services/nostr";
import { usePrivy } from '@privy-io/react-auth';
import { Relay } from '@ai-chen2050/nostr-tools';
import { toNostrEvent } from '../../../node_modules/@ai-chen2050/nostr-tools/lib/esm/cip/subspace.js';
import { serializeEvent } from '../../../node_modules/@ai-chen2050/nostr-tools/lib/esm/pure.js';
import planetIcon from '../../assets/planet.png';
import './index.less';

interface SubspaceCardProps {
  id: string;
  image: string;
  name: string;
  description: string;
  proposals: number;
  posts: number;
}

const SubspaceCard: React.FC<SubspaceCardProps> = ({
  id,
  image,
  name,
  description,
  proposals,
  posts,
}) => {
  const { signMessage, user } = usePrivy();
  const [loading, setLoading] = useState(false);
  const [mpcPublicKey, setMpcPublicKey] = useState<string | null>(null);

  useEffect(() => {
    const connectRelay = async () => {
      try {
        const relayURL = 'wss://events.teeml.ai';
        console.log('Connecting to relay...');
        const relay = await Relay.connect(relayURL);
        console.log(`Connected to ${relay.url}`);

        // Save relay instance to nostrService
        console.log('Setting relay in nostrService...');
        nostrService.setRelay(relay);
        console.log('Relay set successfully');
      } catch (error) {
        console.error('Failed to connect to relay:', error);
        message.error('Failed to connect to relay');
      }
    };

    connectRelay();

    // Cleanup function
    return () => {
      console.log('Disconnecting relay...');
      nostrService.disconnect();
      console.log('Relay disconnected');
    };
  }, []);

  useEffect(() => {
    if (user) {
      const embeddedWallet = user.linkedAccounts.findLast(account => account.type === 'wallet');
      if (embeddedWallet) {
        setMpcPublicKey(embeddedWallet.address);
        console.log('MPC Wallet Address:', embeddedWallet.address);
      }
    }
  }, [user]);

  const handleEnterSubspace = () => {
    history.push(`/governance/${id}`);
  };

  const handleJoinSubspace = async () => {
    if (!mpcPublicKey) {
      message.error("Please connect your wallet first");
      return;
    }

    try {
      setLoading(true);
      // Create join event
      const joinEvent = await nostrService.createJoinSubspace(id);
      console.log('joinEvent', joinEvent);

      // Convert to Nostr event
      const nostrEvent = toNostrEvent(joinEvent);
      console.log('nostrEvent', nostrEvent);

      // Set pubkey
      nostrEvent.pubkey = mpcPublicKey.slice(2);
      console.log('pubkey set:', nostrEvent.pubkey);

      // Serialize event
      const messageToSign = serializeEvent(nostrEvent);
      console.log('messageToSign:', messageToSign);

      // Sign message
      const signature = await signMessage(messageToSign);
      console.log('signature:', signature);

      // Publish join event
      const signedEvent = await nostrService.publishJoinSubspace(joinEvent, mpcPublicKey.slice(2), signature.slice(2));
      console.log('signedEvent:', signedEvent);

      message.success("Successfully joined the subspace");
    } catch (error) {
      console.error("Error joining subspace:", error);
      message.error("Failed to join subspace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="subspace-card">
      {/* Wrapper for overall card layout: main content on left, button on right */}
      <div className="card-layout-wrapper">
        {/* Main content area: Image + Info Block */}
        <div className="card-main-content">
          {/* Image */}
          <div className="card-image">
            <img
              src={image}
              alt={name}
              className="image"
            />
          </div>
          
          {/* Info block: Title, Description, and Stats */}
          <div className="card-info-block">
            <h2 className="card-title">{name}</h2>
            <p className="card-description">{description}</p>
            {/* Statistics moved under description */}
            <div className="card-stats">
              <Statistic
                title="Proposals"
                value={proposals}
              />
              <Statistic
                title="Posts"
                value={posts}
              />
            </div>
          </div>
        </div> {/* End of card-main-content */}
        
        {/* Action area: Button on the far right */}
        <div className="card-action-area">
          <Button
            type="primary"
            onClick={handleJoinSubspace}
            loading={loading}
            style={{ 
              marginBottom: '12px', 
              width: '100%',
              backgroundColor: '#000000',
              borderColor: '#000000'
            }}
          >
            Join
          </Button>
          <Button
            type="primary"
            onClick={handleEnterSubspace}
            style={{ 
              width: '100%',
              backgroundColor: '#000000',
              borderColor: '#000000'
            }}
          >
            Enter
          </Button>
        </div>
      </div> {/* End of card-layout-wrapper */}
    </Card>
  );
};

const Vote = () => {
  const [subspaces, setSubspaces] = useState<SubspaceCardProps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubspaces = async () => {
      try {
        const events = await eventAPIService.getEventsByKind(30100);
        
        // Process subspace data
        const processedSubspacesPromises = events.map(async (event) => {
          // Get subspace name from tags
          const nameTag = event.tags.find(tag => tag[0] === 'subspace_name');
          const name = nameTag ? nameTag[1] : 'Unnamed Subspace';

          // Get the actual Subspace ID (sid) from tags
          const sidTag = event.tags.find(tag => tag[0] === 'sid');
          const subspaceId = sidTag ? sidTag[1] : null;

          if (!subspaceId) {
            console.error('Subspace ID (sid) not found in event tags:', event);
            return null;
          }

          // Get description and image URL from content
          let description = '';
          let imageUrl = '';
          try {
            const contentObj = JSON.parse(event.content);
            description = contentObj.desc || 'No description available';
            imageUrl = contentObj.img_url || '/image.png';
          } catch (e) {
            description = 'No description available';
            imageUrl = '/image.png';
          }

          let proposalsCount = 0;
          let postsCount = 0;

          try {
            const details = await eventAPIService.getSubspaceDetails(subspaceId);
            proposalsCount = details.keys["30301"] || 0;
            postsCount = details.keys["30300"] || 0;
          } catch (detailError) {
            console.error(`Failed to get details for subspace ${subspaceId}:`, detailError);
          }

          return {
            id: subspaceId,
            name,
            description,
            image: imageUrl,
            proposals: proposalsCount,
            posts: postsCount,
          };
        });

        const resolvedSubspacesWithDetails = await Promise.all(processedSubspacesPromises);
        const validSubspaces = resolvedSubspacesWithDetails.filter(s => s !== null) as SubspaceCardProps[];
        setSubspaces(validSubspaces);
      } catch (error) {
        console.error('Error fetching subspaces:', error);
        message.error('Failed to fetch subspaces');
      } finally {
        setLoading(false);
      }
    };

    fetchSubspaces();
  }, []);

  const handleCreateSubspace = () => {
    history.push('/create-subspace');
  };

  return (
    <div className="vote-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src={planetIcon} alt="planet icon" style={{ marginRight: '8px', height: '24px' }} />
          <h1 className="page-title">Subspaces</h1>
        </div>
      </div>
      <div className="subspace-grid">
        {subspaces.map((subspace) => (
          <SubspaceCard key={subspace.id} {...subspace} />
        ))}
      </div>
    </div>
  );
};

export default Vote;
