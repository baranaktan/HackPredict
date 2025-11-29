// Smart Contracts API for Betting on Livestreams - Stellar Soroban
import {
  Contract,
  Networks,
  SorobanRpc,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
  Operation,
  Account
} from '@stellar/stellar-sdk';

// Type aliases for better TypeScript support
type ScVal = xdr.ScVal;
import { mockLivestreams } from '../data/livestreams';
import type { LivestreamDataType, MarketDataType } from '../../types/types';

// API Base URL for backend calls
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3334/api';

// Stellar Network Configuration
const STELLAR_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
const RPC_URL = STELLAR_NETWORK === 'testnet' 
  ? 'https://soroban-testnet.stellar.org'
  : 'https://soroban-mainnet.stellar.org';

// Contract addresses
const CONTRACTS = {
  PredictionMarket: 'CCLL4NFYAZEF2GU6ORX75LHQGO64WEDTLNKEPUF5XRMVGAMTMQYC5SGS',
  MarketFactory: 'CB62SVUB23QWDDJCEG2HODGQRT6W3K5CSXJZPYD4VBXTQ3KBYDBYJDEY'
};

// Helper function to get RPC server
function getRpcServer(): SorobanRpc.Server {
  return new SorobanRpc.Server(RPC_URL, { allowHttp: true });
}

// Helper function to get network passphrase
function getNetworkPassphrase(): string {
  return STELLAR_NETWORK === 'testnet' 
    ? Networks.TESTNET 
    : Networks.PUBLIC;
}

// Helper function to check if contract is deployed
export function isContractDeployed() {
  return CONTRACTS.MarketFactory && CONTRACTS.MarketFactory !== '';
}

// Network information for users
export function getNetworkInfo() {
  return {
    networkId: STELLAR_NETWORK,
    networkName: STELLAR_NETWORK === 'testnet' ? 'Stellar Testnet' : 'Stellar Mainnet',
    rpcUrl: RPC_URL,
    explorerUrl: STELLAR_NETWORK === 'testnet' 
      ? 'https://stellar.expert/explorer/testnet'
      : 'https://stellar.expert/explorer/public',
    faucetUrl: STELLAR_NETWORK === 'testnet' 
      ? 'https://laboratory.stellar.org/#account-creator?network=test'
      : null,
    contractAddress: CONTRACTS.MarketFactory
  };
}

// Helper function to get current network config
export function getCurrentNetworkConfig() {
  return {
    network: STELLAR_NETWORK,
    rpcUrl: RPC_URL,
    passphrase: getNetworkPassphrase()
  };
}

// Market State enum
export enum MarketState {
  Open = 0,
  Closed = 1,
  Resolved = 2
}

// Helper function to convert market state to readable string
export function getMarketStateLabel(state: MarketState): string {
  switch (state) {
    case MarketState.Open:
      return 'Open';
    case MarketState.Closed:
      return 'Closed';
    case MarketState.Resolved:
      return 'Resolved';
    default:
      return 'Unknown';
  }
}

// Helper function to get market state status with color
export function getMarketStateStatus(state: MarketState): { label: string; color: string } {
  switch (state) {
    case MarketState.Open:
      return { label: 'Open', color: 'green' };
    case MarketState.Closed:
      return { label: 'Closed', color: 'yellow' };
    case MarketState.Resolved:
      return { label: 'Resolved', color: 'blue' };
    default:
      return { label: 'Unknown', color: 'gray' };
  }
}

// Per-livestream betting data
export interface LivestreamBet {
  livestreamId: number;
  title: string;
  amount: string;
  percentage: number;
  isActive: boolean;
}

export interface MarketInfo {
  livestreamIds: number[];
  question: string;
  livestreamTitles: string[];
  state: MarketState;
  winningLivestreamId: number;
  totalPool: string;
  totalBettors: number;
  createdAt: number;
  closedAt: number;
  resolvedAt: number;
}

export interface UserBets {
  livestreamIds: number[];
  amounts: string[];
}

