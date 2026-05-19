"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export default function GoogleButton({ onClick, disabled, className }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadGoogleScript = () => {
    return new Promise((resolve) => {
      if (window.google?.accounts?.oauth2) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  };

  const handleGoogleLogin = async (e) => {
    if (e) e.preventDefault();
    
    // If a custom onClick handler is supplied, run it first
    if (onClick) {
      onClick(e);
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!clientId || clientId === "your_google_client_id_here") {
      setError("Google Client ID is not configured in .env.local. Please follow setup instructions in that file.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const loaded = await loadGoogleScript();
      if (!loaded) {
        throw new Error("Failed to load Google Login SDK. Please check your internet connection.");
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "email profile openid",
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            console.error("Google OAuth Error:", tokenResponse);
            setError(tokenResponse.error_description || `Google Login failed: ${tokenResponse.error}`);
            setIsLoading(false);
            return;
          }

          try {
            // Retrieve user info from Google's userInfo endpoint
            const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenResponse.access_token}`);
            if (!res.ok) {
              throw new Error("Failed to fetch user profile information from Google.");
            }

            const googleUser = await res.json();
            if (!googleUser.email) {
              throw new Error("Google account did not return a valid email address.");
            }

            console.log("Authenticated via Google:", googleUser.email);

            // Check if user already exists in the public.users database
            const { data: dbUser, error: dbError } = await supabase
              .from("users")
              .select("*")
              .eq("email", googleUser.email)
              .maybeSingle();

            if (dbError) {
              console.error("Supabase query error:", dbError);
              throw new Error(dbError.message || "Database query failed during Google login.");
            }

            let finalUser = dbUser;

            // If the user does not exist, perform automatic registration/signup
            if (!dbUser) {
              console.log("User does not exist in our database. Creating user record...");
              const trialEnds = new Date();
              trialEnds.setDate(trialEnds.getDate() + 14); // 14 days free trial

              const { data: newUser, error: insertError } = await supabase
                .from("users")
                .insert({
                  name: googleUser.name || googleUser.given_name || "Google User",
                  email: googleUser.email,
                  password: null, // OAuth users have no password
                  phone: "",
                  timezone: "Asia/Karachi",
                  currency: "PKR",
                  trial_ends_at: trialEnds.toISOString(),
                  onboarding_completed: false,
                  onboarding_step: 1
                })
                .select()
                .single();

              if (insertError) {
                console.error("Supabase insert error:", insertError);
                throw new Error(insertError.message || "Failed to create user account in database.");
              }

              finalUser = newUser;
              console.log("Created user account successfully:", finalUser);
            }

            // Save authenticated user to localStorage
            localStorage.setItem("zyro_user", JSON.stringify(finalUser));

            // Trigger a custom event so layouts/headers can listen to login change
            window.dispatchEvent(new Event("authChange"));

            // Redirect appropriately based on onboarding status
            if (finalUser.onboarding_completed) {
              router.push("/dashboard");
            } else {
              router.push("/onboarding");
            }
          } catch (err) {
            console.error("Google login processing error:", err);
            setError(err.message || "An error occurred during account sync.");
            setIsLoading(false);
          }
        },
      });

      client.requestAccessToken();
    } catch (err) {
      console.error("Failed to initialize Google Sign-In client:", err);
      setError(err.message || "Failed to load Google Login.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <motion.button
        type="button"
        onClick={handleGoogleLogin}
        disabled={disabled || isLoading}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "w-full h-12 flex items-center justify-center gap-3",
          "bg-bg-elev border border-border rounded-[11px]",
          "text-sm font-semibold text-text",
          "transition-all duration-200",
          "hover:border-border-mid hover:bg-bg-high",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 text-jade-300 animate-spin" />
        ) : (
          /* Google 4-color G logo */
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              d="M22 12.1c0-.7-.1-1.4-.2-2H12v3.8h5.6c-.2 1.3-1 2.4-2.1 3.1v2.6h3.4c2-1.8 3.1-4.5 3.1-7.5z"
              fill="#4285F4"
            />
            <path
              d="M12 22c2.8 0 5.2-.9 6.9-2.5l-3.4-2.6c-.9.6-2.1 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.7v2.7C4.5 19.9 8 22 12 22z"
              fill="#34A853"
            />
            <path
              d="M6.2 13.6c-.2-.6-.3-1.3-.3-2 0-.7.1-1.4.3-2V6.9H2.7C2 8.4 1.5 10.1 1.5 12s.5 3.6 1.2 5.1l3.5-2.7z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.8c1.5 0 2.9.5 4 1.5l3-3C17.2 2.6 14.8 1.5 12 1.5 8 1.5 4.5 3.6 2.7 6.9l3.5 2.7c.8-2.5 3.1-4.3 5.8-4.3z"
              fill="#EA4335"
            />
          </svg>
        )}
        {isLoading ? "Signing in..." : "Continue with Google"}
      </motion.button>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl"
          >
            <p className="text-xs font-semibold text-red-400 text-center leading-normal">
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

