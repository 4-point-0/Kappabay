module nft_template::prompt_manager {
    use sui::event;
    use sui::table::{Self, Table};
    use sui::bag::{Self, Bag};
    use std::string::{String};
    
    use nft_template::agent::{Self, AgentCap, AdminCap};

    // Error constants
    const ENotAuthorized: u64 = 1;
    const EPromptNotFound: u64 = 2;

    public struct PromptCreated has copy, drop {
        id: ID,
        prompt_text: String,
        sender: address,
        agent_wallet: address
    }

    public struct PromptWithCallback has copy, drop {
        id: ID,
        prompt_text: String,
        sender: address,
        callback: String,
        agent_wallet: address
    }

    public struct PromptStored has copy, drop {
        id: ID,
        prompt_text: String,
        sender: address
    }

    public struct PromptRetrieved has copy, drop {
        id: ID,
        recipient: address
    }

    public struct PromptRemoved has copy, drop {
        id: ID,
        removed_by: address
    }

    public struct PromptResponseAdded has copy, drop {
        id: ID,
        response_text: String
    }

    public struct PromptManager has key {
        id: UID,
        agent_id: ID,
        // Table of prompts indexed by their ID
        prompts: Table<ID, Prompt>,
        // Bag for additional storage needs (extensibility)
        storage: Bag,
        // Stats
        total_prompts: u64,
        total_responses: u64
    }

    public struct Prompt has key, store {
        id: UID,
        question: String,
        response: Option<String>,
        sender: address,
        timestamp: u64
    }

    // === Initialization and Creation ===

    public fun create_prompt_manager(
        agent_id: ID,
        cap: &AdminCap,
        ctx: &mut TxContext
    ): PromptManager {
        // Verify the capability refers to the correct agent
        assert!(agent::get_agent_id_from_admin(cap) == agent_id, ENotAuthorized);
        
        let prompt_manager = PromptManager {
            id: object::new(ctx),
            agent_id,
            prompts: table::new(ctx),
            storage: bag::new(ctx),
            total_prompts: 0,
            total_responses: 0
        };
        
        prompt_manager
    }

    // Create and share the prompt manager
    public entry fun init_prompt_manager(
        agent_id: ID,
        cap: &AdminCap,
        ctx: &mut TxContext
    ) {
        let prompt_manager = create_prompt_manager(agent_id, cap, ctx);
        transfer::share_object(prompt_manager);
    }

    // === Core Prompt Functions ===

    // Create and store a prompt in the manager
    public fun store_prompt(
        manager: &mut PromptManager,
        question: String,
        sender: address,
        ctx: &mut TxContext
    ): ID {
        let prompt = Prompt {
            id: object::new(ctx),
            question,
            response: option::none(),
            sender,
            timestamp: tx_context::epoch_timestamp_ms(ctx)
        };
        
        let prompt_id = object::id(&prompt);
        
        // Store prompt in the table
        table::add(&mut manager.prompts, prompt_id, prompt);
        
        // Update stats
        manager.total_prompts = manager.total_prompts + 1;
        
        // Emit event
        event::emit(PromptStored {
            id: prompt_id,
            prompt_text: question,
            sender
        });
        
        prompt_id
    }

    // Entry function to create a prompt (agent-integrated version)
    public entry fun infer_prompt(
        manager: &mut PromptManager,
        agent_cap: &AgentCap,
        question: String,
        agent_wallet: address,
        ctx: &mut TxContext
    ) {
        // Verify the capability is for the same agent
        assert!(manager.agent_id == agent::get_agent_id(agent_cap), ENotAuthorized);
        
        let sender = tx_context::sender(ctx);
        
        // Store the prompt
        let prompt_id = store_prompt(manager, question, sender, ctx);
        
        // Emit our own event for backend to catch
        event::emit(PromptCreated {
            id: prompt_id,
            prompt_text: question,
            sender,
            agent_wallet
        });
    }

    // Entry function to create a prompt with callback
    public entry fun infer_prompt_with_callback(
        manager: &mut PromptManager,
        agent_cap: &AgentCap,
        question: String,
        agent_wallet: address,
        callback: String,
        ctx: &mut TxContext
    ) {
        // Verify the capability is for the same agent
        assert!(manager.agent_id == agent::get_agent_id(agent_cap), ENotAuthorized);
        
        let sender = tx_context::sender(ctx);
        
        // Store the prompt
        let prompt_id = store_prompt(manager, question, sender, ctx);
        
        // Emit our own event for backend to catch
        event::emit(PromptWithCallback {
            id: prompt_id,
            prompt_text: question,
            sender,
            callback,
            agent_wallet
        });
    }

    // Add response to a stored prompt
    public entry fun add_response(
        manager: &mut PromptManager,
        agent_cap: &AgentCap,
        prompt_id: ID,
        response: String
    ) {
        // Verify the capability is for the same agent
        assert!(manager.agent_id == agent::get_agent_id(agent_cap), ENotAuthorized);
        
        // Verify prompt exists
        assert!(table::contains(&manager.prompts, prompt_id), EPromptNotFound);
        
        // Get the prompt and add response
        let prompt = table::borrow_mut(&mut manager.prompts, prompt_id);
        prompt.response = option::some(response);
        
        // Update stats
        manager.total_responses = manager.total_responses + 1;
        
        // Emit event
        event::emit(PromptResponseAdded {
            id: prompt_id,
            response_text: response
        });
    }

    // Retrieve a prompt and send it to a recipient
    public entry fun retrieve_prompt(
        manager: &mut PromptManager,
        agent_cap: &AgentCap,
        prompt_id: ID,
        recipient: address
    ) {
        // Verify the capability is for the same agent
        assert!(manager.agent_id == agent::get_agent_id(agent_cap), ENotAuthorized);
        
        // Verify prompt exists
        assert!(table::contains(&manager.prompts, prompt_id), EPromptNotFound);
        
        // Remove prompt from storage
        let prompt = table::remove(&mut manager.prompts, prompt_id);
        
        // Emit event
        event::emit(PromptRetrieved {
            id: object::id(&prompt),
            recipient
        });
        
        // Send to recipient
        transfer::public_transfer(prompt, recipient);
    }

    // Remove a prompt without transferring it (for cleanup)
    public entry fun remove_prompt(
        manager: &mut PromptManager,
        admin_cap: &AdminCap,
        prompt_id: ID,
        ctx: &mut TxContext
    ) {
        // Verify the capability is for the same agent
        assert!(manager.agent_id == agent::get_agent_id_from_admin(admin_cap), ENotAuthorized);
        
        // Verify prompt exists
        assert!(table::contains(&manager.prompts, prompt_id), EPromptNotFound);
        
        // Remove and delete prompt
        let Prompt { id, question: _, response: _, sender: _, timestamp: _ } = 
            table::remove(&mut manager.prompts, prompt_id);
        
        // Delete the prompt UID
        object::delete(id);
        
        // Emit event
        event::emit(PromptRemoved {
            id: prompt_id,
            removed_by: tx_context::sender(ctx)
        });
    }

    // === Utility Functions ===

    // Check if a prompt exists
    public fun has_prompt(manager: &PromptManager, prompt_id: ID): bool {
        table::contains(&manager.prompts, prompt_id)
    }

    // Get prompt count
    public fun get_prompt_count(manager: &PromptManager): u64 {
        table::length(&manager.prompts)
    }

    // Get total prompts ever created
    public fun get_total_prompts(manager: &PromptManager): u64 {
        manager.total_prompts
    }

    // Get total responses added
    public fun get_total_responses(manager: &PromptManager): u64 {
        manager.total_responses
    }

    // Borrow a prompt immutably
    public fun borrow_prompt(manager: &PromptManager, prompt_id: ID): &Prompt {
        assert!(table::contains(&manager.prompts, prompt_id), EPromptNotFound);
        table::borrow(&manager.prompts, prompt_id)
    }

    // Get prompt details
    public fun get_prompt_details(prompt: &Prompt): (String, Option<String>, address, u64) {
        (prompt.question, prompt.response, prompt.sender, prompt.timestamp)
    }
}