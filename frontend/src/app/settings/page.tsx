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

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { SupportedLanguage } from "@/lib/i18n/translations";

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();

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

  const [currency, setCurrency] = useState("INR");
  const [autoReparse, setAutoReparse] = useState(true);
  const [soundFeedback, setSoundFeedback] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleLangChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("hisabkitab_voice_lang", lang);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("hisabkitab_voice_lang", language);
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
            {t("settings.title")}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("settings.subtitle")}
          </p>
        </div>

        {saveSuccess && (
          <Badge variant="emerald" className="py-1 px-3 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{t("settings.saved")}</span>
          </Badge>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Shop Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4 text-emerald-600" />
              <span>{t("settings.shopProfile")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t("settings.shopName")}
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
              <Input
                label={t("settings.ownerName")}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label={t("settings.phone")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label={t("settings.gstin")}
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
              />
              <Input
                label={t("settings.city")}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Website Language Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Languages className="h-4 w-4 text-emerald-600" />
              <span>{t("settings.languageSectionTitle")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">
              {t("settings.languageSectionSubtitle")}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* English */}
              <div
                onClick={() => handleLangChange("en")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  language === "en"
                    ? "bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600 shadow-sm"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">English</span>
                  <Badge variant="emerald">{t("settings.liveBadge")}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">Indian English + Hinglish retail terminology</p>
              </div>

              {/* Hindi */}
              <div
                onClick={() => handleLangChange("hi")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  language === "hi"
                    ? "bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600 shadow-sm"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">हिन्दी (Hindi)</span>
                  <Badge variant="emerald">{t("settings.liveBadge")}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">दुकान का पूरा हिसाब और बिलिंग हिंदी में</p>
              </div>

              {/* Kannada */}
              <div
                onClick={() => handleLangChange("kn")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  language === "kn"
                    ? "bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600 shadow-sm"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">ಕನ್ನಡ (Kannada)</span>
                  <Badge variant="emerald">{t("settings.readyBadge")}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">ಸಂಪೂರ್ಣ ಕಿರಾಣಿ ಬಿಲ್ಲಿಂಗ್ ಮತ್ತು ದಾಸ್ತಾನು ಕನ್ನಡದಲ್ಲಿ</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voice Engine Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mic className="h-4 w-4 text-emerald-600" />
              <span>{t("settings.voiceSectionTitle")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{t("settings.autoParseTitle")}</p>
                <p className="text-xs text-slate-500">
                  {t("settings.autoParseSub")}
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
                <p className="text-sm font-semibold text-slate-900">{t("settings.chimeTitle")}</p>
                <p className="text-xs text-slate-500">
                  {t("settings.chimeSub")}
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
              <span>{t("settings.currencySectionTitle")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{t("settings.rupeeTitle")}</p>
                <p className="text-xs text-slate-500">
                  {t("settings.rupeeSub")}
                </p>
              </div>
              <Badge variant="emerald">{t("settings.defaultStandard")}</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" className="shadow-sm">
            <span>{t("settings.savePreferences")}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
