# Decentralized AI Agent Marketplace on Sui

A comprehensive system for creating, managing, and trading AI agents as NFTs on the Sui blockchain, featuring integrated marketplace functionality, royalty systems, and decentralized agent operations.

## Package Information

- **Package ID**: `0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5`
- **Core Modules**:
  - `agent` - Core AI agent functionality and fund management
  - `agent_marketplace` - Decentralized marketplace using Sui Kiosk
  - `agent_royalty` - Creator royalty enforcement system
  - `prompt_manager` - AI interaction and prompt management
  - `game_manager` - Extensible game coordination framework
  - `hot_potato` - Example game implementation

## Core Features

### 🤖 AI Agent System

Create sophisticated AI agents with persistent storage and autonomous fund management:

- **Configuration Management**: Store agent settings, behaviors, and parameters
- **Memory System**: Persistent memory storage for agent learning and context
- **Knowledge Bank**: Centralized knowledge storage and retrieval
- **Multi-Tier Fund Management**:
  - Gas Tank: For transaction execution
  - Private Funds: Agent-controlled resources
  - Public Funds: Community-accessible resources
- **Object Storage**: Built-in storage for rewards, assets, and game objects

### 🏪 Decentralized Marketplace

Trade AI agents using Sui's native Kiosk system:

- **Sui Kiosk Integration**: Leverages Sui's built-in trading infrastructure
- **Creator Royalties**: Automatic royalty distribution to original creators
- **Listing Management**: List, delist, and manage agent sales
- **Transfer Policies**: Configurable rules for agent ownership transfers
- **Event Tracking**: Comprehensive marketplace analytics

### 💬 Prompt Management System

Sophisticated AI interaction framework:

- **Centralized Prompt Storage**: Organized prompt and response management
- **Callback System**: Support for both single and multi-callback workflows
- **Agent Integration**: Direct integration with agent capabilities
- **Response Tracking**: Monitor AI interactions and responses

### 🎮 Extensible Game Framework

Built-in game coordination system for agent-based applications:

- **Game Management**: Create and coordinate multi-agent games
- **Prize Pool Management**: Automated reward distribution
- **Player Tracking**: Monitor participation and game statistics
- **Event System**: Real-time game state updates

## Complete System Setup

### Prerequisites

Before using the system, you need:

1. **Publisher Object**: Obtained from package deployment (required for marketplace initialization)
2. **SUI Tokens**: For gas fees and initial funding
3. **Sui CLI**: Configured and connected to the appropriate network

### Phase 1: System Initialization (One-time Setup)

#### 1. Initialize the Marketplace

**⚠️ Important**: This must be done once per deployment and requires the Publisher object from package deployment.

```bash
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module agent_marketplace \
  --function initialize_marketplace \
  --args "[PUBLISHER_OBJECT]" "500" \
  --gas-budget 20000000
```

This creates:

- **Marketplace** (shared): `[MARKETPLACE_ID]`
- **MarketplaceAdminCap**: `[MARKETPLACE_ADMIN_CAP_ID]`
- **TransferPolicy** (shared): `[TRANSFER_POLICY_ID]`
- **TransferPolicyCap**: `[TRANSFER_POLICY_CAP_ID]`

#### 2. Setup Display Objects (One-time)

The `hot_potato` module's `init()` function automatically creates display objects for NFTs when the package is deployed.

### Phase 2: User Onboarding

#### For Each User Who Wants to Trade Agents:

```bash
# Create a personal kiosk for trading
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module agent_marketplace \
  --function create_user_kiosk \
  --gas-budget 20000000
```

This creates:

- **User Kiosk** (shared): `[USER_KIOSK_ID]`
- **KioskOwnerCap**: `[USER_KIOSK_CAP_ID]`

### Phase 3: Agent Creation and Setup

#### 1. Create an AI Agent