export interface MarketOdds {
  livestreamBets: LivestreamBet[];
}

// Helper function to get user's public key from wallet
// Uses Stellar Wallet Kit via window.stellarWalletsKit
async function getUserPublicKey(address?: string): Promise<string> {
  if (address) {
    return address;
  }

  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }

  // Try to get from Stellar Wallet Kit via window (if available)
  if ((window as any).stellarWalletsKit) {
    try {
      const { address: kitAddress } = await (window as any).stellarWalletsKit.getAddress();
      if (kitAddress) return kitAddress;
    } catch (error) {
      console.error('Error getting address from Stellar Wallet Kit:', error);
    }
  }
  
  throw new Error('No Stellar wallet found. Please connect your wallet through the UI.');
}

// Helper function to sign and send transaction
async function signAndSend(
  contract: Contract,
  method: string,
  args: ScVal[],
  userAddress: string
): Promise<string> {
  const server = getRpcServer();
  
  // Build the transaction
  const sourceAccount = await server.getAccount(userAddress);
  const tx = new SorobanRpc.TransactionBuilder(sourceAccount, {
    fee: '100',
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  // Sign with Freighter
  if (window.freighterApi) {
    const signed = await window.freighterApi.signTransaction(tx.toXDR(), {
      network: getNetworkPassphrase(),
      accountToSign: userAddress,
    });
    
    const txResponse = await server.sendTransaction(signed);
    
    if (txResponse.status === 'ERROR') {
      throw new Error(txResponse.errorResult?.toString() || 'Transaction failed');
    }
    
    return txResponse.hash;
  }

  throw new Error('No wallet available for signing');
}

// Associate a market with a livestream (1:1 relationship)
export async function associateMarketWithLivestream(
  marketAddress: string,
  livestreamId: number
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/livestreams/${livestreamId}/associate-market`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        market_address: marketAddress
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to associate market with livestream');
    }

    console.log(`✅ Successfully associated market ${marketAddress} with livestream ${livestreamId}`);
  } catch (error) {
    console.error('Error associating market with livestream:', error);
    throw error;
  }
}

// Create a new betting market for a livestream
export async function createMarket(
  question: string,
  title: string,
  description: string,
  category: string,
  tags: string[],
  livestreamIds: number[] = [],
  livestreamTitles: string[] = []
): Promise<{ success: boolean; marketAddress?: string; error?: string }> {
  try {
    console.log('🚀 Creating market with multiple livestreams:', {
      question,
      title,
      livestreamIds,
      livestreamTitles
    });
    
    // Validate input
    if (!question || !title) {
      return { success: false, error: 'Question and title are required' };
    }

    // Validate arrays have same length (can be empty)
    if (livestreamIds.length !== livestreamTitles.length) {
      return { success: false, error: 'Livestream IDs and titles must have the same length' };
    }

    // Get user's public key
    const userAddress = await getUserPublicKey();
    
    // Get oracle address (for now, use user address as oracle)
    const oracleAddress = userAddress;
    
    // Create factory contract instance
    const factoryContract = new Contract(CONTRACTS.MarketFactory);
    
    // Convert parameters to ScVal
    const livestreamIdsScVal = nativeToScVal(livestreamIds.map(id => BigInt(id)), { type: 'vec' });
    const questionScVal = nativeToScVal(question);
    const livestreamTitlesScVal = nativeToScVal(livestreamTitles, { type: 'vec' });
    
    // Note: For Stellar, we need the WASM hash to deploy. This should be provided or fetched
    // For now, we'll use a placeholder. In production, you'd need the actual WASM hash.
    const wasmHash = new Uint8Array(32).fill(0); // Placeholder - replace with actual hash
    
    const server = getRpcServer();
    const sourceAccount = await server.getAccount(userAddress);
    
    // Build contract invocation
    const contractAddress = new Address(CONTRACTS.MarketFactory);
    const contractOp = Operation.invokeHostFunction({
      func: xdr.HostFunction.hostFunctionTypeInvokeContract(
        xdr.InvokeContractArgs({
          contractAddress: contractAddress.toScAddress(),
          functionName: xdr.ScSymbol.fromString('create_market'),
          args: [
            nativeToScVal(userAddress),
            livestreamIdsScVal,
            questionScVal,
            livestreamTitlesScVal,
            nativeToScVal(wasmHash)
          ]
        })
      ),
      auth: []
    });
    
    // Call create_market function
    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(contractOp)
      .setTimeout(30)
      .build();

    // Sign with Stellar Wallet Kit
    const kit = (window as any).stellarWalletsKit;
    if (kit) {
      const { signedTxXdr } = await kit.signTransaction(tx.toXDR(), {
        networkPassphrase: getNetworkPassphrase(),
        address: userAddress,
      });
      
      const txResponse = await server.sendTransaction(signedTxXdr);
      
      if (txResponse.status === 'ERROR') {
        return { 
          success: false, 
          error: txResponse.errorResult?.toString() || 'Transaction failed' 
        };
      }
      
      // Wait for transaction to complete
      let txResult = await server.getTransaction(txResponse.hash);
      while (txResult.status === 'NOT_FOUND' || txResult.status === 'PENDING') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        txResult = await server.getTransaction(txResponse.hash);
      }
      
      if (txResult.status === 'SUCCESS' && txResult.resultXdr) {
        // Parse the result to get market address
        const result = scValToNative(txResult.resultXdr);
        const marketAddress = result.toString();
        
        console.log('✅ Market created at address:', marketAddress);
        
        // Store market metadata
        try {
          const metadataResponse = await fetch(`${API_BASE_URL}/markets/metadata`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contract_address: marketAddress,
              creator_wallet_address: userAddress,
              description,
              category,
              tags,
              livestream_ids: livestreamIds
            }),
          });

          if (!metadataResponse.ok) {
            console.warn('Failed to store market metadata');
          }
        } catch (metadataError) {
          console.warn('Error storing market metadata:', metadataError);
        }
        
        return { success: true, marketAddress };
      }
      
      return { success: false, error: 'Transaction completed but market address not found' };
    }
    
      return { success: false, error: 'No Stellar wallet available. Please connect your wallet.' };
    
  } catch (error: any) {
    console.error('❌ Error creating market:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred' 
    };
  }
}

// Create a market with metadata (stored on-chain via the contract)
export async function createMarketWithMetadata(
  livestreamId: number | null,
  question: string,
  title: string,
  description?: string,
  category?: string,
  tags?: string[]
): Promise<string> {
  try {
    const creatorAddress = await getUserPublicKey();
    
    const livestreamIds = livestreamId ? [livestreamId] : [];
    const livestreamTitles = livestreamId ? [title] : [];
    
    const result = await createMarket(
      question,
      title,
      description || '',
      category || '',
      tags || [],
      livestreamIds,
      livestreamTitles
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to create market');
    }

    const marketAddress = result.marketAddress!;
    console.log('Market created on-chain:', marketAddress);
    
    // Store additional metadata off-chain
    if (description || category || tags) {
      try {
        const response = await fetch(`${API_BASE_URL}/markets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contract_address: marketAddress,
            creator_wallet_address: creatorAddress,
            description,
            category,
            tags
          }),
        });

        if (!response.ok) {
          console.warn('Failed to store market metadata, but market was created successfully');
        }
      } catch (metadataError) {
        console.warn('Failed to store market metadata:', metadataError);
      }
    }
    
    return marketAddress;
  } catch (error) {
    console.error('Error creating market with metadata:', error);
    throw error;
  }
}

