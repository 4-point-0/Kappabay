"use client";

import type React from "react";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Trash2, Download, Upload, Wand2 } from "lucide-react";
import PluginSelector from "@/components/plugin-selector";
import { defaultAgentConfig } from "@/lib/default-config";
import type { AgentConfig } from "@/lib/types";
//import { useWallet } from "@suiet/wallet-kit";
import { Deploy } from "@/lib/actions/deploy";
import { Transaction } from "@mysten/sui/transactions";
import { serializeAgentConfig } from "@/lib/utils";
import { bcs } from "@mysten/sui/bcs";
import { toast } from "@/hooks/use-toast";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
  useCurrentAccount,
  useCurrentWallet,
  useDisconnectWallet,
  useSuiClient,
  useSignAndExecuteTransaction,
  useSignTransaction,
} from "@mysten/dapp-kit";
import { useSignExecuteAndWaitForTransaction } from "@/hooks/use-sign";

export default function AgentDeployer() {
  const client = useSuiClient();
  const wallet = useCurrentWallet();
  const account = useCurrentAccount();
  const signAndExec = useSignExecuteAndWaitForTransaction();

  const { mutate: disconnect } = useDisconnectWallet();

  const [agentConfig, setAgentConfig] =
    useState<AgentConfig>(defaultAgentConfig);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: string, value: any) => {
    setAgentConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setAgentConfig((prev) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }));
  };

  const handleArrayChange = (field: string, index: number, value: string) => {
    setAgentConfig((prev) => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return {
        ...prev,
        [field]: newArray,
      };
    });
  };

  const handleArrayAdd = (field: string) => {
    setAgentConfig((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const handleArrayRemove = (field: string, index: number) => {
    setAgentConfig((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const exportConfig = () => {
    const dataStr = JSON.stringify(agentConfig, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = `${agentConfig.name
      .toLowerCase()
      .replace(/\s+/g, "-")}-config.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const importConfig = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string);
        setAgentConfig(config);
      } catch (error) {
        console.error("Error parsing JSON:", error);
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const handleDeploy = async () => {
    const tx = new Transaction();

    const [coin] = tx.splitCoins(tx.gas, [1 * 10000000]);

    tx.moveCall({
      target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::create_agent`,
      arguments: [
        tx.pure(
          bcs
            .vector(bcs.u8())
            .serialize(
              Array.from(Buffer.from(serializeAgentConfig(agentConfig)))
            )
        ),
        coin,
        tx.pure.string(
          agentConfig.image || "https://example.com/placeholder.png"
        ),
      ],
    });

    try {
      const txResult = await signAndExec(tx);

      console.log("Transaction result:", txResult);
      console.log(
        "Transaction result structure:",
        JSON.stringify(txResult, null, 2)
      );

      // Extract object IDs from transaction result
      let agentObjectId = "";
      let agentCapId = "";
      let adminCapId = "";

      // The structure of txResult can vary between SDK versions
      // Let's inspect the structure more carefully
      const txResultStr = JSON.stringify(txResult);
      console.log("Full transaction result:", txResultStr);
      console.log(
        "Conditional:",
        txResult.objectChanges && Array.isArray(txResult.objectChanges)
      );

      if (txResult.objectChanges && Array.isArray(txResult.objectChanges)) {
        for (const change of txResult.objectChanges) {
          if (change.type === "created") {
            if (change.objectType.includes("::agent::AgentCap")) {
              agentCapId = change.objectId;
            } else if (change.objectType.includes("::agent::AdminCap")) {
              adminCapId = change.objectId;
            } else if (change.objectType.includes("::agent::Agent")) {
              agentObjectId = change.objectId;
            }
          }
        }
      }
      console.log("AgentObjectId: ", agentObjectId);
      console.log("AgentCapId: ", agentCapId);
      console.log("AdminCapId: ", adminCapId);
      // If we still couldn't find the objects, try another approach
      if (!agentObjectId || !agentCapId || !adminCapId) {
        // Attempt to get the digest and then use the Sui explorer API or blockchain API
        const txDigest = txResult.digest;
        console.error(
          "Could not extract objects directly. Transaction digest:",
          txDigest
        );
        toast({
          title: "Deployment Warning",
          description:
            "Could not automatically extract object IDs. Please check the console and input them manually.",
          variant: "destructive",
        });
        return;
      }

      // Call Deploy server action
      const deployResult = await Deploy({
        agentConfig,
        onChainData: {
          agentObjectId,
          agentCapId,
          adminCapId,
          ownerWallet: account?.address || "",
          txDigest: txResult.digest,
        },
      });

      if (deployResult.success) {
        // Create a second transaction to transfer the caps to the agent wallet
        const transferTx = new Transaction();
        if (deployResult.agentWallet) {
          // Transfer AdminCap
          transferTx.transferObjects(
            [transferTx.object(adminCapId)],
            transferTx.pure.address(deployResult.agentWallet)
          );
        } else {
          toast({
            title: "No Agent Wallet Found",
            description: deployResult.error || "Unknown error occurred",
            variant: "destructive",
          });
        }

        // Execute the transfer
        await signAndExec(transferTx);

        toast({
          title: "Agent deployed successfully",
          description: `Agent ID: ${deployResult.agentId}, available at: ${deployResult.agentUrl}`,
        });
      } else {
        toast({
          title: "Backend Deployment Error",
          description: deployResult.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      toast({
        title: `${error}`,
        description: "Failed to deploy",
        variant: "destructive",
      });
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Agent Configuration</h2>
          <p className="text-sm text-gray-500">
            Configure your agent parameters
          </p>
        </div>
        <div className="flex space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="opacity-50 cursor-not-allowed"
                  disabled
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  AI Assist
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Coming soon: AI assisted parameter generation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button variant="outline" onClick={importConfig}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" onClick={exportConfig}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="personality">Personality</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
          <TabsTrigger value="plugins">Plugins</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    value={agentConfig.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Enter agent name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modelProvider">Model Provider</Label>
                  <Select
                    value={agentConfig.modelProvider}
                    onValueChange={(value) =>
                      handleChange("modelProvider", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deepseek">deepseek</SelectItem>
                      <SelectItem value="openai">Anthropic</SelectItem>
                      <SelectItem value="mistral">Mistral AI</SelectItem>
                      <SelectItem value="llama">Llama</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="system">System Prompt</Label>
                <Textarea
                  id="system"
                  value={agentConfig.system}
                  onChange={(e) => handleChange("system", e.target.value)}
                  placeholder="Enter system prompt"
                  className="min-h-[150px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Voice Settings</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    value={agentConfig.settings.voice.model}
                    onValueChange={(value) =>
                      handleNestedChange("settings", "voice", { model: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select voice model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_US-male-medium">
                        US Male (Medium)
                      </SelectItem>
                      <SelectItem value="en_US-female-medium">
                        US Female (Medium)
                      </SelectItem>
                      <SelectItem value="en_UK-male-medium">
                        UK Male (Medium)
                      </SelectItem>
                      <SelectItem value="en_UK-female-medium">
                        UK Female (Medium)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personality" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Bio Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Bio</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArrayAdd("bio")}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                {agentConfig.bio.map((item, index) => (
                  <div
                    key={`bio-${index}`}
                    className="flex items-center space-x-2"
                  >
                    <Input
                      value={item}
                      onChange={(e) =>
                        handleArrayChange("bio", index, e.target.value)
                      }
                      placeholder="Enter bio line"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleArrayRemove("bio", index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Lore Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Lore</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArrayAdd("lore")}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                {agentConfig.lore.map((item, index) => (
                  <div
                    key={`lore-${index}`}
                    className="flex items-center space-x-2"
                  >
                    <Input
                      value={item}
                      onChange={(e) =>
                        handleArrayChange("lore", index, e.target.value)
                      }
                      placeholder="Enter lore line"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleArrayRemove("lore", index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Knowledge Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Knowledge</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArrayAdd("knowledge")}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                {agentConfig.knowledge.map((item, index) => (
                  <div
                    key={`knowledge-${index}`}
                    className="flex items-center space-x-2"
                  >
                    <Input
                      value={item}
                      onChange={(e) =>
                        handleArrayChange("knowledge", index, e.target.value)
                      }
                      placeholder="Enter knowledge line"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleArrayRemove("knowledge", index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Topics Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Topics</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArrayAdd("topics")}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {agentConfig.topics.map((topic, index) => (
                    <Badge
                      key={`topic-${index}`}
                      className="flex items-center gap-1 px-3 py-1"
                    >
                      {topic}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => handleArrayRemove("topics", index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  <Input
                    className="w-40 h-8"
                    placeholder="Add topic"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value) {
                        handleArrayAdd("topics");
                        handleArrayChange(
                          "topics",
                          agentConfig.topics.length,
                          e.currentTarget.value
                        );
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
              </div>

              {/* Adjectives Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Adjectives</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArrayAdd("adjectives")}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {agentConfig.adjectives.map((adj, index) => (
                    <Badge
                      key={`adj-${index}`}
                      className="flex items-center gap-1 px-3 py-1"
                    >
                      {adj}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => handleArrayRemove("adjectives", index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  <Input
                    className="w-40 h-8"
                    placeholder="Add adjective"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value) {
                        handleArrayAdd("adjectives");
                        handleArrayChange(
                          "adjectives",
                          agentConfig.adjectives.length,
                          e.currentTarget.value
                        );
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Message Examples Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Message Examples</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAgentConfig((prev) => ({
                        ...prev,
                        messageExamples: [
                          ...prev.messageExamples,
                          [
                            {
                              user: "{{user1}}",
                              content: { text: "" },
                            },
                            {
                              user: agentConfig.name
                                .toLowerCase()
                                .replace(/\s+/g, "-"),
                              content: { text: "" },
                            },
                          ],
                        ],
                      }));
                    }}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> Add Example
                  </Button>
                </div>

                {agentConfig.messageExamples.map((example, exampleIndex) => (
                  <div
                    key={`example-${exampleIndex}`}
                    className="border rounded-md p-4 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">
                        Example {exampleIndex + 1}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAgentConfig((prev) => ({
                            ...prev,
                            messageExamples: prev.messageExamples.filter(
                              (_, i) => i !== exampleIndex
                            ),
                          }));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {example.map((message, messageIndex) => (
                      <div
                        key={`message-${exampleIndex}-${messageIndex}`}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              message.user === "{{user1}}"
                                ? "outline"
                                : "default"
                            }
                          >
                            {message.user === "{{user1}}" ? "User" : "Agent"}
                          </Badge>
                        </div>
                        <Textarea
                          value={message.content.text}
                          onChange={(e) => {
                            const newExamples = [
                              ...agentConfig.messageExamples,
                            ];
                            newExamples[exampleIndex][
                              messageIndex
                            ].content.text = e.target.value;
                            setAgentConfig((prev) => ({
                              ...prev,
                              messageExamples: newExamples,
                            }));
                          }}
                          placeholder={
                            message.user === "{{user1}}"
                              ? "Enter user message"
                              : "Enter agent response"
                          }
                          className="min-h-[80px]"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Post Examples Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Post Examples</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArrayAdd("postExamples")}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                {agentConfig.postExamples.map((item, index) => (
                  <div
                    key={`post-${index}`}
                    className="flex items-center space-x-2"
                  >
                    <Textarea
                      value={item}
                      onChange={(e) =>
                        handleArrayChange("postExamples", index, e.target.value)
                      }
                      placeholder="Enter post example"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleArrayRemove("postExamples", index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plugins" className="space-y-4 mt-4">
          <Card className="relative">
            <div className="absolute inset-0 bg-gray-200 bg-opacity-50 flex items-center justify-center z-10 rounded-md">
              <Badge className="text-lg py-2 px-4">Coming Soon</Badge>
            </div>
            <CardContent className="pt-6">
              <PluginSelector />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Style Configuration</Label>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">All Contexts</h4>
                    {agentConfig.style.all.map((item, index) => (
                      <div
                        key={`style-all-${index}`}
                        className="flex items-center space-x-2 mb-2"
                      >
                        <Input
                          value={item}
                          onChange={(e) => {
                            const newStyle = { ...agentConfig.style };
                            newStyle.all[index] = e.target.value;
                            handleChange("style", newStyle);
                          }}
                          placeholder="Enter style guideline"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newStyle = { ...agentConfig.style };
                            newStyle.all = newStyle.all.filter(
                              (_, i) => i !== index
                            );
                            handleChange("style", newStyle);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newStyle = { ...agentConfig.style };
                        newStyle.all = [...newStyle.all, ""];
                        handleChange("style", newStyle);
                      }}
                    >
                      <PlusCircle className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Chat Style</h4>
                    {agentConfig.style.chat.map((item, index) => (
                      <div
                        key={`style-chat-${index}`}
                        className="flex items-center space-x-2 mb-2"
                      >
                        <Input
                          value={item}
                          onChange={(e) => {
                            const newStyle = { ...agentConfig.style };
                            newStyle.chat[index] = e.target.value;
                            handleChange("style", newStyle);
                          }}
                          placeholder="Enter chat style guideline"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newStyle = { ...agentConfig.style };
                            newStyle.chat = newStyle.chat.filter(
                              (_, i) => i !== index
                            );
                            handleChange("style", newStyle);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newStyle = { ...agentConfig.style };
                        newStyle.chat = [...newStyle.chat, ""];
                        handleChange("style", newStyle);
                      }}
                    >
                      <PlusCircle className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Post Style</h4>
                    {agentConfig.style.post.map((item, index) => (
                      <div
                        key={`style-post-${index}`}
                        className="flex items-center space-x-2 mb-2"
                      >
                        <Input
                          value={item}
                          onChange={(e) => {
                            const newStyle = { ...agentConfig.style };
                            newStyle.post[index] = e.target.value;
                            handleChange("style", newStyle);
                          }}
                          placeholder="Enter post style guideline"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newStyle = { ...agentConfig.style };
                            newStyle.post = newStyle.post.filter(
                              (_, i) => i !== index
                            );
                            handleChange("style", newStyle);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newStyle = { ...agentConfig.style };
                        newStyle.post = [...newStyle.post, ""];
                        handleChange("style", newStyle);
                      }}
                    >
                      <PlusCircle className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end mt-8">
        <Button size="lg" onClick={handleDeploy}>
          Deploy Agent
        </Button>
      </div>
    </div>
  );
}
