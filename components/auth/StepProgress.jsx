"use client";

import React from "react";
import { motion } from "framer-motion";

export default function StepProgress({ currentStep, totalSteps }) {
  return (
    <div className="flex flex-col items-center mt-5">
      <div className="flex gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className="relative w-10 h-1 rounded-full overflow-hidden"
            style={{ background: "var(--bg-high)" }}
          >
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: i < currentStep ? 1 : 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{
                background: "#5CA87C",
                transformOrigin: "left",
                boxShadow: i < currentStep ? "inset 0 0 4px rgba(143, 212, 164, 0.5)" : "none",
              }}
            />
          </div>
        ))}
      </div>
      <span className="mt-2 text-[11px] font-semibold text-text-faint">
        Step {currentStep} of {totalSteps}
      </span>
    </div>
  );
}
