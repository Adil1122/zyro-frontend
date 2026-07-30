"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import FormField from "@/components/auth/FormField";
import AmbientBackground from "@/components/auth/AmbientBackground";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Something went wrong");
        return;
      }

      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-0 sm:p-6"
      style={{ background: "#0A1C16" }}
    >
      <AmbientBackground />

      <div className="relative z-10 w-full flex items-center justify-center">
        <AuthCard>
          {sent ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center py-4"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: "rgba(92,168,124,0.12)", border: "1px solid rgba(92,168,124,0.3)" }}
              >
                <CheckCircle className="w-7 h-7 text-jade-200" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Check your inbox</h2>
              <p className="text-sm text-text-sub leading-relaxed mb-2">
                We sent a password reset link to
              </p>
              <p className="text-sm font-semibold text-jade-200 mb-6">
                {getValues("email")}
              </p>
              <p className="text-xs text-text-faint mb-8">
                The link expires in 1 hour. Check your spam folder if you don't see it.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="text-sm font-semibold text-jade-200 hover:underline"
              >
                Back to sign in
              </button>
            </motion.div>
          ) : (
            <>
              <AuthHeader
                title="Forgot password?"
                subtitle="Enter your email and we'll send you a reset link"
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl"
                >
                  <p className="text-xs font-medium text-red-400">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
                <FormField
                  {...register("email")}
                  id="email"
                  label="Email address"
                  icon={Mail}
                  type="email"
                  placeholder="you@example.com"
                  autoFocus
                  autoComplete="email"
                  error={errors.email?.message}
                />

                <motion.button
                  type="submit"
                  disabled={!isValid || isLoading}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98, backgroundColor: "white", color: "#3D7A5A" }}
                  className="w-full h-12 mt-6 flex items-center justify-center gap-2 rounded-[11px] text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg, #5CA87C 0%, #3D7A5A 100%)",
                    boxShadow: "0 8px 24px rgba(92, 168, 124, 0.35)",
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending link...
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </motion.button>
              </form>

              <p className="mt-7 text-center text-[13px] font-medium text-text-sub">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-jade-200 font-bold hover:underline group"
                >
                  <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </AuthCard>
      </div>
    </div>
  );
}
