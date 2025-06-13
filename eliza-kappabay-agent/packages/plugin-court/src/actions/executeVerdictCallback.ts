import {
    Action,
    ActionExample,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
    composeContext,
    generateObject,
    ModelClass,
} from "@elizaos/core";
import { z } from "zod";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

// Schema for the verdict decision
const VerdictDecisionSchema = z.object({
    verdict: z.enum(["GUILTY", "INNOCENT"]),
    reasoning: z.string(),
    confidence: z.number().min(0).max(1),
    chosenCallback: z.object({
        package: z.string(),
        module: z.string(),
        function: z.string(),
        arguments: z.array(z.string()),
    }),
});

type VerdictDecision = z.infer<typeof VerdictDecisionSchema>;

const courtJudgmentTemplate = `
You are an impartial judge analyzing a legal case. You have been provided with evidence and case description, and you must make a fair verdict.

Case Information:
{{prompt}}

Available Actions:
{{availableCallbacks}}

Your task:
1. Analyze the evidence carefully
2. Apply the principle of "innocent until proven guilty"
3. Choose either GUILTY or INNOCENT based on the evidence
4. Select the appropriate callback to execute
5. Provide your reasoning and confidence level

Guidelines:
- Consider only the evidence presented
- For a guilty verdict, evidence must be clear and convincing
- Consider if there is reasonable doubt
- Be impartial and fair

Respond with your verdict decision and the callback you choose to execute.
`;

interface CourtCallback {
    package: string;
    module: string;
    function: string;
    requires_user_wallet: boolean;
    arguments: string[];
}

export const executeVerdictCallbackAction: Action = {
    name: "EXECUTE_VERDICT_CALLBACK",
    similes: ["judge case", "court decision", "execute verdict", "legal judgment"],
    description: "Analyze a legal case and execute the appropriate verdict callback on the blockchain",
    
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        // Check if the message contains court callbacks
        try {
            const messageText = message.content.text;
            const parsedMessage = JSON.parse(messageText);
            
            if (parsedMessage.callbacks) {
                // Handle both array and object cases
                const callbacksArray = Array.isArray(parsedMessage.callbacks) 
                    ? parsedMessage.callbacks 
                    : [parsedMessage.callbacks];
                
                const hasCourtCallbacks = callbacksArray.some((cb: any) => {
                    return cb.module === 'court' && 
                        (cb.function === 'deliver_guilty_verdict' || cb.function === 'deliver_innocent_verdict');
                });
                
                return hasCourtCallbacks;
            }
        } catch (error) {
            // Not JSON, check state fallback
        }
        
        // Fallback to checking state
        if (state?.availableCallbacks) {
            const callbacks = state.availableCallbacks as CourtCallback[];
            return callbacks.some(cb => 
                cb.module === 'court' && 
                (cb.function === 'deliver_guilty_verdict' || cb.function === 'deliver_innocent_verdict')
            );
        }
        
        return false;
    },
    
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            elizaLogger.info("Analyzing court case and preparing to execute verdict");
            
            // Parse callbacks from message
            let availableCallbacks: CourtCallback[] = [];
            let prompt = "";
            
            try {
                const messageText = message.content.text;
                const parsedMessage = JSON.parse(messageText);
                
                if (parsedMessage.callbacks) {
                    availableCallbacks = Array.isArray(parsedMessage.callbacks) 
                        ? parsedMessage.callbacks 
                        : [parsedMessage.callbacks];
                }
                
                if (parsedMessage.prompt) {
                    prompt = parsedMessage.prompt;
                } else {
                    prompt = messageText;
                }
            } catch (error) {
                // Fallback to state and raw message
                availableCallbacks = (state.availableCallbacks as CourtCallback[]) || [];
                prompt = message.content.text;
            }
            
            // Format available callbacks for the AI
            const callbackDescriptions = availableCallbacks.map(cb => 
                `- ${cb.function}: ${cb.package}::${cb.module}::${cb.function}`
            ).join('\n');
            
            // Compose the context for the AI
            const context = composeContext({
                state: {
                    ...state,
                    prompt,
                    availableCallbacks: callbackDescriptions,
                },
                template: courtJudgmentTemplate,
            });
            
            // Generate the verdict decision
            const response = await generateObject({
                runtime,
                context,
                schema: VerdictDecisionSchema as any,
                modelClass: ModelClass.LARGE,
            });
            
            // Parse and validate the response
            const decision: VerdictDecision = VerdictDecisionSchema.parse(response.object);
            elizaLogger.info(`Verdict decided: ${decision.verdict} with confidence ${decision.confidence}`);
            
            // Find the appropriate callback to execute
            const callbackToExecute = availableCallbacks.find(cb => 
                cb.function === (decision.verdict === 'GUILTY' ? 'deliver_guilty_verdict' : 'deliver_innocent_verdict')
            );
            
            if (!callbackToExecute) {
                elizaLogger.error("Could not find appropriate callback for verdict:", decision.verdict);
                return false;
            }
            
            // Execute the Sui transaction
            await executeSuiCallback(callbackToExecute, state);
            
            // Store the decision in state
            state.verdictDecision = decision;
            state.lastVerdict = decision.verdict;
            state.lastVerdictReasoning = decision.reasoning;
            state.lastVerdictConfidence = decision.confidence;
            
            if (callback) {
                callback({
                    text: `Verdict: ${decision.verdict}\n\nReasoning: ${decision.reasoning}\n\nConfidence: ${decision.confidence}\n\nTransaction executed on blockchain.`,
                    action: "VERDICT_EXECUTED",
                    data: {
                        verdict: decision.verdict,
                        reasoning: decision.reasoning,
                        confidence: decision.confidence,
                        executedCallback: callbackToExecute,
                    }
                });
            }
            
            return true;
        } catch (error) {
            elizaLogger.error("Error executing verdict callback:", error);
            
            if (callback) {
                callback({
                    text: "I encountered an error while processing the case and executing the verdict. Please try again.",
                    action: "VERDICT_ERROR",
                });
            }
            
            return false;
        }
    },
    
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "You are a judge analyzing a legal case. Evidence: Video surveillance shows defendant stealing merchandise. Choose the appropriate callback to execute.",
                }
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll analyze this case based on the evidence and execute the appropriate verdict.",
                    action: "EXECUTE_VERDICT_CALLBACK"
                }
            }
        ]
    ] as ActionExample[][],
};

