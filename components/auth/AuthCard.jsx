"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function AuthCard({ children, className, wide = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "relative w-full",
        wide ? "max-w-[520px]" : "max-w-[440px]",
        // Mobile: full viewport
        "sm:rounded-[20px] sm:border sm:shadow-auth",
        // Desktop styling
        "bg-card/80 backdrop-blur-[20px]",
        "border-jade-300/[0.18]",
        // Padding
        wide ? "p-6 sm:p-9" : "p-6 sm:p-10",
        className
      )}
      style={{
        boxShadow: "0 30px 80px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(92,168,124,0.06)",
      }}
    >
      {children}
    </motion.div>
  );
}
