import { Network } from './sui-utils';
require('dotenv').config();

console.log(`Using network: ${process.env.NETWORK}`);

/**
 * A default configuration
 * */
export const CONFIG = {
	/// Look for events every 1s
	POLLING_INTERVAL_MS: 1000,
	DEFAULT_LIMIT: 50,
	NETWORK: (process.env.NETWORK as Network) || 'testnet',
	AGENT_CONTRACT: {
		packageId: process.env.PACKAGE_ID || '0x7749f6b3bdaf599900ead36469abfeadc2072d22d3fedbd41a2c16a54e1a3af3',
		module: process.env.AGENT_CONTRACT_MODULE || 'agent',
	},
	INITIAL_TRANSACTION_DIGEST: process.env.INITIAL_TRANSACTION_DIGEST || '3v8x7zpPD9tuakdGD7nRpLRBUoy4U1Dzhk2Xi2pBLqbz',
	BASE_URL: process.env.BASE_URL || 'http://192.168.1.67:3000',
	AGENT_ID: process.env.AGENT_ID || '47ed2985-5ab6-0f5f-8ac7-1916787f8877',
	PRIVATE_KEY: process.env.PRIVATE_SEED || 'something something else what the you want here dont copy my seed',
};
