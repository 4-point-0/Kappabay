"use client";
import { Card, CardContent, CardFooter } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Info, Star } from "lucide-react";
import Image from "next/image";

interface ListingCardProps {
  agent: any;
  onDetails: (a: any) => void;
  onPurchase: (a: any) => void;
}

export function ListingCard({ agent, onDetails, onPurchase }: ListingCardProps) {
  // unpack the listing info
  const { name, description, image_url, price, seller, category } = agent.fields;
  const displayPrice   = (Number(price) / 1e9).toFixed(3) + " SUI";
  const displayCategory = category || "All";

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <div className="h-48 bg-muted flex items-center justify-center relative">
        {image_url ? (
          <Image
            src={image_url}
            alt={name || "agent image"}
            fill
            className="object-cover"
            style={{ objectFit: "cover" }}
            sizes="100vw"
          />
        ) : (
          <img src="/placeholder.svg" alt={name} className="w-full h-full object-cover" />
        )}
      </div>
      <CardContent className="p-4 flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg">{name}</h3>
          <Badge variant="outline">{displayCategory}</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <div className="text-sm text-muted-foreground">
          <p>Creator: {seller}</p>
          <p className="font-medium text-foreground mt-2">{displayPrice}</p>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between">
        <Button variant="outline" size="sm" className="gap-1" onClick={() => onDetails(agent)}>
          <Info className="h-4 w-4" /> Details
        </Button>
        <Button size="sm" onClick={() => onPurchase(agent)}>Purchase</Button>
      </CardFooter>
    </Card>
  );
}
