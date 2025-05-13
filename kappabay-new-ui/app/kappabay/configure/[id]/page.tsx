"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Header from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { motion } from "framer-motion"
import CharacterQuestionnaire from "@/components/character-questionnaire"
import AgentDeployer from "@/components/agent-deployer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Sparkles } from "lucide-react"
import Link from "next/link"

// Try to read the raw questionnaire from sessionStorage
const loadSavedConfig = (): any | null => {
  try {
    const raw = sessionStorage.getItem("waifuConfig")
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function ConfigurePage() {
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(true)
  const [waifuConfig, setWaifuConfig] = useState<any>(null)
  const [started, setStarted] = useState(false)
  const [showDeployer, setShowDeployer] = useState(false)

  useEffect(() => {
    const loadConfig = async () => {
      // 1) first check sessionStorage (piped in by the create page)
      const saved = loadSavedConfig()
      if (saved) {
        setWaifuConfig(saved)
        setLoading(false)
        return
      }
      // 2) fallback: load from your real endpoint (if you have one)
      try {
        const res = await fetch(`/api/agents/${id}`)
        if (!res.ok) throw new Error(res.statusText)
        const data = await res.json()
        setWaifuConfig(data.config)
      } catch (err) {
        console.error("Fetch agent config failed:", err)
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [id])

  // when the user finishes the questionnaire, show the Update UI
  const handleComplete = (config: any) => {
    setWaifuConfig(config)
    setStarted(true)
    setShowDeployer(false)
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center mb-8">
            <Link href="/kappabay/status">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Configure Companion</h1>
              <p className="text-muted-foreground">
                Waifu ID: <span className="font-mono">{id}</span>
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
              />
            </div>
          ) : waifuConfig && !started ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              <CharacterQuestionnaire initialConfig={waifuConfig} onComplete={handleComplete} />
            </motion.div>
          ) : waifuConfig && started && !showDeployer ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="p-6 space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Character Summary</h2>
                  <Button variant="outline" onClick={() => setStarted(false)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Questionnaire
                  </Button>
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
                    <h3 className="text-xl font-bold mb-4">{waifuConfig.name}</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium">Visual Style:&nbsp;</span>
                        {waifuConfig.visualStyle === "anime"
                          ? "Anime / Stylized"
                          : "Realistic / Relatable"}
                      </div>
                      <div>
                        <span className="font-medium">Archetype:&nbsp;</span>
                        {waifuConfig.archetype}
                      </div>
                      <div>
                        <span className="font-medium">Personality:&nbsp;</span>
                        {waifuConfig.topTraits.join(", ")}
                      </div>
                      {/* add any other fields you want to display */}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <Button onClick={() => setShowDeployer(true)}>
                    Update Companion
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : waifuConfig && started && showDeployer ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <AgentDeployer
                agentConfig={waifuConfig}
                isConfiguring
                agentId={id}
              />
            </motion.div>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p>Failed to load companion configuration. Please try again.</p>
            </div>
          )}
        </div>
      </PageTransition>
    </main>
  )
}
