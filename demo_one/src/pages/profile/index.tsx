import React from 'react';
import { Card, Avatar, Row, Col, Typography, Statistic, Alert, Button } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { usePrivy } from '@privy-io/react-auth';
import styles from './index.less';

const { Title, Text } = Typography;

interface SubspaceCard {
  id: string;
  name: string;
  image: string;
  proposalCount: number;
  voteCount: number;
}

const HomePage: React.FC = () => {
  const { authenticated, ready } = usePrivy();

  // Mock data - replace with actual data from your backend
  const userProfile = {
    name: 'John Doe',
    avatar: 'https://example.com/avatar.jpg',
  };

  const participationStats = {
    totalKeys: 5,
    proposalCount: 12,
    voteCount: 45,
    inviteCount: 8,
  };

  const userSubspaces: SubspaceCard[] = [
    {
      id: '1',
      name: 'AI Research',
      image: 'https://example.com/subspace1.jpg',
      proposalCount: 5,
      voteCount: 23,
    },
    {
      id: '2',
      name: 'Blockchain Development',
      image: 'https://example.com/subspace2.jpg',
      proposalCount: 3,
      voteCount: 15,
    },
  ];

  if (!ready) {
    return <div>Loading...</div>;
  }

  if (!authenticated) {
    return (
      <div className={styles.container}>
        <Alert
          message="Wallet Connection Required"
          description="Please connect your wallet to view your profile and participation details."
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* User Profile Section */}
      <Card className={styles.profileCard}>
        <div className={styles.profileContent}>
          <Avatar
            size={64}
            src={userProfile.avatar}
            icon={<UserOutlined />}
          />
          <Title level={3} className={styles.userName}>
            {userProfile.name}
          </Title>
        </div>
      </Card>

      {/* Participation Stats Section */}
      <Card className={styles.statsCard}>
        <Title level={4}>Your Participation</Title>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Statistic title="Total Keys" value={participationStats.totalKeys} />
          </Col>
          <Col span={6}>
            <Statistic title="Proposals" value={participationStats.proposalCount} />
          </Col>
          <Col span={6}>
            <Statistic title="Votes" value={participationStats.voteCount} />
          </Col>
          <Col span={6}>
            <Statistic title="Invites" value={participationStats.inviteCount} />
          </Col>
        </Row>
      </Card>

      {/* Subspaces Section */}
      <Card className={styles.subspacesCard}>
        <Title level={4}>Your Subspaces</Title>
        <Row gutter={[16, 24]}>
          {userSubspaces.map((subspace) => (
            <Col xs={24} sm={12} md={12} lg={8} xl={8} key={subspace.id}>
              <Card
                hoverable
                cover={<img alt={subspace.name} src={subspace.image} style={{ aspectRatio: '16/9', objectFit: 'cover' }} />}
              >
                <Card.Meta
                  title={subspace.name}
                  description={
                    <div>
                      <Text>Proposals: {subspace.proposalCount}</Text>
                      <br />
                      <Text>Votes: {subspace.voteCount}</Text>
                    </div>
                  }
                />
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <Button type="primary">
                    Token Launch
                  </Button>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default HomePage;