```bash
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module agent \
  --function create_agent \
  --args "[AGENT_CONFIG_BYTES]" "[INITIAL_GAS_COIN]" "[IMAGE_URL]" \
  --gas-budget 20000000
```

This creates:

- **Agent** (shared): `[AGENT_ID]`
- **AdminCap**: `[ADMIN_CAP_ID]`
- **AgentCap**: `[AGENT_CAP_ID]`

#### 2. Initialize Prompt Manager for the Agent

```bash
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module prompt_manager \
  --function init_prompt_manager \
  --args "[AGENT_ID]" "[ADMIN_CAP_ID]" \
  --gas-budget 20000000
```

This creates:

- **PromptManager** (shared): `[PROMPT_MANAGER_ID]`

### Phase 4: Game Framework Setup (Optional)

#### 1. Create Oven for Game Objects

```bash
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module hot_potato \
  --function create_oven \
  --args "[AGENT_ID]" "[AGENT_CAP_ID]" \
  --gas-budget 20000000
```

This creates:

- **Oven** (shared): `[OVEN_ID]`
- **OvenCap**: `[OVEN_CAP_ID]`

#### 2. Create Game Manager

```bash
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module game_manager \
  --function create_game_manager \
  --args "[OVEN_ID]" "[INITIAL_PRIZE_POOL_COIN]" \
  --gas-budget 20000000
```

This creates:

- **GameManager** (shared): `[GAME_MANAGER_ID]`
- **GameManagerCap**: `[GAME_MANAGER_CAP_ID]`

## Quick Start

### For New Users (After System Setup)

Once the system is initialized, new users can quickly get started:

#### 1. Create Your Trading Kiosk

```bash
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module agent_marketplace \
  --function create_user_kiosk \
  --gas-budget 20000000
```

#### 2. Create Your First Agent

```bash
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module agent \
  --function create_agent \
  --args "[CONFIG_BYTES]" "[GAS_COIN]" "[IMAGE_URL]" \
  --gas-budget 20000000
```

#### 3. Set Up Prompt Management

```bash
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module prompt_manager \
  --function init_prompt_manager \
  --args "[YOUR_AGENT_ID]" "[YOUR_ADMIN_CAP_ID]" \
  --gas-budget 20000000
```

### For Frontend Developers

Key objects you'll need to track:

- **Marketplace ID**: `[MARKETPLACE_ID]` (shared, same for all users)
- **TransferPolicy ID**: `[TRANSFER_POLICY_ID]` (shared, same for all users)
- **User Kiosk ID**: `[USER_KIOSK_ID]` (unique per user)
- **Agent IDs**: `[AGENT_ID]` (unique per agent)
- **PromptManager IDs**: `[PROMPT_MANAGER_ID]` (unique per agent)

## Agent Management

### Fund Your Agent

```bash
# Add gas for transactions
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module agent \
  --function deposit_gas \
  --args "[AGENT_ID]" "[GAS_COIN]" \
  --gas-budget 20000000

# Add private funds (admin only)
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module agent \
  --function deposit_private_funds \
  --args "[AGENT_ID]" "[ADMIN_CAP_ID]" "[FUNDS_COIN]" \
  --gas-budget 20000000
```

### Update Agent Configuration

```bash
# Update agent configuration
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module agent \
  --function update_configuration \
  --args "[AGENT_ID]" "[ADMIN_CAP_ID]" "[NEW_CONFIG_BYTES]" \
  --gas-budget 20000000

# Update memories
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module agent \
  --function update_memories \
  --args "[AGENT_ID]" "[ADMIN_CAP_ID]" "[MEMORY_BYTES]" \
  --gas-budget 20000000
```

## Marketplace Operations

### List an Agent for Sale

```bash
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module agent_marketplace \
  --function list_agent \
  --args "[MARKETPLACE_ID]" "[AGENT_CAP_ID]" "[AGENT_ID]" "[KIOSK_ID]" "[KIOSK_CAP_ID]" "[PRICE_IN_MIST]" "[NAME]" "[DESCRIPTION]" "[IMAGE_URL]" "[CATEGORY]" \
  --gas-budget 20000000
```

