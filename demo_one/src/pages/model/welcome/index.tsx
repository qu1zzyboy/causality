import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Empty } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import welcome from '@/assets/welcome.png';

interface ModelData {
  id: number;
  model_name: string;
  image_url: string;
  dataset: string;
  num_epochs: number;
  batch_size: number;
  description: string;
}

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<ModelData[]>([]);

  useEffect(() => {
    const userModels = JSON.parse(localStorage.getItem('userModels') || '[]');
    setModels(userModels);
  }, []);

  const renderModelList = () => {
    if (models.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-screen">
          <img
            src={welcome}
            alt="welcome"
            style={{ width: '200px', marginBottom: '20px' }}
          />
          <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>Model station</h1>
          <p style={{ maxWidth: '400px', margin: '0 auto 30px', lineHeight: '1.5' }}>
            A one-stop solution to manage your AI models, create, bind, and distribute them with no coding required.
          </p>
          <Button
            type="primary"
            onClick={() => navigate('/model/create')}
            style={{
              padding: '10px 20px',
              height: 'auto',
              fontWeight: 'bold',
            }}
          >
            Create fine-tuned model
          </Button>
        </div>
      );
    }

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Your Models</h1>
          <Button type="primary" onClick={() => navigate('/model/create')}>
            Create New Model
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => (
            <Card key={model.id} className="hover:shadow-lg transition-shadow">
              <div className="flex items-start">
                <div className="w-1/3">
                  <img
                    src={model.image_url}
                    alt={model.model_name}
                    className="w-full h-auto rounded"
                    style={{ maxHeight: '100px', objectFit: 'cover' }}
                  />
                  <div className="mt-2 text-sm">
                    <div className="font-bold">{model.model_name}</div>
                    <div className="text-gray-500">Dataset: {model.dataset}</div>
                  </div>
                </div>
                <div className="w-1/3 px-4">
                  <div className="text-sm">
                    <div className="mb-1">
                      <span className="font-medium">Epochs:</span> {model.num_epochs}
                    </div>
                    <div>
                      <span className="font-medium">Batch:</span> {model.batch_size}
                    </div>
                  </div>
                </div>
                <div className="w-1/3 flex justify-end">
                  <Button
                    type="primary"
                    icon={<MessageOutlined />}
                    onClick={() => navigate(`/model/chat/${model.id}`)}
                  >
                    Chat
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return renderModelList();
};

export default WelcomePage;