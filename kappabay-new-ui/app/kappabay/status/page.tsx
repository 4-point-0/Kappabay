"use client"

import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Play, Pause, RefreshCw, Settings, Terminal, Wallet } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageTransition } from "@/components/page-transition"
import { motion } from "framer-motion"

// Mock data for owned waifus
const initialWaifus = [
  {
    id: "0x1a2b3c4d5e6f7g8h9i0j",
    name: "Sakura",
    status: "active",
    created: "2023-04-15",
    lastActive: "2023-04-24",
    pocketMoney: "0.25",
  },
  {
    id: "0x9i8h7g6f5e4d3c2b1a0",
    name: "Aria",
    status: "inactive",
    created: "2023-03-10",
    lastActive: "2023-04-20",
    pocketMoney: "0.10",
  },
  {
    id: "0x2b3c4d5e6f7g8h9i0j1a",
    name: "Miko",
    status: "active",
    created: "2023-04-01",
    lastActive: "2023-04-24",
    pocketMoney: "0.50",
  },
]

export default function WaifuStatusPage() {
  const [waifus, setWaifus] = useState(initialWaifus)
  const [totalPocketMoney, setTotalPocketMoney] = useState("1.25")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [depositAmount, setDepositAmount] = useState("")
  const [selectedWaifuId, setSelectedWaifuId] = useState("")

  const toggleStatus = (id: string) => {
    setWaifus(
      waifus.map((waifu) =>
        waifu.id === id ? { ...waifu, status: waifu.status === "active" ? "inactive" : "active" } : waifu,
      ),
    )
  }

  const handleDeposit = () => {
    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) return

    // Update the selected waifu's pocket money
    setWaifus(
      waifus.map((waifu) =>
        waifu.id === selectedWaifuId
          ? { ...waifu, pocketMoney: (Number(waifu.pocketMoney) + Number(depositAmount)).toFixed(2) }
          : waifu,
      ),
    )

    // Update total pocket money
    setTotalPocketMoney((Number(totalPocketMoney) - Number(depositAmount)).toFixed(2))
    setDepositAmount("")
  }

  const handleWithdraw = () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) return

    // Find the selected waifu
    const waifu = waifus.find((a) => a.id === selectedWaifuId)
    if (!waifu || Number(withdrawAmount) > Number(waifu.pocketMoney)) return

    // Update the selected waifu's pocket money
    setWaifus(
      waifus.map((waifu) =>
        waifu.id === selectedWaifuId
          ? { ...waifu, pocketMoney: (Number(waifu.pocketMoney) - Number(withdrawAmount)).toFixed(2) }
          : waifu,
      ),
    )

    // Update total pocket money
    setTotalPocketMoney((Number(totalPocketMoney) + Number(withdrawAmount)).toFixed(2))
    setWithdrawAmount("")
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">My Waifus</h1>
              <p className="text-muted-foreground mt-2">Manage your digital companions</p>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/kappabay/create">
                <Button>Create New Companion</Button>
              </Link>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Card>
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Object ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pocket Money</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waifus.map((waifu, index) => (
                      <motion.tr
                        key={waifu.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="border-b border-border"
                      >
                        <TableCell className="font-medium">{waifu.name}</TableCell>
                        <TableCell className="font-mono text-xs">{waifu.id}</TableCell>
                        <TableCell>
                          <Badge variant={waifu.status === "active" ? "default" : "outline"}>
                            {waifu.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="mr-2">{waifu.pocketMoney} SUI</span>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setSelectedWaifuId(waifu.id)}
                                >
                                  <Wallet className="h-3 w-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Manage Pocket Money</DialogTitle>
                                  <DialogDescription>
                                    Add or withdraw SUI from your companion's pocket money.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="deposit">Deposit SUI</Label>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        id="deposit"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="Amount"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                      />
                                      <Button onClick={handleDeposit}>Deposit</Button>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="withdraw">Withdraw SUI</Label>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        id="withdraw"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max={waifu.pocketMoney}
                                        placeholder="Amount"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                      />
                                      <Button onClick={handleWithdraw}>Withdraw</Button>
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" type="button">
                                    Close
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                        <TableCell>{waifu.created}</TableCell>
                        <TableCell>{waifu.lastActive}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Link href={`/kappabay/chat/${waifu.id}`}>
                                <Button variant="outline" size="icon" title="Chat">
                                  <Terminal className="h-4 w-4" />
                                </Button>
                              </Link>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Button variant="outline" size="icon" onClick={() => toggleStatus(waifu.id)}>
                                {waifu.status === "active" ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Button variant="outline" size="icon">
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Link href={`/kappabay/configure/${waifu.id}`}>
                                <Button variant="outline" size="icon">
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </Link>
                            </motion.div>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </PageTransition>
    </main>
  )
}