// Get market information
export async function getMarketInfo(marketAddress: string): Promise<MarketInfo> {
  try {
    const server = getRpcServer();
    const contractAddress = new Address(marketAddress);
    
    // Build contract invocation for get_market_info
    const contractOp = Operation.invokeHostFunction({
      func: xdr.HostFunction.hostFunctionTypeInvokeContract(
        xdr.InvokeContractArgs({
          contractAddress: contractAddress.toScAddress(),
          functionName: xdr.ScSymbol.fromString('get_market_info'),
          args: []
        })
      ),
      auth: []
    });
    
    // Create a dummy account for simulation (read-only)
    const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
    const tx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(contractOp)
      .setTimeout(30)
      .build();
    
    // Simulate the transaction
    const response = await server.simulateTransaction(tx);
    
    if (response.errorResult) {
      throw new Error(response.errorResult.toString());
    }
    
    if (!response.result) {
      throw new Error('No result from contract call');
    }
    
    const data = scValToNative(response.result);
    
    // Parse the tuple result: (Vec<u64>, String, State, u64, i128, u64)
    const livestreamIds = (data[0] as bigint[]).map(id => Number(id));
    const question = data[1] as string;
    const state = Number(data[2]) as MarketState;
    const winningLivestreamId = Number(data[3]);
    const totalPool = (data[4] as bigint).toString();
    const totalBettors = Number(data[5]);
    
    // Get livestream titles (need to fetch separately or from storage)
    // For now, we'll use empty array - you may need to fetch titles separately
    const livestreamTitles: string[] = [];
    
    return {
      livestreamIds,
      question,
      livestreamTitles,
      state,
      winningLivestreamId,
      totalPool,
      totalBettors,
      createdAt: 0, // Stellar contracts don't return these in get_market_info
      closedAt: 0,
      resolvedAt: 0
    };
  } catch (error) {
    console.error('Error fetching market info:', error);
    throw error;
  }
}

