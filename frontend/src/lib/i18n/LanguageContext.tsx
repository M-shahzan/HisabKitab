"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { SupportedLanguage, TranslationDictionary, translations } from "./translations";

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: keyof TranslationDictionary | string, fallbackOrParams?: string | Record<string, any>) => string;
  locale: string;
  formatCurrency: (amount: number, showDecimals?: boolean) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
}

const STORAGE_KEY = "hisab_kitab_ui_lang";
const VALID_LANGUAGES: SupportedLanguage[] = ["en", "hi", "kn"];

const LOCALE_MAP: Record<SupportedLanguage, string> = {
  en: "en-IN",
  hi: "hi-IN",
  kn: "kn-IN",
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [mounted, setMounted] = useState(false);

  // Restore language from localStorage on initial client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
      if (stored && VALID_LANGUAGES.includes(stored)) {
        setLanguageState(stored);
        if (typeof document !== "undefined") {
          document.documentElement.lang = stored;
        }
      }
    } catch {
      // localStorage may fail in restricted/private modes
    }
    setMounted(true);
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    if (!VALID_LANGUAGES.includes(lang)) return;
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      if (typeof document !== "undefined") {
        document.documentElement.lang = lang;
      }
      // Broadcast to other tabs / static pages
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }, []);

  // Listen for storage events from other tabs or static frontend
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
        if (stored && VALID_LANGUAGES.includes(stored) && stored !== language) {
          setLanguageState(stored);
          if (typeof document !== "undefined") {
            document.documentElement.lang = stored;
          }
        }
      } catch {}
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [language]);

  const locale = LOCALE_MAP[language] || "en-IN";

  const t = useCallback(
    (key: keyof TranslationDictionary | string, fallbackOrParams?: string | Record<string, any>): string => {
      const dict = translations[language] || translations["en"];
      const enDict = translations["en"];

      let text: string | undefined = (dict as any)?.[key];
      if (!text) {
        text = (enDict as any)?.[key];
      }

      if (!text) {
        if (typeof fallbackOrParams === "string") {
          return fallbackOrParams;
        }
        return String(key);
      }

      if (fallbackOrParams && typeof fallbackOrParams === "object") {
        let interpolated = text;
        for (const [paramKey, paramVal] of Object.entries(fallbackOrParams)) {
          interpolated = interpolated.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramVal));
        }
        return interpolated;
      }

      return text;
    },
    [language]
  );

  const formatCurrency = useCallback(
    (amount: number, showDecimals: boolean = false): string => {
      try {
        const formatter = new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "INR",
          minimumFractionDigits: showDecimals ? 2 : 0,
          maximumFractionDigits: 2,
        });
        return formatter.format(amount);
      } catch {
        return `₹${amount.toLocaleString()}`;
      }
    },
    [locale]
  );

  const formatDate = useCallback(
    (dateInput: Date | string, options?: Intl.DateTimeFormatOptions): string => {
      try {
        const dateObj = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
        return new Intl.DateTimeFormat(locale, options || {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(dateObj);
      } catch {
        return String(dateInput);
      }
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      locale,
      formatCurrency,
      formatDate,
    }),
    [language, setLanguage, t, locale, formatCurrency, formatDate]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
