"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Droplets, Wind, Pill, HeartPulse, Heart, Leaf, Zap, Shirt, Footprints, Sparkles, UtensilsCrossed, Home, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const niches = [
  { id: "skincare", name: "Skincare", subtitle: "Serums, creams, cleansers", icon: Droplets },
  { id: "haircare", name: "Haircare", subtitle: "Shampoos, oils, treatments", icon: Wind },
  { id: "pharma", name: "Pharmaceuticals", subtitle: "Drugs, prescriptions, OTC", icon: Pill },
  { id: "health", name: "Medicines & Health", subtitle: "Medical supplies, wellness", icon: HeartPulse },
  { id: "sexual", name: "Sexual Health", subtitle: "Adult wellness (discreet)", icon: Heart },
  { id: "herbal", name: "Herbal & Ayurvedic", subtitle: "Natural, traditional remedies", icon: Leaf },
  { id: "supplements", name: "Supplements", subtitle: "Vitamins, protein, nutrition", icon: Zap },
  { id: "fashion", name: "Fashion & Apparel", subtitle: "Clothing, accessories", icon: Shirt },
  { id: "footwear", name: "Footwear", subtitle: "Shoes, sneakers, sandals", icon: Footprints },
  { id: "beauty", name: "Beauty & Cosmetics", subtitle: "Makeup, fragrances, tools", icon: Sparkles },
  { id: "food", name: "Food & Snacks", subtitle: "Edibles, packaged food", icon: UtensilsCrossed },
  { id: "home", name: "Home & Lifestyle", subtitle: "Decor, kitchen, gadgets", icon: Home },
  { id: "other", name: "Other", subtitle: "Doesn't fit above? Tell us more", icon: Plus },
];

export default function NicheSelect({ value, onChange, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = niches.find((n) => n.id === value);
  const SelectedIcon = selected?.icon;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-12 flex items-center gap-3 px-4",
          "bg-bg-elev border rounded-[11px]",
          "text-left transition-all duration-200",
          error
            ? "border-red-400"
            : isOpen
            ? "border-jade-300 shadow-[0_0_0_3px_rgba(92,168,124,0.12)]"
            : "border-border hover:border-border-mid"
        )}
      >
        {SelectedIcon ? (
          <SelectedIcon className="w-5 h-5 text-jade-300 shrink-0" />
        ) : (
          <div className="w-5 h-5" />
        )}
        <span className={cn("flex-1 text-sm font-medium", selected ? "text-text" : "text-text-faint")}>
          {selected?.name || "Select your category"}
        </span>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-text-faint transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-card border border-border-mid rounded-xl max-h-80 overflow-y-auto shadow-lg"
          >
            {niches.map((niche) => {
              const Icon = niche.icon;
              const isSelected = value === niche.id;
              return (
                <button
                  key={niche.id}
                  type="button"
                  onClick={() => {
                    onChange(niche.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3",
                    "text-left transition-colors duration-150",
                    "hover:bg-bg-elev",
                    isSelected && "bg-jade-300/10"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 shrink-0",
                      isSelected ? "text-jade-300" : "text-text-muted"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold", isSelected ? "text-jade-300" : "text-text")}>
                      {niche.name}
                    </p>
                    <p className="text-xs text-text-faint truncate">{niche.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1.5 text-xs font-medium text-red-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
