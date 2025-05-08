import { Outlet } from '@umijs/max';
import { Layout, Menu } from 'antd';
import { Link } from '@umijs/max';
import { HomeOutlined, CalculatorOutlined, CheckSquareOutlined, AlignLeftOutlined, AppstoreOutlined, DeploymentUnitOutlined } from '@ant-design/icons';
import { PrivyProvider } from '@privy-io/react-auth';
import { mainnet } from 'viem/chains';
import WalletConnect from '@/components/WalletConnect';

const { Header, Content, Sider } = Layout;

export default function CustomLayout() {
  return (
    <PrivyProvider
      appId={"cm9z9zbig00f5la0mz07ds1ep"}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: 'light',
          accentColor: '#3b82f6',
        },
        embeddedWallets: {
          createOnLogin: 'all-users',
          noPromptOnSignature: true,
        },
        defaultChain: mainnet,
        supportedChains: [mainnet],
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '0 24px' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Causality Graph</div>
          <WalletConnect />
        </Header>
        <Layout>
          <Sider width={200} style={{ background: '#fff' }}>
            <Menu
              mode="inline"
              defaultSelectedKeys={['1']}
              style={{ height: '100%', borderRight: 0 }}
            >

              <Menu.Item key="2" icon={<CheckSquareOutlined />}>
                <Link to="/vote">DeGovernance</Link>
              </Menu.Item>
              <Menu.Item key="3" icon={<AlignLeftOutlined />}>
                <Link to="/alignment">Alignment</Link>
              </Menu.Item>
              <Menu.Item key="4" icon={<DeploymentUnitOutlined />}>
                <Link to="/causalitygraph">CausalityGraph</Link>
              </Menu.Item>
              <Menu.Item key="5" icon={<DeploymentUnitOutlined />}>
                <Link to="/model">Model</Link>
              </Menu.Item>
            </Menu>
          </Sider>
          <Layout style={{ padding: '24px' }}>
            <Content
              style={{
                padding: 24,
                margin: 0,
                minHeight: 280,
                background: '#fff',
              }}
            >
              <Outlet />
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </PrivyProvider>
  );
} 