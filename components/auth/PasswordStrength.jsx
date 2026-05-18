"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";

const criteria = [
  { label: "8+ characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One number", test: (p) => /[0-9]/.test(p) },
  { label: "One symbol (!@#$%...)", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export default function PasswordStrength({ password }) {
  const results = useMemo(() => criteria.map((c) => c.test(password)), [password]);
  const metCount = results.filter(Boolean).length;

  const getStrengthColor = () => {
    if (metCount === 0) return "bg-bg-high";
    if (metCount === 1) return "bg-red-400";
    if (metCount === 2) return "bg-yellow-400";
    if (metCount === 3) return "bg-jade-200";
    return "bg-jade-300";
  };

  const getStrengthLabel = () => {
    if (metCount === 0) return { text: "", color: "" };
    if (metCount === 1) return { text: "Too weak", color: "text-red-400" };
    if (metCount === 2) return { text: "Weak", color: "text-yellow-400" };
    if (metCount === 3) return { text: "Strong", color: "text-jade-200" };
    return { text: "Excellent", color: "text-jade-300" };
  };

  const strength = getStrengthLabel();

  return (
    <div className="mt-3">
      {/* Strength bar */}
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="relative flex-1 h-1 rounded-sm overflow-hidden bg-bg-high"
          >
            <motion.div
              className={`absolute inset-0 rounded-sm ${i < metCount ? getStrengthColor() : ""}`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: i < metCount ? 1 : 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{
                transformOrigin: "left",
                boxShadow: metCount === 4 && i < metCount ? "0 0 8px rgba(92, 168, 124, 0.5)" : "none",
              }}
            />
          </div>
        ))}
      </div>

      {/* Strength label */}
      {password.length > 0 && (
        <p className={`mt-2 text-xs font-bold ${strength.color}`}>
          Strength: {strength.text}
        </p>
      )}

      {/* Criteria checklist */}
      <div className="mt-2 space-y-1.5">
        {criteria.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              {results[i] ? (
                <motion.div
                  key="checked"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CheckCircle2 className="w-4 h-4 text-jade-300" />
                </motion.div>
              ) : (
                <motion.div
                  key="unchecked"
                  initial={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Circle className="w-4 h-4 text-text-faint" strokeDasharray="2 2" />
                </motion.div>
              )}
            </AnimatePresence>
            <span
              className={`text-xs font-medium transition-colors duration-200 ${
                results[i] ? "text-text-sub" : "text-text-faint"
              }`}
            >
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
