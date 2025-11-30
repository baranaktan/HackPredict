#!/bin/bash

# Test script for contract initialization

set -e

CONTRACT_ID="CASAJ3VKONBMJSUAYXQC7JDVNFPL4TBTNIMZTEQCACDH4ISR2ASMFOOL"
NETWORK="testnet"
KEY_NAME="deployer"

echo "🧪 Testing Contract Initialization"
echo "===================================="
echo ""

# Get owner address
OWNER_ADDRESS=$(stellar keys address "$KEY_NAME" 2>/dev/null)
if [ -z "$OWNER_ADDRESS" ]; then
    echo "❌ Could not get owner address from key: $KEY_NAME"
    exit 1
fi

echo "Contract ID: $CONTRACT_ID"
echo "Owner Address: $OWNER_ADDRESS"
echo "Network: $NETWORK"
echo ""

# Step 1: Check if contract is already initialized
echo "📋 Step 1: Checking if contract is initialized..."
if stellar contract invoke \
    --id "$CONTRACT_ID" \
    --network "$NETWORK" \
    --source-account "$KEY_NAME" \
    -- get_owner 2>&1 | grep -q "Contract not initialized\|UnreachableCodeReached"; then
    echo "✅ Contract is NOT initialized (as expected)"
    INITIALIZED=false
else
    CURRENT_OWNER=$(stellar contract invoke \
        --id "$CONTRACT_ID" \
        --network "$NETWORK" \
        --source-account "$KEY_NAME" \
        -- get_owner 2>&1 | grep -oE "[A-Z0-9]{56}" | head -1)
    if [ -n "$CURRENT_OWNER" ]; then
        echo "⚠️  Contract is already initialized"
        echo "Current Owner: $CURRENT_OWNER"
        if [ "$CURRENT_OWNER" = "$OWNER_ADDRESS" ]; then
            echo "✅ Owner matches! Contract is ready."
            exit 0
        else
            echo "❌ Owner mismatch!"
            exit 1
        fi
    fi
    INITIALIZED=true
fi

echo ""

# Step 2: Try to initialize
if [ "$INITIALIZED" = "false" ]; then
    echo "🚀 Step 2: Initializing contract..."
    echo ""
    
    INIT_RESULT=$(stellar contract invoke \
        --id "$CONTRACT_ID" \
        --network "$NETWORK" \
        --source-account "$KEY_NAME" \
        -- initialize \
        --owner "$OWNER_ADDRESS" 2>&1)
    
    if echo "$INIT_RESULT" | grep -q "success\|Success\|✅"; then
        echo "✅ Initialization successful!"
        echo "$INIT_RESULT"
    elif echo "$INIT_RESULT" | grep -q "error\|Error\|❌"; then
        echo "❌ Initialization failed:"
        echo "$INIT_RESULT"
        exit 1
    else
        echo "📤 Transaction submitted:"
        echo "$INIT_RESULT"
    fi
    
    echo ""
    echo "⏳ Waiting 3 seconds for transaction to complete..."
    sleep 3
fi

# Step 3: Verify initialization
echo ""
echo "🔍 Step 3: Verifying initialization..."
VERIFY_RESULT=$(stellar contract invoke \
    --id "$CONTRACT_ID" \
    --network "$NETWORK" \
    --source-account "$KEY_NAME" \
    -- get_owner 2>&1)

if echo "$VERIFY_RESULT" | grep -q "$OWNER_ADDRESS"; then
    echo "✅ SUCCESS! Contract is initialized"
    echo "Owner: $OWNER_ADDRESS"
    exit 0
elif echo "$VERIFY_RESULT" | grep -q "Contract not initialized\|UnreachableCodeReached"; then
    echo "❌ Contract is still not initialized"
    echo "Result: $VERIFY_RESULT"
    exit 1
else
    echo "⚠️  Unexpected result:"
    echo "$VERIFY_RESULT"
    exit 1
fi
