import {
    Evaluator,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
    composeContext,
    generateObject,
    ModelClass,
} from "@elizaos/core";
import { z } from "zod";

// Schema for case analysis
const CaseAnalysisSchema = z.object({
    hasEvidence: z.boolean(),
    evidenceStrength: z.enum(["STRONG", "MODERATE", "WEAK", "NONE"]),
    hasClearDescription: z.boolean(),
    requiresJudgment: z.boolean(),
    caseType: z.enum(["CRIMINAL", "CIVIL", "ADMINISTRATIVE", "UNKNOWN"]),
});

type CaseAnalysis = z.infer<typeof CaseAnalysisSchema>;

const caseAnalysisTemplate = `
Analyze the following text to determine if it contains a legal case that requires judgment:

Text: {{text}}

Evaluate:
1. Does it contain evidence or facts about a case?
2. How strong is the evidence presented?
3. Is there a clear description of what happened?
4. Does this require a legal judgment?
5. What type of case is this?

Provide your analysis.
`;

export const caseAnalysisEvaluator: Evaluator = {
    name: "CASE_ANALYSIS",
    similes: ["legal analysis", "case evaluation", "evidence assessment"],
    description: "Analyzes whether a message contains a legal case requiring judgment",
    
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        const context = message.content.text.toLowerCase();
        return context.includes("evidence") || context.includes("case") || context.includes("judge") || context.includes("verdict");
    },
    
    handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        try {
            elizaLogger.info("Evaluating message for legal case content");
            
            const context = composeContext({
                state: {
                    ...state,
                    text: message.content.text,
                },
                template: caseAnalysisTemplate,
            });
            
            const response = await generateObject({
                runtime,
                context,
                schema: CaseAnalysisSchema as any,
                modelClass: ModelClass.SMALL,
            });
            
            // Parse and validate the response
            const analysis: CaseAnalysis = CaseAnalysisSchema.parse(response.object);
            
            elizaLogger.info(`Case analysis: ${JSON.stringify(analysis)}`);
            
            // Store analysis in state
            if (state) {
                state.lastCaseAnalysis = analysis;
            }
            
            // Return true if this requires judgment
            return analysis.requiresJudgment && analysis.hasEvidence;
            
        } catch (error) {
            elizaLogger.error("Error analyzing case:", error);
            return false;
        }
    },
    
    examples: [
        {
            context: "The defendant was caught on camera stealing from the store at 3 PM.",
            messages: [],
            outcome: "true",
        },
        {
            context: "What's the weather like today?",
            messages: [],
            outcome: "false",
        },
        {
            context: "Evidence shows the contract was breached when payment was not delivered on time as agreed.",
            messages: [],
            outcome: "true",
        },
    ],
};