"use client"

import Header from "@/components/header"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { PageTransition } from "@/components/page-transition"
import { motion } from "framer-motion"

// Mock data for marketplace agents
const marketplaceAgents = [
  {
    id: "1",
    name: "Financial Advisor",
    description: "AI agent specialized in financial analysis and investment advice",
    price: "0.5 SUI",
    creator: "0x123...abc",
    category: "Finance",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: "2",
    name: "Crypto Market Analyst",
    description: "Real-time crypto market analysis and trend predictions",
    price: "0.8 SUI",
    creator: "0x456...def",
    category: "Crypto",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: "3",
    name: "News Aggregator",
    description: "Collects and summarizes news from various sources",
    price: "0.3 SUI",
    creator: "0x789...ghi",
    category: "News",
    image: "/placeholder.svg?height=200&width=200",
  },
  {
    id: "4",
    name: "Social Media Manager",
    description: "Manages social media accounts and generates content",
    price: "0.6 SUI",
    creator: "0xabc...123",
    category: "Social",
    image: "/placeholder.svg?height=200&width=200",
  },
]

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Agent Marketplace</h1>
              <p className="text-muted-foreground mt-2">Discover and acquire AI agents for your needs</p>
            </div>
            <Link href="/deploy">
              <Button>Create New Agent</Button>
            </Link>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {marketplaceAgents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <Card className="overflow-hidden h-full flex flex-col">
                  <div className="h-48 bg-muted flex items-center justify-center">
                    <img
                      src={agent.image || "/placeholder.svg"}
                      alt={agent.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-4 flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{agent.name}</h3>
                      <Badge variant="outline">{agent.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{agent.description}</p>
                    <div className="text-sm text-muted-foreground">
                      <p>Creator: {agent.creator}</p>
                      <p className="font-medium text-foreground mt-2">{agent.price}</p>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex justify-between">
                    <Button variant="outline" size="sm">
                      Details
                    </Button>
                    <Button size="sm">Purchase</Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </PageTransition>
    </main>
  )
}
