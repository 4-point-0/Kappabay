module nft_template::agent_marketplace {
    use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::table::{Self, Table};
    use sui::package::Publisher;
    use sui::transfer_policy::{Self, TransferPolicy, TransferPolicyCap};
    use sui::balance::{Self, Balance};
    use std::string::String;
    use nft_template::agent::{Self, Agent, AgentCap, AdminCap};
    use nft_template::agent_royalty;

    // Error constants
    const EInvalidPrice: u64 = 1;
    const EAgentNotForSale: u64 = 2;
    const ENotAuthorized: u64 = 3;
    const ECategoryAlreadyExists: u64 = 4;
    const ECategoryNotFound: u64 = 5;
    const ERoyaltyTooHigh: u64 = 6;
    const EWrongCapForAgent: u64 = 7;

    // Config constants
    const MAX_ROYALTY_PERCENTAGE: u64 = 2000; // 20% max

    // Events
    public struct AgentListed has copy, drop {
        agent_cap_id: ID,
        admin_cap_id: ID,
        agent_id: ID,
        price: u64,
        category: String,
        seller: address
    }

    public struct AgentPurchased has copy, drop {
        agent_cap_id: ID,
        admin_cap_id: ID,
        agent_id: ID,
        price: u64,
        seller: address,
        buyer: address,
        royalty_amount: u64
    }

    public struct AgentDelisted has copy, drop {
        agent_cap_id: ID,
        admin_cap_id: ID,
        agent_id: ID,
        seller: address
    }

    public struct CategoryCreated has copy, drop {
        name: String,
        description: String,
        created_by: address
    }

    public struct RoyaltyChanged has copy, drop {
        old_percentage: u64,
        new_percentage: u64,
        admin: address
    }

    // Marketplace administrator capability
    public struct MarketplaceAdminCap has key, store {
        id: UID,
        marketplace_id: ID
    }

    // Marketplace object to track categories and metadata
    public struct Marketplace has key, store {
        id: UID,
        categories: Table<String, ID>, // Map category names to their IDs
        agent_categories: Table<ID, String>, // Map agent IDs to their category
        metadata_registry: Table<ID, AgentMetadata>, // Map agent IDs to metadata
        agent_ids: Table<ID, ID>, // Map agent_cap_id to agent_id
        admin_caps: Table<ID, ID>, // Map agent_id to admin_cap_id
        kiosk_id: ID, // ID of the centralized marketplace kiosk
        agent_sellers: Table<ID, address>, // Map agent_cap_id to seller
        listing_prices: Table<ID, u64>, // Map agent_cap_id to price
        royalty_percentage: u64, // In basis points (10000 = 100%)
        royalty_balance: Balance<SUI>, // Collected royalties
        owner: address
    }

    // Category object
    public struct Category has key, store {
        id: UID,
        name: String,
        description: String
    }

    // Metadata for agents
    public struct AgentMetadata has store {
        name: String,
        description: String,
        image_url: String,
        creator: address,
        creation_time: u64
    }

    // === Initialization ===

    // One-time initialization to create marketplace, kiosk and admin cap
    #[allow(lint(share_owned))]
    public entry fun initialize_marketplace(
        publisher: &Publisher,
        royalty_percentage: u64,
        ctx: &mut tx_context::TxContext
    ) {
        // Validate royalty percentage
        assert!(royalty_percentage <= MAX_ROYALTY_PERCENTAGE, ERoyaltyTooHigh);
        
        let sender = tx_context::sender(ctx);
        
        // Create kiosk for the marketplace
        let (kiosk, kiosk_cap) = kiosk::new(ctx);
        let kiosk_id = object::id(&kiosk);
        
        // Create marketplace
        let marketplace = Marketplace {
            id: object::new(ctx),
            categories: table::new(ctx),
            agent_categories: table::new(ctx),
            metadata_registry: table::new(ctx),
            agent_ids: table::new(ctx),
            admin_caps: table::new(ctx),
            kiosk_id,
            agent_sellers: table::new(ctx),
            listing_prices: table::new(ctx),
            royalty_percentage: royalty_percentage,
            royalty_balance: balance::zero<SUI>(),
            owner: sender
        };
        
        // Create admin capability
        let admin_cap = MarketplaceAdminCap {
            id: object::new(ctx),
            marketplace_id: object::id(&marketplace)
        };
        
        // Create transfer policy for AgentCap
        let (mut policy, policy_cap) = transfer_policy::new<AgentCap>(publisher, ctx);
        
        // Add royalty rule directly during initialization
        agent_royalty::add_rule<AgentCap>(
            &mut policy,
            &policy_cap,
            royalty_percentage
        );
        
        // Share and transfer objects
        transfer::public_share_object(marketplace);
        transfer::public_share_object(kiosk);
        transfer::public_share_object(policy);
        
        // Transfer caps to the sender
        transfer::public_transfer(admin_cap, sender);
        transfer::public_transfer(kiosk_cap, sender);
        transfer::public_transfer(policy_cap, sender);
    }

    // === Admin Functions ===

    // Update royalty percentage (admin only)
    public entry fun update_royalty_percentage(
        marketplace: &mut Marketplace,
        admin_cap: &MarketplaceAdminCap,
        policy: &mut TransferPolicy<AgentCap>,
        policy_cap: &TransferPolicyCap<AgentCap>,
        new_percentage: u64,
        ctx: &mut tx_context::TxContext
    ) {
        // Verify admin
        assert!(object::id(marketplace) == admin_cap.marketplace_id, ENotAuthorized);
        // Validate royalty percentage
        assert!(new_percentage <= MAX_ROYALTY_PERCENTAGE, ERoyaltyTooHigh);
        
        let old_percentage = marketplace.royalty_percentage;
        marketplace.royalty_percentage = new_percentage;
        
        // Update royalty rule
        if (agent_royalty::has_rule<AgentCap>(policy)) {
            // Remove the old rule
            transfer_policy::remove_rule<AgentCap, agent_royalty::AgentRoyalty, agent_royalty::RoyaltyConfig>(
                policy,
                policy_cap
            );
        };
        
        // Add the new rule
        agent_royalty::add_rule<AgentCap>(
            policy,
            policy_cap,
            new_percentage
        );
        
        // Emit event
        event::emit(RoyaltyChanged {
            old_percentage,
            new_percentage,
            admin: tx_context::sender(ctx)
        });
    }
    
    // Withdraw collected royalties (admin only)
    public entry fun withdraw_royalties(
        marketplace: &mut Marketplace,
        admin_cap: &MarketplaceAdminCap,
        ctx: &mut tx_context::TxContext
    ) {
        // Verify admin
        assert!(object::id(marketplace) == admin_cap.marketplace_id, ENotAuthorized);
        
        let amount = balance::value(&marketplace.royalty_balance);
        
        // Only proceed if there are royalties to withdraw
        if (amount > 0) {
            let coin = coin::take(&mut marketplace.royalty_balance, amount, ctx);
            transfer::public_transfer(coin, tx_context::sender(ctx));
        };
    }

    // === Category Management (Admin Only) ===

    // Create a new category (admin only)
    public entry fun create_category(
        marketplace: &mut Marketplace,
        admin_cap: &MarketplaceAdminCap,
        name: String,
        description: String,
        ctx: &mut tx_context::TxContext
    ) {
        // Verify admin
        assert!(object::id(marketplace) == admin_cap.marketplace_id, ENotAuthorized);
        
        // Check if category already exists
        assert!(!table::contains(&marketplace.categories, name), ECategoryAlreadyExists);
        
        // Create category
        let category = Category {
            id: object::new(ctx),
            name: name,
            description
        };
        
        let category_id = object::id(&category);
        
        // Store category in marketplace
        table::add(&mut marketplace.categories, name, category_id);
        
        // Share category object
        transfer::public_share_object(category);
        
        // Emit event
        event::emit(CategoryCreated {
            name,
            description,
            created_by: tx_context::sender(ctx)
        });
    }

    // === Agent Listing and Trading ===

    // List an AgentCap and AdminCap for sale in the marketplace kiosk with metadata
    public entry fun list_agent(
        marketplace: &mut Marketplace,
        kiosk: &mut Kiosk,
        kiosk_cap: &KioskOwnerCap,
        agent_cap: AgentCap,
        admin_cap: AdminCap,
        agent: &Agent,
        price: u64,
        name: String,
        description: String,
        image_url: String,
        category: String,
        ctx: &mut tx_context::TxContext
    ) {
        // Validate price
        assert!(price > 0, EInvalidPrice);
        
        // Verify both caps belong to this Agent
        let agent_id = object::id(agent);
        assert!(agent::get_agent_id(&agent_cap) == agent_id, EWrongCapForAgent);
        assert!(agent::get_agent_id_from_admin(&admin_cap) == agent_id, EWrongCapForAgent);
        
        // Verify category exists
        assert!(table::contains(&marketplace.categories, category), ECategoryNotFound);
        
        // Verify this is the marketplace kiosk
        assert!(object::id(kiosk) == marketplace.kiosk_id, ENotAuthorized);
        
        // Get IDs
        let agent_cap_id = object::id(&agent_cap);
        let admin_cap_id = object::id(&admin_cap);
        let seller = tx_context::sender(ctx);
        
        // Store metadata
        let metadata = AgentMetadata {
            name,
            description,
            image_url,
            creator: seller,
            creation_time: tx_context::epoch_timestamp_ms(ctx)
        };
        
        table::add(&mut marketplace.metadata_registry, agent_id, metadata);
        table::add(&mut marketplace.agent_categories, agent_id, category);
        table::add(&mut marketplace.agent_sellers, agent_cap_id, seller);
        table::add(&mut marketplace.agent_ids, agent_cap_id, agent_id);
        table::add(&mut marketplace.admin_caps, agent_id, admin_cap_id); // Store admin cap ID
        table::add(&mut marketplace.listing_prices, agent_cap_id, price); // Store the price
        
        // Place and list both caps in the kiosk
        kiosk::place(kiosk, kiosk_cap, agent_cap);
        kiosk::place(kiosk, kiosk_cap, admin_cap);
        kiosk::list<AgentCap>(kiosk, kiosk_cap, agent_cap_id, price);
        
        // Emit event 
        event::emit(AgentListed {
            agent_cap_id,
            admin_cap_id,
            agent_id,
            price,
            category,
            seller
        });
    }

    // Purchase an agent cap from the marketplace kiosk
    public entry fun purchase_agent(
        marketplace: &mut Marketplace,
        kiosk: &mut Kiosk,
        kiosk_cap: &KioskOwnerCap, // Needed to take AdminCap
        policy: &mut TransferPolicy<AgentCap>,
        agent_cap_id: ID,
        payment: Coin<SUI>,
        ctx: &mut tx_context::TxContext
    ) {
        // Ensure this is the marketplace kiosk
        assert!(object::id(kiosk) == marketplace.kiosk_id, ENotAuthorized);
        assert!(kiosk::has_access(kiosk, kiosk_cap), ENotAuthorized); // Ensure kiosk_cap is for this kiosk
        
        // Make sure the item is listed
        assert!(kiosk::is_listed(kiosk, agent_cap_id), EAgentNotForSale);
        
        // Get the seller, agent_id, and admin_cap_id
        let seller = *table::borrow(&marketplace.agent_sellers, agent_cap_id);
        let agent_id = *table::borrow(&marketplace.agent_ids, agent_cap_id);
        let admin_cap_id = *table::borrow(&marketplace.admin_caps, agent_id);
        
        // Get the price from our stored table
        let price = *table::borrow(&marketplace.listing_prices, agent_cap_id);
        
        // Purchase the AgentCap (payment is processed here)
        let (agent_cap, mut request) = kiosk::purchase<AgentCap>(kiosk, agent_cap_id, payment);
        
        // Calculate royalty amount
        let royalty_amount = (price * marketplace.royalty_percentage) / 10000;
        
        // Extract royalty from kiosk profits if needed
        if (royalty_amount > 0) {
            // Take royalty from kiosk profits
            let royalty_coin = coin::take(kiosk::profits_mut(kiosk, kiosk_cap), royalty_amount, ctx);
            
            // Add to marketplace's royalty balance
            add_to_royalty_balance(marketplace, royalty_coin);
        };
        
        // Add royalty receipt to the request
        agent_royalty::add_receipt<AgentCap>(&mut request);
        
        // Confirm the transfer through the policy
        let (_item_id, _paid, _from) = transfer_policy::confirm_request(policy, request);
        
        // Take the AdminCap from the kiosk
        let admin_cap = kiosk::take<AdminCap>(kiosk, kiosk_cap, admin_cap_id);
        
        // Clean up the tables
        table::remove(&mut marketplace.agent_sellers, agent_cap_id);
        table::remove(&mut marketplace.agent_ids, agent_cap_id);
        table::remove(&mut marketplace.admin_caps, agent_id);
        table::remove(&mut marketplace.listing_prices, agent_cap_id);
        
        // Emit purchase event
        event::emit(AgentPurchased {
            agent_cap_id,
            admin_cap_id,
            agent_id,
            price,
            seller,
            buyer: tx_context::sender(ctx),
            royalty_amount
        });

        // Transfer the AgentCap and AdminCap to the buyer
        transfer::public_transfer(agent_cap, tx_context::sender(ctx));
        transfer::public_transfer(admin_cap, tx_context::sender(ctx));
    }

    // Delist an agent from the marketplace
    public entry fun delist_agent(
        marketplace: &mut Marketplace,
        kiosk: &mut Kiosk,
        kiosk_cap: &KioskOwnerCap,
        agent_cap_id: ID,
        ctx: &mut tx_context::TxContext
    ) {
        // Ensure this is the marketplace kiosk
        assert!(object::id(kiosk) == marketplace.kiosk_id, ENotAuthorized);
        
        // Get the seller and make sure it's the caller
        let seller = *table::borrow(&marketplace.agent_sellers, agent_cap_id);
        assert!(seller == tx_context::sender(ctx), ENotAuthorized);
        
        // Ensure the agent is listed
        assert!(kiosk::is_listed(kiosk, agent_cap_id), EAgentNotForSale);
        
        // Get agent ID and admin cap ID from mapping
        let agent_id = *table::borrow(&marketplace.agent_ids, agent_cap_id);
        let admin_cap_id = *table::borrow(&marketplace.admin_caps, agent_id);
        
        // Delist the agent
        kiosk::delist<AgentCap>(kiosk, kiosk_cap, agent_cap_id);
        
        // Emit delisted event
        event::emit(AgentDelisted {
            agent_cap_id,
            admin_cap_id,
            agent_id,
            seller
        });
        
        // Take the agent cap and admin cap back
        let agent_cap = kiosk::take<AgentCap>(kiosk, kiosk_cap, agent_cap_id);
        let admin_cap = kiosk::take<AdminCap>(kiosk, kiosk_cap, admin_cap_id);
        
        // Remove from tables
        table::remove(&mut marketplace.agent_sellers, agent_cap_id);
        table::remove(&mut marketplace.agent_ids, agent_cap_id);
        table::remove(&mut marketplace.admin_caps, agent_id);
        table::remove(&mut marketplace.listing_prices, agent_cap_id);
        
        // Return the caps to the seller
        transfer::public_transfer(agent_cap, seller);
        transfer::public_transfer(admin_cap, seller);
    }

    // === Royalty Management ===
    
    // Add to royalty balance
    public fun add_to_royalty_balance(
        marketplace: &mut Marketplace,
        royalty_coin: Coin<SUI>
    ) {
        coin::put(&mut marketplace.royalty_balance, royalty_coin);
    }

    // === Getters ===

    // Get agent metadata by ID
    public fun get_agent_metadata(
        marketplace: &Marketplace, 
        agent_id: ID
    ): (String, String, String, address, u64) {
        let metadata = table::borrow(&marketplace.metadata_registry, agent_id);
        (
            metadata.name, 
            metadata.description, 
            metadata.image_url, 
            metadata.creator, 
            metadata.creation_time
        )
    }

    // Get agent category
    public fun get_agent_category(
        marketplace: &Marketplace, 
        agent_id: ID
    ): String {
        *table::borrow(&marketplace.agent_categories, agent_id)
    }

    // Get agent seller
    public fun get_agent_seller(
        marketplace: &Marketplace, 
        agent_cap_id: ID
    ): address {
        *table::borrow(&marketplace.agent_sellers, agent_cap_id)
    }

    // Get agent ID from cap ID
    public fun get_agent_id_from_cap(
        marketplace: &Marketplace, 
        agent_cap_id: ID
    ): ID {
        *table::borrow(&marketplace.agent_ids, agent_cap_id)
    }

    // Get admin cap ID from agent ID
    public fun get_admin_cap_id(
        marketplace: &Marketplace, 
        agent_id: ID
    ): ID {
        *table::borrow(&marketplace.admin_caps, agent_id)
    }

    // Get agent listing price
    public fun get_agent_price(
        marketplace: &Marketplace, 
        agent_cap_id: ID
    ): u64 {
        *table::borrow(&marketplace.listing_prices, agent_cap_id)
    }

    // Check if category exists
    public fun category_exists(
        marketplace: &Marketplace, 
        category_name: String
    ): bool {
        table::contains(&marketplace.categories, category_name)
    }

    // Get marketplace kiosk ID
    public fun get_marketplace_kiosk_id(
        marketplace: &Marketplace
    ): ID {
        marketplace.kiosk_id
    }
    
    // Get current royalty percentage
    public fun get_royalty_percentage(
        marketplace: &Marketplace
    ): u64 {
        marketplace.royalty_percentage
    }
    
    // Get collected royalty balance
    public fun get_royalty_balance(
        marketplace: &Marketplace
    ): u64 {
        balance::value(&marketplace.royalty_balance)
    }
}