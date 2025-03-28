# Hot Potato Game

A fun and interactive game built on Sui blockchain where players pass around "hot potatoes" with countdown timers.

## Features

- Mint and transfer hot potato NFTs
- 30-minute countdown timer for each transfer
- View potato status and history
- Built with Next.js and Sui Wallet Kit

## Setup

### Prerequisites

- Node.js v23 or higher
- pnpm

### Installation

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in the required values
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Run the development server:
   ```bash
   pnpm dev
   ```
5. Open [http://localhost:3015](http://localhost:3015) in your browser

## How to Play

1. Connect your wallet
2. Request a Modal Cap from the agent
3. Bake a new hot potato
4. Transfer it to another player before the timer expires
5. Avoid being the last holder when time runs out!
