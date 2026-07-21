"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, Store, Sparkles, Loader2, ArrowLeft, Check, ShieldCheck } from "lucide-react";
import Link from "next/link";

import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import StepProgress from "@/components/auth/StepProgress";
import FormField from "@/components/auth/FormField";
import PasswordStrength from "@/components/auth/PasswordStrength";
import GoogleButton from "@/components/auth/GoogleButton";
import NicheSelect from "@/components/auth/NicheSelect";
import ChannelChips from "@/components/auth/ChannelChips";
import SuccessState from "@/components/auth/SuccessState";
import AmbientBackground from "@/components/auth/AmbientBackground";
import { supabase } from "@/lib/supabase";

// Step 1 schema
const step1Schema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().regex(/^3[0-5][0-9]\s?[0-9]{7}$/, "Enter a valid Pakistani mobile number"),
});

// Step 3 schema (password)
const step3Schema = z.object({
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "One uppercase letter")
    .regex(/[0-9]/, "One number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "One symbol"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Step 4 schema (business)
const step4Schema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  niche: z.string().min(1, "Please select a category"),
  channels: z.array(z.string()).min(1, "Select at least one channel"),
  terms: z.boolean().refine((val) => val === true, "You must accept the terms"),
});

const stepSubheadings = [
  "Let's start with you",
  "Verify your email",
  "Secure your account",
  "Tell us about your store",
];

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 20 : -20, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction < 0 ? 20 : -20, opacity: 0 }),
};

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState(null);

  // OTP state
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);

  // Step 1 form
  const step1Form = useForm({ resolver: zodResolver(step1Schema), mode: "onChange" });

  // Step 3 form (password)
  const step3Form = useForm({ resolver: zodResolver(step3Schema), mode: "onChange" });

  // Step 4 form (business)
  const step4Form = useForm({
    resolver: zodResolver(step4Schema),
    mode: "onChange",
    defaultValues: { channels: [], terms: false },
  });

  const password = step3Form.watch("password") || "";
  const confirmPassword = step3Form.watch("confirmPassword") || "";
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const goNext = () => { setDirection(1); setStep((s) => s + 1); };
  const goBack = () => { setDirection(-1); setStep((s) => s - 1); setError(null); };

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Step 1 → send OTP
  const handleStep1Submit = async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, name: data.fullName }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to send verification code");
      setFirstName(data.fullName.split(" ")[0]);
      setOtp(["", "", "", "", "", ""]);
      setResendCooldown(60);
      goNext();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setOtpLoading(true);
    try {
      const email = step1Form.getValues("email");
      const name = step1Form.getValues("fullName");
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to resend code");
      setOtp(["", "", "", "", "", ""]);
      setResendCooldown(60);
      otpRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  // OTP input handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  // Step 2 → verify OTP
  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter the complete 6-digit code"); return; }
    setOtpLoading(true);
    setError(null);
    try {
      const email = step1Form.getValues("email");
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Verification failed");
      goNext();
    } catch (err) {
      setError(err.message);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setOtpLoading(false);
    }
  };

  // Step 3 → go to step 4
  const handleStep3Submit = async () => { goNext(); };

  // Step 4 → create account
  const handleStep4Submit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const step1Data = step1Form.getValues();
      const step3Data = step3Form.getValues();
      const step4Data = step4Form.getValues();

      const formattedPhone = "+92" + step1Data.phone.replace(/\s/g, "");

      const { data: registerData, error: rpcError } = await supabase.rpc("register_user", {
        p_name: step1Data.fullName,
        p_email: step1Data.email,
        p_password: step3Data.password,
        p_phone: formattedPhone,
      });

      if (rpcError) throw new Error(rpcError.message || "Signup failed.");
      if (!registerData || (Array.isArray(registerData) && registerData.length === 0)) {
        throw new Error("Signup failed. No user data returned.");
      }

      const user = Array.isArray(registerData) ? registerData[0] : registerData;
      localStorage.setItem("zyro_user", JSON.stringify(user));

      try {
        await supabase.from("users").update({
          business_name: step4Data.businessName,
          niche: step4Data.niche,
          channels: step4Data.channels,
        }).eq("id", user.id);
      } catch (_) {}

      // Send welcome email (non-blocking)
      fetch('/api/auth/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: step1Data.email, name: step1Data.fullName, businessName: step4Data.businessName }),
      }).catch(() => {});

      window.dispatchEvent(new Event("authChange"));
      setIsSuccess(true);
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-0 sm:p-6" style={{ background: "#0A1C16" }}>
        <AmbientBackground />
        <div className="relative z-10 w-full flex items-center justify-center">
          <AuthCard wide>
            <SuccessState title={`Welcome to Zyro, ${firstName}!`} subtitle="Setting up your dashboard..." redirectTo="/onboarding" />
          </AuthCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-0 sm:p-6" style={{ background: "#0A1C16" }}>
      <AmbientBackground />
      <div className="relative z-10 w-full flex items-center justify-center">
        <AuthCard wide>
          <AuthHeader title="Create your Zyro account" subtitle={stepSubheadings[step - 1]} />

          <StepProgress currentStep={step} totalSteps={4} />

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl"
            >
              <p className="text-xs font-medium text-red-400">{error}</p>
            </motion.div>
          )}

          <div className="mt-8 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>

              {/* ── Step 1: Personal Info ── */}
              {step === 1 && (
                <motion.form
                  key="step1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter" animate="center" exit="exit"
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  onSubmit={step1Form.handleSubmit(handleStep1Submit)}
                  className="space-y-5"
                >
                  <FormField
                    {...step1Form.register("fullName")}
                    id="fullName" label="Full name" icon={User}
                    placeholder="Ahmad Khan" autoFocus autoComplete="name"
                    error={step1Form.formState.errors.fullName?.message}
                  />
                  <FormField
                    {...step1Form.register("email")}
                    id="email" label="Email address" icon={Mail} type="email"
                    placeholder="you@example.com" autoComplete="email"
                    error={step1Form.formState.errors.email?.message}
                    success={step1Form.formState.dirtyFields.email && !step1Form.formState.errors.email}
                  />
                  <FormField
                    {...step1Form.register("phone")}
                    id="phone" label="Phone number" prefix="+92"
                    placeholder="300 1234567" autoComplete="tel"
                    error={step1Form.formState.errors.phone?.message}
                    helperText="Used for WhatsApp updates and 2FA"
                  />
                  <motion.button
                    type="submit"
                    disabled={!step1Form.formState.isValid || isLoading}
                    whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                    className="w-full h-12 mt-8 flex items-center justify-center gap-2 rounded-[11px] text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #5CA87C 0%, #3D7A5A 100%)", boxShadow: "0 8px 24px rgba(92,168,124,0.35)" }}
                  >
                    {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Sending code...</> : <>Continue <ArrowLeft className="w-4 h-4 rotate-180" /></>}
                  </motion.button>

                  <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] font-semibold text-text-faint uppercase tracking-widest">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <GoogleButton />
                  <p className="mt-6 text-center text-[13px] font-medium text-text-sub">
                    Already have an account?{" "}
                    <Link href="/login" className="text-jade-200 font-bold hover:underline">Sign in</Link>
                  </p>
                </motion.form>
              )}

              {/* ── Step 2: OTP Verification ── */}
              {step === 2 && (
                <motion.form
                  key="step2-otp"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter" animate="center" exit="exit"
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  onSubmit={handleOTPSubmit}
                  className="space-y-6"
                >
                  {/* Icon */}
                  <div className="flex justify-center">
                    <div style={{
                      width: 64, height: 64, borderRadius: 16,
                      background: "linear-gradient(135deg, #17332A 0%, #1D4033 100%)",
                      border: "1px solid rgba(92,168,124,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <ShieldCheck className="w-7 h-7 text-jade-300" style={{ color: "#5CA87C" }} />
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-medium text-text-sub">
                      We sent a 6-digit code to
                    </p>
                    <p className="text-sm font-bold mt-1" style={{ color: "#5CA87C" }}>
                      {step1Form.getValues("email")}
                    </p>
                    <p className="text-xs text-text-faint mt-1">Check your inbox and spam folder</p>
                  </div>

                  {/* OTP inputs */}
                  <div className="flex gap-2 justify-center">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => (otpRefs.current[i] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={i === 0 ? handleOtpPaste : undefined}
                        style={{
                          width: 48, height: 56, borderRadius: 10, border: "1.5px solid",
                          borderColor: digit ? "#5CA87C" : "rgba(92,168,124,0.2)",
                          background: digit ? "rgba(92,168,124,0.08)" : "#122720",
                          color: "#F0FDF4", fontSize: 22, fontWeight: 800,
                          textAlign: "center", outline: "none",
                          transition: "all 0.15s",
                          fontFamily: "'Courier New', monospace",
                        }}
                        onFocus={(e) => e.target.style.borderColor = "#5CA87C"}
                        onBlur={(e) => e.target.style.borderColor = digit ? "#5CA87C" : "rgba(92,168,124,0.2)"}
                      />
                    ))}
                  </div>

                  {/* Resend */}
                  <div className="text-center">
                    {resendCooldown > 0 ? (
                      <p className="text-xs text-text-faint">
                        Resend code in <span style={{ color: "#5CA87C", fontWeight: 700 }}>{resendCooldown}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={otpLoading}
                        className="text-xs font-bold hover:underline disabled:opacity-50"
                        style={{ color: "#5CA87C", background: "none", border: "none", cursor: "pointer" }}
                      >
                        {otpLoading ? "Sending..." : "Resend code"}
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <motion.button
                      type="button" onClick={goBack}
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                      className="w-1/3 h-12 flex items-center justify-center gap-2 rounded-[11px] text-sm font-semibold text-text bg-bg-elev border border-border hover:border-border-mid transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={otp.join("").length < 6 || otpLoading}
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                      className="flex-1 h-12 flex items-center justify-center gap-2 rounded-[11px] text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: "linear-gradient(135deg, #5CA87C 0%, #3D7A5A 100%)", boxShadow: "0 8px 24px rgba(92,168,124,0.35)" }}
                    >
                      {otpLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying...</> : <><Check className="w-4 h-4" />Verify Email</>}
                    </motion.button>
                  </div>
                </motion.form>
              )}

              {/* ── Step 3: Password ── */}
              {step === 3 && (
                <motion.form
                  key="step3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter" animate="center" exit="exit"
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  onSubmit={step3Form.handleSubmit(handleStep3Submit)}
                  className="space-y-5"
                >
                  <div>
                    <FormField
                      {...step3Form.register("password")}
                      id="password" label="Create password" icon={Lock}
                      isPassword placeholder="Min 8 characters" autoComplete="new-password"
                      error={step3Form.formState.errors.password?.message}
                    />
                    <PasswordStrength password={password} />
                  </div>
                  <FormField
                    {...step3Form.register("confirmPassword")}
                    id="confirmPassword" label="Confirm password" icon={Lock}
                    isPassword placeholder="Re-enter your password" autoComplete="new-password"
                    error={step3Form.formState.errors.confirmPassword?.message}
                    success={passwordsMatch}
                  />
                  <div className="flex gap-2 mt-8">
                    <motion.button
                      type="button" onClick={goBack}
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                      className="w-1/3 h-12 flex items-center justify-center gap-2 rounded-[11px] text-sm font-semibold text-text bg-bg-elev border border-border hover:border-border-mid transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={!step3Form.formState.isValid}
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                      className="flex-1 h-12 flex items-center justify-center gap-2 rounded-[11px] text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: "linear-gradient(135deg, #5CA87C 0%, #3D7A5A 100%)", boxShadow: "0 8px 24px rgba(92,168,124,0.35)" }}
                    >
                      Continue <ArrowLeft className="w-4 h-4 rotate-180" />
                    </motion.button>
                  </div>
                </motion.form>
              )}

              {/* ── Step 4: Business Info ── */}
              {step === 4 && (
                <motion.form
                  key="step4"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter" animate="center" exit="exit"
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  onSubmit={step4Form.handleSubmit(handleStep4Submit)}
                  className="space-y-5"
                >
                  <div className="flex items-start gap-3 p-3 bg-bg-elev border-l-[3px] border-jade-300 rounded-[10px]">
                    <Sparkles className="w-4 h-4 text-jade-300 mt-0.5 shrink-0" />
                    <p className="text-xs font-medium text-text-sub">
                      We'll customize Zyro for your business — templates, integrations, even AI suggestions specific to your niche.
                    </p>
                  </div>

                  <FormField
                    {...step4Form.register("businessName")}
                    id="businessName" label="Business name" icon={Store}
                    placeholder="e.g. Acme Stores, Bilal Beauty, Karachi Threads"
                    error={step4Form.formState.errors.businessName?.message}
                  />

                  <div>
                    <label className="text-xs font-bold text-text mb-1.5 block">What do you sell?</label>
                    <p className="text-[11px] text-text-faint mb-2">Pick your primary category</p>
                    <NicheSelect
                      value={step4Form.watch("niche") || ""}
                      onChange={(val) => step4Form.setValue("niche", val, { shouldValidate: true })}
                      error={step4Form.formState.errors.niche?.message}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text mb-1.5 block">Where do you currently sell?</label>
                    <p className="text-[11px] text-text-faint mb-2">Select all that apply — you'll connect them later</p>
                    <ChannelChips
                      selected={step4Form.watch("channels")}
                      onChange={(val) => step4Form.setValue("channels", val, { shouldValidate: true })}
                      error={step4Form.formState.errors.channels?.message}
                    />
                  </div>

                  <div className="flex items-start gap-3 mt-5">
                    <button
                      type="button"
                      onClick={() => step4Form.setValue("terms", !step4Form.watch("terms"), { shouldValidate: true })}
                      className={`w-[18px] h-[18px] shrink-0 mt-0.5 rounded-[5px] border-[1.5px] flex items-center justify-center transition-all ${
                        step4Form.watch("terms") ? "bg-jade-300 border-jade-300" : "bg-transparent border-border-mid"
                      }`}
                    >
                      {step4Form.watch("terms") && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </button>
                    <p className="text-xs font-medium text-text-sub">
                      I agree to Zyro's{" "}
                      <Link href="/terms" className="text-jade-200 font-bold hover:underline">Terms of Service</Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-jade-200 font-bold hover:underline">Privacy Policy</Link>
                    </p>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <motion.button
                      type="button" onClick={goBack}
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                      className="w-1/3 h-12 flex items-center justify-center gap-2 rounded-[11px] text-sm font-semibold text-text bg-bg-elev border border-border hover:border-border-mid transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={!step4Form.formState.isValid || isLoading}
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                      className="flex-1 h-12 flex items-center justify-center gap-2 rounded-[11px] text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: "linear-gradient(135deg, #5CA87C 0%, #3D7A5A 100%)", boxShadow: "0 8px 24px rgba(92,168,124,0.35)" }}
                    >
                      {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : <><Sparkles className="w-4 h-4" />Create my account</>}
                    </motion.button>
                  </div>
                </motion.form>
              )}

            </AnimatePresence>
          </div>
        </AuthCard>
      </div>
    </div>
  );
}
