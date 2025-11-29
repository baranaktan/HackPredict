#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Vec, BytesN
};

#[contracttype]
pub enum DataKey {
    Owner,
    LivestreamMarkets(u64), // livestream_id -> Vec<Address>
    ValidMarkets(Address), // market_address -> bool
    MarketToLivestreams(Address), // market_address -> Vec<u64>
    AllMarkets,
}

#[contract]
pub struct MarketFactory;

#[contractimpl]
impl MarketFactory {
    /// Initialize the factory
    pub fn initialize(env: Env, owner: Address) {
        owner.require_auth();
        
        env.storage().instance().set(&DataKey::Owner, &owner);
        env.storage().instance().set(&DataKey::AllMarkets, &Vec::<Address>::new(&env));
        
        env.events().publish(
            (String::from_str(&env, "factory_initialized"),),
            owner
        );
    }

    /// Create a new prediction market
    pub fn create_market(
        env: Env,
        caller: Address,
        livestream_ids: Vec<u64>,
        question: String,
        livestream_titles: Vec<String>,
        wasm_hash: BytesN<32>,
    ) -> Address {
        caller.require_auth();
        
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        assert!(caller == owner, "Not owner");
        
        assert!(
            livestream_ids.len() == livestream_titles.len(),
            "Mismatched arrays"
        );
        
        // Deploy new prediction market contract
        let question_bytes = question.to_bytes();
        let salt_hash = env.crypto().sha256(&question_bytes);
        let salt_array = salt_hash.to_array();
        let salt = BytesN::from_array(&env, &salt_array);
        let market_address = env.deployer()
            .with_current_contract(salt)
            .deploy_v2(wasm_hash, ());
        
        // Initialize the market (you'll need to add this call to the market contract)
        // This is a placeholder - actual implementation depends on how you structure initialization
        
        // Store market info
        env.storage().persistent().set(&DataKey::ValidMarkets(market_address.clone()), &true);
        env.storage().persistent().set(&DataKey::MarketToLivestreams(market_address.clone()), &livestream_ids);
        
        let mut all_markets: Vec<Address> = env.storage().instance().get(&DataKey::AllMarkets).unwrap();
        all_markets.push_back(market_address.clone());
        env.storage().instance().set(&DataKey::AllMarkets, &all_markets);
        
        // Add market to each livestream's market list
        for i in 0..livestream_ids.len() {
            let livestream_id = livestream_ids.get(i).unwrap();
            
            let mut markets = env.storage()
                .persistent()
                .get(&DataKey::LivestreamMarkets(livestream_id))
                .unwrap_or(Vec::<Address>::new(&env));
            
            markets.push_back(market_address.clone());
            env.storage().persistent().set(&DataKey::LivestreamMarkets(livestream_id), &markets);
        }
        
        env.events().publish(
            (String::from_str(&env, "market_created"),),
            (market_address.clone(), question, livestream_ids.clone())
        );
        
        market_address
    }

    /// Add a livestream to an existing market
    pub fn add_livestream_to_market(
        env: Env,
        caller: Address,
        market_address: Address,
        livestream_id: u64,
        _livestream_title: String,
    ) {
        caller.require_auth();
        
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        assert!(caller == owner, "Not owner");
        
        let is_valid: bool = env.storage()
            .persistent()
            .get(&DataKey::ValidMarkets(market_address.clone()))
            .unwrap_or(false);
        assert!(is_valid, "Invalid market");
        
        // Check if livestream is already in market
        let current_livestreams: Vec<u64> = env.storage()
            .persistent()
            .get(&DataKey::MarketToLivestreams(market_address.clone()))
            .unwrap();
        
        for i in 0..current_livestreams.len() {
            let id = current_livestreams.get(i).unwrap();
            assert!(id != livestream_id, "Livestream already in market");
        }
        
        // Update mappings
        let mut market_livestreams = current_livestreams;
        market_livestreams.push_back(livestream_id);
        env.storage().persistent().set(
            &DataKey::MarketToLivestreams(market_address.clone()),
            &market_livestreams
        );
        
        let mut livestream_markets = env.storage()
            .persistent()
            .get(&DataKey::LivestreamMarkets(livestream_id))
            .unwrap_or(Vec::<Address>::new(&env));
        livestream_markets.push_back(market_address.clone());
        env.storage().persistent().set(&DataKey::LivestreamMarkets(livestream_id), &livestream_markets);
        
        env.events().publish(
            (String::from_str(&env, "livestream_added_to_market"),),
            (market_address, livestream_id)
        );
    }

