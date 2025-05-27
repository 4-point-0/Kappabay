# Agent Launchpad

A decentralized AI Agent marketplace and management dashboard built on SUI, using Next.js 15 and TypeScript.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Installation & Setup](#installation--setup)
6. [Environment Variables](#environment-variables)
7. [Available Scripts](#available-scripts)
8. [Project Structure](#project-structure)
9. [Database & ORM](#database--orm)

## Overview

**Agent Launchpad** is a Next.js 15 application that lets you deploy, monitor, and interact with on-chain AI Agents on the SUI network. It provides:

- A wizard to configure and deploy new Agents
- A Marketplace to list, discover, and purchase Agent capabilities
- Live status pages for wallets, gas management, and terminals
- Integration with SUI wallets via `@mysten/dapp-kit` and `@mysten/enoki`

## Features

- Deploy & configure AI Agents with zero boilerplate
- Real-time status monitoring (gas balance, process status)
- Terminal access and service toggles
- Agent marketplace with listings, filters, and purchase flow
- Secure environment management with Prisma + SQLite

## Tech Stack

- Next.js 15 (App Router, Turbopack)
- TypeScript
- Tailwind CSS (+ `tailwindcss-animate`)
- Radix UI primitives
- React Query (`@tanstack/react-query`)
- Prisma ORM with SQLite
- SUI Client (`@mysten/dapp-kit`, `@mysten/enoki`)
- Walrus Decentralized Storage
- Framer Motion, Lucide React, Zod, React Hook Form

## Prerequisites

- Node.js v23 or higher
- pnpm
- A SUI wallet (e.g. via Sui Dapp Kit) connected to testnet or mainnet

## Installation & Setup

1. Install dependencies
   ```bash
   pnpm install
   ```
2. Copy and configure project's environment variables

   ```bash
   cp .env.example .env
   ```

   Edit `.env` as needed (see [Environment Variables](#environment-variables)).

3. Copy and configure agent's environment variables

   ```bash
   cp agent-config/.env.example agent-config/.env
   ```

   Edit `.env` as needed (see [Environment Variables](#environment-variables)).

4. Run the development server
   ```bash
   pnpm dev
   ```

## Environment Variables

Project required variables are listed in `.env.example`. Key ones include:

- `OPENAI_API_KEY` – OpenAI API key, starting with sk-
- `PORTAINER_API_KEY` - Portainer API key
- `ENCRYPTION_KEY` - Encryption key for encrypting secrets e.g `e45a2d8c934f1b07d82e6f3a591c4d0f76b9a8123cd4e5678901f2b345d67a89` (example)
- `NEXT_PUBLIC_FEE_ADDRESS` - Sui fee collector address
- `FEE_RECEIVER_PK` - Sui fee collector private key

Agent required variables are listed in `.env.example`. Key ones include:

- `OPENAI_API_KEY` - OpenAI API key, starting with sk-
- `SUI_FEE_RECEIVER_PK=` - Sui fee collector private key

## Available Scripts

- `pnpm dev` – Start in development (Turbopack)
- `pnpm build` – Build for production
- `pnpm start` – Start production server

## Project Structure

The core application routes are under `app/`, with the following subdirectories:

```
app/
├─ configure/    # Agent configuration wizard
├─ deploy/       # Deployment flow
├─ kappabae/     # Custom Kappabae layout & pages
├─ marketplace/  # Agent marketplace UI
├─ status/       # Owned agents status page
└─ terminal/     # Terminal access pages
```

Reusable components and UI primitives live in:

```
components/
└─ ui/           # Tailwind/Radix-based UI components
```

Background jobs and cron actions are in:

```
lib/actions/    # Prisma cron jobs (e.g. fee collection)
```

Other important folders:

- `prisma/` – Schema and migrations for SQLite
- `providers.tsx` – App-wide context providers (QueryClient, WalletProvider)
- `tailwind.config.ts` – Tailwind CSS setup
- `tsconfig.json` – TypeScript compiler options

## Database & ORM

This project uses Prisma with SQLite by default:

- Schema: `prisma/schema.prisma`
- Local database file: `dev.db`
- Migrations: managed via `prisma migrate`
