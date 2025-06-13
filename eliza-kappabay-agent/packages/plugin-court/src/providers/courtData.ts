import {
    Provider,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
} from "@elizaos/core";

interface CourtStats {
    totalCases: number;
    guiltyVerdicts: number;
    innocentVerdicts: number;
    pendingCases: number;
    convictionRate: number;
}

export const courtDataProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<string> => {
        try {
            // Pull on-chain data and display it maybe ?

            const stats: CourtStats = (state?.courtStats as CourtStats) || {
                totalCases: 0,
                guiltyVerdicts: 0,
                innocentVerdicts: 0,
                pendingCases: 0,
                convictionRate: 0,
            };

            // Calculate conviction rate
            if (stats.guiltyVerdicts + stats.innocentVerdicts > 0) {
                stats.convictionRate =
                    (stats.guiltyVerdicts /
                        (stats.guiltyVerdicts + stats.innocentVerdicts)) *
                    100;
            }

            const courtInfo = `
Court Statistics:
- Total Cases: ${stats.totalCases}
- Guilty Verdicts: ${stats.guiltyVerdicts}
- Innocent Verdicts: ${stats.innocentVerdicts}
- Pending Cases: ${stats.pendingCases}
- Conviction Rate: ${stats.convictionRate.toFixed(2)}%

Recent Verdicts:
${
    Array.isArray(state?.recentVerdicts)
        ? (state.recentVerdicts as any[])
              .map((v: any) => `- Case ${v.caseId}: ${v.verdict} (${v.date})`)
              .join("\n")
        : "No recent verdicts"
}
            `.trim();

            elizaLogger.info("Court data provided");
            return courtInfo;
        } catch (error) {
            elizaLogger.error("Error fetching court data:", error);
            return "Unable to fetch court statistics at this time.";
        }
    },
};
