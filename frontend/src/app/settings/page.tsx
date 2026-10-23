"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Store,
  Languages,
  Mic,
  Coins,
  BellRing,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default function SettingsPage() {
  const [shopName, setShopName] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hisabkitab_shop_profile");
      if (saved) {
        try { return JSON.parse(saved).shopName || "Gupta Kirana & General Store"; } catch {}
      }
    }
    return "Gupta Kirana & General Store";
  });
  const [ownerName, setOwnerName] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hisabkitab_shop_profile");
      if (saved) {
        try { return JSON.parse(saved).ownerName || "Rajesh Gupta"; } catch {}
      }
    }
    return "Rajesh Gupta";
  });
  const [phone, setPhone] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hisabkitab_shop_profile");
      if (saved) {
        try { return JSON.parse(saved).phone || "+91 98450 12345"; } catch {}
      }
    }
    return "+91 98450 12345";
  });
  const [gstin, setGstin] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hisabkitab_shop_profile");
      if (saved) {
        try { return JSON.parse(saved).gstin || "29ABCDE1234F1Z5"; } catch {}
      }
    }
    return "29ABCDE1234F1Z5";
  });
  const [city, setCity] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hisabkitab_shop_profile");
      if (saved) {
        try { return JSON.parse(saved).city || "Bengaluru, Karnataka"; } catch {}
      }
    }
    return "Bengaluru, Karnataka";
  });

  const [selectedLang, setSelectedLang] = useState<"en" | "hi" | "kn" | "ur">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hisabkitab_voice_lang");
      if (saved && (saved === "en" || saved === "hi" || saved === "kn" || saved === "ur")) {
        return saved as "en" | "hi" | "kn" | "ur";
      }
    }
    return "en";
  });
  const [currency, setCurrency] = useState("INR");
  const [autoReparse, setAutoReparse] = useState(true);
  const [soundFeedback, setSoundFeedback] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSelectLanguage = (lang: "en" | "hi" | "kn" | "ur") => {
    setSelectedLang(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("hisabkitab_voice_lang", lang);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("hisabkitab_voice_lang", selectedLang);
      localStorage.setItem(
        "hisabkitab_shop_profile",
        JSON.stringify({ shopName, ownerName, phone, gstin, city })
      );
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Settings & Preferences
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your store profile, voice speech models, and regional languages
          </p>
        </div>

        {saveSuccess && (
          <Badge variant="emerald" className="py-1 px-3 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Settings Saved</span>
          </Badge>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Shop Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4 text-emerald-600" />
              <span>Shop Profile</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Shop Name"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
              <Input
                label="Proprietor / Owner Name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Contact Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="GSTIN (Optional)"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
              />
              <Input
                label="City / Location"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Regional Language & Dialect Readiness */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Languages className="h-4 w-4 text-emerald-600" />
              <span>Language & Dialect Readiness</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">
              Select your primary conversational language for shop voice recognition:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* English */}
              <div
                onClick={() => handleSelectLanguage("en")}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedLang === "en"
                    ? "bg-emerald-50 border-emerald-600 ring-1 ring-emerald-600"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">English</span>
                  <Badge variant="emerald">Live</Badge>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Indian English + Hinglish terms</p>
              </div>

              {/* Hindi */}
              <div
                onClick={() => handleSelectLanguage("hi")}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedLang === "hi"
                    ? "bg-emerald-50 border-emerald-600 ring-1 ring-emerald-600"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">हिन्दी (Hindi)</span>
                  <Badge variant="emerald">Live</Badge>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">तूर दाल, तेल, चीनी, आटा</p>
              </div>

              {/* Kannada */}
              <div
                onClick={() => handleSelectLanguage("kn")}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedLang === "kn"
                    ? "bg-emerald-50 border-emerald-600 ring-1 ring-emerald-600"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">ಕನ್ನಡ (Kannada)</span>
                  <Badge variant="blue">Ready</Badge>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">ಅಕ್ಕಿ, ಬೇಳೆ, ಎಣ್ಣೆ, ಸಕ್ಕರೆ</p>
              </div>

              {/* Urdu RTL */}
              <div
                onClick={() => handleSelectLanguage("ur")}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedLang === "ur"
                    ? "bg-emerald-50 border-emerald-600 ring-1 ring-emerald-600"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">اردو (Urdu)</span>
                  <Badge variant="gray">RTL Prep</Badge>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Layout RTL architectural support</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voice Engine Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mic className="h-4 w-4 text-emerald-600" />
              <span>Voice Interaction Preferences</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Auto-parse spoken items</p>
                <p className="text-xs text-slate-500">
                  Automatically parse items when silence is detected
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoReparse}
                onChange={(e) => setAutoReparse(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-900">Subtle audio chime on confirmation</p>
                <p className="text-xs text-slate-500">
                  Plays a soft confirmation chime when a sale is confirmed
                </p>
              </div>
              <input
                type="checkbox"
                checked={soundFeedback}
                onChange={(e) => setSoundFeedback(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Currency & Accounting Standard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-600" />
              <span>Currency & Numbering Format</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Indian Rupee (INR ₹)</p>
                <p className="text-xs text-slate-500">
                  Formatted with lakhs & crores standard: ₹1,00,000.00
                </p>
              </div>
              <Badge variant="emerald">Default Standard</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" className="shadow-sm">
            <span>Save Preferences</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
