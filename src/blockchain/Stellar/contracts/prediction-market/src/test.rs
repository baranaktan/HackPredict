#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String, Vec};

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register(PredictionMarket, ());
    let client = PredictionMarketClient::new(&env, &contract_id);

    // Create test addresses using BytesN
    let oracle_bytes = [1u8; 32];
    let oracle = Address::from_contract_id(&env, &BytesN::from_array(&env, &oracle_bytes));
    
    let factory_bytes = [2u8; 32];
    let factory = Address::from_contract_id(&env, &BytesN::from_array(&env, &factory_bytes));
    let question = String::from_str(&env, "Which livestream will win?");
    
    let livestream_ids = Vec::from_array(&env, [1u64, 2u64]);
    let livestream_titles = Vec::from_array(
        &env,
        [
            String::from_str(&env, "Livestream 1"),
            String::from_str(&env, "Livestream 2"),
        ],
    );

    client.initialize(
        &livestream_ids,
        &question,
        &livestream_titles,
        &oracle,
        &factory,
    );

    let (ids, retrieved_question, state, winning_id, total_pool, total_bettors) = client.get_market_info();
    assert_eq!(ids.len(), 2);
    assert_eq!(retrieved_question, question);
    assert_eq!(state, State::Open);
    assert_eq!(winning_id, 0);
    assert_eq!(total_pool, 0);
    assert_eq!(total_bettors, 0);
}
