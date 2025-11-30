# Stellar Soroban Contract Deployment Guide

## Ön Gereksinimler

1. **Stellar CLI Kurulumu:**
   ```bash
   cargo install --locked --version 20.4.0 soroban-cli
   ```

2. **Stellar Testnet Hesabı:**
   - Testnet XLM almak için: https://laboratory.stellar.org/#account-creator?network=test
   - Veya: `stellar keys generate` ile yeni keypair oluşturun

## Hızlı Deploy

### Basit Yöntem (Önerilen)

```bash
cd src/blockchain/Stellar
./deploy-simple.sh
```

Bu script:
- Contract'ı build eder
- Testnet'e deploy eder  
- Contract ID'yi gösterir

### Gelişmiş Yöntem

```bash
cd src/blockchain/Stellar
./deploy.sh
```

## Adım Adım Deploy

### 1. Contract'ı Build Etme

```bash
cd src/blockchain/Stellar/contracts/market-factory
stellar contract build
```

### 2. Contract'ı Deploy Etme

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/market_factory.wasm \
  --network testnet
```

### 3. Contract ID'yi Kopyalama

Deploy çıktısından Contract ID'yi kopyalayın (56 karakterlik string).

### 4. Contract Address'ini Güncelleme

`src/app/lib/contractsApi.ts` dosyasını açın ve `CONTRACTS.MarketFactory` değerini güncelleyin:

```typescript
const CONTRACTS = {
  PredictionMarket: 'CCLL4NFYAZEF2GU6ORX75LHQGO64WEDTLNKEPUF5XRMVGAMTMQYC5SGS',
  MarketFactory: 'YENI_CONTRACT_ID_BURAYA'  // ← Buraya yeni contract ID
};
```

### 5. Contract'ı Initialize Etme

UI'dan "Initialize Contract" butonunu kullanabilirsiniz.

## Sorun Giderme

### "stellar: command not found"
```bash
cargo install --locked --version 20.4.0 soroban-cli
```

### "Insufficient balance"
- Testnet XLM alın: https://laboratory.stellar.org/#account-creator?network=test
- Veya: `stellar keys fund --network testnet`

### WASM dosyası bulunamıyor
```bash
cd src/blockchain/Stellar/contracts/market-factory
stellar contract build
find target -name "*.wasm"
```
