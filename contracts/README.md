# Hot Potato Game & AI Agent System

This repository contains a Sui Move implementation of a Hot Potato game with a GameManager for tracking players and distributing rewards, along with an AI Agent system for game interactions.

## Package Information

- **Package ID**: `0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6`
- **Relevant Modules**:
  - `agent` - Manages game agents and AI interactions
  - `prompt_manager` - Manages prompt storage and retrieval
  - `hot_potato` - Core hot potato game logic
  - `game_manager` - Game coordination and rewards

## Agent & Prompt System

The repository includes an AI agent system to facilitate game interactions. The system consists of:

1. **Agent Module** - Handles agent configuration, funding, and basic prompt functionality
2. **Prompt Manager** - Provides centralized prompt storage, retrieval, and management

### Agent Setup Instructions

Follow these steps to set up an agent with prompt management.

#### Step 1: Create an Agent

```bash
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module agent \
  --function create_agent \
  --args "[0]" "[COIN_ID_FOR_INITIAL_GAS]" "[IMAGE_URL]" \
  --gas-budget 20000000
```

This creates:

- A shared Agent object
- An AdminCap for the agent
- An AgentCap for bag access

Note the IDs from the transaction output:

- Agent ID: `[AGENT_ID]`
- AdminCap ID: `[ADMIN_CAP_ID]`
- AgentCap ID: `[AGENT_CAP_ID]`

#### Step 2: Create a Prompt Manager

```bash
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module prompt_manager \
  --function init_prompt_manager \
  --args "[AGENT_ID]" "[ADMIN_CAP_ID]" \
  --gas-budget 20000000
```

This creates a shared Prompt Manager object for centralized prompt handling:

- Prompt Manager ID: `[PROMPT_MANAGER_ID]`

### Prompt Management

#### Creating Prompts

```bash
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module prompt_manager \
  --function infer_prompt \
  --args "[PROMPT_MANAGER_ID]" "[AGENT_CAP_ID]" "What is the status of my hot potato game?" "[AGENT_WALLET_ADDRESS]" \
  --gas-budget 20000000
```

For prompts with callbacks:

```bash
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module prompt_manager \
  --function infer_prompt_with_callback \
  --args "[PROMPT_MANAGER_ID]" "[AGENT_CAP_ID]" "What is the status of my hot potato game?" "[AGENT_WALLET_ADDRESS]" "[PACKAGE_ID]::game_manager::check_game_status" \
  --gas-budget 20000000
```

#### Adding Responses

```bash
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module prompt_manager \
  --function add_response \
  --args "[PROMPT_MANAGER_ID]" "[AGENT_CAP_ID]" "[PROMPT_ID]" "Your game has 5 active players." \
  --gas-budget 20000000
```

#### Updating Prompts

```bash
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module prompt_manager \
  --function update_prompt \
  --args "[PROMPT_MANAGER_ID]" "[AGENT_CAP_ID]" "[PROMPT_ID]" "Updated question about my hot potato game?" \
  --gas-budget 20000000
```

#### Retrieving Prompts

```bash
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module prompt_manager \
  --function retrieve_prompt \
  --args "[PROMPT_MANAGER_ID]" "[AGENT_CAP_ID]" "[PROMPT_ID]" "[USER_ADDRESS]" \
  --gas-budget 20000000
```

#### Managing Prompts

```bash
# Remove a specific prompt
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module prompt_manager \
  --function remove_prompt \
  --args "[PROMPT_MANAGER_ID]" "[ADMIN_CAP_ID]" "[PROMPT_ID]" \
  --gas-budget 20000000

# Completely destroy the prompt manager
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module prompt_manager \
  --function destroy_prompt_manager \
  --args "[PROMPT_MANAGER_ID]" "[ADMIN_CAP_ID]" \
  --gas-budget 20000000
```

## Game Setup Instructions

Follow these steps to set up a complete hot potato game environment.

### Step 1: Create an Oven

```bash
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module hot_potato \
  --function create_oven \
  --args "[AGENT_ID]" "[AGENT_CAP_ID]" \
  --gas-budget 20000000
```

This creates:

- A shared Oven object
- An OvenCap for baking potatoes

Note the IDs:

- Oven ID: `[OVEN_ID]`
- OvenCap ID: `[OVEN_CAP_ID]`

### Step 2: Create a GameManager

```bash
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module game_manager \
  --function create_game_manager \
  --args "[OVEN_ID]" "[COIN_FOR_PRIZE_POOL]" \
  --gas-budget 20000000
```

This creates:

- A shared GameManager object
- A GameManagerCap for administration

Note the IDs:

- GameManager ID: `[GAME_MANAGER_ID]`
- GameManagerCap ID: `[GAME_MANAGER_CAP_ID]`

### Step 3: Create a Game

```bash
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module game_manager \
  --function create_game \
  --args "[GAME_MANAGER_ID]" "[GAME_MANAGER_CAP_ID]" "[48]" \
  --gas-budget 20000000
```

The game ID will be emitted in a GameCreated event in the transaction output.

- Game ID: `[GAME_ID]`

## Game Workflow

### 0. Create a ModelCap for UI Access (Required)

```bash
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module hot_potato \
  --function create_model_cap \
  --args "[RECIPIENT_ADDRESS]" "0x6" \
  --gas-budget 20000000
```