// Place a bet on a specific livestream in a market
export async function placeBet(
  marketAddress: string,
  livestreamId: number,
  amount: string
): Promise<string> {
  try {
    const userAddress = await getUserPublicKey();
    const server = getRpcServer();
    const contract = new Contract(marketAddress);
    
    // Convert amount to stroops (1 XLM = 10,000,000 stroops)
    // Assuming amount is in XLM
    const amountInStroops = BigInt(Math.floor(parseFloat(amount) * 10000000).toString());
    
    console.log(`Placing bet: ${amount} XLM on livestream ${livestreamId}`);
    
    const sourceAccount = await server.getAccount(userAddress);
    const contractAddress = new Address(marketAddress);
    const contractOp = Operation.invokeHostFunction({
      func: xdr.HostFunction.hostFunctionTypeInvokeContract(
        xdr.InvokeContractArgs({
          contractAddress: contractAddress.toScAddress(),
          functionName: xdr.ScSymbol.fromString('place_bet'),
          args: [
            nativeToScVal(userAddress),
            nativeToScVal(BigInt(livestreamId)),
            nativeToScVal(amountInStroops)
          ]
        })
      ),
      auth: []
    });
    
    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(contractOp)
      .setTimeout(30)
      .build();

    // Sign with Freighter wallet
    if (window.freighterApi) {
      const signed = await window.freighterApi.signTransaction(tx.toXDR(), {
        network: getNetworkPassphrase(),
        accountToSign: userAddress,
      });
      
      const txResponse = await server.sendTransaction(signed);
      
      if (txResponse.status === 'ERROR') {
        throw new Error(txResponse.errorResult?.toString() || 'Transaction failed');
      }
      
      return txResponse.hash;
    }
    
    throw new Error('No Stellar wallet available. Please connect your wallet through the UI.');
  } catch (error) {
    console.error('Error placing bet:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('user rejected') || error.message.includes('User rejected')) {
        throw new Error('Bet cancelled by user');
      } else if (error.message.includes('insufficient funds')) {
        throw new Error('Insufficient XLM to place bet');
      } else if (error.message.includes('Market not open')) {
        throw new Error('This market is closed for betting');
      } else if (error.message.includes('Amount must be positive')) {
        throw new Error('Invalid bet amount - must be greater than 0');
      }
    }
    
    throw error;
  }
}

