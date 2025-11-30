// Smart Contracts API for Betting on Livestreams - Stellar Soroban
import {
  Contract,
  Networks,
  rpc,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
  Operation,
  Account,
  Transaction,
  Keypair
} from '@stellar/stellar-sdk';
import * as StellarSdk from '@stellar/stellar-sdk';

// Type aliases for better TypeScript support
type ScVal = xdr.ScVal;
// NO MOCK DATA - Only real data from backend API
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
  MarketFactory: 'CDMVSGDBIAL6HUYQULGRLNKRDRZJSXVK3B2YXYLQP2OIA3PFCHAHVVTB'
};

// Transaction status constants
const TX_STATUS_NOT_FOUND = 'NOT_FOUND';
const TX_STATUS_PENDING = 'PENDING';
const TX_STATUS_SUCCESS = 'SUCCESS';

// Helper function to get RPC server
function getRpcServer(): rpc.Server {
  return new rpc.Server(RPC_URL, { allowHttp: true });
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
async function signAndSend(tx: any, userAddress: string): Promise<string> {
  const server = getRpcServer();
  
  // Sign with Stellar Wallet Kit
  const kit = (window as any).stellarWalletsKit;
  if (!kit) {
    throw new Error('No Stellar wallet available. Please connect your wallet through the UI.');
  }
  
  try {
    const txXdr = tx.toXDR();
    const signResult = await kit.signTransaction(txXdr, {
      networkPassphrase: getNetworkPassphrase(),
      address: userAddress,
    });
    
    if (!signResult || !signResult.signedTxXdr) {
      throw new Error('Transaction signing failed. No signed transaction returned.');
    }
    
    // Ensure signedTxXdr is a string (XDR format)
    const signedTxXdrString = typeof signResult.signedTxXdr === 'string' 
      ? signResult.signedTxXdr 
      : String(signResult.signedTxXdr);
    
    // Send transaction with XDR string directly (same as createMarket and other functions)
    // This is the proven working pattern in the codebase
    let txResponse;
    try {
      txResponse = await server.sendTransaction(signedTxXdrString);
    } catch (sendError: any) {
      // Better error message extraction
      let errorMsg = 'Transaction send failed';
      if (sendError) {
        if (typeof sendError === 'string') {
          errorMsg = sendError;
        } else if (sendError.message) {
          errorMsg = sendError.message;
        } else if (sendError.toString && sendError.toString() !== '[object Object]') {
          errorMsg = sendError.toString();
        } else {
          // Try to extract useful info from error object
          try {
            errorMsg = JSON.stringify(sendError, Object.getOwnPropertyNames(sendError));
          } catch {
            errorMsg = 'Unknown error (could not stringify)';
          }
        }
      }
      throw new Error(`Failed to send transaction: ${errorMsg}`);
    }
    
    if (txResponse.status === 'ERROR') {
      let errorMsg = 'Transaction failed';
      if (txResponse.errorResult) {
        if (typeof txResponse.errorResult === 'string') {
          errorMsg = txResponse.errorResult;
        } else if (txResponse.errorResult.toString && txResponse.errorResult.toString() !== '[object Object]') {
          errorMsg = txResponse.errorResult.toString();
        } else {
          errorMsg = JSON.stringify(txResponse.errorResult);
        }
      }
      throw new Error(errorMsg);
    }
    
    if (!txResponse.hash) {
      throw new Error('Transaction sent but no hash returned');
    }
    
    return txResponse.hash;
  } catch (error: any) {
    // Better error handling with detailed message extraction
    let errorMessage = 'Unknown error occurred';
    if (error) {
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.toString && error.toString() !== '[object Object]') {
        errorMessage = error.toString();
      } else {
        errorMessage = JSON.stringify(error);
      }
    }
    throw new Error(`Transaction failed: ${errorMessage}`);
  }
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

// Initialize the MarketFactory contract
export async function initializeContract(): Promise<{ success: boolean; error?: string; txHash?: string }> {
  try {
    console.log('🚀 Initializing MarketFactory contract...');
    
    // Get user's public key (this will be the owner)
    const userAddress = await getUserPublicKey();
    
    const server = getRpcServer();
    
    // Get source account with proper error handling
    let sourceAccount;
    try {
      sourceAccount = await server.getAccount(userAddress);
    } catch (error: any) {
      return { 
        success: false, 
        error: `Failed to load account: ${error.message || 'Account not found'}` 
      };
    }
    
    const factoryContract = new Contract(CONTRACTS.MarketFactory);
    
    // Try to check if contract is already initialized using get_owner
    // This is a read-only call, so it won't cause issues
    try {
      const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
      const ownerCall = factoryContract.call('get_owner');
      const ownerTx = new TransactionBuilder(dummyAccount, {
        fee: '100',
        networkPassphrase: getNetworkPassphrase(),
      })
        .addOperation(ownerCall)
        .setTimeout(30)
        .build();
      
      const ownerResponse = await server.simulateTransaction(ownerTx);
      
      if (ownerResponse && ('result' in ownerResponse) && ownerResponse.result) {
        const currentOwner = scValToNative(ownerResponse.result.retval).toString();
        return { 
          success: false, 
          error: `Contract is already initialized. Owner: ${currentOwner.slice(0, 8)}... You can proceed to create markets.` 
        };
      }
    } catch (checkError: any) {
      // If get_owner fails, contract is not initialized - proceed with initialization
      console.log('Contract is not initialized, proceeding with initialization...');
    }
    
    // Build initialize call - use string directly (same as createMarket pattern)
    // nativeToScVal can handle string addresses directly
    // IMPORTANT: Convert address to proper Address type, not string
    const ownerAddress = new Address(userAddress);
    const initializeCall = factoryContract.call(
      'initialize',
      ownerAddress.toScVal()
    );
    
    // Build initial transaction
    let tx;
    try {
      tx = new TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: getNetworkPassphrase(),
      })
        .addOperation(initializeCall)
        .setTimeout(30)
        .build();
    } catch (buildError: any) {
      return { 
        success: false, 
        error: `Failed to build transaction: ${buildError.message || String(buildError)}` 
      };
    }

    // Simulate the transaction first
    console.log('📋 Simulating initialize transaction...');
    const simulationResponse = await server.simulateTransaction(tx);
    
    // Check for simulation errors
    if ('error' in simulationResponse && simulationResponse.error) {
      const errorMsg = String(simulationResponse.error);
      if (errorMsg.includes('already initialized') || errorMsg.includes('UnreachableCodeReached')) {
        return { 
          success: false, 
          error: 'Contract is already initialized. You can proceed to create markets.' 
        };
      }
      return {
        success: false,
        error: `Simulation failed: ${errorMsg}`
      };
    }

    // Prepare the transaction with simulation results
    console.log('📦 Preparing transaction...');
    const preparedTx = rpc.assembleTransaction(tx, simulationResponse as rpc.Api.SimulateTransactionSuccessResponse);
    const preparedTxBuilt = preparedTx.build();

    // Sign and send transaction
    const kit = (window as any).stellarWalletsKit;
    if (!kit) {
      return { 
        success: false, 
        error: 'No Stellar wallet available. Please connect your wallet.' 
      };
    }
    
    let txHash: string;
    try {
      console.log('✍️ Requesting signature...');
      const signResult = await kit.signTransaction(preparedTxBuilt.toXDR(), {
        networkPassphrase: getNetworkPassphrase(),
        address: userAddress,
      });
      
      const signedTxXdr = typeof signResult === 'string' 
        ? signResult 
        : (signResult?.signedTxXdr || String(signResult));
      
      console.log('📤 Sending transaction...');
      // Parse the signed XDR back to a Transaction for sendTransaction
      const signedTx = TransactionBuilder.fromXDR(signedTxXdr, getNetworkPassphrase());
      const txResponse = await server.sendTransaction(signedTx);
      
      if (txResponse.status === 'ERROR') {
        const errorMsg = txResponse.errorResult?.toString() || 'Transaction failed';
        if (errorMsg.includes('UnreachableCodeReached') || errorMsg.includes('initialize')) {
          return { 
            success: false, 
            error: 'Contract is already initialized. You can proceed to create markets.' 
          };
        }
        return { 
          success: false, 
          error: errorMsg 
        };
      }
      
      if (!txResponse.hash) {
        return { 
          success: false, 
          error: 'Transaction sent but no hash returned' 
        };
      }
      
      txHash = txResponse.hash;
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || 'Unknown error';
      console.error('Transaction error details:', error);
      
      if (errorMsg.includes('UnreachableCodeReached') || errorMsg.includes('initialize')) {
        return { 
          success: false, 
          error: 'Contract is already initialized. You can proceed to create markets.' 
        };
      }
      
      return { 
        success: false, 
        error: `Transaction failed: ${errorMsg}` 
      };
    }
    
    // Wait for transaction to complete and verify
    let txResult;
    try {
      txResult = await server.getTransaction(txHash);
      while ((txResult.status as string) === 'NOT_FOUND' || (txResult.status as string) === 'PENDING') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        txResult = await server.getTransaction(txHash);
      }
    } catch (getError: any) {
      // If we got a hash from signAndSend, assume success
      console.log('✅ Contract initialized successfully! (Hash:', txHash, ')');
      return { success: true, txHash };
    }
    
    if ((txResult.status as string) === 'SUCCESS') {
      console.log('✅ Contract initialized successfully!');
      return { success: true, txHash };
    }
    
    // Check transaction result for errors
    if (txResult.status === 'FAILED' || txResult.status === 'ERROR') {
      const errorDetails = txResult.errorResult?.toString() || 'Transaction failed';
      if (errorDetails.includes('UnreachableCodeReached') || errorDetails.includes('initialize')) {
        return { 
          success: false, 
          error: 'Contract is already initialized. You can proceed to create markets.' 
        };
      }
      return { 
        success: false, 
        error: `Transaction failed: ${errorDetails}` 
      };
    }
    
    return { success: false, error: 'Transaction completed but initialization may have failed' };
    
  } catch (error: any) {
    console.error('❌ Error initializing contract:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
    return { 
      success: false, 
      error: errorMessage
    };
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
    
    const server = getRpcServer();
    const sourceAccount = await server.getAccount(userAddress);
    const factoryContract = new Contract(CONTRACTS.MarketFactory);
    
    // Note: Owner check will be done by the contract itself during simulation
    // If the caller is not the owner, the simulation will fail with "Not owner" error
    console.log('📝 Creating market with caller:', userAddress);
    
    // Convert parameters to ScVal
    // Empty arrays need special handling
    const livestreamIdsScVal = livestreamIds.length > 0
      ? nativeToScVal(livestreamIds.map(id => BigInt(id)), { type: 'vec' })
      : xdr.ScVal.scvVec([]);
    const questionScVal = nativeToScVal(question, { type: 'string' });
    const livestreamTitlesScVal = livestreamTitles.length > 0
      ? nativeToScVal(livestreamTitles, { type: 'vec' })
      : xdr.ScVal.scvVec([]);
    
    // Prediction Market contract WASM hash (deployed contract)
    // This is the hash of the prediction-market contract that was built
    // Hash: b44fd7a519a402bd869038f1d0def9bcb135a65fc38a180bd0006f28275e7efd
    const wasmHashHex = 'b44fd7a519a402bd869038f1d0def9bcb135a65fc38a180bd0006f28275e7efd';
    // Convert hex string to Uint8Array (browser-compatible)
    const wasmHashBytes = new Uint8Array(
      wasmHashHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    console.log('📦 Using Prediction Market WASM hash:', wasmHashHex);
    
    // Build contract invocation using Contract.call()
    // IMPORTANT: Convert address to proper Address type, not string
    const callerAddress = new Address(userAddress);
    // Create BytesN<32> ScVal for wasm hash using nativeToScVal with bytes type
    const wasmHashScVal = nativeToScVal(wasmHashBytes, { type: 'bytes' });
    const contractCall = factoryContract.call(
      'create_market',
      callerAddress.toScVal(),
      livestreamIdsScVal,
      questionScVal,
      livestreamTitlesScVal,
      wasmHashScVal
    );
    
    // Build initial transaction
    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100000', // Higher fee for contract deployment
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(contractCall)
      .setTimeout(300) // Longer timeout for deployment
      .build();

    // IMPORTANT: Simulate the transaction first to get footprint and auth requirements
    console.log('📋 Simulating transaction...');
    
    // Use raw fetch to avoid SDK parsing issues with newer Soroban protocol
    const rpcUrl = STELLAR_NETWORK === 'mainnet' 
      ? 'https://soroban-mainnet.stellar.org'
      : 'https://soroban-testnet.stellar.org';
    
    const rawResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'simulateTransaction',
        params: {
          transaction: tx.toXDR()
        }
      })
    });
    
    const rawResult = await rawResponse.json();
    console.log('Raw simulation response:', rawResult);
    
    if (rawResult.error) {
      return {
        success: false,
        error: `Simulation failed: ${rawResult.error.message || JSON.stringify(rawResult.error)}`
      };
    }
    
    if (rawResult.result?.error) {
      const errorStr = rawResult.result.error;
      console.error('Simulation error:', errorStr);
      
      if (errorStr.includes('Not owner')) {
        return { success: false, error: 'Only the contract owner can create markets.' };
      }
      if (errorStr.includes('Contract not initialized')) {
        return { success: false, error: 'Contract is not initialized.' };
      }
      if (errorStr.includes('ExistingValue') || errorStr.includes('contract already exists')) {
        return { success: false, error: 'A market with this exact question already exists. Please use a different question.' };
      }
      
      return { success: false, error: `Simulation failed: ${errorStr}` };
    }
    
    // Check if simulation was successful
    if (!rawResult.result?.transactionData) {
      return {
        success: false,
        error: 'Simulation did not return transaction data. The transaction may fail.'
      };
    }
    
    // Use SDK's prepareTransaction for proper handling
    console.log('📦 Preparing transaction...');
    const simResult = rawResult.result;
    
    const kit = (window as any).stellarWalletsKit;
    if (!kit) {
      return { success: false, error: 'No Stellar wallet available. Please connect your wallet.' };
    }
    
    let preparedTxXdr: string;
    try {
      // Try SDK's prepareTransaction first (handles auth, footprint, fees automatically)
      console.log('Trying SDK prepareTransaction...');
      const preparedTx = await server.prepareTransaction(tx);
      preparedTxXdr = preparedTx.toXDR();
      console.log('✅ SDK prepareTransaction succeeded');
    } catch (sdkError: any) {
      console.warn('SDK prepareTransaction failed:', sdkError.message);
      
      // Fallback: Manual preparation using raw simulation data
      try {
        console.log('Falling back to manual preparation...');
        
        // Parse soroban data
        const sorobanDataXdr = xdr.SorobanTransactionData.fromXDR(simResult.transactionData, 'base64');
        
        // Calculate fee
        const minFee = parseInt(simResult.minResourceFee || '0');
        const totalFee = (100000 + minFee).toString();
        
        // Get auth entries
        let authEntries: xdr.SorobanAuthorizationEntry[] = [];
        if (simResult.results?.[0]?.auth) {
          authEntries = simResult.results[0].auth.map((a: string) => 
            xdr.SorobanAuthorizationEntry.fromXDR(a, 'base64')
          );
        }
        
        // Clone transaction preserving sequence number
        const clonedBuilder = TransactionBuilder.cloneFrom(tx, {
          fee: totalFee,
          sorobanData: sorobanDataXdr
        });
        
        // Rebuild with auth
        clonedBuilder.clearOperations();
        const opWithAuth = Operation.invokeHostFunction({
          func: (tx.operations[0] as any).func,
          auth: authEntries
        });
        clonedBuilder.addOperation(opWithAuth);
        
        const preparedTx = clonedBuilder.build();
        preparedTxXdr = preparedTx.toXDR();
        console.log('✅ Manual preparation succeeded');
      } catch (manualError: any) {
        console.error('Manual preparation also failed:', manualError);
        return {
          success: false,
          error: `Failed to prepare transaction: ${manualError.message}`
        };
      }
    }
    
    console.log('✍️ Requesting signature...');
    
    // Sign the transaction
    const signResult = await kit.signTransaction(preparedTxXdr, {
      networkPassphrase: getNetworkPassphrase(),
      address: userAddress,
    });
    
    // Ensure signedTxXdr is a string (XDR format)
    const signedTxXdr = typeof signResult === 'string' 
      ? signResult 
      : (signResult?.signedTxXdr || (signResult as any)?.xdr || String(signResult));
    
    if (!signedTxXdr || typeof signedTxXdr !== 'string') {
      return { 
        success: false, 
        error: 'Transaction signing failed. Invalid signed transaction format.' 
      };
    }
    
    // Send transaction using raw RPC to avoid SDK parsing issues
    console.log('📤 Sending transaction...');
    const sendResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'sendTransaction',
        params: {
          transaction: signedTxXdr
        }
      })
    });
    
    const sendResult = await sendResponse.json();
    console.log('Send transaction response:', sendResult);
    
    if (sendResult.error) {
      return {
        success: false,
        error: `Transaction failed: ${sendResult.error.message || JSON.stringify(sendResult.error)}`
      };
    }
    
    if (sendResult.result?.status === 'ERROR') {
      // Try to decode the error
      let errorDetails = sendResult.result.errorResultXdr || 'Unknown error';
      
      // Log full response for debugging
      console.error('Transaction ERROR response:', JSON.stringify(sendResult.result, null, 2));
      
      // Common error codes
      if (errorDetails.includes('AAAAAAAH')) {
        errorDetails = 'Transaction failed during execution. This usually means the contract call failed (e.g., authorization issue, contract error, or insufficient resources).';
      }
      
      return {
        success: false,
        error: `Transaction failed: ${errorDetails}`
      };
    }
    
    const txHash = sendResult.result?.hash;
    if (!txHash) {
      return { success: false, error: 'Transaction sent but no hash returned' };
    }
    
    console.log('Transaction hash:', txHash);
    
    // Poll for transaction result using raw RPC
    let attempts = 0;
    const maxAttempts = 30;
    let txStatus = 'PENDING';
    let txResultData: any = null;
    
    while ((txStatus === 'PENDING' || txStatus === 'NOT_FOUND') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      
      const statusResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'getTransaction',
          params: {
            hash: txHash
          }
        })
      });
      
      const statusResult = await statusResponse.json();
      txStatus = statusResult.result?.status || 'NOT_FOUND';
      txResultData = statusResult.result;
      
      console.log(`Transaction status (attempt ${attempts}):`, txStatus);
    }
    
    if (txStatus === 'SUCCESS') {
      // Try to extract the market address from the result
      let marketAddress = '';
      
      if (txResultData?.returnValue) {
        // The return value should be the market address
        // It's in SCVal format, we need to decode it
        try {
          // Try to decode the address from the return value
          // The format is usually an ScVal Address type
          const returnVal = txResultData.returnValue;
          // For now, just use the raw value or hash as identifier
          marketAddress = txHash; // Fallback to tx hash
          
          // Try to parse if it looks like an address
          if (typeof returnVal === 'string' && returnVal.startsWith('C')) {
            marketAddress = returnVal;
          }
        } catch (parseErr) {
          console.warn('Could not parse return value:', parseErr);
          marketAddress = txHash;
        }
      } else {
        marketAddress = txHash; // Use tx hash as fallback identifier
      }
      
      console.log('✅ Market created! TX Hash:', txHash);
      
      // Store market metadata directly in Supabase
      try {
        const { supabase } = await import('./supabase');
        const { error: insertError } = await supabase
          .from('market_metadata')
          .insert({
            contract_address: marketAddress,
            description: title,
            category: category || 'general',
            creator_wallet_address: userAddress,
          });

        if (insertError) {
          console.warn('Failed to store market metadata:', insertError.message);
        } else {
          console.log('Market metadata stored in Supabase successfully');
        }
      } catch (metadataError) {
        console.warn('Error storing market metadata:', metadataError);
      }
      
      return { success: true, marketAddress };
    } else if (txStatus === 'FAILED') {
      return { 
        success: false, 
        error: `Transaction failed: ${txResultData?.resultXdr || 'Unknown error'}` 
      };
    } else {
      return { 
        success: false, 
        error: `Transaction timed out after ${maxAttempts * 2} seconds` 
      };
    }
    
  } catch (error: any) {
    console.error('❌ Error creating market:', error);
    let errorMsg = 'Unknown error occurred';
    if (typeof error === 'string') {
      errorMsg = error;
    } else if (error?.message) {
      errorMsg = error.message;
    } else if (error) {
      try {
        errorMsg = JSON.stringify(error);
      } catch {
        errorMsg = String(error);
      }
    }
    return { 
      success: false, 
      error: errorMsg
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
    // Get the creator's wallet address
    const creatorAddress = await getUserPublicKey();
    
    // Create the market on blockchain with the provided title and question
    // The smart contract will store these on-chain
    const livestreamIds = livestreamId ? [livestreamId] : []; // Can be empty
    const livestreamTitles = livestreamId ? [title] : []; // Can be empty
    
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
      const errorMsg = typeof result.error === 'string' 
        ? result.error 
        : (result.error ? JSON.stringify(result.error) : 'Failed to create market');
      throw new Error(errorMsg);
    }

    const marketAddress = result.marketAddress!;
    console.log('Market created on-chain:', marketAddress);
    
    // Store additional metadata in Supabase
    if (description || category || tags) {
      try {
        const { supabase } = await import('./supabase');
        
        // Check if already exists (from createMarket function)
        const { data: existing } = await supabase
          .from('market_metadata')
          .select('id')
          .eq('contract_address', marketAddress)
          .single();
        
        if (existing) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('market_metadata')
            .update({
              description: description || question,
              category: category || 'general',
            })
            .eq('contract_address', marketAddress);
          
          if (updateError) {
            console.warn('Failed to update market metadata:', updateError.message);
          } else {
            console.log('Market metadata updated in Supabase');
          }
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('market_metadata')
            .insert({
              contract_address: marketAddress,
              description: description || question,
              category: category || 'general',
              creator_wallet_address: creatorAddress,
            });
          
          if (insertError) {
            console.warn('Failed to store market metadata:', insertError.message);
          } else {
            console.log('Market metadata stored in Supabase');
          }
        }
      } catch (metadataError) {
        console.warn('Failed to store market metadata:', metadataError);
        // Don't throw error - the market was created successfully
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
    const contract = new Contract(marketAddress);
    
    // Build contract invocation for get_market_info using Contract.call()
    const contractCall = contract.call('get_market_info');
    
    // Create a dummy account for simulation (read-only)
    const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
    const tx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(contractCall)
      .setTimeout(30)
      .build();
    
    // Simulate the transaction
    const response = await server.simulateTransaction(tx);
    
    // Type guard for SimulateTransactionResponse
    if ('errorResult' in response && response.errorResult) {
      throw new Error(response.errorResult.toString());
    }
    
    if (!('result' in response) || !response.result) {
      throw new Error('No result from contract call');
    }
    
    const data = scValToNative(response.result.retval);
    
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
      createdAt: 0, // Stellar contracts may not have this
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
    // IMPORTANT: Convert address to proper Address type, not string
    const userAddr = new Address(userAddress);
    const contractCall = contract.call(
      'place_bet',
      userAddr.toScVal(),
      nativeToScVal(BigInt(livestreamId)),
      nativeToScVal(amountInStroops)
    );
    
    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(contractCall)
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
        throw new Error(txResponse.errorResult?.toString() || 'Transaction failed');
      }
      
      return txResponse.hash;
    }
    
    throw new Error('No Stellar wallet available. Please connect your wallet through the UI.');
  } catch (error) {
    console.error('Error placing bet:', error);
    
    // Enhanced error handling for betting scenarios
    if (error instanceof Error) {
      if (error.message.includes('user rejected') || error.message.includes('rejected')) {
        throw new Error('Bet cancelled by user');
      } else if (error.message.includes('insufficient funds')) {
        throw new Error('Insufficient XLM tokens to place bet');
      } else if (error.message.includes('execution reverted') || error.message.includes('failed')) {
        throw new Error('Bet failed - market may be closed or invalid amount');
      } else if (error.message.includes('network')) {
        throw new Error('Network error - check your connection to Stellar testnet');
      }
    }
    
    throw error;
  }
}

