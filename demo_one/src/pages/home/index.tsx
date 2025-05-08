import React from 'react';
import { Row, Col, Card, Typography, Input, Button, Avatar, Space } from 'antd';
import { SendOutlined, WechatOutlined } from '@ant-design/icons'; // Placeholder for H logo
import styles from './index.less';

const { Title, Text, Paragraph } = Typography;

const suggestionPrompts = [
  {
    title: 'Help me find information or answer a question',
    description: 'Quick info, answers, or help searching',
  },
  {
    title: 'Help me build my AI Avatar!',
    description: 'Quick info, answers, or help searching',
  },
  {
    title: 'What can I do today?',
    description: 'Discover tasks, missions, and rewards.',
  },
];

const HomePage: React.FC = () => {
  return (
    <div className={styles.homePageContainer}>
      {/* Top Logo and Title Area */}
      <div className={styles.logoTitleSection}>
        <Avatar size={64} className={styles.hetuLogo}>
          H
        </Avatar>
        <Title level={1} className={styles.mainTitle}>
          Hetu
        </Title>
        <Text className={styles.subTitle}>AI Avatar</Text>
      </div>

      {/* Suggestion Cards Section */}
      <Row gutter={[24, 24]} className={styles.suggestionCardsRow} justify="center">
        {[1, 2, 3].map((item) => (
          <Col key={item} xs={24} sm={24} md={12} lg={8}>
            <Card className={styles.suggestionCard} bordered={false}>
              <Title level={4} className={styles.cardTitle}>
                Talk to Hetu Agent – Try asking:
              </Title>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {suggestionPrompts.map((prompt, index) => (
                  <div key={index} className={styles.promptBox}>
                    <Text strong>{prompt.title}</Text>
                    <Paragraph type="secondary" className={styles.promptDescription}>
                      {prompt.description}
                    </Paragraph>
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Bottom Send Message Bar */}
      <div className={styles.sendMessageBar}>
        <Input
          size="large"
          placeholder="Send a message"
          className={styles.messageInput}
          suffix={<Button type="text" icon={<SendOutlined />} className={styles.sendButton} />}
        />
      </div>
    </div>
  );
};

export default HomePage;