This creates a ModelCap that allows the recipient to interact with the game UI:

- ModelCap ID: `[MODEL_CAP_ID]`

### 1. Bake a Potato

```bash
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module hot_potato \
  --function bake_potato \
  --args "[OVEN_ID]" "[GAME_MANAGER_ID]" "[PAYMENT_COIN]" "0x6" "0x8" "[RECIPIENT_ADDRESS]" "[METADATA]" \
  --gas-budget 20000000
```

This creates a potato and transfers it to the recipient:

- Potato ID: `[POTATO_ID]`

### 2. Register the Potato with a Game

```bash
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module game_manager \
  --function register_potato \
  --args "[GAME_MANAGER_ID]" "[GAME_MANAGER_CAP_ID]" "[POTATO_ID]" "[GAME_ID]" \
  --gas-budget 20000000
```

### 3. Create GameCap for the Recipient

```bash
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module hot_potato \
  --function create_game_cap \
  --args "[POTATO_ID]" "[RECIPIENT_ADDRESS]" \
  --gas-budget 20000000
```

This creates a GameCap for the recipient:

- GameCap ID: `[GAME_CAP_ID]`

### 4. Transfer the Potato (by Recipient)

```bash
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module hot_potato \
  --function transfer_potato \
  --args "[POTATO_ID]" "[GAME_CAP_ID]" "[GAME_MANAGER_ID]" "[GAME_MANAGER_CAP_ID]" "0x6" "[NEW_RECIPIENT_ADDRESS]" \
  --gas-budget 20000000
```

### 5. Record the Transfer (by Admin)

```bash
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module game_manager \
  --function record_transfer_by_potato \
  --args "[GAME_MANAGER_ID]" "[GAME_MANAGER_CAP_ID]" "[POTATO_ID]" "[PLAYER_ADDRESS]" \
  --gas-budget 20000000
```

## Agent and Game Integration

The agent system can be integrated with the Hot Potato game to provide AI-driven game experiences:

1. **Game Questions**: Users can ask the agent about their game status, rules, or strategies
2. **Game Actions**: The agent can trigger game actions through callbacks
3. **Notifications**: The agent can notify users about game events or status changes

Example prompts for game integration:

```
# Ask about game status
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module prompt_manager \
  --function infer_prompt \
  --args "[PROMPT_MANAGER_ID]" "[AGENT_CAP_ID]" "What is the status of my hot potato game?" "[AGENT_WALLET_ADDRESS]" \
  --gas-budget 20000000

# Ask to create a new game with callback
sui client call --package 0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6 \
  --module prompt_manager \
  --function infer_prompt_with_callback \
  --args "[PROMPT_MANAGER_ID]" "[AGENT_CAP_ID]" "Create a new hot potato game for me" "[AGENT_WALLET_ADDRESS]" "[PACKAGE_ID]::game_manager::create_game" \
  --gas-budget 20000000
```

## Important Notes

1. **Clock and Random Objects**:

   - Clock Object: `0x6`
   - Random Object: `0x8`

2. **Agent System Events**:

   - The prompt manager emits events that can be monitored by backend services
   - Key events include: `PromptCreated`, `PromptWithCallback`, `PromptResponseAdded`, `PromptUpdated`

3. **Potato Fee**:

   - Each potato costs 0.5 SUI to create
   - This fee is automatically added to the prize pool

4. **Game Lifecycle**:

   - The potato has an expiry time (24 hours from creation)
   - Each transfer must occur within a transfer window (30 minutes)
   - If a player holds a potato too long, it "burns"
   - If the potato reaches its expiry time, it "expires"

5. **Sponsored Transactions**:
   To enable sponsored transactions:
   1. Extract a reward coin using `get_reward_coin`
   2. Use the Sui SDK to create a sponsored transaction
   3. The transaction should have:
      - User's address as the sender
      - Agent's address as the gas owner
      - Extracted coin as the gas payment

## System Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│                     │         │                     │
│    Agent System     │         │    Game System      │
│                     │         │                     │
├─────────────────────┤         ├─────────────────────┤
│                     │         │                     │
│  ┌───────────────┐  │         │  ┌───────────────┐  │
│  │     Agent     │  │         │  │     Oven      │  │
│  └───────┬───────┘  │         │  └───────┬───────┘  │
│          │          │         │          │          │
│  ┌───────┴───────┐  │         │  ┌───────┴───────┐  │
│  │ Prompt Manager│  │         │  │ Game Manager  │  │
│  └───────────────┘  │         │  └───────┬───────┘  │
│                     │         │          │          │
└──────────┬──────────┘         │  ┌───────┴───────┐  │
           │                    │  │     Game      │  │
           │                    │  └───────┬───────┘  │
           │                    │          │          │
           │                    │  ┌───────┴───────┐  │
           └────────────────────┼─▶│  Hot Potato   │  │
                                │  └───────────────┘  │
                                │                     │
                                └─────────────────────┘
```

## Backend Integration

The backend services should:

1. Listen for events from both agent and game modules
2. Process prompts and generate responses
3. Execute callbacks when requested
4. Monitor game status and player activities
5. Handle sponsored transactions

For more details on backend integration, refer to the agent system documentation.
