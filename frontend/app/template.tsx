"use client";
import { motion } from "motion/react";

// No filter here: a filter on an ancestor would re-anchor position:fixed children.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.55 }}
    >
      {children}
    </motion.div>
  );
}
