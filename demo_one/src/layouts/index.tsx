import { Outlet, useLocation, Link as UmiLink } from '@umijs/max';
import { Layout, Menu, Input, Button, Image } from 'antd';
import { Link } from '@umijs/max';
import { HomeOutlined, CalculatorOutlined, CheckSquareOutlined, AlignLeftOutlined, AppstoreOutlined, DeploymentUnitOutlined, UserOutlined, SettingOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { PrivyProvider } from '@privy-io/react-auth';
import { mainnet } from 'viem/chains';
import WalletConnect from '@/components/WalletConnect';
const { Header, Content, Sider } = Layout;
import "./index.less"

export default function CustomLayout() {
  const location = useLocation();
  const showVoteSearch = location.pathname === '/vote';

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
      <Layout className="main-layout">
        <Sider width={200} className="main-sider">
          <div className="sider-title">
            <span>Causality Graph</span>
          </div>
          <Menu
            mode="inline"
            defaultSelectedKeys={['6']}
            style={{ height: 'calc(100% - 70px)', borderRight: 0 }}
            theme="dark"
          >
            <Menu.Item key="1" icon={<HomeOutlined />}>
              <UmiLink to="/home">Home</UmiLink>
            </Menu.Item>
            <Menu.Item key="2" icon={<CheckSquareOutlined />}>
              <UmiLink to="/vote">DeGovernance</UmiLink>
            </Menu.Item>
            <Menu.Item key="4" icon={<DeploymentUnitOutlined />}>
              <UmiLink to="/causalitygraph">CausalityGraph</UmiLink>
            </Menu.Item>
            <Menu.Item key="5" icon={<DeploymentUnitOutlined />}>
              <UmiLink to="/model">Model</UmiLink>
            </Menu.Item>
            <Menu.Item key="6" icon={<UserOutlined />}>
              <UmiLink to="/profile">Profile</UmiLink>
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout>
          <Header className={`main-header ${showVoteSearch ? 'with-search' : ''}`}>
            <div className="header-left-section">
              {showVoteSearch && (
                <>
                  <div className="header-search-bar">
                    <SearchOutlined className="header-search-icon" />
                    <Input placeholder="Search in Vote..." className="header-search-input" />
                  </div>
                  <UmiLink to="/create-subspace">
                    <Button 
                      icon={<PlusOutlined />} 
                      className="header-plus-icon-btn"
                      shape="circle"
                    />
                  </UmiLink>
                </>
              )}
            </div>
            <div className="header-actions-wrapper">
              <SettingOutlined className="settings-icon" />
              <WalletConnect />
            </div>
          </Header>
          <Layout className="main-content">
            <Outlet/>
          </Layout>
        </Layout>
      </Layout>
    </PrivyProvider>
  );
} 