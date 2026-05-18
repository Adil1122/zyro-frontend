"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function GoogleButton({ onClick, disabled, className }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "w-full h-12 flex items-center justify-center gap-3",
        "bg-bg-elev border border-border rounded-[11px]",
        "text-sm font-semibold text-text",
        "transition-all duration-200",
        "hover:border-border-mid hover:bg-bg-high",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {/* Google 4-color G logo */}
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path
          d="M22 12.1c0-.7-.1-1.4-.2-2H12v3.8h5.6c-.2 1.3-1 2.4-2.1 3.1v2.6h3.4c2-1.8 3.1-4.5 3.1-7.5z"
          fill="#4285F4"
        />
        <path
          d="M12 22c2.8 0 5.2-.9 6.9-2.5l-3.4-2.6c-.9.6-2.1 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.7v2.7C4.5 19.9 8 22 12 22z"
          fill="#34A853"
        />
        <path
          d="M6.2 13.6c-.2-.6-.3-1.3-.3-2 0-.7.1-1.4.3-2V6.9H2.7C2 8.4 1.5 10.1 1.5 12s.5 3.6 1.2 5.1l3.5-2.7z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.8c1.5 0 2.9.5 4 1.5l3-3C17.2 2.6 14.8 1.5 12 1.5 8 1.5 4.5 3.6 2.7 6.9l3.5 2.7c.8-2.5 3.1-4.3 5.8-4.3z"
          fill="#EA4335"
        />
      </svg>
      Continue with Google
    </motion.button>
  );
}
