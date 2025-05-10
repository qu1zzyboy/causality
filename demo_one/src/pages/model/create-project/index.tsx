import React, { useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Input, Form, Button, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';

const { TextArea } = Input;

const CreateProjectPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // Get existing projects or initialize empty array
      const existingProjects = JSON.parse(localStorage.getItem('userProjects') || '[]');
      
      // Create new project object
      const newProject = {
        id: Date.now(), // Use timestamp as unique ID
        name: values.projectName,
        description: values.projectDescription,
        imageUrl: values.imageUrl || '/image.png', // Default image if not provided
        createdAt: new Date().toISOString(),
        models: [], // Initialize empty models array
      };

      // Save to localStorage
      localStorage.setItem('userProjects', JSON.stringify([...existingProjects, newProject]));

      message.success('Project created successfully!');
      navigate('/model'); // Navigate back to welcome page
    } catch (error) {
      message.error('Failed to create project');
      console.error('Error creating project:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Create New Project">
      <Card>
        <Form
          form={form}
          layout="vertical"
          name="create_project_form"
          onFinish={onFinish}
          style={{ maxWidth: 600, margin: '0 auto' }}
        >
          <Form.Item
            name="projectName"
            label="Project Name"
            rules={[{ required: true, message: 'Please input the project name!' }]}
          >
            <Input placeholder="Enter project name" />
          </Form.Item>

          <Form.Item
            name="imageUrl"
            label="Project Image URL"
            rules={[
              { type: 'url', message: 'Please enter a valid URL' }
            ]}
          >
            <Input placeholder="Enter project image URL (optional)" />
          </Form.Item>

          <Form.Item
            name="projectDescription"
            label="Project Description"
            rules={[{ required: true, message: 'Please input the project description!' }]}
          >
            <TextArea rows={4} placeholder="Enter project description" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Create Project
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  );
};

export default CreateProjectPage; 