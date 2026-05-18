"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, Lock, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import FormField from "@/components/auth/FormField";
import GoogleButton from "@/components/auth/GoogleButton";
import AmbientBackground from "@/components/auth/AmbientBackground";
import { supabase, saveUserToStorage } from "@/lib/supabase";

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required").refine(
    (val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^(\+92|0)?3[0-5][0-9]{8}$/;
      return emailRegex.test(val) || phoneRegex.test(val.replace(/\s/g, ""));
    },
    "Enter a valid email or Pakistani phone number"
  ),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [inputType, setInputType] = useState("email");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const identifier = watch("identifier");

  // Detect input type for icon morphing
  useEffect(() => {
    if (!identifier) {
      setInputType("email");
      return;
    }
    const startsWithDigit = /^(\+|[0-9])/.test(identifier);
    setInputType(startsWithDigit ? "phone" : "email");
  }, [identifier]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError(null);
    setErrorType(null);

    try {
      let emailToAuth = data.identifier;

      // Detect if input is a Pakistani phone number
      const isPhone = /^(\+92|0)?3[0-5][0-9]\s?[0-9]{7}$/.test(data.identifier.replace(/\s/g, ""));
      if (isPhone) {
        let formattedPhone = data.identifier.replace(/\s/g, "");
        let phoneQuery = formattedPhone;
        if (formattedPhone.startsWith("0")) {
          phoneQuery = formattedPhone.substring(1); // standard suffix like '3001234567'
        } else if (formattedPhone.startsWith("+92")) {
          phoneQuery = formattedPhone.substring(3); // standard suffix like '3001234567'
        }

        console.log('Detected phone number login. Querying user for phone suffix:', phoneQuery);

        // Check various format possibilities in DB
        const { data: foundUsers, error: phoneErr } = await supabase
          .from('users')
          .select('email')
          .or(`phone.eq.${phoneQuery},phone.eq.0${phoneQuery},phone.eq.+92${phoneQuery}`);

        if (phoneErr) {
          console.error('Error looking up email by phone:', phoneErr);
        }

        if (foundUsers && foundUsers.length > 0) {
          emailToAuth = foundUsers[0].email;
          console.log('Found matching email for phone number:', emailToAuth);
        } else {
          setErrorType('user_not_found');
          setIsLoading(false);
          return;
        }
      }

      console.log('Attempting login with email:', emailToAuth);
      
      const { data: dbData, error: dbError } = await supabase.rpc('check_user_login', {
        p_email: emailToAuth,
        p_password: data.password
      });

      console.log('Supabase response:', { dbData, dbError });

      if (dbError) {
        console.error('Supabase error:', dbError);
        const errMsg = dbError.message || '';
        if (errMsg.toLowerCase().includes('password')) {
          setErrorType('wrong_password');
        } else if (errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('invalid')) {
          setErrorType('user_not_found');
        } else {
          setError(errMsg);
        }
        setIsLoading(false);
        return;
      }

      if (!dbData || dbData.length === 0) {
        setErrorType('wrong_password');
        setIsLoading(false);
        return;
      }

      const user = dbData[0];
      console.log('User logged in successfully:', user);

      // Save user to localStorage for custom auth
      const saved = saveUserToStorage(user);
      if (!saved) {
        throw new Error('Failed to save login data to browser storage. Please check your browser settings.');
      }

      // Trigger a custom event so the layout can catch it
      window.dispatchEvent(new Event('authChange'));
      router.push("/");
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'An unexpected error occurred during login');
      setIsLoading(false);
    }
  };

  const InputIcon = inputType === "phone" ? Phone : Mail;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-0 sm:p-6"
      style={{ background: "#0A1C16" }}
    >
      <AmbientBackground />
      
      <div className="relative z-10 w-full flex items-center justify-center">
        <AuthCard>
          <AuthHeader
            title="Welcome back"
            subtitle="Sign in to continue running your store on autopilot"
          />

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl"
            >
              <p className="text-xs font-medium text-red-400">
                {error}
              </p>
            </motion.div>
          )}

          <AnimatePresence>
            {errorType === "rate_limited" && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl"
              >
                <p className="text-xs font-medium text-yellow-400">
                  Too many attempts. Try again in 5 minutes for security.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            {/* Email/Phone field */}
            <FormField
              {...register("identifier")}
              id="identifier"
              label="Email or Phone"
              icon={InputIcon}
              type="text"
              placeholder="you@example.com or 0300 1234567"
              autoFocus
              autoComplete="email"
              error={
                errors.identifier?.message ||
                (errorType === "user_not_found" ? "No account found." : undefined)
              }
            />

            {/* User not found inline link */}
            {errorType === "user_not_found" && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-text-sub -mt-3"
              >
                <Link href="/signup" className="text-jade-200 font-semibold hover:underline">
                  Create one?
                </Link>
              </motion.p>
            )}

            {/* Password field */}
            <FormField
              {...register("password")}
              id="password"
              label="Password"
              labelRight={
                <span
                  onClick={() => router.push("/forgot-password")}
                  className="text-xs font-semibold text-jade-200 hover:underline cursor-pointer"
                >
                  Forgot password?
                </span>
              }
              icon={Lock}
              isPassword
              placeholder="Enter your password"
              autoComplete="current-password"
              error={errorType === "wrong_password" ? "Incorrect password. Try again or reset" : errors.password?.message}
            />

            {/* Submit button */}
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
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-7">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] font-semibold text-text-faint uppercase tracking-widest">
              or
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google button */}
          <GoogleButton />

          {/* Footer */}
          <p className="mt-7 text-center text-[13px] font-medium text-text-sub">
            New to Zyro?{" "}
            <Link
              href="/signup"
              className="inline-flex items-center gap-1 text-jade-200 font-bold hover:underline group"
            >
              Create your account
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </p>
        </AuthCard>
      </div>
    </div>
  );
}
