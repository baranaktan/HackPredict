#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, String, Vec
};

#[derive(Clone, Copy, PartialEq, Debug)]
#[contracttype]
pub enum State {
    Open = 0,
    Closed = 1,
    Resolved = 2,
}

#[contracttype]
#[derive(Clone)]
pub struct LivestreamData {
    pub id: u64,
    pub title: String,
    pub active: bool,
    pub added_at: u64,
}

#[contracttype]
pub enum DataKey {
    Question,
    Oracle,
    Factory,
    State,
    WinningLivestreamId,
    CreatedAt,
    ClosedAt,
    ResolvedAt,
    Livestreams(u64), // livestream_id -> LivestreamData
    LivestreamIds,
    Bets(Address, u64), // (user, livestream_id) -> amount
    TotalBets(u64), // livestream_id -> total amount
    TotalPool,
    HasBet(Address),
    Bettors,
    TotalBettors,
}

#[contract]
pub struct PredictionMarket;

#[contractimpl]
impl PredictionMarket {
    /// Initialize the prediction market
    pub fn initialize(
        env: Env,
        livestream_ids: Vec<u64>,
        question: String,
        livestream_titles: Vec<String>,
        oracle: Address,
        factory: Address,
    ) {
        // Ensure arrays match
        assert!(
            livestream_ids.len() == livestream_titles.len(),
            "Mismatched arrays"
        );

        // Store basic info
        env.storage().instance().set(&DataKey::Question, &question);
        env.storage().instance().set(&DataKey::Oracle, &oracle);
        env.storage().instance().set(&DataKey::Factory, &factory);
        env.storage().instance().set(&DataKey::State, &State::Open);
        env.storage().instance().set(&DataKey::CreatedAt, &env.ledger().timestamp());
        env.storage().instance().set(&DataKey::TotalPool, &0u128);
        env.storage().instance().set(&DataKey::TotalBettors, &0u64);
        env.storage().instance().set(&DataKey::WinningLivestreamId, &0u64);

        // Initialize livestreams
        let mut ids_vec: Vec<u64> = Vec::new(&env);
        for i in 0..livestream_ids.len() {
            let id = livestream_ids.get(i).unwrap();
            let title = livestream_titles.get(i).unwrap();
            
            assert!(id != 0, "Invalid livestream ID");
            
            let livestream = LivestreamData {
                id,
                title,
                active: true,
                added_at: env.ledger().timestamp(),
            };
            
            env.storage().persistent().set(&DataKey::Livestreams(id), &livestream);
            ids_vec.push_back(id);
        }
        
        env.storage().instance().set(&DataKey::LivestreamIds, &ids_vec);
        env.storage().instance().set(&DataKey::Bettors, &Vec::<Address>::new(&env));

        // Publish event
        env.events().publish(
            (String::from_str(&env, "market_created"),),
            (question, livestream_ids)
        );
    }

    /// Add a new livestream to the market
    pub fn add_livestream(
        env: Env,
        caller: Address,
        livestream_id: u64,
        title: String,
    ) {
        caller.require_auth();
        
        let oracle: Address = env.storage().instance().get(&DataKey::Oracle).unwrap();
        assert!(caller == oracle, "Not oracle");
        
        let state: State = env.storage().instance().get(&DataKey::State).unwrap();
        assert!(state == State::Open, "Market not open");
        
        assert!(livestream_id != 0, "Invalid livestream ID");
        
        // Check if livestream already exists
        let exists = env.storage().persistent().has(&DataKey::Livestreams(livestream_id));
        assert!(!exists, "Livestream already exists");
        
        let livestream = LivestreamData {
            id: livestream_id,
            title: title.clone(),
            active: true,
            added_at: env.ledger().timestamp(),
        };
        
        env.storage().persistent().set(&DataKey::Livestreams(livestream_id), &livestream);
        
        let mut ids: Vec<u64> = env.storage().instance().get(&DataKey::LivestreamIds).unwrap();
        ids.push_back(livestream_id);
        env.storage().instance().set(&DataKey::LivestreamIds, &ids);
        
        env.events().publish(
            (String::from_str(&env, "livestream_added"),),
            (livestream_id, title)
        );
    }

