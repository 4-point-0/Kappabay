module nft_template::agent {
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::coin::{Self, Coin};
    use sui::bag::{Self, Bag};
    use sui::event;
    use std::string::{Self, String, utf8};

    // Error constants
    const ENotAdmin: u64 = 1;
    const EInsufficientBalance: u64 = 2;

    // Events
    public struct AgentCreated has copy, drop {
        id: ID,
        admin: address
    }

    public struct FundsDeposited has copy, drop {
        agent_id: ID,
        amount: u64,
        fund_type: String // "gas", "private", or "public"
    }

    public struct ObjectStored has copy, drop {
        agent_id: ID,
        object_id: ID
    }

    public struct PromptInferred has copy, drop {
        id: ID,
        question: String,
        sender: address,
        callback: String
    }

    public struct ResponsePopulated has copy, drop {
        id: ID,
        question: String,
        sender: address
    }

    // Agent capability
    public struct AdminCap has key, store {
        id: UID,
        agent_id: ID
    }

    // Agent capability for bag access
    public struct AgentCap has key, store {
        id: UID,
        agent_id: ID
    }

    // Main Agent struct
    public struct Agent has key {
        id: UID,
        configuration: vector<u8>, // Agent configuration data
        memories: vector<u8>,      // Agent memory storage
        gas_tank: Balance<SUI>,    // For transaction fees
        private_funds: Balance<SUI>, // For agent-only use
        public_funds: Balance<SUI>,  // For public distribution
        objects: Bag,              // Storage for game objects and rewards
        owner: address
    }

    public struct Prompt has key, store {
        id: UID,
        question: String,
        response: Option<String>,
        sender: address
    }

    // === Initialization ===

    fun init(_ctx: &mut TxContext) {
        // This would normally be called by the module initializer
        // We'll implement a separate creation function instead
    }

    public entry fun create_agent(
        configuration: vector<u8>,
        initial_gas: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Create the agent instance
        let agent = Agent {
            id: object::new(ctx),
            configuration,
            memories: vector::empty(),
            gas_tank: coin::into_balance(initial_gas),
            private_funds: balance::zero<SUI>(),
            public_funds: balance::zero<SUI>(),
            objects: bag::new(ctx),
            owner: sender
        };
        
        // Create the admin capability
        let admin_cap = AdminCap {
            id: object::new(ctx),
            agent_id: object::id(&agent)
        };
        
        // Create the agent capability for bag access
        let agent_cap = AgentCap {
            id: object::new(ctx),
            agent_id: object::id(&agent)
        };
        
        // Emit creation event
        event::emit(AgentCreated {
            id: object::id(&agent),
            admin: sender
        });
        
        // Transfer capabilities to the creator
        transfer::share_object(agent);
        transfer::public_transfer(admin_cap, sender);
        transfer::public_transfer(agent_cap, sender);
    }

    public entry fun infer_prompt(
        question: String,
        agent_wallet: address,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Create the prompt object
        let prompt = Prompt {
            id: object::new(ctx),
            question,
            response: option::none(),
            sender
        };
        
        // Emit event for backend to catch
        event::emit(PromptInferred {
            id: object::id(&prompt),
            question,
            sender,
            callback: utf8(b"")
        });
        
        // Transfer prompt to agent address for processing
        // This keeps it in a known location for the backend to find
        transfer::public_transfer(prompt, agent_wallet);
    }

    public entry fun infer_prompt_with_callback(
        question: String,
        agent_wallet: address,
        callback: String,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Create the prompt object
        let prompt = Prompt {
            id: object::new(ctx),
            question,
            response: option::none(),
            sender
        };
        
        // Emit event for backend to catch
        event::emit(PromptInferred {
            id: object::id(&prompt),
            question,
            sender,
            callback
        });
        
        // Transfer prompt to agent address for processing
        // This keeps it in a known location for the backend to find
        transfer::public_transfer(prompt, agent_wallet);
    }

    public entry fun populate_prompt(
        mut prompt: Prompt,
        response: String,
        receiver: address
    ) { 
        // Update prompt with response
        prompt.response = option::some(response);
        
        // Emit populated event
        event::emit(ResponsePopulated {
            id: object::id(&prompt),
            question: prompt.question,
            sender: prompt.sender
        });
        
        // Send to user's address
        transfer::public_transfer(prompt, receiver);
    }

    // === Administrative Functions ===

    public entry fun update_configuration(
        agent: &mut Agent,
        cap: &AdminCap,
        new_config: vector<u8>
    ) {
        assert!(object::id(agent) == cap.agent_id, ENotAdmin);
        agent.configuration = new_config;
    }

    public entry fun update_memories(
        agent: &mut Agent,
        cap: &AdminCap,
        new_memories: vector<u8>
    ) {
        assert!(object::id(agent) == cap.agent_id, ENotAdmin);
        agent.memories = new_memories;
    }

    // === Fund Management ===

    public entry fun deposit_gas(
        agent: &mut Agent,
        payment: Coin<SUI>
    ) {
        let amount = coin::value(&payment);
        coin::put(&mut agent.gas_tank, payment);
        
        event::emit(FundsDeposited {
            agent_id: object::id(agent),
            amount,
            fund_type: string::utf8(b"gas")
        });
    }

    public entry fun deposit_private_funds(
        agent: &mut Agent,
        cap: &AdminCap,
        payment: Coin<SUI>
    ) {
        assert!(object::id(agent) == cap.agent_id, ENotAdmin);
        
        let amount = coin::value(&payment);
        coin::put(&mut agent.private_funds, payment);
        
        event::emit(FundsDeposited {
            agent_id: object::id(agent),
            amount,
            fund_type: string::utf8(b"private")
        });
    }

    public entry fun deposit_public_funds(
        agent: &mut Agent,
        payment: Coin<SUI>
    ) {
        let amount = coin::value(&payment);
        coin::put(&mut agent.public_funds, payment);
        
        event::emit(FundsDeposited {
            agent_id: object::id(agent),
            amount,
            fund_type: string::utf8(b"public")
        });
    }

    public entry fun withdraw_gas(
        agent: &mut Agent,
        cap: &AdminCap,
        amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(object::id(agent) == cap.agent_id, ENotAdmin);
        assert!(balance::value(&agent.gas_tank) >= amount, EInsufficientBalance);
        
        let coin = coin::take(&mut agent.gas_tank, amount, ctx);
        transfer::public_transfer(coin, tx_context::sender(ctx));
    }

    public entry fun withdraw_private_funds(
        agent: &mut Agent,
        cap: &AdminCap,
        amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(object::id(agent) == cap.agent_id, ENotAdmin);
        assert!(balance::value(&agent.private_funds) >= amount, EInsufficientBalance);
        
        let coin = coin::take(&mut agent.private_funds, amount, ctx);
        transfer::public_transfer(coin, tx_context::sender(ctx));
    }

    public entry fun withdraw_public_funds(
        agent: &mut Agent,
        cap: &AdminCap,
        amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(object::id(agent) == cap.agent_id, ENotAdmin);
        assert!(balance::value(&agent.public_funds) >= amount, EInsufficientBalance);
        
        let coin = coin::take(&mut agent.public_funds, amount, ctx);
        transfer::public_transfer(coin, tx_context::sender(ctx));
    }

    // === Object Management ===

    public entry fun deposit_object<T: key + store>(
        agent: &mut Agent,
        cap: &AgentCap,
        object: T
    ) {
        assert!(object::id(agent) == cap.agent_id, ENotAdmin);
        
        let object_id = object::id(&object);
        bag::add(&mut agent.objects, object_id, object);
        
        event::emit(ObjectStored {
            agent_id: object::id(agent),
            object_id
        });
    }

    public entry fun send_reward<T: key + store>(
        agent: &mut Agent,
        cap: &AdminCap,
        object_id: ID,
        recipient: address
    ) {
        assert!(object::id(agent) == cap.agent_id, ENotAdmin);
        assert!(bag::contains(&agent.objects, object_id), EInsufficientBalance);
        
        let object: T = bag::remove(&mut agent.objects, object_id);
        transfer::public_transfer(object, recipient);
    }

    // === Getters ===

    public fun get_configuration(agent: &Agent): vector<u8> {
        agent.configuration
    }

    public fun get_memories(agent: &Agent): vector<u8> {
        agent.memories
    }

    public fun get_gas_balance(agent: &Agent): u64 {
        balance::value(&agent.gas_tank)
    }

    public fun get_private_funds_balance(agent: &Agent): u64 {
        balance::value(&agent.private_funds)
    }

    public fun get_public_funds_balance(agent: &Agent): u64 {
        balance::value(&agent.public_funds)
    }
    
    public fun get_agent_id(cap: &AgentCap): ID {
        cap.agent_id
    }

    // === Helper functions for off-chain agent ===
    
    // These functions don't directly execute sponsored transactions,
    // but they provide the mechanisms for the off-chain agent to do so
    
    public fun extract_gas_for_transaction(
        agent: &mut Agent,
        cap: &AdminCap,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<SUI> {
        assert!(object::id(agent) == cap.agent_id, ENotAdmin);
        assert!(balance::value(&agent.gas_tank) >= amount, EInsufficientBalance);
        
        coin::take(&mut agent.gas_tank, amount, ctx)
    }
}