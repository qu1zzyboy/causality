import React from 'react';
import { Form, Input, Select, InputNumber, Card, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';

const { TextArea } = Input;

const CreateModelPage: React.FC = () => {
    const [form] = Form.useForm();
    const navigate = useNavigate();

    const onFinish = (values: any) => {
        // Get existing models or initialize empty array
        const existingModels = JSON.parse(localStorage.getItem('userModels') || '[]');

        // Add new model with creation date
        const newModel = {
            ...values,
            id: Date.now(), // Use timestamp as unique ID
            createdAt: new Date().toISOString(),
        };

        // Save to localStorage
        localStorage.setItem('userModels', JSON.stringify([...existingModels, newModel]));

        message.success('Model created successfully');
        navigate('/model');
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Create Fine-tuned Model</h1>
            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{
                    learning_rate: 0.0001,
                    num_epochs: 3,
                    batch_size: 8,
                    lora_rank: 8,
                    lora_alpha: 32,
                }}
            >
                <Card title="Basic Information" className="mb-6">
                    <Form.Item
                        label="Model Name"
                        name="model_name"
                        rules={[{ required: true, message: 'Please input model name' }]}
                    >
                        <Input placeholder="Enter model name" />
                    </Form.Item>

                    <Form.Item
                        label="Model Image URL"
                        name="image_url"
                        rules={[
                            { required: true, message: 'Please input model image URL' },
                            { type: 'url', message: 'Please enter a valid URL' }
                        ]}
                    >
                        <Input placeholder="Enter model image URL" />
                    </Form.Item>

                    <Form.Item
                        label="Description"
                        name="description"
                        rules={[{ required: true, message: 'Please input model description' }]}
                    >
                        <TextArea rows={4} placeholder="Enter model description" />
                    </Form.Item>

                    <Form.Item
                        label="Base Model"
                        name="base_model"
                        rules={[{ required: true, message: 'Please select base model' }]}
                    >
                        <Select placeholder="Select base model">
                            <Select.Option value="llama2-7b">LLaMA2-7B</Select.Option>
                            <Select.Option value="llama2-13b">LLaMA2-13B</Select.Option>
                            <Select.Option value="chatglm2-6b">ChatGLM2-6B</Select.Option>
                            <Select.Option value="qwen-7b">Qwen-7B</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Dataset"
                        name="dataset"
                        rules={[{ required: true, message: 'Please select dataset' }]}
                    >
                        <Select placeholder="Select dataset">
                            <Select.Option value="dataset1">Dataset 1</Select.Option>
                            <Select.Option value="dataset2">Dataset 2</Select.Option>
                            <Select.Option value="dataset3">Dataset 3</Select.Option>
                        </Select>
                    </Form.Item>
                </Card>

                <Card title="Model Parameters" className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item
                            label="Learning Rate"
                            name="learning_rate"
                            rules={[{ required: true, message: 'Please input learning rate' }]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={0.000001}
                                max={0.01}
                                step={0.0001}
                                precision={6}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Number of Epochs"
                            name="num_epochs"
                            rules={[{ required: true, message: 'Please input number of epochs' }]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={1}
                                max={50}
                                step={1}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Batch Size"
                            name="batch_size"
                            rules={[{ required: true, message: 'Please input batch size' }]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={1}
                                max={128}
                                step={1}
                            />
                        </Form.Item>

                        <Form.Item
                            label="LoRA Rank"
                            name="lora_rank"
                            rules={[{ required: true, message: 'Please input LoRA rank' }]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={1}
                                max={64}
                                step={1}
                            />
                        </Form.Item>

                        <Form.Item
                            label="LoRA Alpha"
                            name="lora_alpha"
                            rules={[{ required: true, message: 'Please input LoRA alpha' }]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={1}
                                max={128}
                                step={1}
                            />
                        </Form.Item>
                    </div>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button onClick={() => navigate('/model')}>Cancel</Button>
                    <Button type="primary" htmlType="submit">
                        Create Model
                    </Button>
                </div>
            </Form>
        </div>
    );
};

export default CreateModelPage; 