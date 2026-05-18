"use client";

import React, { useEffect, useRef, memo } from "react";
import { motion, useReducedMotion } from "framer-motion";

// Floating orbs configuration
const orbs = [
  { size: 380, x: "10%", y: "20%", duration: 28, delay: 0 },
  { size: 320, x: "75%", y: "15%", duration: 35, delay: 2 },
  { size: 280, x: "85%", y: "60%", duration: 32, delay: 1 },
  { size: 400, x: "20%", y: "70%", duration: 38, delay: 3 },
  { size: 260, x: "50%", y: "85%", duration: 30, delay: 4 },
  { size: 340, x: "5%", y: "50%", duration: 36, delay: 2 },
];

const FloatingOrb = memo(function FloatingOrb({
  size,
  x,
  y,
  duration,
  delay,
  reduced,
}) {
  if (reduced) return null;

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: `rgba(92, 168, 124, ${0.04 + Math.random() * 0.04})`,
        filter: "blur(80px)",
      }}
      animate={{
        x: [0, 30, -20, 40, 0],
        y: [0, -40, 20, -30, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
});

const Particles = memo(function Particles({ reduced }) {
  if (reduced) return null;

  return (
    <>
      {Array.from({ length: 35 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 2 + Math.random() * 2,
            height: 2 + Math.random() * 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: "rgba(143, 212, 164, 0.15)",
          }}
          animate={{
            opacity: [0, 0.8, 0],
            y: [0, -100],
          }}
          transition={{
            duration: 8 + Math.random() * 6,
            delay: Math.random() * 10,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </>
  );
});

export default function AmbientBackground() {
  const prefersReducedMotion = useReducedMotion();
  const reduced = !!prefersReducedMotion;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Layer 1: Static radial gradient at top */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(92, 168, 124, 0.18), transparent)",
        }}
      />

      {/* Layer 2: Floating orbs */}
      {orbs.map((orb, i) => (
        <FloatingOrb key={i} {...orb} reduced={reduced} />
      ))}

      {/* Layer 3: Grid pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(143, 212, 164, 0.025) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Layer 4: Particle field */}
      <Particles reduced={reduced} />
    </div>
  );
}
