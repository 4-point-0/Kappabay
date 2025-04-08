module nft_template::game_manager {
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::coin::{Self, Coin};
    use sui::table::{Self, Table};
    use sui::event;
    use std::string::{Self, String};
    
    // Error constants
    const ENotAdmin: u64 = 1;
    const EInsufficientPrizePool: u64 = 2;
    const ENoActiveGame: u64 = 4;
    const EGamePaused: u64 = 5;
    const EGameNotFound: u64 = 6;

    // Events
    public struct GameCreated has copy, drop {
        game_id: ID,
        name: String,
        creation_time: u64,
        prize_pool: u64
    }
    
    public struct PotatoRegistered has copy, drop {
        potato_id: ID,
        game_id: ID
    }

    public struct GamePaused has copy, drop {
        game_id: ID,
        paused_by: address
    }

    public struct GameResumed has copy, drop {
        game_id: ID,
        resumed_by: address
    }

    public struct RewardDistributed has copy, drop {
        game_id: ID,
        recipient: address,
        amount: u64
    }

    // New events for client tracking
    public struct UniquePlayerCountEvent has copy, drop {
        game_id: ID,
        count: u64
    }

    public struct GameTransferCountEvent has copy, drop {
        game_id: ID,
        count: u64
    }

    public struct PlayerParticipationStatusEvent has copy, drop {
        game_id: ID,
        player: address,
        has_participated: bool
    }

    public struct PrizePoolStatusEvent has copy, drop {
        amount: u64
    }

    public struct GameStatusEvent has copy, drop {
        game_id: ID,
        is_active: bool,
        is_paused: bool,
        unique_players: u64,
        total_transfers: u64,
        creation_time: u64,
        name: String
    }

    // Capability for admin privileges
    public struct GameManagerCap has key, store {
        id: UID,
        manager_id: ID
    }

    // Game status tracking
    public struct GameStatus has store {
        name: String,
        active: bool,
        paused: bool,
        creation_time: u64,
        players: Table<address, bool>,  // Set of unique players (address -> bool)
        total_transfers: u64,
        potatoes_created: u64,
        end_time: Option<u64>
    }

    // Main GameManager struct
    public struct GameManager has key {
        id: UID,
        prize_pool: Balance<SUI>,
        active_games: Table<ID, GameStatus>, // Maps game ID to its status
        potato_games: Table<ID, ID>,         // Maps potato ID to game ID
        oven_id: ID,                         // ID of the Oven used to create potatoes
        total_games_created: u64,
        total_rewards_distributed: u64
    }

    // === Initialization ===

    fun init(_ctx: &mut TxContext) {
        // Module initializer, we'll implement a separate creation function
    }

    // Create a new GameManager
    public entry fun create_game_manager(
        oven_id: ID,
        initial_prize_pool: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Create the GameManager
        let manager = GameManager {
            id: object::new(ctx),
            prize_pool: coin::into_balance(initial_prize_pool),
            active_games: table::new(ctx),
            potato_games: table::new(ctx),
            oven_id,
            total_games_created: 0,
            total_rewards_distributed: 0
        };
        
        // Create the manager capability
        let manager_cap = GameManagerCap {
            id: object::new(ctx),
            manager_id: object::id(&manager)
        };
        
        // Transfer objects to the creator
        sui::transfer::share_object(manager);
        sui::transfer::public_transfer(manager_cap, sender);
    }

    // === Game Management ===

    // Start a new game with a name
    public entry fun create_game(
        manager: &mut GameManager,
        cap: &GameManagerCap,
        name: vector<u8>,
        ctx: &mut TxContext
    ) {
        // Verify authority
        assert!(object::id(manager) == cap.manager_id, ENotAdmin);
        
        // Get current time
        let current_time = tx_context::epoch_timestamp_ms(ctx);
        
        // Create game status with proper player tracking
        let game_status = GameStatus {
            name: string::utf8(name),
            active: true,
            paused: false,
            creation_time: current_time,
            players: table::new<address, bool>(ctx),
            total_transfers: 0,
            potatoes_created: 0,
            end_time: option::none<u64>()
        };
        
        // Create temporary UID for game ID
        let game_uid = object::new(ctx);
        let game_id = object::uid_to_inner(&game_uid);
        object::delete(game_uid);
        
        // Add to active games
        table::add(&mut manager.active_games, game_id, game_status);
        
        // Update counter
        manager.total_games_created = manager.total_games_created + 1;
        
        // Emit event
        event::emit(GameCreated {
            game_id,
            name: string::utf8(name),
            creation_time: current_time,
            prize_pool: balance::value(&manager.prize_pool)
        });
    }

    // Pause an active game
    public entry fun pause_game(
        manager: &mut GameManager,
        cap: &GameManagerCap,
        game_id: ID,
        ctx: &mut TxContext
    ) {
        // Verify authority
        assert!(object::id(manager) == cap.manager_id, ENotAdmin);
        
        // Check game exists
        assert!(table::contains(&manager.active_games, game_id), EGameNotFound);
        
        // Get and update game status
        let game = table::borrow_mut(&mut manager.active_games, game_id);
        assert!(game.active, ENoActiveGame);
        assert!(!game.paused, EGamePaused);
        
        game.paused = true;
        
        // Emit event
        event::emit(GamePaused {
            game_id,
            paused_by: tx_context::sender(ctx)
        });
    }

    // Resume a paused game
    public entry fun resume_game(
        manager: &mut GameManager,
        cap: &GameManagerCap,
        game_id: ID,
        ctx: &mut TxContext
    ) {
        // Verify authority
        assert!(object::id(manager) == cap.manager_id, ENotAdmin);
        
        // Check game exists
        assert!(table::contains(&manager.active_games, game_id), EGameNotFound);
        
        // Get and update game status
        let game = table::borrow_mut(&mut manager.active_games, game_id);
        assert!(game.active, ENoActiveGame);
        assert!(game.paused, ENoActiveGame);
        
        game.paused = false;
        
        // Emit event
        event::emit(GameResumed {
            game_id,
            resumed_by: tx_context::sender(ctx)
        });
    }

    // End an active game
    public entry fun end_game(
        manager: &mut GameManager,
        cap: &GameManagerCap,
        game_id: ID,
        ctx: &mut TxContext
    ) {
        // Verify authority
        assert!(object::id(manager) == cap.manager_id, ENotAdmin);
        
        // Check game exists and is active
        assert!(table::contains(&manager.active_games, game_id), EGameNotFound);
        
        // Get and update game status
        let game = table::borrow_mut(&mut manager.active_games, game_id);
        assert!(game.active, ENoActiveGame);
        
        game.active = false;
        game.end_time = option::some(tx_context::epoch_timestamp_ms(ctx));
    }

    // === Prize Pool Management ===

    // Add funds to the prize pool - anyone can add to the prize pool
    public entry fun add_to_prize_pool(
        manager: &mut GameManager,
        payment: Coin<SUI>
    ) {
        // Simply add payment to the prize pool - no authorization needed
        coin::put(&mut manager.prize_pool, payment);
        
        // Emit event for client tracking
        event::emit(PrizePoolStatusEvent {
            amount: balance::value(&manager.prize_pool)
        });
    }

    // Get a coin from the prize pool to distribute as a reward
    public fun get_reward_coin(
        manager: &mut GameManager,
        cap: &GameManagerCap,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<SUI> {
        // Verify authority
        assert!(object::id(manager) == cap.manager_id, ENotAdmin);
        
        // Check sufficient funds
        assert!(balance::value(&manager.prize_pool) >= amount, EInsufficientPrizePool);
        
        // Extract funds
        let reward = coin::take(&mut manager.prize_pool, amount, ctx);
        
        // Update stats
        manager.total_rewards_distributed = manager.total_rewards_distributed + 1;
        
        // Emit event for client tracking
        event::emit(PrizePoolStatusEvent {
            amount: balance::value(&manager.prize_pool)
        });
        
        reward
    }

    // Distribute reward directly to a recipient
    public entry fun distribute_reward(
        manager: &mut GameManager,
        cap: &GameManagerCap,
        game_id: ID,
        recipient: address,
        amount: u64,
        ctx: &mut TxContext
    ) {
        // Verify authority
        assert!(object::id(manager) == cap.manager_id, ENotAdmin);
        
        // Check game exists
        assert!(table::contains(&manager.active_games, game_id), EGameNotFound);
        
        // Check sufficient funds
        assert!(balance::value(&manager.prize_pool) >= amount, EInsufficientPrizePool);
        
        // Get reward
        let reward = coin::take(&mut manager.prize_pool, amount, ctx);
        
        // Update stats
        manager.total_rewards_distributed = manager.total_rewards_distributed + 1;
        
        // Emit event
        event::emit(RewardDistributed {
            game_id,
            recipient,
            amount
        });
        
        // Emit updated prize pool event
        event::emit(PrizePoolStatusEvent {
            amount: balance::value(&manager.prize_pool)
        });
        
        // Send reward
        sui::transfer::public_transfer(reward, recipient);
    }

    // === Potato Management ===
    
    // Register a potato with a specific game
    public entry fun register_potato(
        manager: &mut GameManager,
        cap: &GameManagerCap,
        potato_id: ID,
        game_id: ID,
    ) {
        // Verify authority
        assert!(object::id(manager) == cap.manager_id, ENotAdmin);
        
        // Check game exists and is active
        assert!(table::contains(&manager.active_games, game_id), EGameNotFound);
        let game = table::borrow_mut(&mut manager.active_games, game_id);
        assert!(game.active, ENoActiveGame);
        assert!(!game.paused, EGamePaused);
        
        // Register the potato with the game
        table::add(&mut manager.potato_games, potato_id, game_id);
        
        // Increment potato count for this game
        game.potatoes_created = game.potatoes_created + 1;
        
        // Emit registration event
        event::emit(PotatoRegistered {
            potato_id,
            game_id
        });
    }
    
    // Get the game ID for a potato
    public fun get_potato_game(manager: &GameManager, potato_id: ID): ID {
        assert!(table::contains(&manager.potato_games, potato_id), EGameNotFound);
        *table::borrow(&manager.potato_games, potato_id)
    }
    
    // Check if a potato is registered
    public fun is_potato_registered(manager: &GameManager, potato_id: ID): bool {
        table::contains(&manager.potato_games, potato_id)
    }
    
    // Record transfer with potato ID (easier for agent integration)
    public entry fun record_transfer_by_potato(
        manager: &mut GameManager,
        cap: &GameManagerCap,
        potato_id: ID,
        player: address
    ) {
        // Verify authority
        assert!(object::id(manager) == cap.manager_id, ENotAdmin);
        
        // Check potato exists
        assert!(table::contains(&manager.potato_games, potato_id), EGameNotFound);
        
        // Get the associated game
        let game_id = *table::borrow(&manager.potato_games, potato_id);
        
        // Record the transfer
        record_potato_transfer(manager, cap, game_id, player);
    }
    
    // === Game Stats Tracking ===

    // Update game stats when a potato is transferred
    // Record a potato transfer
    public entry fun record_potato_transfer(
        manager: &mut GameManager,
        cap: &GameManagerCap,
        game_id: ID,
        player: address
    ) {
        // Verify authority
        assert!(object::id(manager) == cap.manager_id, ENotAdmin);
        
        // Check game exists
        assert!(table::contains(&manager.active_games, game_id), EGameNotFound);
        
        // Get and update game status
        let game = table::borrow_mut(&mut manager.active_games, game_id);
        assert!(game.active, ENoActiveGame);
        assert!(!game.paused, EGamePaused);
        
        // Update transfer count
        game.total_transfers = game.total_transfers + 1;
        
        // Add player to the unique players set if not already present
        if (!table::contains(&game.players, player)) {
            table::add(&mut game.players, player, true);
            
            // Emit event for unique player count update
            event::emit(UniquePlayerCountEvent {
                game_id,
                count: table::length(&game.players)
            });
        };
        
        // Emit event for transfer count update
        event::emit(GameTransferCountEvent {
            game_id,
            count: game.total_transfers
        });
    }

    // === Getters with Events ===

    // Get the prize pool balance with event
    public entry fun check_prize_pool_balance(manager: &GameManager) {
        let balance = balance::value(&manager.prize_pool);
        
        event::emit(PrizePoolStatusEvent {
            amount: balance
        });
    }

    // Check if a game is active with event
    public entry fun check_game_status(manager: &GameManager, game_id: ID) {
        assert!(table::contains(&manager.active_games, game_id), EGameNotFound);
        let game = table::borrow(&manager.active_games, game_id);
        
        event::emit(GameStatusEvent {
            game_id,
            is_active: game.active,
            is_paused: game.paused,
            unique_players: table::length(&game.players),
            total_transfers: game.total_transfers,
            creation_time: game.creation_time,
            name: game.name
        });
    }

    // Get unique player count with event
    public entry fun check_unique_player_count(manager: &GameManager, game_id: ID) {
        assert!(table::contains(&manager.active_games, game_id), EGameNotFound);
        let game = table::borrow(&manager.active_games, game_id);
        let count = table::length(&game.players);
        
        event::emit(UniquePlayerCountEvent {
            game_id,
            count
        });
    }

    // Check if a player has participated with event
    public entry fun check_player_participation(manager: &GameManager, game_id: ID, player: address) {
        assert!(table::contains(&manager.active_games, game_id), EGameNotFound);
        let game = table::borrow(&manager.active_games, game_id);
        let has_participated = table::contains(&game.players, player);
        
        event::emit(PlayerParticipationStatusEvent {
            game_id,
            player,
            has_participated
        });
    }

    // Get total transfers with event
    public entry fun check_game_transfer_count(manager: &GameManager, game_id: ID) {
        assert!(table::contains(&manager.active_games, game_id), EGameNotFound);
        let game = table::borrow(&manager.active_games, game_id);
        
        event::emit(GameTransferCountEvent {
            game_id,
            count: game.total_transfers
        });
    }

    // Get the oven ID associated with the game manager
    public fun get_oven_id(manager: &GameManager): ID {
        manager.oven_id
    }

    // === Regular Getters ===

    // Get the prize pool balance
    public fun get_prize_pool_balance(manager: &GameManager): u64 {
        balance::value(&manager.prize_pool)
    }

    // Check if a game is active
    public fun is_game_active(manager: &GameManager, game_id: ID): bool {
        if (!table::contains(&manager.active_games, game_id)) {
            return false
        };
        let game = table::borrow(&manager.active_games, game_id);
        game.active && !game.paused
    }

    // Get number of unique players in a game
    public fun get_unique_player_count(manager: &GameManager, game_id: ID): u64 {
        assert!(table::contains(&manager.active_games, game_id), EGameNotFound);
        let game = table::borrow(&manager.active_games, game_id);
        table::length(&game.players)
    }

    // Check if a player has participated in a game
    public fun has_player_participated(manager: &GameManager, game_id: ID, player: address): bool {
        assert!(table::contains(&manager.active_games, game_id), EGameNotFound);
        let game = table::borrow(&manager.active_games, game_id);
        table::contains(&game.players, player)
    }

    // Get total transfers in a game
    public fun get_game_transfer_count(manager: &GameManager, game_id: ID): u64 {
        assert!(table::contains(&manager.active_games, game_id), EGameNotFound);
        let game = table::borrow(&manager.active_games, game_id);
        game.total_transfers
    }
    
    // Get game creation time
    public fun get_game_creation_time(manager: &GameManager, game_id: ID): u64 {
        assert!(table::contains(&manager.active_games, game_id), EGameNotFound);
        let game = table::borrow(&manager.active_games, game_id);
        game.creation_time
    }
    
    // Get game name
    public fun get_game_name(manager: &GameManager, game_id: ID): String {
        assert!(table::contains(&manager.active_games, game_id), EGameNotFound);
        let game = table::borrow(&manager.active_games, game_id);
        game.name
    }

    // Get total games created
    public fun get_total_games_created(manager: &GameManager): u64 {
        manager.total_games_created
    }

    // Get total rewards distributed
    public fun get_total_rewards_distributed(manager: &GameManager): u64 {
        manager.total_rewards_distributed
    }
}