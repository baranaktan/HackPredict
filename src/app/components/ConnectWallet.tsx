'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { X } from 'lucide-react';
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from '@creit.tech/stellar-wallets-kit';
import WalletSelectionModal from './WalletSelectionModal';

interface ConnectWalletProps {
  className?: string;
  connectedClassName?: string;
  disconnectClassName?: string;
  loadingClassName?: string;
  style?: 'default' | 'header';
  color?: 'yellow' | 'blue' | 'green';
}

export default function ConnectWallet({ 
  className,
  connectedClassName,
  disconnectClassName,
  loadingClassName,
  style = 'default',
  color = 'yellow',
}: ConnectWalletProps) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [stellarAddress, setStellarAddress] = useState<string | null>(null);
  const [stellarWalletId, setStellarWalletId] = useState<string | null>(null);
  const [isCheckingStellar, setIsCheckingStellar] = useState(true);
  const [kit, setKit] = useState<StellarWalletsKit | null>(null);

  // Initialize Stellar Wallets Kit
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stellarKit = new StellarWalletsKit({
        network: WalletNetwork.TESTNET,
        selectedWalletId: FREIGHTER_ID,
        modules: allowAllModules(),
      });
      setKit(stellarKit);
    }
  }, []);

  // Check for existing Stellar connection
  const checkStellarConnection = useCallback(async () => {
    if (!kit) return;
    
    try {
      const storedWalletId = localStorage.getItem('stellar_wallet_id');
      const storedAddress = localStorage.getItem('stellar_address');
      
      if (storedWalletId && storedAddress) {
        kit.setWallet(storedWalletId);
        // Verify the connection is still valid
        try {
          const { address } = await kit.getAddress();
          if (address === storedAddress) {
            setStellarAddress(storedAddress);
            setStellarWalletId(storedWalletId);
          } else {
            // Clear invalid stored data
            localStorage.removeItem('stellar_wallet_id');
            localStorage.removeItem('stellar_address');
          }
        } catch {
          // Wallet might not be available anymore
          localStorage.removeItem('stellar_wallet_id');
          localStorage.removeItem('stellar_address');
        }
      }
    } catch (error) {
      console.error('Error checking Stellar connection:', error);
    } finally {
      setIsCheckingStellar(false);
    }
  }, [kit]);

  useEffect(() => {
    if (kit) {
      checkStellarConnection();
    }
  }, [kit, checkStellarConnection]);

  const handleStellarConnect = (publicKey: string, walletId: string) => {
    setStellarAddress(publicKey);
    setStellarWalletId(walletId);
    localStorage.setItem('stellar_wallet_id', walletId);
    localStorage.setItem('stellar_address', publicKey);
  };

  const handleDisconnect = () => {
    if (stellarAddress) {
      setStellarAddress(null);
      setStellarWalletId(null);
      localStorage.removeItem('stellar_wallet_id');
      localStorage.removeItem('stellar_address');
    } else {
      logout();
    }
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Loading state
  if (!ready || isCheckingStellar) {
    if (style === 'header') {
      return (
        <div className={`bg-yellow-400 px-6 py-2 border-2 border-black rounded-none font-pixel uppercase tracking-wider animate-pulse ${loadingClassName || ''}`}>
          <div className="h-4 w-20 bg-yellow-300 rounded-none"></div>
        </div>
      );
    }
    return (
      <div className={`bg-gray-700 px-4 py-2 rounded-lg animate-pulse ${loadingClassName || ''}`}>
        <div className="h-4 w-20 bg-gray-600 rounded"></div>
      </div>
    );
  }

  // Connected state (either Stellar or Privy)
  const isConnected = stellarAddress || (authenticated && user);
  const displayAddress = stellarAddress 
    ? truncateAddress(stellarAddress)
    : user?.wallet?.address 
      ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}`
      : 'Connected';
  const isStellarWallet = !!stellarAddress;

  if (isConnected) {
    if (style === 'header') {
      return (
        <div className="flex items-stretch space-x-2 h-10">
          <div className={`flex items-center bg-blue-400 text-black px-4 border-2 border-black rounded-none font-pixel uppercase tracking-wider text-xs h-full ${connectedClassName || ''}`}> 
            {isStellarWallet && (
              <span className="mr-1 text-purple-700" title={`${stellarWalletId} Wallet`}>⭐</span>
            )}
            <span className="hidden md:inline">{displayAddress}</span>
            <span className="md:hidden">{isStellarWallet ? 'G...' : '0x'}</span>
          </div>
          <button
            onClick={handleDisconnect}
            className={`flex items-center justify-center bg-red-500 hover:bg-red-400 text-black px-4 border-2 border-black rounded-none font-pixel uppercase tracking-wider transition-colors text-xs h-full ${disconnectClassName || ''}`}
            style={{ minWidth: '90px' }}
          >
            <span className="hidden md:inline">Disconnect</span>
            <X size={16} className="md:hidden" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-3">
        <div className={`flex items-center space-x-2 bg-blue-600/20 border border-blue-500/30 px-3 py-2 rounded-lg ${connectedClassName || ''}`}>
          {isStellarWallet && (
            <span className="text-purple-400" title={`${stellarWalletId} Wallet`}>⭐</span>
          )}
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          <span className="text-sm text-blue-300">{displayAddress}</span>
          <span className="text-xs text-gray-400">XLM</span>
        </div>
        <button
          onClick={handleDisconnect}
          className={`bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-all ${disconnectClassName || ''}`}
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Disconnected state - show connect button
  if (style === 'header') {
    const buttonColor = color === 'blue'
      ? 'bg-blue-600 hover:bg-blue-700 text-yellow-50'
      : color === 'green'
      ? 'bg-blue-600 hover:bg-blue-700 text-yellow-50'
      : 'bg-yellow-400 hover:bg-yellow-300 text-black';
    return (
      <>
        <button
          onClick={() => setShowWalletModal(true)}
          className={`${buttonColor} px-6 py-2 border-2 border-black rounded-none font-pixel uppercase tracking-wider transition-colors ${className || ''}`}
        >
          Connect Wallet
        </button>
        <WalletSelectionModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          onPrivyLogin={login}
          onStellarConnect={handleStellarConnect}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowWalletModal(true)}
        className={`bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-600 transition-all transform hover:scale-105 ${className || ''}`}
      >
        Connect Wallet
      </button>
      <WalletSelectionModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onPrivyLogin={login}
        onStellarConnect={handleStellarConnect}
      />
    </>
  );
}
