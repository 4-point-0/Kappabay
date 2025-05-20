"use client";
import { motion } from "framer-motion";
import { ListingCard } from "./ListingCard";

interface ListingsGridProps {
  agents: any[];
  onDetails: (a: any) => void;
  onPurchase: (a: any) => void;
}

export function ListingsGrid({ agents, onDetails, onPurchase }: ListingsGridProps) {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {agents.map((agent, i) => (
        <motion.div
          key={agent.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.1 }}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
        >
          <ListingCard agent={agent} onDetails={onDetails} onPurchase={onPurchase} />
        </motion.div>
      ))}
    </motion.div>
  );
}