### Purchase an Agent

```bash
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module agent_marketplace \
  --function purchase_agent \
  --args "[MARKETPLACE_ID]" "[SELLER_KIOSK_ID]" "[AGENT_CAP_ID]" "[TRANSFER_POLICY_ID]" "[PAYMENT_COIN]" \
  --gas-budget 20000000
```

## AI Interactions

### Create and Manage Prompts

```bash
# Simple prompt
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module prompt_manager \
  --function infer_prompt \
  --args "[PROMPT_MANAGER_ID]" "[AGENT_CAP_ID]" "[QUESTION_STRING]" "[AGENT_WALLET_ADDRESS]" \
  --gas-budget 20000000

# Prompt with callback
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module prompt_manager \
  --function infer_prompt_with_single_callback \
  --args "[PROMPT_MANAGER_ID]" "[AGENT_CAP_ID]" "[QUESTION_STRING]" "[AGENT_WALLET_ADDRESS]" "[CALLBACK_FUNCTION]" \
  --gas-budget 20000000

# Add response to prompt
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module prompt_manager \
  --function add_response \
  --args "[PROMPT_MANAGER_ID]" "[AGENT_CAP_ID]" "[PROMPT_ID]" "[RESPONSE_STRING]" \
  --gas-budget 20000000
```

## Key Events

The system emits comprehensive events for monitoring and integration:

### Agent Events

- `AgentCreated` - New agent initialization
- `FundsDeposited` - Agent funding operations
- `ObjectStored` - Asset storage in agents
- `GasBalanceChecked` - Balance monitoring

### Marketplace Events

- `AgentListed` - Agent listing for sale
- `AgentPurchased` - Successful agent purchase with royalty info
- `AgentDelisted` - Agent removal from marketplace

### Prompt Events

- `PromptCreated` - New AI interaction
- `PromptWithCallback` - Callback-enabled prompts
- `PromptResponseAdded` - AI response received

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│                     │         │                     │
│    Agent System     │         │   Marketplace       │
│                     │         │                     │
├─────────────────────┤         ├─────────────────────┤
│                     │         │                     │
│  ┌───────────────┐  │         │  ┌───────────────┐  │
│  │ Agent         │  │◄────────┤  │ Kiosk System  │  │
│  │ - Config      │  │         │  │ - Listings    │  │
│  │ - Memory      │  │         │  │ - Trading     │  │
│  │ - Knowledge   │  │         │  └───────────────┘  │
│  │ - Funds       │  │         │                     │
│  └───────┬───────┘  │         │  ┌───────────────┐  │
│          │          │         │  │ Royalty       │  │
│  ┌───────┴───────┐  │         │  │ System        │  │
│  │ Prompt        │  │         │  └───────────────┘  │
│  │ Manager       │  │         │                     │
│  └───────────────┘  │         └─────────────────────┘
│                     │
└─────────────────────┘
```

## Game Framework (Additional Features)

The system includes an extensible game framework for building agent-based applications:

### Game Management

```bash
# Create game manager
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module game_manager \
  --function create_game_manager \
  --args "[OVEN_ID]" "[PRIZE_POOL_COIN]" \
  --gas-budget 20000000

# Create a new game
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module game_manager \
  --function create_game \
  --args "[GAME_MANAGER_ID]" "[GAME_MANAGER_CAP_ID]" "[GAME_NAME_BYTES]" \
  --gas-budget 20000000
```

### Example: Hot Potato Game

As a demonstration of the game framework capabilities, we've included a Hot Potato game implementation:

```bash
# Create oven for game objects
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module hot_potato \
  --function create_oven \
  --args "[AGENT_ID]" "[AGENT_CAP_ID]" \
  --gas-budget 20000000

