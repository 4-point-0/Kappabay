module nft_template::agent_royalty {
    use sui::transfer_policy::{Self, TransferPolicy, TransferPolicyCap, TransferRequest};

    // Witness to authorize the royalty rule
    public struct AgentRoyalty has drop {}

    // Configuration for the royalty rule
    public struct RoyaltyConfig has store, drop {
        percentage: u64
    }

    // Register the royalty rule with a policy
    public fun add_rule<T: key + store>(
        policy: &mut TransferPolicy<T>,
        cap: &TransferPolicyCap<T>,
        percentage: u64
    ) {
        // Add the rule to the policy
        transfer_policy::add_rule<T, AgentRoyalty, RoyaltyConfig>(
            AgentRoyalty {},
            policy,
            cap,
            RoyaltyConfig { percentage }
        );
    }

    // Add receipt to the request
    public fun add_receipt<T: key + store>(request: &mut TransferRequest<T>) {
        transfer_policy::add_receipt<T, AgentRoyalty>(AgentRoyalty {}, request);
    }

    // Check if a policy has the royalty rule
    public fun has_rule<T: key + store>(policy: &TransferPolicy<T>): bool {
        transfer_policy::has_rule<T, AgentRoyalty>(policy)
    }

    // Get the witness (for use in other modules)
    public fun get_witness(): AgentRoyalty { 
        AgentRoyalty {} 
    }
}