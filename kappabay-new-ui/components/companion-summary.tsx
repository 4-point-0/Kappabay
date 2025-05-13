"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Cog, Sparkles } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCompanionDeploy } from "@/lib/utils";

export interface CompanionSummaryProps {
  config: any
  /** if true, we’re on the /configure/[id] page */
  isConfiguring?: boolean
  /** for configure‐page “Back” button */
  onBack?: () => void
  /** required if isConfiguring===true */
  agentId?: string
}

export function CompanionSummary({
  config,
  isConfiguring = false,
  onBack,
  agentId,
}: CompanionSummaryProps) {
  const router = useRouter()
  // pull in the unified deploy/update logic
  const { handleDeploy, isBusy } = useCompanionDeploy(
    config,
    isConfiguring,
    agentId
  )

  const handleAdvanced = () => {
    // stash for configure page
    sessionStorage.setItem("waifuConfig", JSON.stringify(config));
    router.push(`/kappabae/configure/${config.id}`);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="summary"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Character Summary</h2>
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-muted rounded-lg p-6 flex items-center justify-center">
              <div className="text-center">
                <div className="w-48 h-48 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Sparkles className="h-16 w-16 text-primary/50" />
                </div>
                <p className="text-muted-foreground">Character preview here</p>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">{config.name}</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Visual Style:</span>{" "}
                  {config.visualStyle === "anime" ? "Anime / Stylized" : "Realistic / Relatable"}
                </div>
                <div>
                  <span className="font-medium">Archetype:</span> {config.archetype}
                </div>
                <div>
                  <span className="font-medium">Personality:</span> {config.topTraits.join(", ")}
                </div>
                <div>
                  <span className="font-medium">Voice:</span> {config.voiceModel}
                </div>
                <p>Relationship roles: {config.roles.join(", ")}</p>
                <p>Communication style: {config.commStyle}</p>
                <p>World setting: {config.world}</p>
                <p>Origin twist: {config.origin}</p>
                <p>Lore snippet: {config.lore || "N/A"}</p>
                <p>
                  Appearance: {config.artStyle}, {config.hair}, {config.eyes}, {config.build}, {config.attire},{" "}
                  {config.accessory}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            {!isConfiguring && (
              <Button variant="outline" onClick={handleAdvanced} className="gap-2">
                <Cog className="h-4 w-4" /> Advanced Configuration
              </Button>
            )}
            <Button onClick={handleDeploy} disabled={isBusy} className="gap-2">
              {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isConfiguring ? "Update Companion" : "Meet Your Waifu"}{" "}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
