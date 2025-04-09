"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface Plugin {
  id: string
  name: string
  description: string
  category: string
}

export default function PluginSelector() {
  const plugins: Plugin[] = [
    {
      id: "hotpotato",
      name: "HotPotato Plugin",
      description: "Enables real-time data streaming for financial markets",
      category: "Finance",
    },
    {
      id: "defiwizard",
      name: "DefiWizard",
      description: "Access to DeFi protocols and yield optimization strategies",
      category: "Finance",
    },
    {
      id: "sui",
      name: "SUI Plugin",
      description: "Interact with the SUI blockchain and smart contracts",
      category: "Blockchain",
    },
    {
      id: "walrus",
      name: "Walrus Plugin",
      description: "Wallet integration and transaction management",
      category: "Blockchain",
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Available Plugins</h3>
        <p className="text-sm text-gray-500 mb-4">Select plugins to enhance your agent's capabilities</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plugins.map((plugin) => (
          <Card key={plugin.id} className="border-2 border-dashed">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-md">{plugin.name}</CardTitle>
                  <CardDescription>{plugin.description}</CardDescription>
                </div>
                <Badge variant="outline">{plugin.category}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Checkbox id={`plugin-${plugin.id}`} disabled />
                <Label htmlFor={`plugin-${plugin.id}`} className="text-gray-400">
                  Enable plugin
                </Label>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
