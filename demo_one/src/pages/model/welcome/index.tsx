import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Empty, Statistic } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import welcome from '@/assets/welcome.png';
import './index.less';

interface ProjectData {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  createdAt: string;
  models: any[];
}

const ProjectCard: React.FC<ProjectData> = ({
  id,
  name,
  description,
  imageUrl,
  models,
}) => {
  const navigate = useNavigate();

  const handleEnterProject = () => {
    navigate(`/model/project/${id}`);
  };

  return (
    <Card className="project-card">
      <div className="card-layout-wrapper">
        <div className="card-main-content">
          <div className="card-image">
            <img
              src={imageUrl}
              alt={name}
              className="image"
            />
          </div>
          
          <div className="card-info-block">
            <h2 className="card-title">{name}</h2>
            <p className="card-description">{description}</p>
            <div className="card-stats">
              <Statistic
                title="Models"
                value={models?.length || 0}
              />
            </div>
          </div>
        </div>
        
        <div className="card-action-area">
          <Button type="primary" onClick={handleEnterProject}>
            Enter
          </Button>
        </div>
      </div>
    </Card>
  );
};

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectData[]>([]);

  useEffect(() => {
    // Read projects from localStorage
    const userProjects = JSON.parse(localStorage.getItem('userProjects') || '[]');
    setProjects(userProjects);
  }, []);

  const renderProjectList = () => {
    if (projects.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-screen">
          <img
            src={welcome}
            alt="welcome"
            style={{ width: '200px', marginBottom: '20px' }}
          />
          <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>Model graph</h1>
          <p style={{ maxWidth: '400px', margin: '0 auto 30px', lineHeight: '1.5' }}>
            A one-stop solution to manage your AI models, create, bind, and distribute them with no coding required.
          </p>
          <Button
            type="primary"
            onClick={() => navigate('/model/create-project')}
            style={{
              padding: '10px 20px',
              height: 'auto',
              fontWeight: 'bold',
            }}
          >
            Create your project
          </Button>
        </div>
      );
    }

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Your Projects</h1>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/model/create-project')}
          >
            Create New Project
          </Button>
        </div>
        <div className="project-grid">
          {projects.map((project) => (
            <ProjectCard key={project.id} {...project} />
          ))}
        </div>
      </div>
    );
  };

  return renderProjectList();
};

export default WelcomePage;