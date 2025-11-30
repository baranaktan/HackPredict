#!/bin/bash

# Stellar Soroban Contract Deployment Script
# This script builds and deploys the MarketFactory contract to Stellar Testnet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTRACT_NAME="market-factory"
CONTRACT_DIR="contracts/${CONTRACT_NAME}"
NETWORK="${STELLAR_NETWORK:-testnet}"

echo -e "${BLUE}🚀 Stellar Soroban Contract Deployment${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Check if stellar CLI is installed
if ! command -v stellar &> /dev/null; then
    echo -e "${RED}❌ Stellar CLI is not installed!${NC}"
    echo "Please install it from: https://soroban.stellar.org/docs/getting-started/setup"
    exit 1
fi

echo -e "${GREEN}✅ Stellar CLI found${NC}"

# Check if we're in the right directory
if [ ! -d "$CONTRACT_DIR" ]; then
    echo -e "${RED}❌ Contract directory not found: $CONTRACT_DIR${NC}"
    exit 1
fi

# Navigate to contract directory
cd "$CONTRACT_DIR"

echo -e "${BLUE}📦 Building contract...${NC}"
echo ""

# Build the contract
if ! stellar contract build; then
    echo -e "${RED}❌ Contract build failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Contract built successfully!${NC}"
echo ""

# Check if WASM file exists
WASM_FILE="target/wasm32-unknown-unknown/release/${CONTRACT_NAME}.wasm"
if [ ! -f "$WASM_FILE" ]; then
    echo -e "${RED}❌ WASM file not found: $WASM_FILE${NC}"
    echo "Looking for WASM files..."
    find target -name "*.wasm" 2>/dev/null || echo "No WASM files found"
    exit 1
fi

echo -e "${GREEN}✅ WASM file found: $WASM_FILE${NC}"
echo ""

# Deploy the contract
echo -e "${BLUE}🚀 Deploying contract to ${NETWORK}...${NC}"
echo ""

# Check for source account
SOURCE_ACCOUNT=$(stellar keys address 2>/dev/null || echo "")
if [ -z "$SOURCE_ACCOUNT" ]; then
    echo -e "${YELLOW}⚠️  No Stellar key found. You may need to set up your key:${NC}"
    echo "  stellar keys generate"
    echo "  stellar keys fund --network $NETWORK"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Deploy contract
echo -e "${BLUE}📤 Deploying contract...${NC}"
if [ -n "$SOURCE_ACCOUNT" ]; then
    DEPLOY_OUTPUT=$(stellar contract deploy \
        --wasm "$WASM_FILE" \
        --network "$NETWORK" \
        --source-account "$SOURCE_ACCOUNT" 2>&1)
else
    DEPLOY_OUTPUT=$(stellar contract deploy \
        --wasm "$WASM_FILE" \
        --network "$NETWORK" 2>&1)
fi

# Extract contract ID from output
CONTRACT_ID=$(echo "$DEPLOY_OUTPUT" | grep -oE "Contract ID: [A-Z0-9]{56}" | cut -d' ' -f3 || echo "")

if [ -z "$CONTRACT_ID" ]; then
    # Try alternative patterns
    CONTRACT_ID=$(echo "$DEPLOY_OUTPUT" | grep -oE "[A-Z0-9]{56}" | head -1 || echo "")
fi

if [ -z "$CONTRACT_ID" ]; then
    echo -e "${RED}❌ Failed to extract contract ID from deployment output${NC}"
    echo "Deployment output:"
    echo "$DEPLOY_OUTPUT"
    echo ""
    echo -e "${YELLOW}💡 Tip: Contract ID'yi manuel olarak çıktıdan kopyalayabilirsiniz${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Contract deployed successfully!${NC}"
echo ""
echo -e "${BLUE}Contract Information:${NC}"
echo -e "  ${GREEN}Contract ID:${NC} $CONTRACT_ID"
echo -e "  ${GREEN}Network:${NC} $NETWORK"
echo -e "  ${GREEN}WASM File:${NC} $WASM_FILE"
echo ""

# Save deployment info
DEPLOYMENT_FILE="../../deployment-${NETWORK}.json"
cat > "$DEPLOYMENT_FILE" << EOF
{
  "network": "${NETWORK}",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "contracts": {
    "MarketFactory": "${CONTRACT_ID}"
  },
  "wasm_file": "${WASM_FILE}"
}
EOF

echo -e "${GREEN}✅ Deployment info saved to: $DEPLOYMENT_FILE${NC}"
echo ""
echo -e "${YELLOW}⚠️  Next Steps:${NC}"
echo "1. Update CONTRACTS.MarketFactory in contractsApi.ts with the new contract ID"
echo "2. Initialize the contract using the 'Initialize Contract' button in the UI"
echo "3. Or run: stellar contract invoke --id $CONTRACT_ID --network $NETWORK -- initialize --owner <YOUR_ADDRESS>"
echo ""