    /// Remove a livestream from a market
    pub fn remove_livestream_from_market(
        env: Env,
        caller: Address,
        market_address: Address,
        livestream_id: u64,
    ) {
        caller.require_auth();
        
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        assert!(caller == owner, "Not owner");
        
        let is_valid: bool = env.storage()
            .persistent()
            .get(&DataKey::ValidMarkets(market_address.clone()))
            .unwrap_or(false);
        assert!(is_valid, "Invalid market");
        
        // Update marketToLivestreams mapping
        let market_livestreams: Vec<u64> = env.storage()
            .persistent()
            .get(&DataKey::MarketToLivestreams(market_address.clone()))
            .unwrap();
        
        let mut new_market_livestreams: Vec<u64> = Vec::new(&env);
        for i in 0..market_livestreams.len() {
            let id = market_livestreams.get(i).unwrap();
            if id != livestream_id {
                new_market_livestreams.push_back(id);
            }
        }
        env.storage().persistent().set(
            &DataKey::MarketToLivestreams(market_address.clone()),
            &new_market_livestreams
        );
        
        // Update livestreamMarkets mapping
        let livestream_markets: Vec<Address> = env.storage()
            .persistent()
            .get(&DataKey::LivestreamMarkets(livestream_id))
            .unwrap();
        
        let mut new_livestream_markets: Vec<Address> = Vec::new(&env);
        for i in 0..livestream_markets.len() {
            let addr = livestream_markets.get(i).unwrap();
            if addr != market_address {
                new_livestream_markets.push_back(addr);
            }
        }
        env.storage().persistent().set(&DataKey::LivestreamMarkets(livestream_id), &new_livestream_markets);
        
        env.events().publish(
            (String::from_str(&env, "livestream_removed_from_market"),),
            (market_address, livestream_id)
        );
    }

    /// Get all markets for a specific livestream
    pub fn get_markets_for_livestream(env: Env, livestream_id: u64) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::LivestreamMarkets(livestream_id))
            .unwrap_or(Vec::<Address>::new(&env))
    }

    /// Get market count for a livestream
    pub fn get_market_count_for_livestream(env: Env, livestream_id: u64) -> u32 {
        let markets: Vec<Address> = env.storage()
            .persistent()
            .get(&DataKey::LivestreamMarkets(livestream_id))
            .unwrap_or(Vec::<Address>::new(&env));
        markets.len()
    }

    /// Get total number of markets
    pub fn get_total_market_count(env: Env) -> u32 {
        let all_markets: Vec<Address> = env.storage()
            .instance()
            .get(&DataKey::AllMarkets)
            .unwrap();
        all_markets.len()
    }

    /// Get all markets (paginated)
    pub fn get_all_markets(env: Env, offset: u32, limit: u32) -> Vec<Address> {
        let all_markets: Vec<Address> = env.storage()
            .instance()
            .get(&DataKey::AllMarkets)
            .unwrap();
        
        assert!(offset < all_markets.len(), "Offset out of bounds");
        
        let end = if offset + limit > all_markets.len() {
            all_markets.len()
        } else {
            offset + limit
        };
        
        let mut result: Vec<Address> = Vec::new(&env);
        for i in offset..end {
            result.push_back(all_markets.get(i).unwrap());
        }
        
        result
    }

    /// Get livestream IDs for a market
    pub fn get_livestreams_for_market(env: Env, market_address: Address) -> Vec<u64> {
        let is_valid: bool = env.storage()
            .persistent()
            .get(&DataKey::ValidMarkets(market_address.clone()))
            .unwrap_or(false);
        assert!(is_valid, "Invalid market");
        
        env.storage()
            .persistent()
            .get(&DataKey::MarketToLivestreams(market_address))
            .unwrap()
    }

    /// Check if a livestream is in a specific market
    pub fn is_livestream_in_market(
        env: Env,
        market_address: Address,
        livestream_id: u64,
    ) -> bool {
        let is_valid: bool = env.storage()
            .persistent()
            .get(&DataKey::ValidMarkets(market_address.clone()))
            .unwrap_or(false);
        
        if !is_valid {
            return false;
        }
        
        let livestream_ids: Vec<u64> = env.storage()
            .persistent()
            .get(&DataKey::MarketToLivestreams(market_address))
            .unwrap();
        
        for i in 0..livestream_ids.len() {
            if livestream_ids.get(i).unwrap() == livestream_id {
                return true;
            }
        }
        
        false
    }

    /// Called by markets when they are closed
    pub fn notify_market_closed(env: Env, caller: Address, livestream_ids: Vec<u64>) {
        // Verify caller is a valid market
        let is_valid: bool = env.storage()
            .persistent()
            .get(&DataKey::ValidMarkets(caller.clone()))
            .unwrap_or(false);
        assert!(is_valid, "Not a valid market");
        
        env.events().publish(
            (String::from_str(&env, "market_closed"),),
            (caller, livestream_ids)
        );
    }

    /// Transfer ownership
    pub fn transfer_ownership(env: Env, caller: Address, new_owner: Address) {
        caller.require_auth();
        
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        assert!(caller == owner, "Not owner");
        
        env.storage().instance().set(&DataKey::Owner, &new_owner);
        
        env.events().publish(
            (String::from_str(&env, "ownership_transferred"),),
            (caller, new_owner)
        );
    }

    /// Check if a market exists
    pub fn is_valid_market(env: Env, market_address: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::ValidMarkets(market_address))
            .unwrap_or(false)
    }

    /// Get current owner
    pub fn get_owner(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Owner).unwrap()
    }
}

mod test;