    /// Update livestream title
    pub fn update_livestream_title(
        env: Env,
        caller: Address,
        livestream_id: u64,
        new_title: String,
    ) {
        caller.require_auth();
        
        let oracle: Address = env.storage().instance().get(&DataKey::Oracle).unwrap();
        assert!(caller == oracle, "Not oracle");
        
        let state: State = env.storage().instance().get(&DataKey::State).unwrap();
        assert!(state == State::Open, "Market not open");
        
        let mut livestream: LivestreamData = env.storage()
            .persistent()
            .get(&DataKey::Livestreams(livestream_id))
            .expect("Livestream not found");
        
        assert!(livestream.active, "Livestream not active");
        
        livestream.title = new_title.clone();
        env.storage().persistent().set(&DataKey::Livestreams(livestream_id), &livestream);
        
        env.events().publish(
            (String::from_str(&env, "livestream_updated"),),
            (livestream_id, new_title)
        );
    }

    /// Add livestream with title (public function)
    pub fn add_livestream_with_title(
        env: Env,
        caller: Address,
        livestream_id: u64,
        title: String,
    ) {
        caller.require_auth();
        
        let state: State = env.storage().instance().get(&DataKey::State).unwrap();
        assert!(state == State::Open, "Market not open");
        
        assert!(livestream_id > 0, "Invalid livestream ID");
        assert!(title.len() > 0, "Title cannot be empty");
        
        let exists = env.storage().persistent().has(&DataKey::Livestreams(livestream_id));
        
        if !exists {
            let livestream = LivestreamData {
                id: livestream_id,
                title: title.clone(),
                active: true,
                added_at: env.ledger().timestamp(),
            };
            
            env.storage().persistent().set(&DataKey::Livestreams(livestream_id), &livestream);
            
            let mut ids: Vec<u64> = env.storage().instance().get(&DataKey::LivestreamIds).unwrap();
            ids.push_back(livestream_id);
            env.storage().instance().set(&DataKey::LivestreamIds, &ids);
            
            env.events().publish(
                (String::from_str(&env, "livestream_added"),),
                (livestream_id, title)
            );
        }
    }

    /// Remove a livestream from the market
    pub fn remove_livestream(
        env: Env,
        caller: Address,
        livestream_id: u64,
    ) {
        caller.require_auth();
        
        let oracle: Address = env.storage().instance().get(&DataKey::Oracle).unwrap();
        assert!(caller == oracle, "Not oracle");
        
        let state: State = env.storage().instance().get(&DataKey::State).unwrap();
        assert!(state == State::Open, "Market not open");
        
        let mut livestream: LivestreamData = env.storage()
            .persistent()
            .get(&DataKey::Livestreams(livestream_id))
            .expect("Livestream not found");
        
        assert!(livestream.active, "Livestream not active");
        
        livestream.active = false;
        env.storage().persistent().set(&DataKey::Livestreams(livestream_id), &livestream);
        
        // Remove from IDs array
        let ids: Vec<u64> = env.storage().instance().get(&DataKey::LivestreamIds).unwrap();
        let mut new_ids: Vec<u64> = Vec::new(&env);
        for i in 0..ids.len() {
            let id = ids.get(i).unwrap();
            if id != livestream_id {
                new_ids.push_back(id);
            }
        }
        env.storage().instance().set(&DataKey::LivestreamIds, &new_ids);
        
        env.events().publish(
            (String::from_str(&env, "livestream_removed"),),
            livestream_id
        );
    }