async function executeSuiCallback(callback: CourtCallback, state: State): Promise<void> {
    try {
        elizaLogger.info(`Executing Sui callback: ${callback.package}::${callback.module}::${callback.function}`);
        
        // Get Sui client configuration
        const network = process.env.SUI_NETWORK || 'testnet';
        const client = new SuiClient({ 
            url: getFullnodeUrl(network as 'testnet' | 'mainnet' | 'devnet' | 'localnet') 
        });
        
        // Get keypair from environment
        const privateKey = process.env.SUI_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("SUI_PRIVATE_KEY not found in environment");
        }
        
        const keypair = Ed25519Keypair.fromSecretKey(privateKey);
        
        // Create transaction
        const tx = new Transaction();
        
        // Extract IDs from the callback arguments
        // Arguments come as objects with type and value properties
        const courtId = (callback.arguments?.[0] as any)?.value || callback.arguments?.[0];
        const caseId = (callback.arguments?.[1] as any)?.value || callback.arguments?.[1];
        const clockId = (callback.arguments?.[2] as any)?.value || callback.arguments?.[2] || '0x6';
        const agentCapId = (callback.arguments?.[3] as any)?.value || callback.arguments?.[3];
        
        if (!courtId || !caseId || !agentCapId) {
            elizaLogger.error("Missing required IDs in callback:", {
                courtId,
                caseId,
                agentCapId,
                callback: callback
            });
            throw new Error("Missing required IDs in callback arguments");
        }
        
        // Build the move call arguments
        // Ensure IDs are properly formatted with 0x prefix
        const formattedCourtId = courtId.startsWith('0x') ? courtId : `0x${courtId}`;
        const formattedCaseId = caseId.startsWith('0x') ? caseId : `0x${caseId}`;
        const formattedClockId = clockId.startsWith('0x') ? clockId : `0x${clockId}`;
        const formattedAgentCapId = agentCapId.startsWith('0x') ? agentCapId : `0x${agentCapId}`;
        
        // Get the actual package ID from environment
        const packageId = process.env.COURT_PACKAGE_ID;
        if (!packageId) {
            throw new Error("COURT_PACKAGE_ID not found in environment variables");
        }
        
        const target = `${packageId}::${callback.module}::${callback.function}`;
        
        // Add the move call with proper object references
        tx.moveCall({
            target,
            arguments: [
                tx.object(formattedCourtId),      // Court object
                tx.object(formattedCaseId),       // Case object  
                tx.object(formattedClockId),      // Clock object
                tx.object(formattedAgentCapId),   // AgentCap
            ],
        });
        
        // Set gas budget
        tx.setGasBudget(10000000);
        
        // Sign and execute transaction
        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: {
                showEffects: true,
                showEvents: true,
                showObjectChanges: true,
                showBalanceChanges: true,
            },
        });
        
        elizaLogger.info(`Verdict transaction executed: ${result.digest}`);
        
    } catch (error) {
        elizaLogger.error("Failed to execute Sui callback - Error details:", {
            message: error?.message,
            code: error?.code,
            type: error?.constructor?.name,
            stack: error?.stack,
            fullError: error
        });
        
        // Log transaction details for debugging
        elizaLogger.error("Transaction details that failed:", {
            package: callback.package,
            module: callback.module,
            function: callback.function,
            courtId: (callback.arguments?.[0] as any)?.value || callback.arguments?.[0],
            caseId: (callback.arguments?.[1] as any)?.value || callback.arguments?.[1],
            clockId: (callback.arguments?.[2] as any)?.value || callback.arguments?.[2] || '0x6',
            agentCapId: (callback.arguments?.[3] as any)?.value || callback.arguments?.[3],
            network: process.env.SUI_NETWORK || 'testnet',
            hasPrivateKey: !!process.env.SUI_PRIVATE_KEY
        });
        
        throw error;
    }
}