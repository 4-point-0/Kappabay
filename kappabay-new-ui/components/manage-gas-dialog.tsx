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
import { useState } from "react";

interface ManageGasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: any;
  depositAmount: string;
  setDepositAmount: (val: string) => void;
  withdrawAmount: string;
  setWithdrawAmount: (val: string) => void;
  onDeposit: () => void;
  onWithdraw: () => void;
}

export default function ManageGasDialog({
  open,
  onOpenChange,
  agent,
  depositAmount,
  setDepositAmount,
  withdrawAmount,
  setWithdrawAmount,
  onDeposit,
  onWithdraw,
}: ManageGasDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Gas Bag</DialogTitle>
          <DialogDescription>
            Add or withdraw SUI from this agent's gas bag.
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
              <Button onClick={onDeposit}>Deposit</Button>
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
                max={agent?.gasBag || ""}
                placeholder="Amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
              <Button onClick={onWithdraw}>Withdraw</Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
