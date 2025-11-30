#!/bin/bash

# Basit Stellar Soroban Contract Deployment Script

set -e

# Get the script directory (Stellar workspace root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACT_DIR="$SCRIPT_DIR/contracts/market-factory"
NETWORK="${STELLAR_NETWORK:-testnet}"

echo "🚀 Stellar Soroban Contract Deployment"
echo "======================================"
echo ""

# Check if stellar CLI is installed
if ! command -v stellar &> /dev/null; then
    echo "❌ Stellar CLI is not installed!"
    echo "Install: cargo install --locked --version 20.4.0 soroban-cli"
    exit 1
fi

cd "$CONTRACT_DIR"

echo "📦 Building contract..."
stellar contract build

echo ""
echo "✅ Build complete!"
echo ""

# WASM file is created in workspace root target directory
cd "$SCRIPT_DIR"
WASM_FILE="target/wasm32v1-none/release/market_factory.wasm"

# Check if WASM file exists
if [ ! -f "$WASM_FILE" ]; then
    echo "❌ WASM file not found at: $WASM_FILE"
    echo "Looking for WASM files..."
    find target -name "*.wasm" -type f 2>/dev/null || echo "No WASM files found"
    exit 1
fi

echo "📤 Deploying contract to $NETWORK..."
echo "WASM: $WASM_FILE"
echo ""

# Get source account key name (try to find a key)
SOURCE_KEY=""
if stellar keys ls &>/dev/null; then
    # Get the first available key
    SOURCE_KEY=$(stellar keys ls 2>/dev/null | head -1 | awk '{print $1}')
fi

if [ -z "$SOURCE_KEY" ]; then
    echo "❌ No Stellar key found!"
    echo "Please set up a key: stellar keys generate deployer"
    echo "Then fund it: stellar keys fund deployer --network testnet"
    exit 1
fi

SOURCE_ADDRESS=$(stellar keys address "$SOURCE_KEY" 2>/dev/null || echo "")
echo "Using key: $SOURCE_KEY"
if [ -n "$SOURCE_ADDRESS" ]; then
    echo "Account address: $SOURCE_ADDRESS"
fi
echo ""

# Deploy
stellar contract deploy \
    --wasm "$WASM_FILE" \
    --network "$NETWORK" \
    --source-account "$SOURCE_KEY"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "⚠️  Next steps:"
echo "1. Copy the Contract ID from above"
echo "2. Update CONTRACTS.MarketFactory in src/app/lib/contractsApi.ts"
echo "3. Initialize the contract using the UI or CLI"
