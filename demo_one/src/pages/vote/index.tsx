import React, { useEffect, useState } from "react";
import { Card, Button, Statistic, message } from "antd";
import { FileTextOutlined, MessageOutlined, PlusOutlined } from "@ant-design/icons";
import { history } from '@umijs/max';
import { eventAPIService } from '@/services/eventAPI';
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
  const handleEnterSubspace = () => {
    history.push(`/governance/${id}`);
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
          <Button color = "default" variant="solid" size="large" onClick={handleEnterSubspace}>
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
        const events = await eventAPIService.getAllEvents();
        
        // Filter events that create subspaces
        const subspaceEvents = events.filter(event => 
          event.kind === 30100 && 
          event.tags.some(tag => tag[0] === 'd' && tag[1] === 'subspace_create')
        );
        console.log('subspaceEvents:', subspaceEvents);
        // Process subspace data
        const processedSubspacesPromises = subspaceEvents.map(async (event) => {
          // Get subspace name from tags
          const nameTag = event.tags.find(tag => tag[0] === 'subspace_name');
          const name = nameTag ? nameTag[1] : 'Unnamed Subspace';

          // Get the actual Subspace ID (sid) from tags
          const sidTag = event.tags.find(tag => tag[0] === 'sid');
          const subspaceId = sidTag ? sidTag[1] : null;

          if (!subspaceId) {
            console.error('Subspace ID (sid) not found in event tags:', event);
            return null; // Skip this event if sid is not found
          }

          // Get description from content
          let description = '';
          try {
            const contentObj = JSON.parse(event.content);
            description = contentObj.desc || 'No description available';
          } catch (e) {
            description = 'No description available';
          }

          // Get image URL from tags
          let imageUrl = '';
          try {
            const contentObj = JSON.parse(event.content);
            imageUrl = contentObj.img_url || '/image.png'; // Default image
          } catch (e) {
            imageUrl = '/image.png'; // Default image
          }

          let proposalsCount = 0;
          let postsCount = 0;

          try {
            // event.id is the sid for the subspace
            const details = await eventAPIService.getSubspaceDetails(subspaceId);
            proposalsCount = details.keys["30301"] || 0;
            postsCount = details.keys["30300"] || 0;
          } catch (detailError) {
            console.error(`Failed to get details for subspace ${subspaceId}:`, detailError);
            // Keep counts as 0 if details fetch fails
          }

          return {
            id: subspaceId, // This is the subspace_id (sid)
            name,
            description,
            image: imageUrl,
            proposals: proposalsCount,
            posts: postsCount,
          };
        });

        const resolvedSubspacesWithDetails = await Promise.all(processedSubspacesPromises);
        // Filter out any nulls that resulted from missing sids
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
