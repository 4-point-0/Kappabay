"use client"

import Header from "@/components/header"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { PageTransition } from "@/components/page-transition"
import { motion } from "framer-motion"
import { Heart, MessageCircle, Download } from "lucide-react"

// Mock data for gallery companions
const galleryCompanions = [
  {
    id: "template-1",
    name: "Sakura",
    description: "A sweet and caring companion with a passion for nature and art",
    creator: "KappaBae Team",
    category: "Deredere",
    image: "/placeholder.svg?height=200&width=200",
    likes: 245,
    comments: 32,
  },
  {
    id: "template-2",
    name: "Aria",
    description: "A mysterious and intelligent companion who loves books and stargazing",
    creator: "KappaBae Team",
    category: "Bookworm",
    image: "/placeholder.svg?height=200&width=200",
    likes: 189,
    comments: 27,
  },
  {
    id: "template-3",
    name: "Miko",
    description: "An energetic and playful companion who excels at games and puzzles",
    creator: "KappaBae Team",
    category: "Tomboy",
    image: "/placeholder.svg?height=200&width=200",
    likes: 312,
    comments: 45,
  },
  {
    id: "template-4",
    name: "Luna",
    description: "A calm and supportive companion with a talent for music and poetry",
    creator: "KappaBae Team",
    category: "Cool Senpai",
    image: "/placeholder.svg?height=200&width=200",
    likes: 278,
    comments: 38,
  },
]

export default function GalleryPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Companion Gallery</h1>
              <p className="text-muted-foreground mt-2">Browse and customize pre-made companions</p>
            </div>
            <Link href="/kappabay/create">
              <Button>Create Custom Companion</Button>
            </Link>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {galleryCompanions.map((companion, index) => (
              <motion.div
                key={companion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <Card className="overflow-hidden h-full flex flex-col">
                  <div className="h-48 bg-muted flex items-center justify-center">
                    <img
                      src={companion.image || "/placeholder.svg"}
                      alt={companion.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-4 flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{companion.name}</h3>
                      <Badge variant="outline">{companion.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{companion.description}</p>
                    <div className="text-sm text-muted-foreground">
                      <p>Creator: {companion.creator}</p>
                      <div className="flex items-center mt-2 space-x-4">
                        <div className="flex items-center">
                          <Heart className="h-4 w-4 mr-1" />
                          <span>{companion.likes}</span>
                        </div>
                        <div className="flex items-center">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          <span>{companion.comments}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex justify-between">
                    <Button variant="outline" size="sm">
                      Preview
                    </Button>
                    <Link href={`/kappabay/create?template=${companion.id}`}>
                      <Button size="sm" className="gap-2">
                        <Download className="h-4 w-4" /> Use Template
                      </Button>
                    </Link>
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
