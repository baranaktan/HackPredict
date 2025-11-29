'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
  ISupportedWallet,
} from '@creit.tech/stellar-wallets-kit';

interface WalletSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrivyLogin: () => void;
  onStellarConnect: (publicKey: string, walletId: string) => void;
}

export default function WalletSelectionModal({
  isOpen,
  onClose,
  onPrivyLogin,
  onStellarConnect,
}: WalletSelectionModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kit, setKit] = useState<StellarWalletsKit | null>(null);
  const [availableWallets, setAvailableWallets] = useState<ISupportedWallet[]>([]);

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const stellarKit = new StellarWalletsKit({
        network: WalletNetwork.TESTNET,
        selectedWalletId: FREIGHTER_ID,
        modules: allowAllModules(),
      });
      setKit(stellarKit);
      
      // Get available wallets
      const wallets = stellarKit.getSupportedWallets();
      setAvailableWallets(wallets);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStellarWalletConnect = async (walletId: string) => {
    if (!kit) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      kit.setWallet(walletId);
      const { address } = await kit.getAddress();
      
      if (address) {
        onStellarConnect(address, walletId);
        onClose();
      } else {
        setError('Cüzdan bağlantısı reddedildi.');
      }
    } catch (err: unknown) {
      console.error('Stellar wallet connection error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      
      if (errorMessage.includes('not installed') || errorMessage.includes('not found')) {
        setError(`${walletId} cüzdanı bulunamadı. Lütfen uzantıyı yükleyin.`);
      } else {
        setError('Cüzdan bağlantısı başarısız oldu. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleOtherWallets = () => {
    onPrivyLogin();
    onClose();
  };

  const getWalletIcon = (walletId: string) => {
    switch (walletId) {
      case 'freighter':
        return (
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        );
      case 'lobstr':
        return (
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v12M6 12h12" stroke="white" strokeWidth="2"/>
          </svg>
        );
      case 'xbull':
        return (
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
            <polygon points="12,2 22,12 12,22 2,12"/>
          </svg>
        );
      case 'albedo':
        return (
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="6" width="20" height="12" rx="2"/>
          </svg>
        );
    }
  };

  const getWalletGradient = (walletId: string) => {
    switch (walletId) {
      case 'freighter':
        return 'from-purple-500 to-blue-500';
      case 'lobstr':
        return 'from-orange-500 to-red-500';
      case 'xbull':
        return 'from-green-500 to-teal-500';
      case 'albedo':
        return 'from-pink-500 to-purple-500';
      default:
        return 'from-gray-500 to-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#1a1a2e] border-4 border-black p-6 w-full max-w-md mx-4 font-pixel max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl text-cream font-bold">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-300 text-sm rounded">
            {error}
          </div>
        )}

        {/* Stellar Wallets Section */}
        <div className="mb-4">
          <h3 className="text-sm text-gray-400 mb-3 uppercase tracking-wider">Stellar Wallets</h3>
          <div className="space-y-3">
            {availableWallets.length > 0 ? (
              availableWallets.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleStellarWalletConnect(wallet.id)}
                  disabled={isConnecting}
                  className="w-full flex items-center gap-4 p-4 bg-[#2a2a4a] hover:bg-[#3a3a5a] border-2 border-black transition-colors disabled:opacity-50"
                >
                  <div className={`w-10 h-10 bg-gradient-to-br ${getWalletGradient(wallet.id)} rounded-lg flex items-center justify-center`}>
                    {getWalletIcon(wallet.id)}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-cream font-bold capitalize">{wallet.name}</div>
                    <div className="text-gray-400 text-xs">
                      {wallet.isAvailable ? 'Yüklü ✓' : 'Yüklü değil'}
                    </div>
                  </div>
                  {isConnecting && (
                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </button>
              ))
            ) : (
              // Fallback to manual Freighter button
              <button
                onClick={() => handleStellarWalletConnect('freighter')}
                disabled={isConnecting}
                className="w-full flex items-center gap-4 p-4 bg-[#2a2a4a] hover:bg-[#3a3a5a] border-2 border-black transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-cream font-bold">Freighter</div>
                  <div className="text-gray-400 text-xs">Stellar Wallet</div>
                </div>
                {isConnecting && (
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-600" />
          <span className="text-gray-500 text-xs uppercase">or</span>
          <div className="flex-1 h-px bg-gray-600" />
        </div>

        {/* Other Wallets via Privy */}
        <button
          onClick={handleOtherWallets}
          className="w-full flex items-center gap-4 p-4 bg-[#2a2a4a] hover:bg-[#3a3a5a] border-2 border-black transition-colors"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M22 10H18C17 10 16 11 16 12C16 13 17 14 18 14H22" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <div className="text-cream font-bold">Other Wallets</div>
            <div className="text-gray-400 text-xs">MetaMask, Coinbase, WalletConnect</div>
          </div>
        </button>

        {/* Footer */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-500 text-xs">
            Stellar ağı için Freighter cüzdanını kullanmanızı öneriyoruz.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://www.freighter.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-xs underline"
            >
              Freighter
            </a>
            <a
              href="https://lobstr.co/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 hover:text-orange-300 text-xs underline"
            >
              LOBSTR
            </a>
            <a
              href="https://xbull.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 text-xs underline"
            >
              xBull
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
