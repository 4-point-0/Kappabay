# Oracle 

You can change the network by creating a `.env` file with the variable `NETWORK=<mainnet|testnet|devnet|localnet>`

## Installation

1. Install dependencies by running

```bash
pnpm install --ignore-workspace
```

2. Copy the .env.example into .env and populate it with your actuall envormental variable

```bash
cp .env.example .env
```

2. Setup the database by running

```bash
pnpm db:setup:dev
```

3. Run both the API and the indexer

```bash
pnpm dev
```



## Event Indexer

> Run only a single instance of the indexer.

Indexer uses polling to watch for new events. We're saving the
cursor data in the database so we can start from where we left off
when restarting the API.

To run the indexer individually, run:

```bash
pnpm indexer
```