    /// Place a bet on a specific livestream
    pub fn place_bet(
        env: Env,
        user: Address,
        livestream_id: u64,
        amount: i128,
    ) {
        user.require_auth();
        
        let state: State = env.storage().instance().get(&DataKey::State).unwrap();
        assert!(state == State::Open, "Market not open");
        assert!(amount > 0, "Amount must be positive");
        assert!(livestream_id > 0, "Invalid livestream ID");
        
        // Auto-add livestream if it doesn't exist
        let exists = env.storage().persistent().has(&DataKey::Livestreams(livestream_id));
        if !exists {
            let default_title = String::from_str(&env, "Project #");
            
            let livestream = LivestreamData {
                id: livestream_id,
                title: default_title,
                active: true,
                added_at: env.ledger().timestamp(),
            };
            
            env.storage().persistent().set(&DataKey::Livestreams(livestream_id), &livestream);
            
            let mut ids: Vec<u64> = env.storage().instance().get(&DataKey::LivestreamIds).unwrap();
            ids.push_back(livestream_id);
            env.storage().instance().set(&DataKey::LivestreamIds, &ids);
        }
        
        // Transfer tokens from user to contract
        let token_address = Address::from_string(&String::from_str(&env, "NATIVE"));
        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&user, &env.current_contract_address(), &amount);
        
        // Track new bettor
        let has_bet = env.storage().persistent().has(&DataKey::HasBet(user.clone()));
        if !has_bet {
            env.storage().persistent().set(&DataKey::HasBet(user.clone()), &true);
            
            let mut bettors: Vec<Address> = env.storage().instance().get(&DataKey::Bettors).unwrap();
            bettors.push_back(user.clone());
            env.storage().instance().set(&DataKey::Bettors, &bettors);
            
            let mut total_bettors: u64 = env.storage().instance().get(&DataKey::TotalBettors).unwrap();
            total_bettors += 1;
            env.storage().instance().set(&DataKey::TotalBettors, &total_bettors);
        }
        
        // Update bet amounts
        let current_bet = env.storage()
            .persistent()
            .get(&DataKey::Bets(user.clone(), livestream_id))
            .unwrap_or(0i128);
        env.storage()
            .persistent()
            .set(&DataKey::Bets(user.clone(), livestream_id), &(current_bet + amount));
        
        let current_total = env.storage()
            .persistent()
            .get(&DataKey::TotalBets(livestream_id))
            .unwrap_or(0i128);
        env.storage()
            .persistent()
            .set(&DataKey::TotalBets(livestream_id), &(current_total + amount));
        
        let total_pool: i128 = env.storage().instance().get(&DataKey::TotalPool).unwrap();
        env.storage().instance().set(&DataKey::TotalPool, &(total_pool + amount));
        