# Create game objects
sui client call --package 0xe27d33e8b9888236f946a783d93748f8e96e357abf707a963088c79dbf1b12a5 \
  --module hot_potato \
  --function bake_potato \
  --args "[OVEN_ID]" "[GAME_MANAGER_ID]" "[PAYMENT_COIN]" "0x6" "0x8" "[RECIPIENT]" "[METADATA]" \
  --gas-budget 20000000
```

## Integration Guidelines

### Backend Services

Backend services should monitor events for:

1. Agent creation and configuration updates
2. Marketplace transactions and royalty distribution
3. Prompt processing and response management
4. Game state changes and reward distribution

### Frontend Applications

The system provides comprehensive event tracking for building:

- Agent management dashboards
- Marketplace interfaces
- AI interaction tools
- Game applications

## Frontend Development Guide

### Essential Object IDs to Track

Your frontend will need to manage these key object types:

**Global Objects (shared across all users):**

- `MARKETPLACE_ID` - The main marketplace (shared object)
- `TRANSFER_POLICY_ID` - The transfer policy for agent trading (shared object)

**Per-User Objects:**

- `USER_KIOSK_ID` - Each user's trading kiosk (shared object, user-owned)
- `USER_KIOSK_CAP_ID` - Capability to manage user's kiosk (owned object)

**Per-Agent Objects:**

- `AGENT_ID` - The agent itself (shared object)
- `ADMIN_CAP_ID` - Administrative control over agent (owned object)
- `AGENT_CAP_ID` - Operational capability for agent (owned object)
- `PROMPT_MANAGER_ID` - Agent's prompt manager (shared object)

**Per-Game Objects (if using game features):**

- `GAME_MANAGER_ID` - Game coordination (shared object)
- `GAME_MANAGER_CAP_ID` - Game administration (owned object)
- `OVEN_ID` - Game object factory (shared object)
- `OVEN_CAP_ID` - Game object creation rights (owned object)

### User Onboarding Flow

```typescript
// Example frontend onboarding sequence
async function onboardNewUser(userAddress: string) {
  // 1. Create user's trading kiosk
  const kioskTx = await createUserKiosk();
  const kioskResult = await executeTransaction(kioskTx);
  const userKioskId = extractKioskId(kioskResult);
  const userKioskCapId = extractKioskCapId(kioskResult);

  // 2. Store user's kiosk info
  await saveUserProfile(userAddress, {
    kioskId: userKioskId,
    kioskCapId: userKioskCapId,
  });

  // 3. User can now create agents and trade
}
```

### Event Monitoring

**Critical Events to Monitor:**

```typescript
// Agent Events
interface AgentCreated {
  id: string;
  admin: string;
}

// Marketplace Events
interface AgentListed {
  agent_cap_id: string;
  agent_id: string;
  price: number;
  seller: string;
  kiosk_id: string;
  category: string;
}

interface AgentPurchased {
  agent_cap_id: string;
  agent_id: string;
  price: number;
  seller: string;
  buyer: string;
  royalty_amount: number;
  category: string;
}

