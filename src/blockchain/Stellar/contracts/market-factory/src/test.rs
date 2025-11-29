#![cfg(test)]

use super::*;
use soroban_sdk::{Address, BytesN, Env};

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register(MarketFactory, ());
    let client = MarketFactoryClient::new(&env, &contract_id);

    // Create test address using BytesN
    let owner_bytes = [1u8; 32];
    let owner = Address::from_contract_id(&env, &BytesN::from_array(&env, &owner_bytes));
    client.initialize(&owner);
    
    let retrieved_owner = client.get_owner();
    assert_eq!(owner, retrieved_owner);
}

