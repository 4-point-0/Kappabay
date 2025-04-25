"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send } from "lucide-react"
import Link from "next/link"
import { PageTransition } from "@/components/page-transition"
import { motion, AnimatePresence } from "framer-motion"

interface Message {
  id: string
  role: "user" | "agent"
  content: string
  timestamp: Date
}

export default function TerminalPage() {
  const params = useParams()
  const id = params.id as string
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "agent",
      content: "Hello! I'm your AI agent. How can I assist you today?",
      timestamp: new Date(),
    },
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Mock agent data
  const agent = {
    id,
    name: "Agent " + id.slice(0, 6),
    status: "active",
    objectId: id,
  }

  const handleSendMessage = () => {
    if (!input.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")

    // Simulate agent response after a delay
    setTimeout(() => {
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: `I received your message: "${input}". This is a simulated response from the agent.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, agentMessage])
    }, 1000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <PageTransition>
        <div className="container mx-auto px-4 py-4 flex-1 flex flex-col">
          <div className="flex items-center mb-4">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Link href="/status">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
            <h1 className="text-2xl font-bold ml-2">Terminal: {agent.name}</h1>
            <Badge variant="outline" className="ml-4">
              {agent.status}
            </Badge>
          </div>

          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Chat with your agent</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              <AnimatePresence>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`flex max-w-[80%] ${
                          message.role === "user" ? "flex-row-reverse" : "flex-row"
                        } items-start gap-2`}
                      >
                        <Avatar className={message.role === "user" ? "ml-2" : "mr-2"}>
                          <AvatarFallback>{message.role === "user" ? "U" : "A"}</AvatarFallback>
                          {message.role === "agent" && (
                            <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Agent" />
                          )}
                        </Avatar>
                        <motion.div
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          className={`rounded-lg p-3 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <p>{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </AnimatePresence>
            </CardContent>
            <CardFooter className="p-4 pt-2">
              <div className="flex w-full items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                />
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button type="submit" size="icon" onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </CardFooter>
          </Card>
        </div>
      </PageTransition>
    </main>
  )
}