// Prompt Events
interface PromptCreated {
  id: string;
  prompt_text: string;
  sender: string;
  agent_wallet: string;
}
```

### State Management Recommendations

**User State:**

```typescript
interface UserState {
  address: string;
  kioskId?: string;
  kioskCapId?: string;
  ownedAgents: AgentInfo[];
  ownedKioskCaps: string[];
}
```

**Agent State:**

```typescript
interface AgentInfo {
  agentId: string;
  adminCapId?: string; // Only if user owns this
  agentCapId?: string; // Only if user owns this
  promptManagerId?: string;
  configuration: any;
  gasBalance: number;
  privateBalance: number;
  publicBalance: number;
}
```

**Marketplace State:**

```typescript
interface MarketplaceListing {
  agentCapId: string;
  agentId: string;
  price: number;
  seller: string;
  kioskId: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  creationTime: number;
}
```

### Transaction Building Patterns

**Creating an Agent:**

```typescript
async function createAgent(config: AgentConfig) {
  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${PACKAGE_ID}::agent::create_agent`,
    arguments: [
      tx.pure(config.configBytes),
      tx.object(config.initialGasCoin),
      tx.pure(config.imageUrl),
    ],
  });

  return tx;
}
```

**Listing an Agent:**

```typescript
async function listAgent(listing: ListingParams) {
  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${PACKAGE_ID}::agent_marketplace::list_agent`,
    arguments: [
      tx.object(MARKETPLACE_ID),
      tx.object(listing.agentCapId),
      tx.object(listing.agentId),
      tx.object(listing.userKioskId),
      tx.object(listing.userKioskCapId),
      tx.pure(listing.price),
      tx.pure(listing.name),
      tx.pure(listing.description),
      tx.pure(listing.imageUrl),
      tx.pure(listing.category),
    ],
  });

  return tx;
}
```

### Common Patterns and Gotchas

**1. Object Ownership Tracking:**

- Shared objects (agents, marketplace, kiosks) can be accessed by anyone
- Owned objects (caps) must be owned by the transaction sender
- Always verify cap ownership before building transactions

**2. Capability Management:**

- AdminCap = full agent control
- AgentCap = operational access
- KioskOwnerCap = kiosk management rights
- Never expose private keys or capabilities to unauthorized users

**3. Error Handling:**

```typescript
// Common error codes to handle
const ERROR_CODES = {
  ENotAuthorized: "User doesn't own required capability",
  EAgentNotForSale: "Agent is not currently listed",
  EInsufficientBalance: "Insufficient funds for operation",
  EInvalidPrice: "Price must be greater than 0",
};
```

**4. Fee Considerations:**

- Marketplace royalties (default 5% = 500 basis points)
- Gas fees for all transactions
- Game fees (0.5 SUI for potato creation)

## Important Notes

1. **System Dependencies**:

   - Clock Object: `0x6`
   - Random Object: `0x8`
   - Publisher object from package deployment

2. **Initialization Order**:

   - Deploy package → Get Publisher object → Initialize marketplace → Users create kiosks → Create agents

3. **Fund Management**: Agents support three-tier fund management for different use cases

4. **Marketplace Integration**: Built on Sui Kiosk for maximum compatibility and security

5. **Extensibility**: The modular design allows for easy extension with new game types and AI capabilities

6. **Decentralization**: All agent operations are fully decentralized and controllable by capability holders

## Deployment Checklist

### For System Administrators:

**One-Time Setup:**

- [ ] Deploy the package and obtain Publisher object
- [ ] Initialize marketplace with desired royalty rate
- [ ] Record and share Marketplace ID and TransferPolicy ID
- [ ] Set up event monitoring infrastructure

**Per-Environment:**

- [ ] Configure frontend with correct package ID and object IDs
- [ ] Set up backend event listeners
- [ ] Test full user onboarding flow
- [ ] Verify marketplace operations work correctly

### For Users:

**First-Time Setup:**

- [ ] Create personal kiosk for trading
- [ ] Create first agent with initial funding
- [ ] Set up prompt manager for agent
- [ ] Test basic operations (fund agent, create prompt, etc.)

**Ongoing Usage:**

- [ ] Monitor agent balances and top up as needed
- [ ] Manage agent configurations and memories
- [ ] Participate in marketplace trading
- [ ] Use prompt system for AI interactions

## Development

This system provides a complete foundation for building decentralized AI agent ecosystems. The modular architecture allows developers to:

- Create custom agent behaviors and configurations
- Build specialized marketplaces for different agent types
- Develop games and applications that leverage agent capabilities
- Implement custom royalty and reward systems

For advanced usage and custom implementations, refer to the contract source code and event documentation.
