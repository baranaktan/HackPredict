// ClientWrapper.tsx
"use client";

import React from 'react';
import { AuthProvider } from "../../context/AuthContext";
import { PrivyProvider } from "@privy-io/react-auth";

// Stellar Testnet configuration
const stellarTestnet = {
  id: 103, // Stellar testnet identifier
  name: 'Stellar Testnet',
  network: 'stellar-testnet',
  nativeCurrency: {
    decimals: 7,
    name: 'Stellar Lumens',
    symbol: 'XLM',
  },
  rpcUrls: {
    default: {
      http: ['https://soroban-testnet.stellar.org'],
    },
    public: {
      http: ['https://horizon-testnet.stellar.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Stellar Expert',
      url: 'https://stellar.expert/explorer/testnet',
    },
  },
  testnet: true,
};

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        loginMethods: ['wallet', 'email'],
        appearance: {
          theme: 'dark',
          accentColor: '#8B5CF6',
          logo: 'https://res.cloudinary.com/storagemanagementcontainer/image/upload/v1751729735/live-stakes-icon_cfc7t8.png',
        },
        defaultChain: stellarTestnet,
        supportedChains: [stellarTestnet],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <AuthProvider>
        {children}
      </AuthProvider>
    </PrivyProvider>
  );
}