// Get user's bets for a market (per-livestream)
export async function getUserBets(marketAddress: string, userAddress: string): Promise<UserBets> {
  try {
    const server = getRpcServer();
    const contract = new Contract(marketAddress);
    const marketInfo = await getMarketInfo(marketAddress);
    
    const livestreamIds: number[] = [];
    const amounts: string[] = [];
    const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
    const userAddr = new Address(userAddress);
    
    // Fetch bet for each livestream
    for (const livestreamId of marketInfo.livestreamIds) {
      const contractCall = contract.call(
        'get_user_bet',
        nativeToScVal(userAddr),
        nativeToScVal(BigInt(livestreamId))
      );
      
      const tx = new TransactionBuilder(dummyAccount, {
        fee: '100',
        networkPassphrase: getNetworkPassphrase(),
      })
        .addOperation(contractCall)
        .setTimeout(30)
        .build();
      
      const response = await server.simulateTransaction(tx);
      
      if (!('errorResult' in response) && 'result' in response && response.result) {
        const betAmount = scValToNative(response.result.retval) as bigint;
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
    const contract = new Contract(marketAddress);
    const marketInfo = await getMarketInfo(marketAddress);
    
    const livestreamBets: LivestreamBet[] = [];
    const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
    
    for (const livestreamId of marketInfo.livestreamIds) {
      const contractCall = contract.call(
        'get_livestream_bets',
        nativeToScVal(BigInt(livestreamId))
      );
      
      const tx = new TransactionBuilder(dummyAccount, {
        fee: '100',
        networkPassphrase: getNetworkPassphrase(),
      })
        .addOperation(contractCall)
        .setTimeout(30)
        .build();
      
      const response = await server.simulateTransaction(tx);
      
      if (!('errorResult' in response) && 'result' in response && response.result) {
        const data = scValToNative(response.result.retval);
        const amount = (data[0] as bigint).toString();
        const bettorCount = Number(data[1]);
        const isActive = data[2] as boolean;
        
        livestreamBets.push({
          livestreamId,
          title: marketInfo.livestreamTitles[marketInfo.livestreamIds.indexOf(livestreamId)] || `Livestream ${livestreamId}`,
          amount: (Number(amount) / 10000000).toString(), // Convert stroops to XLM
          percentage: 0, // Calculate from total pool
          isActive
        });
      }
    }
    
    // Calculate percentages
    const totalAmount = livestreamBets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
    livestreamBets.forEach(bet => {
      bet.percentage = totalAmount > 0 ? (parseFloat(bet.amount) / totalAmount) * 100 : 0;
    });
    
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
    const contract = new Contract(marketAddress);
    const userAddr = new Address(userAddress);
    const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
    
    // Get user bet
    const userBetCall = contract.call(
      'get_user_bet',
      nativeToScVal(userAddr),
      nativeToScVal(BigInt(livestreamId))
    );
    
    const userBetTx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(userBetCall)
      .setTimeout(30)
      .build();
    
    const userBetResponse = await server.simulateTransaction(userBetTx);
    
    if (('errorResult' in userBetResponse && userBetResponse.errorResult) || !('result' in userBetResponse) || !userBetResponse.result) {
      return '0';
    }
    
    const userBet = scValToNative(userBetResponse.result.retval) as bigint;
    if (userBet === BigInt(0)) return '0';
    
    // Get market info
    const marketInfo = await getMarketInfo(marketAddress);
    const totalPool = BigInt(marketInfo.totalPool);
    
    // Get livestream bets
    const livestreamBetsCall = contract.call(
      'get_livestream_bets',
      nativeToScVal(BigInt(livestreamId))
    );
    
    const livestreamBetsTx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(livestreamBetsCall)
      .setTimeout(30)
      .build();
    
    const livestreamBetsResponse = await server.simulateTransaction(livestreamBetsTx);
    
    if (('errorResult' in livestreamBetsResponse && livestreamBetsResponse.errorResult) || !('result' in livestreamBetsResponse) || !livestreamBetsResponse.result) {
      return '0';
    }
    
    const livestreamData = scValToNative(livestreamBetsResponse.result.retval);
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
    const contract = new Contract(marketAddress);
    // IMPORTANT: Convert address to proper Address type, not string
    const userAddr = new Address(userAddress);
    const contractCall = contract.call(
      'claim_payout',
      userAddr.toScVal()
    );
    
    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(contractCall)
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

// Transfer contract ownership to a new owner
export async function transferOwnership(newOwnerAddress: string): Promise<string> {
  try {
    const userAddress = await getUserPublicKey();
    const server = getRpcServer();
    const sourceAccount = await server.getAccount(userAddress);
    const factoryContract = new Contract(CONTRACTS.MarketFactory);
    
    // Build transfer_ownership call
    // IMPORTANT: Convert addresses to proper Address type, not string
    const callerAddr = new Address(userAddress);
    const newOwnerAddr = new Address(newOwnerAddress);
    const transferCall = factoryContract.call(
      'transfer_ownership',
      callerAddr.toScVal(), // caller
      newOwnerAddr.toScVal() // new_owner
    );
    
    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(transferCall)
      .setTimeout(30)
      .build();

    // Sign with Stellar Wallet Kit
    const kit = (window as any).stellarWalletsKit;
    if (!kit) {
      throw new Error('No Stellar wallet available. Please connect your wallet.');
    }

    const { signedTxXdr } = await kit.signTransaction(tx.toXDR(), {
      networkPassphrase: getNetworkPassphrase(),
      address: userAddress,
    });
    
    const txResponse = await server.sendTransaction(signedTxXdr);
    
    if (txResponse.status === 'ERROR') {
      throw new Error(txResponse.errorResult?.toString() || 'Transaction failed');
    }
    
    return txResponse.hash;
  } catch (error) {
    console.error('Error transferring ownership:', error);
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
    const contract = new Contract(CONTRACTS.MarketFactory);
    const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
    
    // Call get_total_market_count using Contract.call()
    const countCall = contract.call('get_total_market_count');
    const countTx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(countCall)
      .setTimeout(30)
      .build();
    
    const countResponse = await server.simulateTransaction(countTx);
    
    // Call get_owner using Contract.call()
    const ownerCall = contract.call('get_owner');
    const ownerTx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(ownerCall)
      .setTimeout(30)
      .build();
    
    const ownerResponse = await server.simulateTransaction(ownerTx);
    
    const totalMarkets = ('result' in countResponse && countResponse.result)
      ? Number(scValToNative(countResponse.result.retval))
      : 0;
    const owner = ('result' in ownerResponse && ownerResponse.result)
      ? scValToNative(ownerResponse.result.retval).toString()
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
          // Metadata
          contractAddress: metadata.contract_address,
          creator: metadata.creator_wallet_address,
          description: metadata.description,
          category: metadata.category,
          tags: metadata.tags
        };

        marketsWithMetadata.push(marketWithMetadata);
      } catch (error) {
        console.error(`Failed to fetch on-chain data for market ${metadata.contract_address}:`, error);
        // Skip this market if on-chain data is unavailable
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

// Fetch market leaderboard data based on betting activity (Direct Supabase)
export async function fetchMarketLeaderboardData(limit: number = 20): Promise<MarketLeaderboardEntry[]> {
  try {
    // Import supabase client dynamically to avoid circular dependencies
    const { supabase } = await import('./supabase');
    
    const { data, error } = await supabase
      .from('market_metadata')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      return [];
    }

    return (data || []).map((market: any, idx: number) => ({
      rank: idx + 1,
      marketAddress: market.contract_address,
      question: market.description || 'Market',
      totalPool: '0', // Would need to query from blockchain
      totalBettors: 0, // Would need to query from blockchain
      category: market.category || 'general',
      state: MarketState.Open,
      createdAt: market.created_at ? new Date(market.created_at).getTime() : Date.now(),
      livestreamTitles: []
    }));
  } catch (error) {
    console.error('Error fetching market leaderboard data:', error);
    return [];
  }
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

// Fetch livestream leaderboard data (Direct Supabase)
export async function fetchLivestreamLeaderboardData(limit: number = 20): Promise<LivestreamLeaderboardEntry[]> {
  try {
    // Import supabase client dynamically to avoid circular dependencies
    const { supabase } = await import('./supabase');
    
    const { data, error } = await supabase
      .from('livestreams')
      .select('*')
      .order('view_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      return [];
    }
      
    return (data || []).map((stream: any, idx: number) => ({
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
  } catch (error) {
    console.error('Error fetching livestream leaderboard:', error);
    return [];
  }
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
