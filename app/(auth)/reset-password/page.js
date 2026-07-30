"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Lock, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import FormField from "@/components/auth/FormField";
import AmbientBackground from "@/components/auth/AmbientBackground";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords don't match",
  path: ["confirm"],
});

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new one.");
    }
  }, [token]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const onSubmit = async (data) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Something went wrong");
        return;
      }

      setDone(true);
      setTimeout(() => router.push("/login"), 3000);
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
          {done ? (
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
              <h2 className="text-xl font-bold text-text-primary mb-2">Password updated</h2>
              <p className="text-sm text-text-sub leading-relaxed mb-6">
                Your password has been changed. Redirecting you to sign in…
              </p>
              <Link href="/login" className="text-sm font-semibold text-jade-200 hover:underline">
                Sign in now
              </Link>
            </motion.div>
          ) : !token ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center py-4"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
              >
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Invalid link</h2>
              <p className="text-sm text-text-sub leading-relaxed mb-6">
                This reset link is missing or invalid.
              </p>
              <Link href="/forgot-password" className="text-sm font-semibold text-jade-200 hover:underline">
                Request a new link
              </Link>
            </motion.div>
          ) : (
            <>
              <AuthHeader
                title="Set new password"
                subtitle="Choose a strong password for your Zyro account"
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl"
                >
                  <p className="text-xs font-medium text-red-400">{error}</p>
                  {error.includes("expired") && (
                    <Link
                      href="/forgot-password"
                      className="block mt-1 text-xs font-semibold text-jade-200 hover:underline"
                    >
                      Request a new link
                    </Link>
                  )}
                </motion.div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
                <FormField
                  {...register("password")}
                  id="password"
                  label="New password"
                  icon={Lock}
                  isPassword
                  placeholder="At least 8 characters"
                  autoFocus
                  autoComplete="new-password"
                  error={errors.password?.message}
                />

                <FormField
                  {...register("confirm")}
                  id="confirm"
                  label="Confirm new password"
                  icon={Lock}
                  isPassword
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  error={errors.confirm?.message}
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
                      Updating password...
                    </>
                  ) : (
                    "Update password"
                  )}
                </motion.button>
              </form>
            </>
          )}
        </AuthCard>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A1C16" }}>
        <Loader2 className="w-6 h-6 text-jade-200 animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
