"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, Store, Sparkles, Loader2, ArrowLeft, Check } from "lucide-react";
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

// Step 2 schema
const step2Schema = z.object({
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

// Step 3 schema
const step3Schema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  niche: z.string().min(1, "Please select a category"),
  channels: z.array(z.string()).min(1, "Select at least one channel"),
  terms: z.boolean().refine((val) => val === true, "You must accept the terms"),
});

const stepSubheadings = [
  "Let's start with you",
  "Secure your account",
  "Tell us about your store",
];

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? 20 : -20,
    opacity: 0,
  }),
};

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState(null);

  // Step 1 form
  const step1Form = useForm({
    resolver: zodResolver(step1Schema),
    mode: "onChange",
  });

  // Step 2 form
  const step2Form = useForm({
    resolver: zodResolver(step2Schema),
    mode: "onChange",
  });

  // Step 3 form
  const step3Form = useForm({
    resolver: zodResolver(step3Schema),
    mode: "onChange",
    defaultValues: {
      channels: [],
      terms: false,
    },
  });

  const password = step2Form.watch("password") || "";
  const confirmPassword = step2Form.watch("confirmPassword") || "";
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const goNext = () => {
    setDirection(1);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const handleStep1Submit = async (data) => {
    setFirstName(data.fullName.split(" ")[0]);
    goNext();
  };

  const handleStep2Submit = async () => {
    goNext();
  };

  const handleStep3Submit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const step1Data = step1Form.getValues();
      const step2Data = step2Form.getValues();
      const step3Data = step3Form.getValues();

      console.log('Validating unique email:', step1Data.email);

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', step1Data.email)
        .maybeSingle();

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Call the RPC to register
      const formattedPhone = '+92' + step1Data.phone.replace(/\s/g, "");
      console.log('Registering user via RPC with phone:', formattedPhone);

      const { data: registerData, error: rpcError } = await supabase.rpc('register_user', {
        p_name: step1Data.fullName,
        p_email: step1Data.email,
        p_password: step2Data.password,
        p_phone: formattedPhone
      });

      if (rpcError) {
        console.error("RPC Error:", rpcError);
        throw new Error(rpcError.message || 'Signup failed. Please ensure the database function is created.');
      }
      
      if (!registerData || (Array.isArray(registerData) && registerData.length === 0)) {
        throw new Error('Signup failed. No user data returned.');
      }

      const user = Array.isArray(registerData) ? registerData[0] : registerData;
      console.log('User registered successfully:', user);

      // Save user to localStorage for custom auth
      localStorage.setItem('zyro_user', JSON.stringify(user));

      // Attempt to save premium business details (ignores failure if table columns don't exist yet)
      try {
        const { error: updateErr } = await supabase
          .from('users')
          .update({
            business_name: step3Data.businessName,
            niche: step3Data.niche,
            channels: step3Data.channels
          })
          .eq('id', user.id);
        
        if (updateErr) {
          console.warn('Silent update warning (normal if migration SQL is not executed yet):', updateErr);
        } else {
          console.log('Premium details saved successfully!');
        }
      } catch (updateErr) {
        console.warn('Silent update error (normal if migration SQL is not executed yet):', updateErr);
      }

      // Trigger a custom event so the layout can catch it
      window.dispatchEvent(new Event('authChange'));

      // Trigger success state
      setIsSuccess(true);
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'An unexpected error occurred during signup');
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-0 sm:p-6"
        style={{ background: "#0A1C16" }}
      >
        <AmbientBackground />
        
        <div className="relative z-10 w-full flex items-center justify-center">
          <AuthCard wide>
            <SuccessState
              title={`Welcome to Zyro, ${firstName}!`}
              subtitle="Setting up your dashboard..."
              redirectTo="/onboarding"
            />
          </AuthCard>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-0 sm:p-6"
      style={{ background: "#0A1C16" }}
    >
      <AmbientBackground />
      
      <div className="relative z-10 w-full flex items-center justify-center">
        <AuthCard wide>
          <AuthHeader
            title="Create your Zyro account"
            subtitle={stepSubheadings[step - 1]}
          />

          <StepProgress currentStep={step} totalSteps={3} />

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

          <div className="mt-8 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              {/* Step 1: Personal Info */}
              {step === 1 && (
                <motion.form
                  key="step1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  onSubmit={step1Form.handleSubmit(handleStep1Submit)}
                  className="space-y-5"
                >
                  <FormField
                    {...step1Form.register("fullName")}
                    id="fullName"
                    label="Full name"
                    icon={User}
                    placeholder="Ahmad Khan"
                    autoFocus
                    autoComplete="name"
                    error={step1Form.formState.errors.fullName?.message}
                  />

                  <FormField
                    {...step1Form.register("email")}
                    id="email"
                    label="Email address"
                    icon={Mail}
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    error={step1Form.formState.errors.email?.message}
                    success={step1Form.formState.dirtyFields.email && !step1Form.formState.errors.email}
                  />

                  <FormField
                    {...step1Form.register("phone")}
                    id="phone"
                    label="Phone number"
                    prefix="+92"
                    placeholder="300 1234567"
                    autoComplete="tel"
                    error={step1Form.formState.errors.phone?.message}
                    helperText="Used for WhatsApp updates and 2FA"
                  />

                  <motion.button
                    type="submit"
                    disabled={!step1Form.formState.isValid}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-12 mt-8 flex items-center justify-center gap-2 rounded-[11px] text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(135deg, #5CA87C 0%, #3D7A5A 100%)",
                      boxShadow: "0 8px 24px rgba(92, 168, 124, 0.35)",
                    }}
                  >
                    Continue
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </motion.button>

                  {/* Divider */}
                  <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] font-semibold text-text-faint uppercase tracking-widest">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <GoogleButton />

                  <p className="mt-6 text-center text-[13px] font-medium text-text-sub">
                    Already have an account?{" "}
                    <Link href="/login" className="text-jade-200 font-bold hover:underline">
                      Sign in
                    </Link>
                  </p>
                </motion.form>
              )}

              {/* Step 2: Password */}
              {step === 2 && (
                <motion.form
                  key="step2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  onSubmit={step2Form.handleSubmit(handleStep2Submit)}
                  className="space-y-5"
                >
                  <div>
                    <FormField
                      {...step2Form.register("password")}
                      id="password"
                      label="Create password"
                      icon={Lock}
                      isPassword
                      placeholder="Min 8 characters"
                      autoComplete="new-password"
                      error={step2Form.formState.errors.password?.message}
                    />
                    <PasswordStrength password={password} />
                  </div>

                  <FormField
                    {...step2Form.register("confirmPassword")}
                    id="confirmPassword"
                    label="Confirm password"
                    icon={Lock}
                    isPassword
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    error={step2Form.formState.errors.confirmPassword?.message}
                    success={passwordsMatch}
                  />

                  <div className="flex gap-2 mt-8">
                    <motion.button
                      type="button"
                      onClick={goBack}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-1/3 h-12 flex items-center justify-center gap-2 rounded-[11px] text-sm font-semibold text-text bg-bg-elev border border-border hover:border-border-mid transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </motion.button>

                    <motion.button
                      type="submit"
                      disabled={!step2Form.formState.isValid}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 h-12 flex items-center justify-center gap-2 rounded-[11px] text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: "linear-gradient(135deg, #5CA87C 0%, #3D7A5A 100%)",
                        boxShadow: "0 8px 24px rgba(92, 168, 124, 0.35)",
                      }}
                    >
                      Continue
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </motion.button>
                  </div>
                </motion.form>
              )}

              {/* Step 3: Business Info */}
              {step === 3 && (
                <motion.form
                  key="step3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  onSubmit={step3Form.handleSubmit(handleStep3Submit)}
                  className="space-y-5"
                >
                  {/* Info callout */}
                  <div className="flex items-start gap-3 p-3 bg-bg-elev border-l-[3px] border-jade-300 rounded-[10px]">
                    <Sparkles className="w-4 h-4 text-jade-300 mt-0.5 shrink-0" />
                    <p className="text-xs font-medium text-text-sub">
                      We'll customize Zyro for your business — templates, integrations, even AI suggestions specific to your niche.
                    </p>
                  </div>

                  <FormField
                    {...step3Form.register("businessName")}
                    id="businessName"
                    label="Business name"
                    icon={Store}
                    placeholder="e.g. Acme Stores, Bilal Beauty, Karachi Threads"
                    error={step3Form.formState.errors.businessName?.message}
                  />

                  <div>
                    <label className="text-xs font-bold text-text mb-1.5 block">
                      What do you sell?
                    </label>
                    <p className="text-[11px] text-text-faint mb-2">Pick your primary category</p>
                    <NicheSelect
                      value={step3Form.watch("niche") || ""}
                      onChange={(val) => step3Form.setValue("niche", val, { shouldValidate: true })}
                      error={step3Form.formState.errors.niche?.message}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text mb-1.5 block">
                      Where do you currently sell?
                    </label>
                    <p className="text-[11px] text-text-faint mb-2">Select all that apply — you'll connect them later</p>
                    <ChannelChips
                      selected={step3Form.watch("channels")}
                      onChange={(val) => step3Form.setValue("channels", val, { shouldValidate: true })}
                      error={step3Form.formState.errors.channels?.message}
                    />
                  </div>

                  {/* Terms checkbox */}
                  <div className="flex items-start gap-3 mt-5">
                    <button
                      type="button"
                      onClick={() => step3Form.setValue("terms", !step3Form.watch("terms"), { shouldValidate: true })}
                      className={`w-[18px] h-[18px] shrink-0 mt-0.5 rounded-[5px] border-[1.5px] flex items-center justify-center transition-all ${
                        step3Form.watch("terms")
                          ? "bg-jade-300 border-jade-300"
                          : "bg-transparent border-border-mid"
                      }`}
                    >
                      {step3Form.watch("terms") && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </button>
                    <p className="text-xs font-medium text-text-sub">
                      I agree to Zyro's{" "}
                      <Link href="/terms" className="text-jade-200 font-bold hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-jade-200 font-bold hover:underline">
                        Privacy Policy
                      </Link>
                    </p>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <motion.button
                      type="button"
                      onClick={goBack}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-1/3 h-12 flex items-center justify-center gap-2 rounded-[11px] text-sm font-semibold text-text bg-bg-elev border border-border hover:border-border-mid transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </motion.button>

                    <motion.button
                      type="submit"
                      disabled={!step3Form.formState.isValid || isLoading}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 h-12 flex items-center justify-center gap-2 rounded-[11px] text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: "linear-gradient(135deg, #5CA87C 0%, #3D7A5A 100%)",
                        boxShadow: "0 8px 24px rgba(92, 168, 124, 0.35)",
                      }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Create my account
                        </>
                      )}
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
