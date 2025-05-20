"use client";
import { Filter, Plus } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { Button } from "../ui/button";

interface FilterBarProps {
  categories: string[];
  selected: string;
  onSelect: (val: string) => void;
  onCreateClick: () => void;
}

export function FilterBar({ categories, selected, onSelect, onCreateClick }: FilterBarProps) {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold">Agent Marketplace</h1>
        <p className="text-muted-foreground mt-2">Discover and acquire AI agents for your needs</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selected} onValueChange={onSelect}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2" onClick={onCreateClick}>
          <Plus className="h-4 w-4" /> Create New Listing
        </Button>
      </div>
    </div>
  );
}
