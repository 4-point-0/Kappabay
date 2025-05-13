import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AgentConfig } from "./types";
import crypto from "crypto";
import path from "path";

export const ngrokAbsolutePath = path.join(
	process.cwd(),
	"node_modules",
	".pnpm",
	"ngrok@5.0.0-beta.2",
	"node_modules",
	"ngrok",
	"bin"
);

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function serializeAgentConfig(config: AgentConfig): string {
	return JSON.stringify(config, null, 2);
}

export function deserializeAgentConfig(jsonString: string): AgentConfig {
	return JSON.parse(jsonString) as AgentConfig;
}

// -----------------
// Encryption Helpers
// -----------------

export function encrypt(text: string): string {
	const algorithm = "aes-256-cbc";

	const keyHex = process.env.ENCRYPTION_KEY;
	if (!keyHex) {
		throw new Error("ENCRYPTION_KEY environment variable not set.");
	}
	const key = Buffer.from(keyHex, "hex"); // Must be 32 bytes (64 hex characters)
	const iv = crypto.randomBytes(16); // Initialization vector (16 bytes)
	const cipher = crypto.createCipheriv(algorithm, key, iv);
	const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
	// Combine the IV with the encrypted text (separated by a colon)
	return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text: string): string {
	const algorithm = "aes-256-cbc";
	const keyHex = process.env.ENCRYPTION_KEY;
	if (!keyHex) {
		throw new Error("ENCRYPTION_KEY environment variable not set.");
	}
	const key = Buffer.from(keyHex, "hex");
	const [ivHex, encryptedHex] = text.split(":");
	const iv = Buffer.from(ivHex, "hex");
	const encryptedText = Buffer.from(encryptedHex, "hex");
	const decipher = crypto.createDecipheriv(algorithm, key, iv);
	const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
	return decrypted.toString("utf8");
}

// -----------------
// Companion Deploy/Update Hook
// -----------------
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { useSignExecuteAndWaitForTransaction } from "@/hooks/use-sign"
import { toast } from "@/hooks/use-toast"
import { generateCharacter } from "@/lib/actions/generate-character"
import { deployAgent } from "@/lib/deploy-agent"
import { updateAgentConfig } from "@/lib/actions/update-agent-config"

/**
 * Hook that yields handleDeploy and busy–flag for
 * both Create and Configure flows.
 */
export function useCompanionDeploy(
  initialConfig: any,
  isConfiguring = false,
  agentId?: string
) {
  const [isBusy, setIsBusy] = useState(false)
  const router = useRouter()
  const account = useCurrentAccount()
  const signAndExec = useSignExecuteAndWaitForTransaction()

  const handleDeploy = useCallback(async () => {
    setIsBusy(true)
    try {
      if (isConfiguring) {
        // update‐config flow
        await updateAgentConfig(agentId!, initialConfig, account.address!)
        toast({ title: "Configuration updated" })
        router.push("/kappabae/status")
      } else {
        // create‐agent flow
        const formData = new FormData()
        formData.append("description", JSON.stringify(initialConfig))
        const { config: aiConfig, error } = await generateCharacter(formData)

        if (error) {
          throw new Error(
            Array.isArray(error.description)
              ? error.description.join(", ")
              : error.description ?? "AI generation failed"
          )
        }

        const result = await deployAgent(
          aiConfig || initialConfig,
          signAndExec,
          account.address || "",
          "kappabay-create"
        )

        if (result.success && result.agentId) {
          toast({
            title: "Agent deployed",
            description: `Agent ID: ${result.agentId}`,
          })
          router.push("/kappabae/status")
        } else {
          throw new Error(result.error ?? "Deployment failed")
        }
      }
    } catch (err: any) {
      toast({
        title: isConfiguring ? "Update Error" : "Deployment Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsBusy(false)
    }
  }, [
    initialConfig,
    isConfiguring,
    agentId,
    account.address,
    signAndExec,
    router,
  ])

  return { handleDeploy, isBusy }
}
