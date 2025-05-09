import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Buffer } from "buffer";

export interface Usage {
    /** either snake or camel */
    prompt_tokens?: number;
    promptTokens?: number;
    completion_tokens?: number;
    completionTokens?: number;
    model?: string;
}

export interface FeeStrategy {
    calculateMist(usage: Usage): bigint;
}

const OPENAI_PRICES: Record<string, { input: number; output: number }> = {
    "gpt-4": { input: 0.03, output: 0.06 },
    "gpt-4-32k": { input: 0.06, output: 0.12 },
    "gpt-4-turbo": { input: 0.01, output: 0.03 },
    "gpt-4o": { input: 0.005, output: 0.015 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
};

class OpenAIFeeStrategy implements FeeStrategy {
    calculateMist(usage: Usage): bigint {
        const devFeeMultiplier =
            1 + parseInt(process.env.DEV_FEE_PERCENT ?? "5") / 100; // 5% dev fee
        const p = usage.prompt_tokens ?? usage.promptTokens ?? 0;
        const c = usage.completion_tokens ?? usage.completionTokens ?? 0;
        const model = usage.model ?? "gpt-4";
        const su = parseFloat(process.env.SUI_USD_PRICE ?? "1");

        const price = OPENAI_PRICES[model];
        if (!price) throw new Error(`Unknown OpenAI model: ${model}`);

        const usd = (p / 1000) * price.input + (c / 1000) * price.output;
        const sui = usd / su;
        return BigInt(Math.ceil(sui * 1e9 * devFeeMultiplier)); // Mist
    }
}

// stub for DeepSeek later
class DeepseekFeeStrategy implements FeeStrategy {
    calculateMist(_u: Usage): bigint {
        // implement Deepseek pricing here
        return BigInt(0);
    }
}

const strategies: Record<string, FeeStrategy> = {
    openai: new OpenAIFeeStrategy(),
    deepseek: new DeepseekFeeStrategy(),
};

export async function chargeFee(
    usage: Usage,
    modelProvider: string
): Promise<void> {
    console.log("usage", usage);
    console.log("modelProvider", modelProvider);

    const withdrawAmountMist =
        strategies[modelProvider]?.calculateMist(usage) ??
        strategies.openai.calculateMist(usage);
    if (withdrawAmountMist <= 0) return;

    const pkg = process.env.SUI_PACKAGE_ID!;
    const agentObj = process.env.SUI_AGENT_OBJECT_ID!;
    const adminCap = process.env.SUI_ADMIN_CAP_ID!;

    const client = new SuiClient({ url: getFullnodeUrl("testnet") });
    const agentKP = Ed25519Keypair.fromSecretKey(process.env.SUI_AGENT_PK!);
    const sponsorKP = Ed25519Keypair.fromSecretKey(
        process.env.SUI_FEE_RECEIVER_PK!
    );
    const feeRcvr = sponsorKP.toSuiAddress();

    const tx = new Transaction();
    const coin = tx.moveCall({
        target: `${pkg}::agent::extract_gas_for_transaction`,
        arguments: [
            tx.object(agentObj),
            tx.object(adminCap),
            tx.pure.u64(withdrawAmountMist),
        ],
    });
    tx.transferObjects([coin], feeRcvr);
    tx.setSender(agentKP.getPublicKey().toSuiAddress());
    tx.setGasOwner(sponsorKP.getPublicKey().toSuiAddress());
    const builtTx = await tx.build({ client });

    const sponsorSignature = await sponsorKP.signTransaction(builtTx);
    const agentSignature = await agentKP.signTransaction(builtTx);

    const response = await client.executeTransactionBlock({
        transactionBlock: builtTx,
        signature: [agentSignature.signature, sponsorSignature.signature],
        options: {
            showEvents: true,
            showEffects: true,
            showObjectChanges: true,
            showBalanceChanges: true,
            showInput: true,
        },
    });

    console.log("response", response);
}
