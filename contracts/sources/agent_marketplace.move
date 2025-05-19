module nft_template::agent_marketplace {
    use sui::kiosk::{Self, Kiosk, KioskOwnerCap, PurchaseCap};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::table::{Self, Table};
    use sui::package::Publisher;
    use sui::transfer_policy::{Self, TransferPolicy};
    use std::string::String;
    use nft_template::agent::{Self, Agent, AgentCap};
    use nft_template::agent_royalty;

    // Error constants
    const EInvalidPrice: u64 = 1;
    const EAgentNotForSale: u64 = 2;
    const ENotAuthorized: u64 = 3;
    const EInvalidKiosk: u64 = 4;
    const EWrongCapForAgent: u64 = 5;
    const EPurchaseCapMissing: u64 = 7;

    // Events
    public struct AgentListed has copy, drop {
        agent_cap_id: ID,
        agent_id: ID,
        price: u64,
        seller: address,
        kiosk_id: ID
    }

    public struct AgentPurchased has copy, drop {
        agent_cap_id: ID,
        agent_id: ID,
        price: u64,
        seller: address,
        buyer: address,
        royalty_amount: u64
    }

    public struct AgentDelisted has copy, drop {
        agent_cap_id: ID,
        agent_id: ID,
        seller: address
    }

    // Marketplace administrator capability
    public struct MarketplaceAdminCap has key, store {
        id: UID,
        marketplace_id: ID
    }

    // Marketplace object to track listings across user kiosks
    public struct Marketplace has key, store {
        id: UID,
        listings: Table<ID, ListingInfo>, // Map agent_cap_id to listing info
        agent_ids: Table<ID, ID>, // Map agent_cap_id to agent_id
        // Store purchase caps for exclusive listings
        purchase_caps: Table<ID, PurchaseCap<AgentCap>>,
        royalty_percentage: u64, // In basis points (10000 = 100%)
        owner: address
    }

    // Track listing info across user kiosks
    public struct ListingInfo has store, drop {
        agent_id: ID,
        kiosk_id: ID,
        seller: address,
        price: u64,
        name: String,
        description: String,
        image_url: String,
        creation_time: u64
    }

    // === Initialization ===

    #[allow(lint(share_owned))]
    public entry fun initialize_marketplace(
        publisher: &Publisher,
        royalty_percentage: u64,
        ctx: &mut tx_context::TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Create marketplace
        let marketplace = Marketplace {
            id: object::new(ctx),
            listings: table::new(ctx),
            agent_ids: table::new(ctx),
            purchase_caps: table::new(ctx),
            royalty_percentage: royalty_percentage,
            owner: sender
        };
        
        // Create admin capability
        let admin_cap = MarketplaceAdminCap {
            id: object::new(ctx),
            marketplace_id: object::id(&marketplace)
        };
        
        // Create transfer policy for AgentCap - add mut for policy
        let (mut policy, policy_cap) = transfer_policy::new<AgentCap>(publisher, ctx);
        
        // Add royalty rule
        agent_royalty::add_rule<AgentCap>(
            &mut policy,
            &policy_cap,
            royalty_percentage
        );
        
        // Share and transfer objects
        transfer::public_share_object(marketplace);
        transfer::public_share_object(policy);
        
        // Transfer caps to the sender
        transfer::public_transfer(admin_cap, sender);
        transfer::public_transfer(policy_cap, sender);
    }

    // === Helper for kiosk creation ===
    
    public entry fun create_user_kiosk(ctx: &mut tx_context::TxContext) {
        let (kiosk, cap) = kiosk::new(ctx);
        transfer::public_share_object(kiosk);
        transfer::public_transfer(cap, tx_context::sender(ctx));
    }

    // === Listing and Trading ===

    // List an agent cap in the user's kiosk
    public entry fun list_agent(
        marketplace: &mut Marketplace,
        agent_cap: AgentCap,
        agent: &Agent,
        kiosk: &mut Kiosk, // User's kiosk
        kiosk_cap: &KioskOwnerCap, // User's kiosk cap
        price: u64,
        name: String,
        description: String,
        image_url: String,
        ctx: &mut tx_context::TxContext
    ) {
        // Validation code
        assert!(price > 0, EInvalidPrice);
        
        // Verify both caps belong to this Agent
        let agent_id = object::id(agent);
        assert!(agent::get_agent_id(&agent_cap) == agent_id, EWrongCapForAgent);
        
        // Verify this is the user's kiosk
        assert!(kiosk::has_access(kiosk, kiosk_cap), ENotAuthorized);
        
        // Get IDs and seller
        let agent_cap_id = object::id(&agent_cap);
        let seller = tx_context::sender(ctx);
        let kiosk_id = object::id(kiosk);
        
        // Store agent_id mapping
        table::add(&mut marketplace.agent_ids, agent_cap_id, agent_id);
        
        // Store listing info in marketplace
        let listing_info = ListingInfo {
            agent_id,
            kiosk_id,
            seller,
            price,
            name,
            description,
            image_url,
            creation_time: tx_context::epoch_timestamp_ms(ctx)
        };
        
        table::add(&mut marketplace.listings, agent_cap_id, listing_info);
        
        // Place agent cap in kiosk
        kiosk::place(kiosk, kiosk_cap, agent_cap);
        
        let purchase_cap = kiosk::list_with_purchase_cap<AgentCap>(
            kiosk, 
            kiosk_cap, 
            agent_cap_id, 
            price, 
            ctx
        );
        
        // Store the purchase cap in our marketplace
        table::add(&mut marketplace.purchase_caps, agent_cap_id, purchase_cap);
        
        // Emit event
        event::emit(AgentListed {
            agent_cap_id,
            agent_id,
            price,
            seller,
            kiosk_id
        });
    }

    // Purchase an agent cap with royalty extraction
    public entry fun purchase_agent(
        marketplace: &mut Marketplace,
        kiosk: &mut Kiosk, // Seller's kiosk
        agent_cap_id: ID,
        policy: &mut TransferPolicy<AgentCap>,
        mut payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        // Verify the agent is listed
        assert!(table::contains(&marketplace.listings, agent_cap_id), EAgentNotForSale);
        assert!(table::contains(&marketplace.purchase_caps, agent_cap_id), EPurchaseCapMissing);
        
        // Get listing info and price
        let listing_info = table::borrow(&marketplace.listings, agent_cap_id);
        let price = listing_info.price;
        let seller = listing_info.seller;
        
        // Verify this is the correct kiosk
        assert!(object::id(kiosk) == listing_info.kiosk_id, EInvalidKiosk);
        
        // Verify payment amount
        assert!(coin::value(&payment) >= price, EInvalidPrice);
        
        // Calculate royalty amount
        let royalty_amount = (price * marketplace.royalty_percentage) / 10000;
        
        // Split payment into seller portion and royalty portion
        let royalty_coin = coin::split(&mut payment, royalty_amount, ctx);
        
        // Get the purchase cap for this listing
        let purchase_cap = table::remove(&mut marketplace.purchase_caps, agent_cap_id);
        
        // Purchase using the PurchaseCap
        // The payment will go to the seller's kiosk
        let (agent_cap, mut request) = kiosk::purchase_with_cap<AgentCap>(
            kiosk,
            purchase_cap,
            payment
        );
        
        // Pay royalty to the policy
        transfer_policy::add_to_balance<AgentCap, agent_royalty::AgentRoyalty>(
            agent_royalty::get_witness(),
            policy,
            royalty_coin
        );
        
        // Add receipt and confirm transfer
        agent_royalty::add_receipt<AgentCap>(&mut request);
        transfer_policy::confirm_request(policy, request);
        
        // Get agent ID
        let agent_id = *table::borrow(&marketplace.agent_ids, agent_cap_id);
        
        // Emit purchase event
        event::emit(AgentPurchased {
            agent_cap_id,
            agent_id,
            price, // Total price
            seller,
            buyer: tx_context::sender(ctx),
            royalty_amount
        });

        // Clean up tables - need to store the result to satisfy drop constraint
        let _listing_info = table::remove(&mut marketplace.listings, agent_cap_id);
        table::remove(&mut marketplace.agent_ids, agent_cap_id);
        
        // Transfer only the agent cap to the buyer
        transfer::public_transfer(agent_cap, tx_context::sender(ctx));
    }

    // Delist an agent cap from the marketplace
    public entry fun delist_agent(
        marketplace: &mut Marketplace,
        kiosk: &mut Kiosk, // User's kiosk
        kiosk_cap: &KioskOwnerCap, // User's kiosk cap
        agent_cap_id: ID,
        ctx: &mut tx_context::TxContext
    ) {
        // Verify listing exists
        assert!(table::contains(&marketplace.listings, agent_cap_id), EAgentNotForSale);
        assert!(table::contains(&marketplace.purchase_caps, agent_cap_id), EPurchaseCapMissing);
        
        // Get and copy values we need before removing listings
        let listing_info = table::borrow(&marketplace.listings, agent_cap_id);
        let seller = listing_info.seller;
        let kiosk_id = listing_info.kiosk_id;
        let agent_id = listing_info.agent_id;
        
        // Verify this is the correct kiosk
        assert!(object::id(kiosk) == kiosk_id, EInvalidKiosk);
        
        // Verify caller is the seller
        assert!(seller == tx_context::sender(ctx), ENotAuthorized);
        
        // Verify kiosk ownership
        assert!(kiosk::has_access(kiosk, kiosk_cap), ENotAuthorized);
        
        // Get the purchase cap
        let purchase_cap = table::remove(&mut marketplace.purchase_caps, agent_cap_id);
        
        // Return the purchase cap to the kiosk (removes listing)
        kiosk::return_purchase_cap(kiosk, purchase_cap);
        
        // Emit delisted event
        event::emit(AgentDelisted {
            agent_cap_id,
            agent_id,
            seller
        });
        
        // Take the agent cap from the kiosk
        let agent_cap = kiosk::take<AgentCap>(kiosk, kiosk_cap, agent_cap_id);
        
        // Clean up tables - need to store the result to satisfy drop constraint
        let _listing_info = table::remove(&mut marketplace.listings, agent_cap_id); 
        table::remove(&mut marketplace.agent_ids, agent_cap_id);
        
        // Return only the agent cap to the seller
        transfer::public_transfer(agent_cap, seller);
    }

    // === Query Functions ===
    
    // Check if an agent is listed
    public fun is_agent_listed(
        marketplace: &Marketplace,
        agent_cap_id: ID
    ): bool {
        table::contains(&marketplace.listings, agent_cap_id)
    }

    // Get listing info
    public fun get_listing_info(
        marketplace: &Marketplace, 
        agent_cap_id: ID
    ): (ID, ID, address, u64, String, String, String, u64) {
        let info = table::borrow(&marketplace.listings, agent_cap_id);
        (
            info.agent_id,
            info.kiosk_id,
            info.seller,
            info.price,
            info.name,
            info.description,
            info.image_url,
            info.creation_time
        )
    }

    // Get royalty percentage
    public fun get_royalty_percentage(marketplace: &Marketplace): u64 {
        marketplace.royalty_percentage
    }
}