import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tabs, Button, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

interface ProjectData {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  createdAt: string;
  models: any[];
}

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectData | null>(null);

  useEffect(() => {
    // Read project data from localStorage
    const projects = JSON.parse(localStorage.getItem('userProjects') || '[]');
    const currentProject = projects.find((p: ProjectData) => p.id === Number(id));
    setProject(currentProject || null);
  }, [id]);

  if (!project) {
    return <Empty description="Project not found" />;
  }

  const items = [
    {
      key: 'fined_model_square',
      label: 'Fine-tuned Models',
      children: (
        <div className="p-4">
          {project.models && project.models.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {project.models.map((model) => (
                <Card key={model.id} className="hover:shadow-lg transition-shadow">
                  <div className="flex flex-col">
                    <h3 className="text-lg font-bold mb-2">{model.model_name}</h3>
                    <p className="text-gray-600 mb-4">{model.description}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Dataset: {model.dataset}</span>
                      <span>Epochs: {model.num_epochs}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Empty description="No models yet" />
          )}
          <div className="mt-4">
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => navigate(`/model/create?projectId=${project.id}`)}
            >
              Create New Model
            </Button>
          </div>
        </div>
      ),
    },
    {
      key: 'dataset_square',
      label: 'Datasets',
      children: (
        <div className="p-4">
          <Empty description="No datasets yet" />
          <div className="mt-4">
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => navigate(`/model/dataset/create?projectId=${project.id}`)}
            >
              Create New Dataset
            </Button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <p className="text-gray-600 mt-2">{project.description}</p>
      </div>
      <Tabs defaultActiveKey="fined_model_square" items={items} />
    </div>
  );
};

export default ProjectDetailPage; 