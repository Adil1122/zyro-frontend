"use client";

import React from "react";
import { cn } from "@/lib/utils";

export default function ZyroLogo({ size = "md", showWordmark = true, className }) {
  const sizes = {
    sm: { tile: 32, text: 20 },
    md: { tile: 40, text: 24 },
    lg: { tile: 48, text: 28 },
  };

  const { tile, text } = sizes[size] || sizes.md;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Jade gradient tile with Z mark */}
      <div
        className="flex items-center justify-center rounded-[10px] shadow-glow"
        style={{ 
          width: tile, 
          height: tile,
          background: "linear-gradient(135deg, #5CA87C 0%, #3D8A5F 100%)",
          boxShadow: "0 4px 14px rgba(92, 168, 124, 0.35)"
        }}
      >
        <svg
          width={tile * 0.5}
          height={tile * 0.5}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 4H20L12 12L20 20H4L12 12L4 4Z"
            fill="white"
            fillOpacity="0.95"
          />
        </svg>
      </div>
      
      {/* Wordmark */}
      {showWordmark && (
        <span
          className="font-bold text-jade-100"
          style={{ fontSize: text, fontFamily: "var(--font-display), system-ui, sans-serif" }}
        >
          zyro
        </span>
      )}
    </div>
  );
}
