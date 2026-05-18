"use client";

import React from "react";
import { motion } from "framer-motion";

export default function AuthHeader({ title, subtitle }) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Logo block */}
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        className="flex flex-col items-center"
      >
        {/* Logo tile */}
        <div
          className="w-12 h-12 rounded-[13px] flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #5CA87C 0%, #3D7A5A 100%)",
            boxShadow: "0 8px 24px rgba(92, 168, 124, 0.4)",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
            <path
              d="M22 32L58 24"
              stroke="white"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M58 28Q55 30 50 40Q42 54 34 66Q30 72 26 76"
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M26 76L66 70"
              stroke="white"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <circle cx="64" cy="14" r="4.5" fill="white" />
          </svg>
        </div>

        {/* Wordmark */}
        <span
          className="mt-3.5 font-nunito text-[26px] font-extrabold tracking-tight"
          style={{ color: "#B7E5BA" }}
        >
          zyro
        </span>
      </motion.div>

      {/* Heading */}
      <h1 className="mt-7 text-[28px] font-extrabold text-text tracking-[-0.4px]">
        {title}
      </h1>

      {/* Subtitle */}
      <p className="mt-1.5 text-sm font-medium text-text-sub">{subtitle}</p>
    </div>
  );
}
