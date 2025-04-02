import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import type { ContentWithUser } from "@/components/chat";
import type { UUID } from "@elizaos/core";

interface SendMessageVariables {
  message: string;
  selectedFile?: File | null;
  walletAddress: string;
}

export function useSendMessageMutation(agentId: UUID) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<
    ContentWithUser[],
    Error,
    SendMessageVariables
  >({
    mutationKey: ["send_message", agentId],
    mutationFn: ({ message, selectedFile, walletAddress }) =>
      apiClient.sendMessage(agentId, message, walletAddress, selectedFile),
    onSuccess: (newMessages: ContentWithUser[]) => {
      queryClient.setQueryData(["messages", agentId], (old: ContentWithUser[] = []) => [
        ...old.filter((msg) => !msg.isLoading),
        ...newMessages.map((msg) => ({
          ...msg,
          createdAt: Date.now(),
        })),
      ]);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Unable to send message",
        description: error.message,
      });
    },
  });
}
