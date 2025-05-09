import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Buffer } from "buffer";
import { encoding_for_model, TiktokenModel } from "@dqbd/tiktoken";

/** We now pass raw strings into our fee calculator */
export interface Usage {
    /** the text you sent the LLM */
    prompt: string;
    /** the text the LLM returned */
    completion: string;
    /** model name for both encoding & pricing (e.g. "gpt-4") */
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
        // 1) fee‐multiplier (e.g. dev fee %)
        const devFeeMult =
            1 + parseFloat(process.env.DEV_FEE_PERCENT ?? "5") / 100;

        // 2) pick model
        const model = (usage.model ?? "gpt-4o") as TiktokenModel;
        const prices = OPENAI_PRICES[model];
        if (!prices) throw new Error(`Unknown model price config: ${model}`);

        // 3) count tokens via tiktoken
        const enc = encoding_for_model(model);
        const pTokens = enc.encode(usage.prompt).length;
        const cTokens = enc.encode(usage.completion).length;
        enc.free();

        // 4) USD cost = (tokens/1k)*rate, then apply dev fee
        const usd =
            ((pTokens / 1000) * prices.input +
                (cTokens / 1000) * prices.output) *
            devFeeMult;

        // 5) convert USD → SUI → Mist
        const suiPerUsd = parseFloat(process.env.SUI_USD_PRICE ?? "3");
        const totalSui = usd / suiPerUsd;
        return BigInt(Math.ceil(totalSui * 1e9));
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
}
