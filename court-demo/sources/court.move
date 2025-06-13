module court_demo::court {
    use std::string::{Self, String};
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
    use nft_template::agent::AgentCap;
    use nft_template::prompt_manager::{Self, PromptManager};

    // ====== Constants ======
    const E_CASE_ALREADY_DECIDED: u64 = 2;
    const E_CASE_NOT_FOUND: u64 = 4;

    // ====== Structs ======
    
    /// Court object that manages cases
    public struct Court has key, store {
        id: UID,
        name: String,
        judge_agent_id: ID,
        total_cases: u64,
        guilty_verdicts: u64,
        innocent_verdicts: u64,
        active_cases: Table<ID, bool>,
    }

    /// Case object representing a legal dispute
    public struct Case has key, store {
        id: UID,
        court_id: ID,
        case_number: u64,
        evidence: String,
        description: String,
        created_at: u64,
        verdict: option::Option<bool>, // None = pending, Some(true) = guilty, Some(false) = innocent
        decided_at: option::Option<u64>,
    }

    /// Admin capability for the court
    public struct CourtAdminCap has key, store {
        id: UID,
        court_id: ID,
    }

    // ====== Events ======
    
    public struct CourtCreated has copy, drop {
        court_id: ID,
        name: String,
        judge_agent_id: ID,
    }

    public struct CaseCreated has copy, drop {
        case_id: ID,
        court_id: ID,
        case_number: u64,
        evidence: String,
        description: String,
        created_at: u64,
    }

    public struct VerdictDelivered has copy, drop {
        case_id: ID,
        court_id: ID,
        verdict: bool, // true = guilty, false = innocent
        decided_at: u64,
    }

    // ====== Functions ======
    
    /// Create a new court
    public entry fun create_court(
        name: String,
        judge_agent_id: ID,
        ctx: &mut TxContext
    ) {
        let court = Court {
            id: object::new(ctx),
            name,
            judge_agent_id,
            total_cases: 0,
            guilty_verdicts: 0,
            innocent_verdicts: 0,
            active_cases: table::new(ctx),
        };
        
        let court_id = object::id(&court);
        
        event::emit(CourtCreated {
            court_id,
            name,
            judge_agent_id,
        });
        
        transfer::share_object(court);
        
        let admin_cap = CourtAdminCap {
            id: object::new(ctx),
            court_id,
        };
        
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    /// Create a new case and automatically trigger judgment
    public fun create_case(
        court: &mut Court,
        prompt_manager: &mut PromptManager,
        agent_cap: &AgentCap,
        evidence: String,
        description: String,
        clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        court.total_cases = court.total_cases + 1;
        
        let case = Case {
            id: object::new(ctx),
            court_id: object::id(court),
            case_number: court.total_cases,
            evidence,
            description,
            created_at: clock::timestamp_ms(clock),
            verdict: option::none(),
            decided_at: option::none(),
        };
        
        let case_id = object::id(&case);
        table::add(&mut court.active_cases, case_id, true);
        
        event::emit(CaseCreated {
            case_id,
            court_id: object::id(court),
            case_number: court.total_cases,
            evidence,
            description,
            created_at: clock::timestamp_ms(clock),
        });
        
        transfer::share_object(case);
        
        // Automatically trigger judgment via inference
        trigger_judgment(court, case_id, prompt_manager, agent_cap, evidence, description, ctx);
        
        case_id
    }

    /// Internal function to trigger judgment via inference
    fun trigger_judgment(
        court: &Court,
        case_id: ID,
        prompt_manager: &mut PromptManager,
        agent_cap: &AgentCap,
        evidence: String,
        description: String,
        ctx: &mut TxContext
    ) {
        // Construct the judgment prompt
        let mut prompt = string::utf8(b"You are a judge analyzing a legal case. Based on the evidence and description, you must choose to execute either the guilty or innocent verdict callback. Evidence: ");
        string::append(&mut prompt, evidence);
        string::append(&mut prompt, string::utf8(b" Case Description: "));
        string::append(&mut prompt, description);
        string::append(&mut prompt, string::utf8(b" Choose the appropriate callback to execute."));
        
        // Construct callbacks JSON with both guilty and innocent options
        let callbacks_json = construct_court_callbacks_json(object::id(court), case_id, object::id(agent_cap));
        
        // Get agent wallet address (using sender as agent wallet)
        let agent_wallet = tx_context::sender(ctx);
        
        // Call inference with callbacks to trigger agent decision
        prompt_manager::infer_prompt_with_callbacks(
            prompt_manager,
            agent_cap,
            prompt,
            agent_wallet,
            callbacks_json,
            ctx
        );
    }
    
    /// Construct the JSON callbacks for court verdict execution
    fun construct_court_callbacks_json(court_id: ID, case_id: ID, agent_cap_id: ID): String {
        use sui::address;
        
        // Convert IDs to strings
        let court_id_str = address::to_string(object::id_to_address(&court_id));
        let case_id_str = address::to_string(object::id_to_address(&case_id));
        let agent_cap_id_str = address::to_string(object::id_to_address(&agent_cap_id));
        
        // Create JSON string with both guilty and innocent callbacks
        let mut json = string::utf8(b"[");
        
        // Guilty verdict callback
        string::append(&mut json, string::utf8(b"{"));
        string::append(&mut json, string::utf8(b"\"package\": \"court_demo\","));
        string::append(&mut json, string::utf8(b"\"module\": \"court\","));
        string::append(&mut json, string::utf8(b"\"function\": \"deliver_guilty_verdict\","));
        string::append(&mut json, string::utf8(b"\"requires_user_wallet\": false,"));
        string::append(&mut json, string::utf8(b"\"arguments\": [{\"type\": \"object\", \"value\": \""));
        string::append(&mut json, court_id_str);
        string::append(&mut json, string::utf8(b"\"}, {\"type\": \"object\", \"value\": \""));
        string::append(&mut json, case_id_str);
        string::append(&mut json, string::utf8(b"\"}, {\"type\": \"object\", \"value\": \"0x6\"}, {\"type\": \"object\", \"value\": \""));
        string::append(&mut json, agent_cap_id_str);
        string::append(&mut json, string::utf8(b"\"}]"));
        string::append(&mut json, string::utf8(b"},"));
        
        // Innocent verdict callback  
        string::append(&mut json, string::utf8(b"{"));
        string::append(&mut json, string::utf8(b"\"package\": \"court_demo\","));
        string::append(&mut json, string::utf8(b"\"module\": \"court\","));
        string::append(&mut json, string::utf8(b"\"function\": \"deliver_innocent_verdict\","));
        string::append(&mut json, string::utf8(b"\"requires_user_wallet\": false,"));
        string::append(&mut json, string::utf8(b"\"arguments\": [{\"type\": \"object\", \"value\": \""));
        string::append(&mut json, court_id_str);
        string::append(&mut json, string::utf8(b"\"}, {\"type\": \"object\", \"value\": \""));
        string::append(&mut json, case_id_str);
        string::append(&mut json, string::utf8(b"\"}, {\"type\": \"object\", \"value\": \"0x6\"}, {\"type\": \"object\", \"value\": \""));
        string::append(&mut json, agent_cap_id_str);
        string::append(&mut json, string::utf8(b"\"}]"));
        string::append(&mut json, string::utf8(b"}"));
        
        string::append(&mut json, string::utf8(b"]"));
        json
    }


    /// Deliver guilty verdict
    public fun deliver_guilty_verdict(
        court: &mut Court,
        case: &mut Case,
        clock: &Clock,
        _agent_cap: &AgentCap,
        _ctx: &mut TxContext
    ) {
        // Ensure case hasn't been decided yet
        assert!(option::is_none(&case.verdict), E_CASE_ALREADY_DECIDED);
        
        // Verify the case belongs to this court
        assert!(case.court_id == object::id(court), E_CASE_NOT_FOUND);
        
        // Set verdict
        case.verdict = option::some(true);
        case.decided_at = option::some(clock::timestamp_ms(clock));
        court.guilty_verdicts = court.guilty_verdicts + 1;
        
        // Remove from active cases
        table::remove(&mut court.active_cases, object::id(case));
        
        event::emit(VerdictDelivered {
            case_id: object::id(case),
            court_id: object::id(court),
            verdict: true,
            decided_at: clock::timestamp_ms(clock),
        });
    }

    /// Deliver innocent verdict
    public fun deliver_innocent_verdict(
        court: &mut Court,
        case: &mut Case,
        clock: &Clock,
        _agent_cap: &AgentCap,
        _ctx: &mut TxContext
    ) {
        // Ensure case hasn't been decided yet
        assert!(option::is_none(&case.verdict), E_CASE_ALREADY_DECIDED);
        
        // Verify the case belongs to this court
        assert!(case.court_id == object::id(court), E_CASE_NOT_FOUND);
        
        // Set verdict
        case.verdict = option::some(false);
        case.decided_at = option::some(clock::timestamp_ms(clock));
        court.innocent_verdicts = court.innocent_verdicts + 1;
        
        // Remove from active cases
        table::remove(&mut court.active_cases, object::id(case));
        
        event::emit(VerdictDelivered {
            case_id: object::id(case),
            court_id: object::id(court),
            verdict: false,
            decided_at: clock::timestamp_ms(clock),
        });
    }

    // ====== View Functions ======
    
    public fun get_case_verdict(case: &Case): option::Option<bool> {
        case.verdict
    }
    
    public fun get_case_evidence(case: &Case): String {
        case.evidence
    }
    
    public fun get_case_description(case: &Case): String {
        case.description
    }
    
    public fun get_court_stats(court: &Court): (u64, u64, u64) {
        (court.total_cases, court.guilty_verdicts, court.innocent_verdicts)
    }
    
    public fun is_case_active(court: &Court, case_id: ID): bool {
        table::contains(&court.active_cases, case_id)
    }
}