// Get user's bets for a market (per-livestream)
export async function getUserBets(marketAddress: string, userAddress: string): Promise<UserBets> {
  try {
    const server = getRpcServer();
    const contractAddress = new Address(marketAddress);
    const userAddr = new Address(userAddress);
    
    // Get market info to get livestream IDs
    const marketInfo = await getMarketInfo(marketAddress);
    const livestreamIds: number[] = [];
    const amounts: string[] = [];
    
    // Create dummy account for simulation
    const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
    
    // Fetch bet for each livestream
    for (const livestreamId of marketInfo.livestreamIds) {
      const contractOp = Operation.invokeHostFunction({
        func: xdr.HostFunction.hostFunctionTypeInvokeContract(
          xdr.InvokeContractArgs({
            contractAddress: contractAddress.toScAddress(),
            functionName: xdr.ScSymbol.fromString('get_user_bet'),
            args: [
              nativeToScVal(userAddr),
              nativeToScVal(BigInt(livestreamId))
            ]
          })
        ),
        auth: []
      });
      
      const tx = new TransactionBuilder(dummyAccount, {
        fee: '100',
        networkPassphrase: getNetworkPassphrase(),
      })
        .addOperation(contractOp)
        .setTimeout(30)
        .build();
      
      const response = await server.simulateTransaction(tx);
      
      if (!response.errorResult && response.result) {
        const betAmount = scValToNative(response.result) as bigint;
        if (betAmount > BigInt(0)) {
          livestreamIds.push(livestreamId);
          amounts.push((Number(betAmount) / 10000000).toString()); // Convert stroops to XLM
        }
      }
    }
    
    return { livestreamIds, amounts };
  } catch (error) {
    console.error('Error fetching user bets:', error);
    return { livestreamIds: [], amounts: [] };
  }
}

// Get market odds (per-livestream betting data)
export async function getMarketOdds(marketAddress: string): Promise<MarketOdds> {
  try {
    const server = getRpcServer();
    const contractAddress = new Address(marketAddress);
    const marketInfo = await getMarketInfo(marketAddress);
    
    const livestreamBets: LivestreamBet[] = [];
    const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
    
    for (const livestreamId of marketInfo.livestreamIds) {
      const contractOp = Operation.invokeHostFunction({
        func: xdr.HostFunction.hostFunctionTypeInvokeContract(
          xdr.InvokeContractArgs({
            contractAddress: contractAddress.toScAddress(),
            functionName: xdr.ScSymbol.fromString('get_livestream_bets'),
            args: [nativeToScVal(BigInt(livestreamId))]
          })
        ),
        auth: []
      });
      
      const tx = new TransactionBuilder(dummyAccount, {
        fee: '100',
        networkPassphrase: getNetworkPassphrase(),
      })
        .addOperation(contractOp)
        .setTimeout(30)
        .build();
      
      const response = await server.simulateTransaction(tx);
      
      if (!response.errorResult && response.result) {
        const data = scValToNative(response.result);
        const amount = (data[0] as bigint).toString();
        const percentage = Number(data[1]);
        const isActive = data[2] as boolean;
        
        livestreamBets.push({
          livestreamId,
          title: `Livestream ${livestreamId}`, // You may need to fetch title separately
          amount: (Number(amount) / 10000000).toString(), // Convert stroops to XLM
          percentage,
          isActive
        });
      }
    }
    
    return { livestreamBets };
  } catch (error) {
    console.error('Error fetching odds:', error);
    return { livestreamBets: [] };
  }
}

