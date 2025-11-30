'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { StellarWalletsKit, WalletNetwork, allowAllModules } from '@creit.tech/stellar-wallets-kit';

interface AuthContextType {
  isLoggedIn: boolean;
  walletAddress: string | null;
  chainId: number | null;
  user: any;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  ready: boolean;
  kit: StellarWalletsKit | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [kit, setKit] = useState<StellarWalletsKit | null>(null);

  useEffect(() => {
    // Initialize Stellar Wallets Kit
    const initializeKit = async () => {
      try {
        const walletKit = new StellarWalletsKit({
          network: WalletNetwork.TESTNET, // Use TESTNET for development
          modules: allowAllModules(),
        });
        setKit(walletKit);
        
        // Make kit available globally for contractsApi.ts
        if (typeof window !== 'undefined') {
          (window as any).stellarWalletsKit = walletKit;
        }
        
        setReady(true);

        // Check if already connected
        try {
          const { address } = await walletKit.getAddress();
          if (address) {
            setWalletAddress(address);
            setIsLoggedIn(true);
            setChainId(1); // Stellar doesn't use chainId, but we keep it for compatibility
          }
        } catch (error) {
          // Not connected, that's fine
          console.log('No wallet connected');
        }
      } catch (error) {
        console.error('Error initializing Stellar Wallets Kit:', error);
        setReady(true); // Set ready even on error to prevent infinite loading
      }
    };

    initializeKit();
  }, []);

  const login = async () => {
    if (!kit) {
      console.error('Stellar Wallets Kit not initialized');
      return;
    }

    try {
      // Open modal to select wallet
      await kit.openModal({
        onWalletSelected: async (option) => {
          kit.setWallet(option.id);
          const { address } = await kit.getAddress();
          if (address) {
            setWalletAddress(address);
            setIsLoggedIn(true);
            setChainId(1);
          }
        },
      });
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  };

  const logout = async () => {
    if (!kit) {
      return;
    }

    try {
      await kit.disconnect();
      setWalletAddress(null);
      setIsLoggedIn(false);
      setChainId(null);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  const value: AuthContextType = {
    isLoggedIn,
    walletAddress,
    chainId,
    user: walletAddress ? { address: walletAddress } : null,
    login,
    logout,
    ready,
    kit,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
