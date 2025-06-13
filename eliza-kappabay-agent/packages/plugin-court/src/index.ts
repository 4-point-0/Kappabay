import { Plugin } from "@elizaos/core";
import { executeVerdictCallbackAction } from "./actions/executeVerdictCallback";
import { caseAnalysisEvaluator } from "./evaluators/caseAnalysis";
import { courtDataProvider } from "./providers/courtData";

export const courtPlugin: Plugin = {
    name: "court",
    description: "Legal decision-making and court verdict plugin for autonomous agents",
    actions: [
        executeVerdictCallbackAction,
    ],
    evaluators: [
        caseAnalysisEvaluator,
    ],
    providers: [
        courtDataProvider,
    ],
    services: [],
};

export default courtPlugin;