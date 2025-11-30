// Test script to simulate frontend initialize call
// Run with: node test-frontend-init.js

const { Contract, Networks, rpc, Address, nativeToScVal, TransactionBuilder, Account } = require('@stellar/stellar-sdk');

const CONTRACT_ID = 'CASAJ3VKONBMJSUAYXQC7JDVNFPL4TBTNIMZTEQCACDH4ISR2ASMFOOL';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK = Networks.TESTNET;
const TEST_ADDRESS = 'GBPMHFOLEACRDABME54YRSQXPB445UB55ZGRUUHKBIPTGHZPXKTSC6PB';

async function testInitialize() {
  console.log('🧪 Testing Initialize Function');
  console.log('==============================\n');
  
  const server = new rpc.Server(RPC_URL, { allowHttp: true });
  const factoryContract = new Contract(CONTRACT_ID);
  
  // Test 1: Using Address object
  console.log('Test 1: Using Address object');
  try {
    const userAddr = new Address(TEST_ADDRESS);
    const initializeCall1 = factoryContract.call(
      'initialize',
      nativeToScVal(userAddr)
    );
    console.log('✅ Address object conversion successful');
  } catch (error) {
    console.log('❌ Address object conversion failed:', error.message);
  }
  
  // Test 2: Using string directly
  console.log('\nTest 2: Using string directly');
  try {
    const initializeCall2 = factoryContract.call(
      'initialize',
      nativeToScVal(TEST_ADDRESS)
    );
    console.log('✅ String conversion successful');
  } catch (error) {
    console.log('❌ String conversion failed:', error.message);
  }
  
  // Test 3: Simulate transaction building
  console.log('\nTest 3: Building transaction');
  try {
    const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
    const initializeCall = factoryContract.call(
      'initialize',
      nativeToScVal(TEST_ADDRESS)
    );
    
    const tx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: NETWORK,
    })
      .addOperation(initializeCall)
      .setTimeout(30)
      .build();
    
    console.log('✅ Transaction built successfully');
    console.log('Transaction XDR length:', tx.toXDR().length);
  } catch (error) {
    console.log('❌ Transaction building failed:', error.message);
  }
}

testInitialize().catch(console.error);
