"use client"

import { useState } from "react"
import Header from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Cog, Sparkles } from "lucide-react"
import CharacterQuestionnaire from "@/components/character-questionnaire"
import { useRouter } from "next/navigation"

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSignExecuteAndWaitForTransaction } from "@/hooks/use-sign";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { serializeAgentConfig } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Deploy } from "@/lib/actions/deploy";
import { Loader2 } from "lucide-react";

export default function CreateCompanionPage() {
  const [showConfig, setShowConfig] = useState(false)
  const [characterConfig, setCharacterConfig] = useState<any>(null)
  const account = useCurrentAccount();
  const signAndExec = useSignExecuteAndWaitForTransaction();
  const [isDeploying, setIsDeploying] = useState(false);
  const router = useRouter()

  const handleComplete = (config: any) => {
    setCharacterConfig(config)
    setShowConfig(true)
  }

  const handleDeploy = async () => {
    setIsDeploying(true);
    const tx = new Transaction();

    // fund the create_agent call
    const [coin] = tx.splitCoins(tx.gas, [1 * 10_000_000]);
    tx.moveCall({
      target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::create_agent`,
      arguments: [
        tx.pure(
          bcs
            .vector(bcs.u8())
            .serialize(Array.from(Buffer.from(serializeAgentConfig(characterConfig))))
        ),
        coin,
        tx.pure.string(characterConfig.image || "https://example.com/placeholder.png"),
      ],
    });

    // collect platform fee
    const feeAddress = process.env.NEXT_PUBLIC_FEE_ADDRESS!;
    const FEE_AMOUNT = 1 * 10_000_000;
    const [feeCoin] = tx.splitCoins(tx.gas, [FEE_AMOUNT]);
    tx.transferObjects([feeCoin], tx.pure.address(feeAddress));

    try {
      const txResult = await signAndExec(tx);

      // extract object IDs
      let agentObjectId = "";
      let agentCapId = "";
      let adminCapId = "";
      if (txResult.objectChanges && Array.isArray(txResult.objectChanges)) {
        for (const c of txResult.objectChanges) {
          if (c.type === "created") {
            if (c.objectType.includes("::agent::Agent")) agentObjectId = c.objectId;
            else if (c.objectType.includes("::agent::AgentCap")) agentCapId = c.objectId;
            else if (c.objectType.includes("::agent::AdminCap")) adminCapId = c.objectId;
          }
        }
      }
      if (!agentObjectId || !agentCapId || !adminCapId) {
        toast({
          title: "Deployment Warning",
          description: "Could not extract object IDs. Check console.",
          variant: "destructive",
        });
        return;
      }

      // call backend
      const deployResult = await Deploy({
        agentConfig: characterConfig,
        onChainData: {
          agentObjectId,
          agentCapId,
          adminCapId,
          ownerWallet: account?.address || "",
          txDigest: txResult.digest,
        },
      });

      if (deployResult.success) {
        // transfer AdminCap to agent wallet
        const transferTx = new Transaction();
        transferTx.transferObjects(
          [transferTx.object(adminCapId)],
          transferTx.pure.address(deployResult.agentWallet!)
        );
        await signAndExec(transferTx);

        toast({
          title: "Agent deployed successfully",
          description: `Agent ID: ${deployResult.agentId}`,
        });
        router.push("/kappabay/status");
      } else {
        toast({
          title: "Backend Deployment Error",
          description: deployResult.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: `${err}`,
        description: "Failed to deploy",
        variant: "destructive",
      });
      console.error(err);
    } finally {
      setIsDeploying(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center mb-8">
            <Link href="/kappabay">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Create Your Digital Companion</h1>
          </div>

          <AnimatePresence mode="wait">
            {!showConfig ? (
              <motion.div
                key="questionnaire"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-6">
                  <CharacterQuestionnaire onComplete={handleComplete} />
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="config"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Character Summary</h2>
                    <Button variant="outline" onClick={() => setShowConfig(false)}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back to Questionnaire
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-muted rounded-lg p-6 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-48 h-48 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <Sparkles className="h-16 w-16 text-primary/50" />
                        </div>
                        <p className="text-muted-foreground">Character preview will appear here</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold mb-4">{characterConfig.name}</h3>
                      <div className="space-y-3">
                        <div>
                          <span className="font-medium">Visual Style:</span>{" "}
                          {characterConfig.visualStyle === "anime" ? "Anime / Stylized" : "Realistic / Relatable"}
                        </div>
                        <div>
                          <span className="font-medium">Archetype:</span> {characterConfig.archetype}
                        </div>
                        <div>
                          <span className="font-medium">Personality:</span> {characterConfig.topTraits.join(", ")}
                        </div>
                        <div>
                          <span className="font-medium">Voice:</span> {characterConfig.voiceModel}
                        </div>
                      </div>

                      <div className="mt-6 space-y-3">
                        <h4 className="font-medium">Character Description:</h4>
                        <div className="bg-muted p-3 rounded-md text-sm">
                          <p>Visual style: {characterConfig.visualStyle}</p>
                          <p>Archetype: {characterConfig.archetype}</p>
                          <p>Personality sliders: {JSON.stringify(characterConfig.sliderValues)}</p>
                          <p>Relationship roles: {characterConfig.roles.join(", ")}</p>
                          <p>Communication style: {characterConfig.commStyle}</p>
                          <p>World setting: {characterConfig.world}</p>
                          <p>Origin twist: {characterConfig.origin}</p>
                          <p>Lore snippet: {characterConfig.lore || "N/A"}</p>
                          <p>
                            Appearance: {characterConfig.artStyle}, {characterConfig.hair}, {characterConfig.eyes},{" "}
                            {characterConfig.build}, {characterConfig.attire}, {characterConfig.accessory}
                          </p>
                          <p>Voice model: {characterConfig.voiceModel}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => alert("Advanced configuration coming soon!")}
                    >
                      <Cog className="h-4 w-4" /> Advanced Configuration
                    </Button>
                    <Button
                      className="gap-2"
                      onClick={handleDeploy}
                      disabled={isDeploying}
                    >
                      {isDeploying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Meet Your Waifu <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PageTransition>
    </main>
  )
}
