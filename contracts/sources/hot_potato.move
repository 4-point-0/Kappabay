module nft_template::hot_potato {
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::random::{Self, Random};
    use sui::package;
    use sui::display;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use std::string::{Self, String};
    use nft_template::agent::{Self, Agent, AgentCap};
    use nft_template::game_manager::{Self, GameManager};

    const EInvalidRecipient: u64 = 1;
    const ENotGameCapOwner: u64 = 2;
    const EInsufficientFee: u64 = 3;
    const EPOTATO_FEE: u64 = 500000000; // 0.5 SUI in MIST

    // Time constants (in milliseconds)
    const EXPIRY_DURATION: u64 = 86400000; // 24 hours
    const TRANSFER_WINDOW: u64 = 1800000;  // 30 minutes

    // Potato flavor constants
    const POTATO_TYPES: vector<vector<u8>> = vector[
        b"Russet", b"Yukon Gold", b"Red", b"Purple", b"Sweet", b"Fingerling"
    ];
    
    const POTATO_TEMPERATURES: vector<vector<u8>> = vector[
        b"Scalding", b"Burning", b"Fiery", b"Blazing", b"Sizzling", b"White-hot"
    ];
    
    const POTATO_FLAVORS: vector<vector<u8>> = vector[
        b"Spicy", b"Savory", b"Tangy", b"Zesty", b"Explosive", b"Molten"
    ];

    // Events
    public struct PotatoCreated has copy, drop {
        id: ID,
        recipient: address,
        expiry_ms: u64,
        potato_type: String,
        temperature: String,
        flavor: String
    }

    public struct PotatoTransferred has copy, drop {
        id: ID,
        from: address,
        to: address,
        remaining_time_ms: u64
    }

    public struct PotatoExpired has copy, drop {
        id: ID,
        last_holder: address,
        total_transfers: u64
    }

    public struct PotatoBurned has copy, drop {
        id: ID,
        holder: address,
        held_too_long: u64 // how long they held it past the window
    }

    public struct ModelCapCreated has copy, drop {
        id: ID,
        recipient: address
    }

    public struct PotatoStatusChecked has copy, drop {
        id: ID,
        is_active: bool,
        time_remaining_ms: u64,
        expiry_time_ms: u64,
        transfers: u64
    }

    // One-time witness for the module
    public struct HOT_POTATO has drop {}

    // Capability to mint potatoes
    public struct OvenCap has key, store {
        id: UID,
        oven_id: ID
    }

    // Capability to play the game
    public struct GameCap has key, store {
        id: UID,
        potato_id: ID,
        recipient: address
    }

    // ModelCap - capability used by client to open game UI
    public struct ModelCap has key, store {
        id: UID,
        creation_time: u64,
        owner: address
    }

    // The hot potato itself - no store ability for custom transfer control
    public struct HotPotato has key {
        id: UID,
        creation_time_ms: u64,
        expiry_time_ms: u64,
        last_transfer_time_ms: u64,
        transfers: vector<address>,
        potato_type: String,
        temperature: String,
        flavor: String,
        metadata: String,
    }

    // The oven that creates potatoes
    public struct Oven has key {
        id: UID,
        agent_id: ID,
        owner: address,
        potatoes_baked: u64,
    }

    // === Initialization ===

    fun init(otw: HOT_POTATO, ctx: &mut TxContext) {
        let publisher = package::claim(otw, ctx);
        
        // Create display for HotPotato
        let mut potato_display = display::new<HotPotato>(&publisher, ctx);
        
        // Define display fields
        display::add(&mut potato_display, string::utf8(b"name"), string::utf8(b"{potato_type} {temperature} {flavor} Potato"));
        display::add(&mut potato_display, string::utf8(b"description"), string::utf8(b"A {temperature} hot potato that's {flavor}! Pass it quickly before it burns your hands!"));
        display::add(&mut potato_display, string::utf8(b"image_url"), string::utf8(b"https://placehold.co/600x400/FF5733/FFFFFF?text=HOT+POTATO"));
        display::add(&mut potato_display, string::utf8(b"time_remaining"), string::utf8(b"This potato expires at timestamp: {expiry_time_ms}"));
        display::add(&mut potato_display, string::utf8(b"transfers"), string::utf8(b"This potato has been passed {transfers} times"));
        display::add(&mut potato_display, string::utf8(b"potato_type"), string::utf8(b"{potato_type}"));
        display::add(&mut potato_display, string::utf8(b"temperature"), string::utf8(b"{temperature}"));
        display::add(&mut potato_display, string::utf8(b"flavor"), string::utf8(b"{flavor}"));
        
        // Commit the display
        display::update_version(&mut potato_display);
        
        // Transfer the publisher and display to the transaction sender
        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::public_transfer(potato_display, tx_context::sender(ctx));
    }

    public entry fun create_oven(
        _agent: &Agent, 
        agent_cap: &AgentCap,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        let oven = Oven {
            id: object::new(ctx),
            agent_id: agent::get_agent_id(agent_cap),
            owner: sender,
            potatoes_baked: 0,
        };
        
        let oven_cap = OvenCap {
            id: object::new(ctx),
            oven_id: object::id(&oven)
        };
        
        transfer::share_object(oven);
        transfer::public_transfer(oven_cap, sender);
    }

    // Creates a new GameCap for a user who received a potato
    public entry fun create_game_cap(
        potato_id: ID,
        recipient: address,
        ctx: &mut TxContext
    ) {
        // Create game capability for the recipient
        let game_cap = GameCap {
            id: object::new(ctx),
            potato_id,
            recipient
        };
        
        transfer::public_transfer(game_cap, recipient);
    }

    // Creates a ModelCap for a user to interact with the game UI
    public entry fun create_model_cap(
        recipient: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let cap = ModelCap {
            id: object::new(ctx),
            creation_time: clock::timestamp_ms(clock),
            owner: recipient
        };
        
        // Emit event for client tracking
        event::emit(ModelCapCreated {
            id: object::id(&cap),
            recipient
        });
        
        transfer::public_transfer(cap, recipient);
    }

    // === Potato Management ===

    // Modified to remove OvenCap requirement and add fee
    entry fun bake_potato(
        oven: &mut Oven,
        game_manager: &mut GameManager,
        payment: Coin<SUI>,
        clock: &Clock,
        randomness: &Random,
        recipient: address,
        metadata: vector<u8>,
        ctx: &mut TxContext
    ) {
        // Validate payment amount
        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= EPOTATO_FEE, EInsufficientFee);
        
        // Add payment to the prize pool
        game_manager::add_to_prize_pool(game_manager, payment);
        
        // Get current time and calculate expiry
        let current_time = clock::timestamp_ms(clock);
        let expiry_time = current_time + EXPIRY_DURATION;
        
        // Create a random generator for variety
        let mut generator = random::new_generator(randomness, ctx);
        
        // Get copies of constants first
        let potato_types = POTATO_TYPES;
        let potato_temperatures = POTATO_TEMPERATURES;
        let potato_flavors = POTATO_FLAVORS;
        
        // Generate random potato attributes
        let potato_type_idx = random::generate_u64(&mut generator) % vector::length(&potato_types);
        let temp_idx = random::generate_u64(&mut generator) % vector::length(&potato_temperatures);
        let flavor_idx = random::generate_u64(&mut generator) % vector::length(&potato_flavors);
        
        let potato_type = string::utf8(*vector::borrow(&potato_types, potato_type_idx));
        let temperature = string::utf8(*vector::borrow(&potato_temperatures, temp_idx));
        let flavor = string::utf8(*vector::borrow(&potato_flavors, flavor_idx));
        
        // Create the hot potato
        let potato = HotPotato {
            id: object::new(ctx),
            creation_time_ms: current_time,
            expiry_time_ms: expiry_time,
            last_transfer_time_ms: current_time,
            transfers: vector::singleton(tx_context::sender(ctx)), // Start with creator
            potato_type,
            temperature,
            flavor,
            metadata: string::utf8(metadata)
        };
        
        // Create game capability for the recipient
        let game_cap = GameCap {
            id: object::new(ctx),
            potato_id: object::id(&potato),
            recipient
        };
        
        // Update oven stats
        oven.potatoes_baked = oven.potatoes_baked + 1;
        
        // Register potato with game manager
        let potato_id = object::id(&potato);
        
        // Emit creation event
        event::emit(PotatoCreated {
            id: potato_id,
            recipient,
            expiry_ms: expiry_time,
            potato_type,
            temperature,
            flavor
        });
        
        // Custom transfer of the potato to the recipient
        transfer_potato_to(potato, recipient);
        transfer::public_transfer(game_cap, recipient);
    }

    // Custom transfer function for HotPotato - module internal
    fun transfer_potato_to(potato: HotPotato, recipient: address) {
        transfer::transfer(potato, recipient)
    }

    // Public entry point for transferring potatoes
    public entry fun transfer_potato(
        mut potato: HotPotato,
        cap: GameCap,
        clock: &Clock,
        new_recipient: address,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        // Verify authority
        assert!(object::id(&potato) == cap.potato_id, ENotGameCapOwner);
        assert!(sender == cap.recipient, ENotGameCapOwner);
        
        // Check potato status
        if (!is_potato_active(&potato, current_time, sender)) {
            end_game(potato, cap);
            return
        };
        
        // Check if the recipient is valid (not previously in the chain)
        assert!(!vector::contains(&potato.transfers, &new_recipient), EInvalidRecipient);
        
        // Update potato data
        potato.last_transfer_time_ms = current_time;
        vector::push_back(&mut potato.transfers, new_recipient);
        
        // Create new game cap for recipient
        let new_game_cap = GameCap {
            id: object::new(ctx),
            potato_id: object::id(&potato),
            recipient: new_recipient
        };
        
        
        // Emit transfer event
        event::emit(PotatoTransferred {
            id: object::id(&potato),
            from: sender,
            to: new_recipient,
            remaining_time_ms: potato.expiry_time_ms - current_time
        });
        
        // Transfer game cap to new recipient
        transfer::public_transfer(new_game_cap, new_recipient);
        
        // Destroy the old cap
        let GameCap { id, potato_id: _, recipient: _ } = cap;
        object::delete(id);
        
        // Transfer the potato to the new recipient
        transfer_potato_to(potato, new_recipient);
    }

    public entry fun check_potato_status(
        potato: &HotPotato,
        cap: &GameCap,
        clock: &Clock,
        ctx: &mut TxContext
    ): bool {
        let sender = tx_context::sender(ctx);
        
        // Verify authority
        assert!(object::id(potato) == cap.potato_id, ENotGameCapOwner);
        assert!(sender == cap.recipient, ENotGameCapOwner);
        
        let current_time = clock::timestamp_ms(clock);
        let is_active = is_potato_active(potato, current_time, sender);
        
        // Emit status check event for client tracking
        event::emit(PotatoStatusChecked {
            id: object::id(potato),
            is_active,
            time_remaining_ms: if (current_time < potato.expiry_time_ms) { potato.expiry_time_ms - current_time } else { 0 },
            expiry_time_ms: potato.expiry_time_ms,
            transfers: vector::length(&potato.transfers)
        });
        
        return is_active
    }

    fun end_game(
        potato: HotPotato,
        cap: GameCap,
    ) { 
        // Clean up objects - events already emitted by is_potato_active
        let HotPotato { id, creation_time_ms: _, expiry_time_ms: _, last_transfer_time_ms: _, transfers: _, 
                    potato_type: _, temperature: _, flavor: _, metadata: _ } = potato;
        let GameCap { id: cap_id, potato_id: _, recipient: _ } = cap;
        
        object::delete(id);
        object::delete(cap_id);
    }

    // === Helper functions ===
    
    public fun get_potato_expiry(potato: &HotPotato): u64 {
        potato.expiry_time_ms
    }
    
    public fun get_last_transfer_time(potato: &HotPotato): u64 {
        potato.last_transfer_time_ms
    }
    
    public fun get_creation_time(potato: &HotPotato): u64 {
        potato.creation_time_ms
    }
    
    public fun get_transfers(potato: &HotPotato): &vector<address> {
        &potato.transfers
    }
    
    public fun get_transfer_count(potato: &HotPotato): u64 {
        vector::length(&potato.transfers)
    }
    
    public fun get_potato_type(potato: &HotPotato): String {
        potato.potato_type
    }
    
    public fun get_temperature(potato: &HotPotato): String {
        potato.temperature
    }
    
    public fun get_flavor(potato: &HotPotato): String {
        potato.flavor
    }

    fun is_potato_active(
        potato: &HotPotato,
        current_time: u64,
        sender: address
    ): bool {
        // Check if potato has expired
        if (current_time >= potato.expiry_time_ms) {
            // Emit expiry event
            event::emit(PotatoExpired {
                id: object::id(potato),
                last_holder: sender,
                total_transfers: vector::length(&potato.transfers)
            });
            return false
        };
        
        // Check burn condition
        let time_held = current_time - potato.last_transfer_time_ms;
        if (time_held > TRANSFER_WINDOW) {
            // Emit burn event
            event::emit(PotatoBurned {
                id: object::id(potato),
                holder: sender,
                held_too_long: time_held - TRANSFER_WINDOW
            });
            return false
        };
        
        // Still active
        return true
    }
}