import { PrivyClient } from '@privy-io/react-auth';

// Create Privy client
const privyClient = new PrivyClient({
  appId: process.env.PRIVY_APP_ID || '',
  apiUrl: process.env.PRIVY_API_URL,
});

export class AuthService {
  private static instance: AuthService;
  private privyClient: PrivyClient;
  private isAuthenticated: boolean = false;
  private user: any = null;

  private constructor() {
    this.privyClient = privyClient;
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async initialize() {
    try {
      // Check authentication status
      const user = await this.privyClient.getUser();
      if (user) {
        this.isAuthenticated = true;
        this.user = user;
      }
    } catch (error) {
      console.error('Failed to initialize auth service:', error);
    }
  }

  public async login() {
    try {
      // Show Privy login UI
      await this.privyClient.login();
      const user = await this.privyClient.getUser();
      this.isAuthenticated = true;
      this.user = user;
      return user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  public async logout() {
    try {
      await this.privyClient.logout();
      this.isAuthenticated = false;
      this.user = null;
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  public async getUser() {
    return this.user;
  }

  public isLoggedIn() {
    return this.isAuthenticated;
  }

  public async getWalletAddress() {
    if (!this.user) return null;
      // Retrieve wallet address
    const wallets = await this.privyClient.getWallets();
    return wallets[0]?.address || null;
  }

  public async getPublicKey() {
    if (!this.user) return null;
      // Derive public key
      // Implementation depends on MPC wallet details
    const walletAddress = await this.getWalletAddress();
    if (!walletAddress) return null;
    
    // Simulate getting MPC wallet public key
    return `mpc_${walletAddress}`;
  }
}

export const authService = AuthService.getInstance();
