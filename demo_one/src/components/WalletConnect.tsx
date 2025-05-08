import React, { useEffect, useState } from 'react';
import { Button, message } from 'antd';
import { WalletOutlined } from '@ant-design/icons';
import { usePrivy } from '@privy-io/react-auth';

const WalletConnect: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [mpcPublicKey, setMpcPublicKey] = useState<string | null>(null);
  const { login, logout, user, ready, authenticated, createWallet } = usePrivy();

  useEffect(() => {
    if (authenticated && user) {
      setConnected(true);
      // Get MPC wallet
      const embeddedWallet = user.linkedAccounts.find(account => account.type === 'wallet');
      if (embeddedWallet) {
        // Save MPC wallet address
        setMpcPublicKey(embeddedWallet.address);
        console.log('MPC Wallet Address:', embeddedWallet.address);
      }
    }
  }, [ready, authenticated, user]);

  const handleConnect = async () => {
    try {
      if (connected) {
        await logout();
        setMpcPublicKey(null);
        setConnected(false);
        message.success('Logged out successfully');
      } else {
        await login();
        // Create MPC wallet
        const wallet = await createWallet();
        if (wallet) {
          setMpcPublicKey(wallet.address);
          setConnected(true);
          console.log('New MPC Wallet Address:', wallet.address);
          message.success('Wallet connected successfully');
        }
      }
    } catch (error) {
      console.error('Wallet operation failed:', error);
      message.error('Wallet operation failed');
    }
  };

  return (
    <Button 
      type="primary"
      icon={<WalletOutlined />}
      onClick={handleConnect}
      style={{
        marginRight: '20px',
        float: 'right'
      }}
    >
      {connected ? 'Disconnect Wallet' : 'Connect Wallet'}
    </Button>
  );
};

export default WalletConnect; 