// Get potential payout for a user's bet on a specific livestream
export async function getPotentialPayout(
  marketAddress: string,
  userAddress: string,
  livestreamId: number
): Promise<string> {
  try {
    const server = getRpcServer();
    const contractAddress = new Address(marketAddress);
    const userAddr = new Address(userAddress);
    const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
    
    // Get user bet
    const userBetOp = Operation.invokeHostFunction({
      func: xdr.HostFunction.hostFunctionTypeInvokeContract(
        xdr.InvokeContractArgs({
          contractAddress: contractAddress.toScAddress(),
          functionName: xdr.ScSymbol.fromString('get_user_bet'),
          args: [
            nativeToScVal(userAddr),
            nativeToScVal(BigInt(livestreamId))
          ]
        })
      ),
      auth: []
    });
    
    const userBetTx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(userBetOp)
      .setTimeout(30)
      .build();
    
    const userBetResponse = await server.simulateTransaction(userBetTx);
    
    if (userBetResponse.errorResult || !userBetResponse.result) {
      return '0';
    }
    
    const userBet = scValToNative(userBetResponse.result) as bigint;
    if (userBet === BigInt(0)) return '0';
    
    // Get market info
    const marketInfo = await getMarketInfo(marketAddress);
    const totalPool = BigInt(marketInfo.totalPool);
    
    // Get livestream bets
    const livestreamBetsOp = Operation.invokeHostFunction({
      func: xdr.HostFunction.hostFunctionTypeInvokeContract(
        xdr.InvokeContractArgs({
          contractAddress: contractAddress.toScAddress(),
          functionName: xdr.ScSymbol.fromString('get_livestream_bets'),
          args: [nativeToScVal(BigInt(livestreamId))]
        })
      ),
      auth: []
    });
    
    const livestreamBetsTx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(livestreamBetsOp)
      .setTimeout(30)
      .build();
    
    const livestreamBetsResponse = await server.simulateTransaction(livestreamBetsTx);
    
    if (livestreamBetsResponse.errorResult || !livestreamBetsResponse.result) {
      return '0';
    }
    
    const livestreamData = scValToNative(livestreamBetsResponse.result);
    const livestreamPool = livestreamData[0] as bigint;
    
    if (livestreamPool === BigInt(0)) return '0';
    
    // Calculate potential payout: (userBet / livestreamPool) * totalPool
    const payout = (userBet * totalPool) / livestreamPool;
    return (Number(payout) / 10000000).toString(); // Convert stroops to XLM
  } catch (error) {
    console.error('Error fetching potential payout:', error);
    return '0';
  }
}

// Claim payout from a resolved market
export async function claimPayout(marketAddress: string): Promise<string> {
  try {
    const userAddress = await getUserPublicKey();
    const server = getRpcServer();
    const sourceAccount = await server.getAccount(userAddress);
    const contractAddress = new Address(marketAddress);
    const contractOp = Operation.invokeHostFunction({
      func: xdr.HostFunction.hostFunctionTypeInvokeContract(
        xdr.InvokeContractArgs({
          contractAddress: contractAddress.toScAddress(),
          functionName: xdr.ScSymbol.fromString('claim_payout'),
          args: [nativeToScVal(userAddress)]
        })
      ),
      auth: []
    });
    
    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(contractOp)
      .setTimeout(30)
      .build();

    // Sign with Freighter wallet
    if (window.freighterApi) {
      const signed = await window.freighterApi.signTransaction(tx.toXDR(), {
        network: getNetworkPassphrase(),
        accountToSign: userAddress,
      });
      
      const txResponse = await server.sendTransaction(signed);
      
      if (txResponse.status === 'ERROR') {
        throw new Error(txResponse.errorResult?.toString() || 'Transaction failed');
      }
      
      return txResponse.hash;
    }
    
    throw new Error('No Stellar wallet available. Please connect your wallet through the UI.');
  } catch (error) {
    console.error('Error claiming payout:', error);
    throw error;
  }
}

// Check if user has Stellar wallet available
export function isWalletAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as any).stellarWalletsKit !== 'undefined';
}