        env.events().publish(
            (String::from_str(&env, "bet_placed"),),
            (user, livestream_id, amount, env.ledger().timestamp())
        );
    }

    /// Close the market
    pub fn close_market(env: Env, caller: Address) {
        caller.require_auth();
        
        let oracle: Address = env.storage().instance().get(&DataKey::Oracle).unwrap();
        assert!(caller == oracle, "Not oracle");
        
        let state: State = env.storage().instance().get(&DataKey::State).unwrap();
        assert!(state == State::Open, "Market not open");
        
        env.storage().instance().set(&DataKey::State, &State::Closed);
        env.storage().instance().set(&DataKey::ClosedAt, &env.ledger().timestamp());
        
        env.events().publish(
            (String::from_str(&env, "market_closed"),),
            env.ledger().timestamp()
        );
    }

    /// Resolve the market with a winning livestream
    pub fn resolve_market(
        env: Env,
        caller: Address,
        winning_livestream_id: u64,
    ) {
        caller.require_auth();
        
        let oracle: Address = env.storage().instance().get(&DataKey::Oracle).unwrap();
        assert!(caller == oracle, "Not oracle");
        
        let state: State = env.storage().instance().get(&DataKey::State).unwrap();
        assert!(state == State::Closed, "Market not closed");
        
        let _livestream: LivestreamData = env.storage()
            .persistent()
            .get(&DataKey::Livestreams(winning_livestream_id))
            .expect("Invalid winning livestream");
        
        let total_bets: i128 = env.storage()
            .persistent()
            .get(&DataKey::TotalBets(winning_livestream_id))
            .unwrap_or(0);
        assert!(total_bets > 0, "No bets on this livestream");
        
        env.storage().instance().set(&DataKey::WinningLivestreamId, &winning_livestream_id);
        env.storage().instance().set(&DataKey::State, &State::Resolved);
        env.storage().instance().set(&DataKey::ResolvedAt, &env.ledger().timestamp());
        
        env.events().publish(
            (String::from_str(&env, "market_resolved"),),
            (winning_livestream_id, env.ledger().timestamp())
        );
    }

    /// Claim payout for winning bet
    pub fn claim_payout(env: Env, user: Address) {
        user.require_auth();
        
        let state: State = env.storage().instance().get(&DataKey::State).unwrap();
        assert!(state == State::Resolved, "Market not resolved");
        
        let winning_id: u64 = env.storage().instance().get(&DataKey::WinningLivestreamId).unwrap();
        
        let user_bet: i128 = env.storage()
            .persistent()
            .get(&DataKey::Bets(user.clone(), winning_id))
            .unwrap_or(0);
        assert!(user_bet > 0, "No winning bet");
        
        let winning_pool: i128 = env.storage()
            .persistent()
            .get(&DataKey::TotalBets(winning_id))
            .unwrap();
        assert!(winning_pool > 0, "No winning bets");
        
        let total_pool: i128 = env.storage().instance().get(&DataKey::TotalPool).unwrap();
        
        // Calculate payout
        let payout = (user_bet * total_pool) / winning_pool;
        
        // Reset user's bet
        env.storage().persistent().set(&DataKey::Bets(user.clone(), winning_id), &0i128);
        
        // Transfer payout
        let token_address = Address::from_string(&String::from_str(&env, "NATIVE"));
        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&env.current_contract_address(), &user, &payout);
        
        env.events().publish(
            (String::from_str(&env, "payout_claimed"),),
            (user, payout, env.ledger().timestamp())
        );
    }

    /// Get market information
    pub fn get_market_info(env: Env) -> (Vec<u64>, String, State, u64, i128, u64) {
        let livestream_ids: Vec<u64> = env.storage().instance().get(&DataKey::LivestreamIds).unwrap();
        let question: String = env.storage().instance().get(&DataKey::Question).unwrap();
        let state: State = env.storage().instance().get(&DataKey::State).unwrap();
        let winning_id: u64 = env.storage().instance().get(&DataKey::WinningLivestreamId).unwrap();
        let total_pool: i128 = env.storage().instance().get(&DataKey::TotalPool).unwrap();
        let total_bettors: u64 = env.storage().instance().get(&DataKey::TotalBettors).unwrap();
        
        (livestream_ids, question, state, winning_id, total_pool, total_bettors)
    }

    /// Get livestream betting data
    pub fn get_livestream_bets(env: Env, livestream_id: u64) -> (i128, u64, bool) {
        let livestream: LivestreamData = env.storage()
            .persistent()
            .get(&DataKey::Livestreams(livestream_id))
            .expect("Livestream not found");
        
        let amount: i128 = env.storage()
            .persistent()
            .get(&DataKey::TotalBets(livestream_id))
            .unwrap_or(0);
        
        let total_pool: i128 = env.storage().instance().get(&DataKey::TotalPool).unwrap();
        let percentage = if total_pool > 0 {
            ((amount * 100) / total_pool) as u64
        } else {
            0
        };
        
        (amount, percentage, livestream.active)
    }

    /// Get user's bet on a specific livestream
    pub fn get_user_bet(env: Env, user: Address, livestream_id: u64) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Bets(user, livestream_id))
            .unwrap_or(0)
    }
}

mod test;
