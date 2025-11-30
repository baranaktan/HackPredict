# Stellar Wallet Connection Guide

## Overview

A React-based wallet connection system for Stellar blockchain using `@creit.tech/stellar-wallets-kit`.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    AuthProvider                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  StellarWalletsKit                            │  │
│  │  - Manages wallet connections                 │  │
│  │  - Supports: Freighter, Albedo, xBull, etc.  │  │
│  └───────────────────────────────────────────────┘  │
│                        │                             │
│              useAuth() Hook                          │
│  ┌───────────────────────────────────────────────┐  │
│  │  isLoggedIn | walletAddress | login | logout  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
    ConnectWallet.tsx           ContractsApi.ts
    (UI Component)              (Blockchain Calls)
```

---

## Quick Reference

| Method | Description |
|--------|-------------|
| `kit.openModal()` | Opens wallet selector popup |
| `kit.getAddress()` | Returns `{ address: string }` |
| `kit.signTransaction(xdr, opts)` | Signs transaction XDR |
| `kit.disconnect()` | Disconnects wallet |

---

## AI Implementation Prompt

```
TASK: Implement Stellar wallet connection for Next.js app

INSTALL:
npm install @creit.tech/stellar-wallets-kit @stellar/stellar-sdk

FILES TO CREATE:

1. src/app/context/AuthContext.tsx
   - Create React Context with StellarWalletsKit
   - Export: AuthProvider, useAuth hook
   - State: isLoggedIn, walletAddress, ready, kit
   - Methods: login(), logout()
   - On mount: initialize kit, check existing connection
   - Make kit global: window.stellarWalletsKit = kit

2. src/app/components/ConnectWallet.tsx
   - Use useAuth() hook
   - Show loading skeleton while !ready
   - Show "Connect Wallet" button when disconnected
   - Show truncated address + Disconnect when connected
   - Handle async connect/disconnect with loading states

3. Wrap app with <AuthProvider> in layout.tsx

KEY CODE:

// Initialize kit
const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  modules: allowAllModules(),
});

// Connect
await kit.openModal({
  onWalletSelected: async (option) => {
    kit.setWallet(option.id);
    const { address } = await kit.getAddress();
    setWalletAddress(address);
    setIsLoggedIn(true);
  },
});

// Sign transaction
const { signedTxXdr } = await kit.signTransaction(txXdr, {
  networkPassphrase: 'Test SDF Network ; September 2015',
  address: walletAddress,
});

// Disconnect
await kit.disconnect();

NETWORKS:
- Testnet: WalletNetwork.TESTNET
- Mainnet: WalletNetwork.PUBLIC
```

---

## File Templates

### AuthContext.tsx (minimal)

```tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { StellarWalletsKit, WalletNetwork, allowAllModules } from '@creit.tech/stellar-wallets-kit';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [kit, setKit] = useState(null);

  useEffect(() => {
    const walletKit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      modules: allowAllModules(),
    });
    setKit(walletKit);
    window.stellarWalletsKit = walletKit;
    setReady(true);
    
    // Auto-reconnect
    walletKit.getAddress().then(({ address }) => {
      if (address) { setWalletAddress(address); setIsLoggedIn(true); }
    }).catch(() => {});
  }, []);

  const login = async () => {
    await kit.openModal({
      onWalletSelected: async (opt) => {
        kit.setWallet(opt.id);
        const { address } = await kit.getAddress();
        setWalletAddress(address);
        setIsLoggedIn(true);
      },
    });
  };

  const logout = async () => {
    await kit.disconnect();
    setWalletAddress(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, walletAddress, login, logout, ready, kit }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

### ConnectWallet.tsx (minimal)

```tsx
'use client';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ConnectWallet() {
  const { ready, isLoggedIn, walletAddress, login, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!ready) return <div>Loading...</div>;

  if (isLoggedIn) {
    return (
      <div>
        <span>{walletAddress?.slice(0,6)}...{walletAddress?.slice(-4)}</span>
        <button onClick={logout}>Disconnect</button>
      </div>
    );
  }

  return (
    <button onClick={async () => { setLoading(true); await login(); setLoading(false); }}>
      {loading ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
```

---

## Supported Wallets

- 🦊 **Freighter** - Browser extension
- 🌙 **Albedo** - Web-based signer  
- 🐂 **xBull** - Browser extension
- 📱 **WalletConnect** - Mobile wallets
- And more via `allowAllModules()`

---

## Usage in Contract Calls

```typescript
// Access kit from anywhere
const kit = window.stellarWalletsKit;

// Sign and send transaction
const signResult = await kit.signTransaction(txXdr, {
  networkPassphrase: 'Test SDF Network ; September 2015',
  address: userAddress,
});

// Use signed XDR
const signedTx = signResult.signedTxXdr;
```
