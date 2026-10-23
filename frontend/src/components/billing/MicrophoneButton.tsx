"use client";

import React from "react";
import { BillingState } from "@/types/billing";
import { Mic, MicOff, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MicrophoneButtonProps {
  state: BillingState;
  onStart: () => void;
  onStop: () => void;
}

export function MicrophoneButton({ state, onStart, onStop }: MicrophoneButtonProps) {
  const isListening = state === "listening";
  const isProcessing = state === "processing" || state === "saving";
  const isError = state === "error";

  const handleClick = () => {
    if (isListening) {
      onStop();
    } else if (!isProcessing) {
      onStart();
    }
  };

  const getStatusText = () => {
    switch (state) {
      case "listening":
        return {
          title: "Listening...",
          subtitle: "Speak naturally. I'm listening to your order.",
        };
      case "processing":
        return {
          title: "Preparing your bill...",
          subtitle: "Identifying products and calculating totals.",
        };
      case "saving":
        return {
          title: "Confirming transaction...",
          subtitle: "Updating ledger and store stock.",
        };
      case "review":
        return {
          title: "Your bill is ready",
          subtitle: "Review items below or tap mic again to add more.",
        };
      case "error":
        return {
          title: "Couldn't process your request",
          subtitle: "Tap the microphone to retry or add items manually.",
        };
      case "idle":
      default:
        return {
          title: "Ready to create a bill",
          subtitle: "Tap the microphone and tell me what the customer bought.",
        };
    }
  };

  const status = getStatusText();

  return (
    <div className="flex flex-col items-center justify-center text-center py-4 select-none">
      {/* Microphone Button with Soft Pulse Rings */}
      <div className="relative flex items-center justify-center my-3">
        {/* Outer ambient pulsing ring 1 */}
        {isListening && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0.6 }}
            animate={{ scale: 1.45, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-emerald-500 pointer-events-none"
          />
        )}

        {/* Outer ambient pulsing ring 2 */}
        {isListening && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1.25, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, delay: 0.4, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-emerald-400 pointer-events-none"
          />
        )}

        {/* Main circular button */}
        <button
          type="button"
          onClick={handleClick}
          disabled={isProcessing}
          aria-label={isListening ? "Stop listening" : "Start voice billing"}
          className={cn(
            "relative z-10 h-20 w-20 sm:h-24 sm:w-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl focus:outline-none focus:ring-4",
            isListening
              ? "bg-emerald-600 text-white ring-4 ring-emerald-300/80 shadow-pulseGlow scale-105"
              : isProcessing
              ? "bg-slate-100 text-slate-400 cursor-not-allowed ring-0 shadow-sm"
              : isError
              ? "bg-red-600 text-white hover:bg-red-700 ring-4 ring-red-200"
              : "bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-glow hover:scale-105 active:scale-95 ring-emerald-200/60"
          )}
        >
          {isProcessing ? (
            <Loader2 className="h-8 w-8 sm:h-9 sm:w-9 animate-spin text-emerald-600" />
          ) : isListening ? (
            <Mic className="h-8 w-8 sm:h-9 sm:w-9 animate-pulse" />
          ) : isError ? (
            <AlertCircle className="h-8 w-8 sm:h-9 sm:w-9" />
          ) : (
            <Mic className="h-8 w-8 sm:h-9 sm:w-9" />
          )}
        </button>
      </div>

      {/* Status Label & Microcopy */}
      <div className="mt-3 max-w-sm">
        <h3
          className={cn(
            "text-base sm:text-lg font-bold tracking-tight",
            isError ? "text-red-600" : isListening ? "text-emerald-700" : "text-slate-900"
          )}
        >
          {status.title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
          {status.subtitle}
        </p>
      </div>
    </div>
  );
}
