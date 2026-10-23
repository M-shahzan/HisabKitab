"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  isListening: boolean;
  audioLevel?: number; // 0 to 1
  className?: string;
}

export function AudioWaveform({ isListening, audioLevel = 0, className }: AudioWaveformProps) {
  const bars = Array.from({ length: 24 });

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1 h-12 w-full max-w-xs mx-auto py-2 px-4 rounded-xl transition-all duration-300",
        isListening ? "opacity-100" : "opacity-40",
        className
      )}
      aria-hidden="true"
    >
      {bars.map((_, i) => {
        // Create an organic wave shape with sine offset
        const normalizedIndex = Math.sin((i / 24) * Math.PI);
        const dynamicHeight = isListening
          ? Math.max(6, Math.min(36, Math.round(normalizedIndex * 36 * (0.3 + audioLevel * 1.4))))
          : 6;

        return (
          <div
            key={i}
            className={cn(
              "w-1 rounded-full transition-all duration-75",
              isListening ? "bg-emerald-500 shadow-sm" : "bg-slate-300"
            )}
            style={{
              height: `${dynamicHeight}px`,
              transitionDelay: `${(i % 4) * 20}ms`,
            }}
          />
        );
      })}
    </div>
  );
}
