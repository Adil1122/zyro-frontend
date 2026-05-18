"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Globe, ShoppingCart, Package, MessageCircle, Store, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Custom SVG components for brand icons that are missing in the older lucide-react package version
const Instagram = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const Facebook = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export const channels = [
  { id: "shopify", name: "Shopify", icon: ShoppingBag },
  { id: "website", name: "Custom Website", icon: Globe },
  { id: "woocommerce", name: "WooCommerce", icon: ShoppingCart },
  { id: "daraz", name: "Daraz", icon: Package },
  { id: "instagram", name: "Instagram", icon: Instagram },
  { id: "facebook", name: "Facebook", icon: Facebook },
  { id: "whatsapp", name: "WhatsApp", icon: MessageCircle },
  { id: "physical", name: "Physical Store", icon: Store },
];

export default function ChannelChips({ selected, onChange, error }) {
  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter((c) => c !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {channels.map((channel) => {
          const Icon = channel.icon;
          const isSelected = selected.includes(channel.id);

          return (
            <motion.button
              key={channel.id}
              type="button"
              onClick={() => toggle(channel.id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative h-14 flex items-center gap-2.5 px-3",
                "bg-bg-elev border rounded-[11px]",
                "transition-all duration-200 cursor-pointer",
                isSelected
                  ? "border-jade-300 border-2 bg-jade-300/[0.08] shadow-[inset_0_0_12px_rgba(92,168,124,0.15)]"
                  : "border-border hover:border-border-mid hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-colors",
                  isSelected ? "text-jade-300" : "text-text-muted"
                )}
              />
              <span
                className={cn(
                  "text-[13px] font-semibold transition-colors",
                  isSelected ? "text-jade-300" : "text-text"
                )}
              >
                {channel.name}
              </span>

              {/* Selected checkmark */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-1.5 right-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-jade-300" strokeWidth={3} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Selected count */}
      <p className="mt-2.5 text-xs text-text-sub">
        {selected.length} channel{selected.length !== 1 ? "s" : ""} selected
      </p>

      {/* Error */}
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
