"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Header from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { motion } from "framer-motion"
import CharacterQuestionnaire from "@/components/character-questionnaire"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

// Mock function to fetch waifu config by ID
const fetchWaifuConfig = async (id: string): Promise<any> => {
  // In a real app, this would fetch from an API
  console.log(`Fetching config for waifu: ${id}`)

  // For demo purposes, return a mock config
  return {
    name: id === "0x1a2b3c4d5e6f7g8h9i0j" ? "Sakura" : id === "0x9i8h7g6f5e4d3c2b1a0" ? "Aria" : "Miko",
    visualStyle: "anime",
    archetype: "deredere",
    sliderValues: {
      sociability: 4,
      energy: 3,
      quirkiness: 2,
      affection: 5,
      humor: 3,
    },
    roles: ["best-friend", "wholesome-partner"],
    commStyle: "emoji-heavy",
    world: "slice-of-life",
    origin: "runaway-idol",
    lore: "Loves to bake cookies for friends on rainy days",
    artStyle: "watercolor",
    hair: "pink-long",
    eyes: "azure-large",
    build: "petite",
    attire: "sailor-uniform",
    accessory: "fox-ears",
    voiceModel: "en_US-female-soft",
    topTraits: ["Sweet", "Caring", "Playful"],
  }
}

export default function ConfigurePage() {
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(true)
  const [waifuConfig, setWaifuConfig] = useState<any>(null)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await fetchWaifuConfig(id)
        setWaifuConfig(config)
      } catch (error) {
        console.error("Failed to load waifu config:", error)
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [id])

  const handleComplete = (config: any) => {
    setWaifuConfig(config)
    alert("Configuration updated!")
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
          ) : waifuConfig ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              <CharacterQuestionnaire initialConfig={waifuConfig} onComplete={handleComplete} />
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
