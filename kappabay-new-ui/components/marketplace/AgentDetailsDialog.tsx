"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Star } from "lucide-react";

interface DetailsDialogProps {
  agent: any;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onPurchase: (a: any) => void;
}

export function AgentDetailsDialog({ agent, open, onOpenChange, onPurchase }: DetailsDialogProps) {
  if (!agent) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{agent.name}</DialogTitle>
          <DialogDescription>{agent.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
            <img src={agent.image || "/placeholder.svg"} alt={agent.name} className="w-20 h-20 object-cover rounded-md" />
            <div>
              <Badge variant="outline">{agent.category}</Badge>
              <p className="font-medium text-lg mt-1">{agent.price}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Creator:</span><span>{agent.creator}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Creation Date:</span><span>{agent.creationDate}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Listing Date:</span><span>{agent.listingDate}</span></div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground">Creator Reputation:</span>
              <span className="flex items-center">
                {agent.creatorReputation}<Star className="h-3 w-3 text-yellow-500 ml-1 fill-yellow-500"/>
              </span>
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={() => onPurchase(agent)}>Purchase</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
