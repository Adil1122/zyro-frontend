"use client";

import React, { forwardRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const FormField = forwardRef(
  (
    {
      label,
      labelRight,
      icon: Icon,
      rightIcon: RightIcon,
      error,
      success,
      helperText,
      isPassword,
      prefix,
      className,
      type,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="w-full">
        {/* Label row */}
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor={props.id}
            className="text-xs font-bold text-text"
          >
            {label}
          </label>
          {labelRight}
        </div>

        {/* Input container */}
        <div className="relative">
          {/* Prefix block (for phone) */}
          {prefix && (
            <div className="absolute left-0 top-0 bottom-0 flex items-center px-3 bg-bg-high border-r border-border rounded-l-[11px]">
              <span className="text-sm font-semibold text-text-sub">{prefix}</span>
            </div>
          )}

          {/* Left icon */}
          {Icon && !prefix && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <Icon className="w-[18px] h-[18px] text-text-faint" />
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            type={inputType}
            className={cn(
              "w-full h-12 bg-bg-elev rounded-[11px]",
              "text-sm font-medium text-text placeholder:text-text-faint",
              "border outline-none transition-all duration-200",
              // Padding based on icons
              Icon && !prefix ? "pl-11" : prefix ? "pl-[72px]" : "pl-4",
              (isPassword || RightIcon || success) ? "pr-11" : "pr-4",
              // Border states
              error
                ? "border-red-400 focus:border-red-400"
                : isFocused
                ? "border-jade-300 shadow-[0_0_0_3px_rgba(92,168,124,0.12)]"
                : "border-border hover:border-border-mid",
              className
            )}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />

          {/* Right side icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Success checkmark */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  exit={{ scale: 0 }}
                >
                  <CheckCircle2 className="w-[18px] h-[18px] text-jade-300" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Password toggle */}
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-text-faint hover:text-text-muted transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-[18px] h-[18px]" />
                ) : (
                  <Eye className="w-[18px] h-[18px]" />
                )}
              </button>
            )}

            {/* Custom right icon */}
            {RightIcon && !isPassword && !success && (
              <RightIcon className="w-[18px] h-[18px] text-text-faint" />
            )}
          </div>
        </div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="mt-1.5 text-xs font-medium text-red-400"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Helper text */}
        {helperText && !error && (
          <p className="mt-1.5 text-[11px] text-text-faint">{helperText}</p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";

export default FormField;