// Request wallet connection
// Note: This function should be called from a component with AuthContext access
// For direct usage, use the AuthContext's login function instead
export async function connectWallet(): Promise<string> {
  const kit = (window as any).stellarWalletsKit;
  if (!kit) {
    throw new Error('Stellar Wallet Kit not initialized. Please connect your wallet through the UI.');
  }
  
  try {
    const { address } = await kit.getAddress();
    if (!address) {
      throw new Error('Failed to connect wallet');
    }
    return address;
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
}

// Debug function to test contract connectivity
export async function testContractConnection(): Promise<{
  isConnected: boolean;
  contractAddress: string;
  networkConfig: any;
  totalMarkets: number;
  owner: string;
  error?: string;
}> {
  try {
    const server = getRpcServer();
    const contractAddress = new Address(CONTRACTS.MarketFactory);
    const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
    
    // Call get_total_market_count
    const countOp = Operation.invokeHostFunction({
      func: xdr.HostFunction.hostFunctionTypeInvokeContract(
        xdr.InvokeContractArgs({
          contractAddress: contractAddress.toScAddress(),
          functionName: xdr.ScSymbol.fromString('get_total_market_count'),
          args: []
        })
      ),
      auth: []
    });
    
    const countTx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(countOp)
      .setTimeout(30)
      .build();
    
    const countResponse = await server.simulateTransaction(countTx);
    
    // Call get_owner
    const ownerOp = Operation.invokeHostFunction({
      func: xdr.HostFunction.hostFunctionTypeInvokeContract(
        xdr.InvokeContractArgs({
          contractAddress: contractAddress.toScAddress(),
          functionName: xdr.ScSymbol.fromString('get_owner'),
          args: []
        })
      ),
      auth: []
    });
    
    const ownerTx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(ownerOp)
      .setTimeout(30)
      .build();
    
    const ownerResponse = await server.simulateTransaction(ownerTx);
    
    const totalMarkets = countResponse.result 
      ? Number(scValToNative(countResponse.result))
      : 0;
    const owner = ownerResponse.result 
      ? scValToNative(ownerResponse.result).toString()
      : '';
    
    return {
      isConnected: true,
      contractAddress: CONTRACTS.MarketFactory,
      networkConfig: getCurrentNetworkConfig(),
      totalMarkets,
      owner
    };
  } catch (error) {
    console.error('Contract connection test failed:', error);
    return {
      isConnected: false,
      contractAddress: CONTRACTS.MarketFactory,
      networkConfig: getCurrentNetworkConfig(),
      totalMarkets: 0,
      owner: '',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Extended market info including metadata
export interface MarketWithMetadata extends MarketInfo {
  contractAddress: string;
  creator: string;
  description?: string;
  category?: string;
  tags?: string[];
}

// Fetch markets with metadata and filtering
export async function fetchMarketsWithMetadata(filters: {
  category?: string;
  tags?: string[];
  creator?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{
  markets: MarketWithMetadata[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}> {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.tags && filters.tags.length > 0) params.set('tags', filters.tags.join(','));
    if (filters.creator) params.set('creator', filters.creator);
    if (filters.limit) params.set('limit', filters.limit.toString());
    if (filters.offset) params.set('offset', filters.offset.toString());

    // Fetch metadata from database
    const response = await fetch(`${API_BASE_URL}/markets/metadata?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch market metadata');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch market metadata');
    }

    // For each market, fetch on-chain data
    const marketsWithMetadata: MarketWithMetadata[] = [];

    for (const metadata of data.markets) {
      try {
        const onChainInfo = await getMarketInfo(metadata.contract_address);
        
        const marketWithMetadata: MarketWithMetadata = {
          ...onChainInfo,
          contractAddress: metadata.contract_address,
          creator: metadata.creator_wallet_address,
          description: metadata.description,
          category: metadata.category,
          tags: metadata.tags
        };

        marketsWithMetadata.push(marketWithMetadata);
      } catch (error) {
        console.error(`Failed to fetch on-chain data for market ${metadata.contract_address}:`, error);
      }
    }

    return {
      markets: marketsWithMetadata,
      pagination: data.pagination
    };
  } catch (error) {
    console.error('Error fetching markets with metadata:', error);
    throw error;
  }
}

// Fetch all available tags for filtering
export async function fetchAvailableTags(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/markets/metadata/tags`);
    if (!response.ok) {
      throw new Error('Failed to fetch tags');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch tags');
    }

    return data.tags;
  } catch (error) {
    console.error('Error fetching available tags:', error);
    return [];
  }
}

// Fetch all available categories for filtering
export async function fetchAvailableCategories(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/markets/metadata/categories`);
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch categories');
    }

    return data.categories;
  } catch (error) {
    console.error('Error fetching available categories:', error);
    return [];
  }
}

// Market leaderboard entry interface
export interface MarketLeaderboardEntry {
  rank: number;
  marketAddress: string;
  question: string;
  totalPool: string;
  totalBettors: number;
  category: string;
  state: MarketState;
  createdAt: number;
  livestreamTitles: string[];
}

// Fetch market leaderboard data based on betting activity
export async function fetchMarketLeaderboardData(limit: number = 20): Promise<MarketLeaderboardEntry[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard/markets?limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch market leaderboard data');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch market leaderboard data');
    }

    return data.leaderboard;
  } catch (error) {
    console.error('Error fetching market leaderboard data:', error);
    return generateMockMarketLeaderboardData(limit);
  }
}

// Generate mock market leaderboard data for development/testing
function generateMockMarketLeaderboardData(limit: number): MarketLeaderboardEntry[] {
  const mockData: MarketLeaderboardEntry[] = [];
  
  for (let i = 0; i < limit; i++) {
    const totalPool = (Math.random() * 1000 + 50).toFixed(2);
    const totalBettors = Math.floor(Math.random() * 50) + 5;
    const categories = ['hackathon', 'gaming', 'technology', 'education', 'entertainment'];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const states = [MarketState.Open, MarketState.Closed, MarketState.Resolved];
    const state = states[Math.floor(Math.random() * states.length)];
    
    mockData.push({
      rank: i + 1,
      marketAddress: `G${Math.random().toString(36).substring(2, 56)}`,
      question: `Will this ${category} project win the hackathon?`,
      totalPool,
      totalBettors,
      category,
      state,
      createdAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
      livestreamTitles: [`${category.charAt(0).toUpperCase() + category.slice(1)} Project ${i + 1}`]
    });
  }
  
  return mockData.sort((a, b) => parseFloat(b.totalPool) - parseFloat(a.totalPool));
}

// Livestream leaderboard entry interface
export interface LivestreamLeaderboardEntry {
  rank: number;
  livestreamId: number;
  title: string;
  creatorUsername: string;
  totalBets: number;
  totalVolume: string;
  category: string;
  status: string;
  viewCount: number;
  createdAt: number;
  thumbnailUrl: string;
  market_address: string;
}

// Fetch livestream leaderboard data from API
export async function fetchLivestreamLeaderboardData(limit: number = 20): Promise<LivestreamLeaderboardEntry[]> {
  const sorted = [...mockLivestreams]
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, limit);
  return sorted.map((stream, idx) => ({
    rank: idx + 1,
    livestreamId: stream.id || idx + 1,
    title: stream.title,
    creatorUsername: stream.creator_wallet_address,
    totalBets: 0,
    totalVolume: '0',
    category: stream.category || 'general',
    status: stream.status,
    viewCount: stream.view_count || 0,
    createdAt: stream.created_at ? new Date(stream.created_at).getTime() : Date.now(),
    thumbnailUrl: stream.thumbnail_url || '',
    market_address: stream.market_address || '',
  }));
}

// Type declaration for Stellar Wallet Kit
declare global {
  interface Window {
    stellarWalletsKit?: {
      getAddress: () => Promise<{ address: string }>;
      signTransaction: (xdr: string, opts?: { networkPassphrase?: string; address?: string }) => Promise<{ signedTxXdr: string }>;
      disconnect: () => Promise<void>;
      setWallet: (id: string) => void;
      openModal: (params: {
        onWalletSelected: (option: any) => void;
        onClosed?: (err: Error) => void;
        modalTitle?: string;
        notAvailableText?: string;
      }) => Promise<void>;
    };
  }
}
