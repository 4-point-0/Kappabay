"use client";

import { TableCell, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Terminal, Loader2, Pause, Play, RefreshCw, Settings, Send, Wallet } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface AgentRowProps {
  agent: any;
  index: number;
  loadingAgent: string | null;
  terminalEnabledAgents: string[];
  onServiceToggle: (agentId: string, currentStatus: string) => Promise<void>;
  onOpenManageGas: (agent: any) => void;
  onOpenTransferCap: (agent: any) => void;
}

const formatObjectId = (objectId: string) => {
  return `${objectId.slice(0, 6)}...${objectId.slice(-4)}`;
};

export default function AgentRow({
  agent,
  index,
  loadingAgent,
  terminalEnabledAgents,
  onServiceToggle,
  onOpenManageGas,
  onOpenTransferCap,
}: AgentRowProps) {
  return (
    <motion.tr
      key={agent.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="border-b border-border"
    >
      <TableCell className="font-medium">{agent.name}</TableCell>
      <TableCell className="font-mono text-xs">{formatObjectId(agent.objectId)}</TableCell>
      <TableCell>
        <Badge variant={agent.status === "ACTIVE" ? "default" : "outline"}>
          {agent.status === "ACTIVE" ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center">
          <span className="mr-2">{agent.gasBag} SUI</span>
          {/* Trigger ManageGasDialog from parent */}
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => onOpenManageGas(agent)}
          >
            <Wallet className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
      <TableCell>{new Date(agent.createdAt).toLocaleString()}</TableCell>
      <TableCell>{agent.lastActive}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end space-x-2">
          <motion.div
            whileHover={{
              scale:
                agent.status === "ACTIVE" && terminalEnabledAgents.includes(agent.id) ? 1.1 : 1,
            }}
            whileTap={{
              scale:
                agent.status === "ACTIVE" && terminalEnabledAgents.includes(agent.id) ? 0.9 : 1,
            }}
          >
            {agent.status === "ACTIVE" ? (
              terminalEnabledAgents.includes(agent.id) ? (
                <Link href={`/terminal/${agent.id}`}>
                  <Button variant="outline" size="icon" title="Open Terminal">
                    <Terminal className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="icon" title="Enabling Terminal..." disabled>
                  <Loader2 className="h-4 w-4 animate-spin" />
                </Button>
              )
            ) : (
              <Button variant="outline" size="icon" title="Terminal unavailable" disabled>
                <Terminal className="h-4 w-4 opacity-50" />
              </Button>
            )}
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              variant="outline"
              size="icon"
              title="Transfer Agent Cap"
              onClick={() => onOpenTransferCap(agent)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </motion.div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onServiceToggle(agent.id, agent.status)}
          >
            {loadingAgent === agent.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : agent.status === "ACTIVE" ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Link href={`/configure/${agent.id}`}>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </TableCell>
    </motion.tr>
  );
}
