import { useSignTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useCallback } from "react";

export const useSignExecuteAndWaitForTransaction = () => {
  const suiClient = useSuiClient();

  const { mutateAsync: signTransaction } = useSignTransaction();

  const signExecuteAndWaitForTransaction = useCallback(
    async (transaction: Transaction) => {
      try {
        // Sign
        const signedTransaction = await signTransaction({
          transaction,
          chain: "sui:testnet",
        });

        // Execute
        const res1 = await suiClient.executeTransactionBlock({
          transactionBlock: signedTransaction.bytes,
          signature: signedTransaction.signature,
        });

        // Wait
        const res2 = await suiClient.waitForTransaction({
          digest: res1.digest,
          options: {
            showEffects: true,
            showBalanceChanges: true,
            showEvents: true,
            showObjectChanges: true,
          },
        });

        if (
          res2.effects?.status !== undefined &&
          res2.effects.status.status === "failure"
        )
          throw new Error(res2.effects.status.error ?? "Transaction failed");

        return res2;
      } catch (err) {
        throw err;
      }
    },
    [signTransaction]
  );

  return signExecuteAndWaitForTransaction;
};
