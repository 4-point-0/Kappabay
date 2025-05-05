"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";

interface TransferAgentCapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transferAddress: string;
  setTransferAddress: (val: string) => void;
  selectedCap: string;
  setSelectedCap: (val: string) => void;
  caps: any[];
  onSend: () => void;
}

const formatObjectId = (objectId: string) => {
  return `${objectId.slice(0, 6)}...${objectId.slice(-4)}`;
};

export default function TransferAgentCapDialog({
  open,
  onOpenChange,
  transferAddress,
  setTransferAddress,
  selectedCap,
  setSelectedCap,
  caps,
  onSend,
}: TransferAgentCapDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Agent Cap</DialogTitle>
          <DialogDescription>
            Enter the recipient Sui address and choose an Agent Cap to transfer.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="transfer-address">Recipient Sui Address</Label>
            <Input
              id="transfer-address"
              type="text"
              placeholder="Enter Sui Address"
              value={transferAddress}
              onChange={(e) => setTransferAddress(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-cap">Select Agent Cap</Label>
            <select
              id="agent-cap"
              className="input"
              value={selectedCap}
              onChange={(e) => setSelectedCap(e.target.value)}
            >
              <option value="">Select a cap</option>
              {caps.map((cap: any) => (
                <option key={cap.data.objectId} value={cap.data.objectId}>
                  {formatObjectId(cap.data.objectId)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSend}>Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
