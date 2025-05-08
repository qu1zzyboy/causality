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
      {/* Top section: horizontal layout */}
      <div className="card-content">
        {/* Left image */}
        <div className="card-image">
          <img
            src={image}
            alt={name}
            className="image"
          />
        </div>
        
        {/* Middle text section */}
        <div className="card-info">
          <h2 className="card-title">{name}</h2>
          <p className="card-description">{description}</p>
        </div>
        
        {/* Right statistics */}
        <div className="card-stats">
          <Statistic
            title="Proposals"
            value={proposals}
            prefix={<FileTextOutlined />}
          />
          <Statistic
            title="Posts"
            value={posts}
            prefix={<MessageOutlined />}
          />
        </div>
      </div>

      {/* Bottom section: buttons */}
      <div className="card-footer">
        <Button type="primary" size="large" className="enter-button" onClick={handleEnterSubspace}>
          Enter Subspace
        </Button>
      </div>
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

        // Process subspace data
        const processedSubspaces = subspaceEvents.map(event => {
          // Get subspace name from tags
          const nameTag = event.tags.find(tag => tag[0] === 'subspace_name');
          const name = nameTag ? nameTag[1] : 'Unnamed Subspace';

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
            imageUrl = contentObj.img_url || '/image.png';
          } catch (e) {
            imageUrl = '/image.png';
          }

          return {
            id: event.id,
            name,
            description,
            image: imageUrl,
            proposals: 0, // 这些数据需要另外统计
            posts: 0,     // 这些数据需要另外统计
          };
        });

        setSubspaces(processedSubspaces);
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
