'use client';

import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { X } from 'lucide-react';

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

  const truncateAddress = (address: string) => {
    if (address.length <= 8) return address;
    return `${address.slice(0, 1)}..${address.slice(-1)}`;
  };

  // Don't render anything until Privy is ready
  if (!ready) {
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

  if (authenticated && user) {
    // Get the EVM wallet address for display
    const walletAddress = user.wallet?.address;
    const displayAddress = walletAddress 
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : 'Connected';

    if (style === 'header') {
      return (
        <div className="flex items-stretch space-x-2 h-10">
          <div className={`flex items-center bg-blue-400 text-black px-4 border-2 border-black rounded-none font-pixel uppercase tracking-wider text-xs h-full ${connectedClassName || ''}`}> 
            <span className="hidden md:inline">{displayAddress}</span>
            <span className="md:hidden">0x</span>
          </div>
          <button
            onClick={logout}
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
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          <span className="text-sm text-blue-300">{displayAddress}</span>
          <span className="text-xs text-gray-400">FLOW</span>
        </div>
        <button
          onClick={logout}
          className={`bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-all ${disconnectClassName || ''}`}
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (style === 'header') {
    // Use color prop to determine button color
    const buttonColor = color === 'blue'
      ? 'bg-blue-600 hover:bg-blue-700 text-yellow-50'
      : color === 'green'
      ? 'bg-blue-600 hover:bg-blue-700 text-yellow-50'
      : 'bg-yellow-400 hover:bg-yellow-300 text-black';
    return (
      <button
        onClick={login}
        className={`${buttonColor} px-6 py-2 border-2 border-black rounded-none font-pixel uppercase tracking-wider transition-colors ${className || ''}`}
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <button
      onClick={login}
      className={`bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-600 transition-all transform hover:scale-105 ${className || ''}`}
    >
      Connect Wallet
    </button>
  );
} 