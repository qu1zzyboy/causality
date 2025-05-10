import React, { useEffect, useRef, useState } from 'react';
import { Card, Avatar, Row, Col, Typography, Statistic, Alert, Button } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { usePrivy } from '@privy-io/react-auth';
import * as echarts from 'echarts';
import { eventAPIService, UserInvites, UserStats } from '@/services/eventAPI';
import styles from './index.less';

const { Title, Text } = Typography;

// Kind constants
const KindSubspaceCreate = 30100;
const KindSubspaceJoin = 30200;
const KindGovernancePost = 30300;
const KindGovernancePropose = 30301;
const KindGovernanceVote = 30302;
const KindGovernanceInvite = 30303;

interface SubspaceCard {
  id: string;
  name: string;
  image: string;
  proposalCount: number;
  voteCount: number;
}

const HomePage: React.FC = () => {
  const { authenticated, ready, user } = usePrivy();
  const chartRef = useRef<HTMLDivElement>(null);
  const [userInvites, setUserInvites] = useState<UserInvites | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  // Calculate total keys based on stats
  const calculateTotalKeys = (stats: UserStats | null): number => {
    if (!stats) return 0;
    
    const totalStats = stats.total_stats;
    return (
      (totalStats[KindSubspaceCreate] || 0) * 10 + // 创建 subspace
      (totalStats[KindSubspaceJoin] || 0) * 1 +    // 加入 subspace
      (totalStats[KindGovernancePost] || 0) * 1 +  // 发言
      (totalStats[KindGovernancePropose] || 0) * 5 + // 提案
      (totalStats[KindGovernanceVote] || 0) * 2 +  // 投票
      (totalStats[KindGovernanceInvite] || 0) * 5   // 邀请
    );
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const embeddedWallet = user.linkedAccounts.findLast(account => account.type === 'wallet');
        if (embeddedWallet) {
          try {
            // Remove '0x' prefix from address
            const address = embeddedWallet.address.slice(2);
            
            // Fetch both invites and stats
            const [invites, stats] = await Promise.all([
              eventAPIService.getUserInvites(embeddedWallet.address),
              eventAPIService.getUserStats(address)
            ]);
            
            setUserInvites(invites);
            setUserStats(stats);
          } catch (error) {
            console.error('Failed to fetch user data:', error);
          }
        }
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    if (chartRef.current && userInvites) {
      const myChart = echarts.init(chartRef.current);

      // 准备节点数据
      const nodes = [];
      const links = [];

      // 添加中心节点（当前用户）
      if (user) {
        const embeddedWallet = user.linkedAccounts.findLast(account => account.type === 'wallet');
        if (embeddedWallet) {
          nodes.push({
            id: embeddedWallet.address,
            name: 'You',
            category: 'Center',
            symbolSize: 30,
            value: userInvites.total_invited
          });
        }
      }

      // 添加被邀请用户节点
      Object.entries(userInvites.invited_users).forEach(([subspaceId, users]) => {
        users.forEach(invitedUser => {
          nodes.push({
            id: invitedUser.user_id,
            name: invitedUser.user_id.slice(0, 6) + '...' + invitedUser.user_id.slice(-4),
            category: 'Referrals',
            symbolSize: 20,
            value: 1
          });

          // 添加连接
          if (user) {
            const embeddedWallet = user.linkedAccounts.findLast(account => account.type === 'wallet');
            if (embeddedWallet) {
              links.push({
                source: embeddedWallet.address,
                target: invitedUser.user_id
              });
            }
          }
        });
      });

      // 设置图表配置
      const option = {
        tooltip: {
          formatter: (params: any) => {
            const data = params.data || {};
            if (data.name) {
              return `
                <div>
                  <div>Address: ${data.id}</div>
                  <div>Name: ${data.name}</div>
                  <div>Invitations: ${data.value}</div>
                </div>
              `;
            }
            return '';
          },
        },
        legend: [
          {
            data: ['Center', 'Referrals']
          }
        ],
        series: [
          {
            type: 'graph',
            layout: 'circular',
            data: nodes,
            links,
            categories: [
              { name: 'Center' },
              { name: 'Referrals' }
            ],
            roam: true,
            label: {
              show: true,
              position: 'right'
            },
            lineStyle: {
              curveness: 0.3
            }
          }
        ]
      };

      myChart.setOption(option);

      // 清理函数
      return () => {
        myChart.dispose();
      };
    }
  }, [userInvites, user]);

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
            icon={<UserOutlined />}
          />
          <Title level={3} className={styles.userName}>
            {user?.linkedAccounts.findLast(account => account.type === 'wallet')?.address.slice(0, 6)}...{user?.linkedAccounts.findLast(account => account.type === 'wallet')?.address.slice(-4)}
          </Title>
        </div>
      </Card>

      {/* Participation Stats Section */}
      <Card className={styles.statsCard}>
        <Title level={4}>Your Participation</Title>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Statistic 
              title="Total Keys" 
              value={calculateTotalKeys(userStats)} 
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Created Subspaces" 
              value={userStats?.total_stats[KindSubspaceCreate] || 0} 
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Joined Subspaces" 
              value={userStats?.total_stats[KindSubspaceJoin] || 0} 
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Posts" 
              value={userStats?.total_stats[KindGovernancePost] || 0} 
            />
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={6}>
            <Statistic 
              title="Proposals" 
              value={userStats?.total_stats[KindGovernancePropose] || 0} 
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Votes" 
              value={userStats?.total_stats[KindGovernanceVote] || 0} 
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Invites" 
              value={userStats?.total_stats[KindGovernanceInvite] || 0} 
            />
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

      {/* Invite Graph Section */}
      <Card className={styles.inviteGraphCard}>
        <Title level={4}>Your Invite Network</Title>
        <div style={{ height: '400px' }} ref={chartRef} />
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Statistic 
              title="Total Invited" 
              value={userInvites?.total_invited || 0} 
            />
          </Col>
          <Col span={12}>
            <Statistic 
              title="Active Subspaces" 
              value={userInvites ? Object.keys(userInvites.subspace_invited).length : 0} 
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default HomePage;
