import React, { useEffect, useRef, useState } from 'react';
import { Card, Avatar, Row, Col, Typography, Statistic, Alert, Button, Modal, Form, Input, InputNumber, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { usePrivy } from '@privy-io/react-auth';
import * as echarts from 'echarts';
import { eventAPIService, UserInvites, UserStats } from '@/services/eventAPI';
import styles from './index.less';
import { history } from '@umijs/max';
import { nostrService } from '@/services/nostr';
import { serializeEvent } from '../../../node_modules/@ai-chen2050/nostr-tools/lib/esm/pure.js';
import { ethers } from 'ethers';
import {newPostEvent, newVoteEvent, newProposeEvent, newInviteEvent, toNostrEvent as toNostrEventGov,setProposal} from '../../../node_modules/@ai-chen2050/nostr-tools/lib/esm/cip/cip01/governance.js'
import {
  NewSubspaceCreateEvent,
  ValidateSubspaceCreateEvent,
  NewSubspaceJoinEvent,
  ValidateSubspaceJoinEvent,
  toNostrEvent,
} from '../../../node_modules/@ai-chen2050/nostr-tools/lib/esm/cip/subspace.js'
import { Relay } from '../../../node_modules/@ai-chen2050/nostr-tools/lib/esm/relay.js';
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

interface SubspaceCardProps {
  id: string;
  name: string;
  description: string;
  image: string;
  proposals: number;
  posts: number;
}

const HomePage: React.FC = () => {
  const { authenticated, ready, user } = usePrivy();
  const chartRef = useRef<HTMLDivElement>(null);
  const [userInvites, setUserInvites] = useState<UserInvites | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userSubspaces, setUserSubspaces] = useState<SubspaceCardProps[]>([]);
  const [loadingSubspaces, setLoadingSubspaces] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [selectedSubspaceId, setSelectedSubspaceId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const embeddedWallet = user.linkedAccounts.findLast(account => account.type === 'wallet');
        if (embeddedWallet) {
          try {
            // Remove '0x' prefix from address
            const address = embeddedWallet.address.slice(2);
            
            // First fetch invites and stats
            const [invites, stats] = await Promise.all([
              eventAPIService.getUserInvites(embeddedWallet.address),
              eventAPIService.getUserStats(address)
            ]);
            
            setUserInvites(invites);
            setUserStats(stats);

            // Then fetch subspaces with loading state
            setLoadingSubspaces(true);
            try {
              const subspaceEvents = await eventAPIService.getEventsByKind(30100);
              
              // Process subspace events
              const userCreatedSubspaces = subspaceEvents
                .filter(event => event.pubkey === address)
                .map(event => {
                  const nameTag = event.tags.find(tag => tag[0] === 'subspace_name');
                  const sidTag = event.tags.find(tag => tag[0] === 'sid');
                  let description = '';
                  let imageUrl = '';
                  try {
                    const contentObj = JSON.parse(event.content);
                    description = contentObj.desc || 'No description available';
                    imageUrl = contentObj.img_url || '/image.png';
                  } catch (e) {
                    description = 'No description available';
                    imageUrl = '/image.png';
                  }

                  return {
                    id: sidTag ? sidTag[1] : '',
                    name: nameTag ? nameTag[1] : 'Unnamed Subspace',
                    description,
                    image: imageUrl,
                    proposals: 0,
                    posts: 0
                  };
                });

              // Filter out duplicates
              const uniqueSubspaces = Array.from(new Map(userCreatedSubspaces.map(subspace => [subspace.id, subspace])).values());

              // Log subspace IDs to check for duplicates
              const ids = uniqueSubspaces.map(subspace => subspace.id);
              const uniqueIds = new Set(ids);
              if (uniqueIds.size !== ids.length) {
                console.warn('Duplicate subspace IDs found:', ids);
              }

              setUserSubspaces(uniqueSubspaces);
            } finally {
              setLoadingSubspaces(false);
            }
          } catch (error) {
            console.error('Failed to fetch user data:', error);
          }
        }
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    const connectRelay = async () => {
      try {
        const relayURL = 'wss://events.teeml.ai';
        console.log('Connecting to relay...');
        const relay = await Relay.connect(relayURL);
        console.log(`Connected to ${relay.url}`);

        // Save relay instance to nostrService
        console.log('Setting relay in nostrService...');
        nostrService.setRelay(relay);
        console.log('Relay set successfully');
      } catch (error) {
        console.error('Failed to connect to relay:', error);
        message.error('Failed to connect to relay');
      }
    };

    connectRelay();

    // Cleanup function
    return () => {
      console.log('Disconnecting relay...');
      nostrService.disconnect();
      console.log('Relay disconnected');
    };
  }, []);

  // Calculate total keys based on stats
  const calculateTotalKeys = (stats: UserStats | null): number => {
    if (!stats) return 0;
    
    const totalStats = stats.total_stats;
    return (
      (totalStats[KindSubspaceCreate] || 0) * 10 + // Create subspace
      (totalStats[KindSubspaceJoin] || 0) * 1 +    // Join subspace
      (totalStats[KindGovernancePost] || 0) * 1 +  // Post
      (totalStats[KindGovernancePropose] || 0) * 5 + // Propose
      (totalStats[KindGovernanceVote] || 0) * 2 +  // Vote
      (totalStats[KindGovernanceInvite] || 0) * 5   // Invite
    );
  };

  useEffect(() => {
    if (chartRef.current && userInvites) {
      const myChart = echarts.init(chartRef.current);

      // 准备节点数据
      const nodes: any[] = [];
      const links: { source: string; target: string }[] = [];

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

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleMintToken = async (values: any) => {
    try {
      if (!user) {
        throw new Error('Please connect your wallet first');
      }

      const embeddedWallet = user.linkedAccounts.findLast(account => account.type === 'wallet');
      if (!embeddedWallet) {
        throw new Error('No wallet connected');
      }

      const mpcPublicKey = embeddedWallet.address;
      console.log('MPC Wallet Address:', mpcPublicKey);

      const subspaceID = selectedSubspaceId;
      const mintEvent = await nostrService.createMint({ ...values, subspaceID });
      const nostrEvent = toNostrEventGov(mintEvent);
      nostrEvent.pubkey = mpcPublicKey.slice(2);
      console.log('Nostr Event:', nostrEvent);

      // Convert all elements in the tags array to strings
      nostrEvent.tags = nostrEvent.tags.map((tag: any[]) => tag.map(String));

      // Serialize the event

      // Sign the event
      const signature = await signMessage(nostrEvent);
      if (!signature) {
        throw new Error('Signature failed');
      }
      console.log('Signature:', signature);

      // Publish the mint event with address and signature
      const signedMintEvent = await nostrService.publishMint(nostrEvent, mpcPublicKey.slice(2), signature.slice(2));
      console.log('Signed Mint Event:', signedMintEvent);
      message.success('Token minted successfully!');
    } catch (error) {
      console.error('Failed to mint token:', error);
      message.error('Failed to mint token.');
    } finally {
      setIsModalVisible(false);
    }
  };

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

      <Modal
        title="Mint Token"
        visible={isModalVisible}
        onCancel={handleCancel}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleMintToken}
        >
          <Form.Item
            name="tokenName"
            label="Token Name"
            rules={[{ required: true, message: 'Please input the token name!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="tokenSymbol"
            label="Token Symbol"
            rules={[{ required: true, message: 'Please input the token symbol!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="tokenDecimals"
            label="Token Decimals"
            rules={[{ required: true, message: 'Please input the token decimals!' }]}
          >
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item
            name="initialSupply"
            label="Initial Supply"
            rules={[{ required: true, message: 'Please input the initial supply!' }]}
          >
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item
            name="dropRatio"
            label="Drop Ratio"
            rules={[{ required: true, message: 'Please input the drop ratio!' }]}
          >
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item
            name="content"
            label="Content"
            rules={[{ required: true, message: 'Please input the content!' }]}
          >
            <Input.TextArea />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Mint Token
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Subspaces Section */}
      <Card className={styles.subspacesCard} loading={loadingSubspaces}>
        <Title level={4}>Your Created Subspaces</Title>
        <Row gutter={[16, 24]}>
          {userSubspaces.map((subspace) => (
            <Col xs={24} sm={12} md={12} lg={8} xl={8} key={subspace.id}>
              <Card
                hoverable
                cover={<img alt={subspace.name} src={subspace.image} style={{ aspectRatio: '16/9', objectFit: 'cover' }} />}
              >
                <Card.Meta
                  title={subspace.name}
                  description={subspace.description}
                />
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <Button type="primary" onClick={() => { setSelectedSubspaceId(subspace.id); showModal(); }}>
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

// Define signMessage function
const signMessage = async (message: string): Promise<string> => {
  if (!window.ethereum) {
    throw new Error('Ethereum provider not found');
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const signature = await signer.signMessage(message);
  return signature;
};

export default HomePage;

