"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVoiceBilling } from "@/hooks/useVoiceBilling";
import { useStock } from "@/hooks/useStock";
import { MicrophoneButton } from "@/components/billing/MicrophoneButton";
import { AudioWaveform } from "@/components/billing/AudioWaveform";
import { TranscriptPanel } from "@/components/billing/TranscriptPanel";
import { BillItemRow } from "@/components/billing/BillItemRow";
import { BillSummary } from "@/components/billing/BillSummary";
import { ProductPicker } from "@/components/billing/ProductPicker";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorState, EmptyState } from "@/components/ui/States";
import {
  Sparkles,
  Plus,
  ShoppingBag,
  Volume2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  LayoutDashboard,
  Store,
  Languages,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  LANGUAGE_OPTIONS,
  SAMPLE_VOICE_SCRIPTS_BY_LANG,
  SAMPLE_VOICE_SCRIPTS,
} from "@/lib/mock-data";

export default function NewOrderPage() {
  const router = useRouter();
  const { allProducts } = useStock();
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const { t } = useLanguage();

  const {
    state,
    transcript,
    items,
    billId,
    spokenMessage,
    isSpeaking,
    audioLevel,
    subtotal,
    total,
    errorMessage,
    lowStockWarnings,
    confirmedSale,
    paymentMode,
    hasUnsavedEdits,
    selectedLanguage,
    setSelectedLanguage,
    setPaymentMode,
    startListening,
    stopListening,
    processTranscript,
    replayAudio,
    stopAudio,
    updateItemQuantity,
    removeItem,
    addItem,
    resetBill,
    confirmSale,
    language,
    setLanguage,
  } = useVoiceBilling();

  const activeLanguageMeta =
    LANGUAGE_OPTIONS.find((l) => l.id === selectedLanguage) || LANGUAGE_OPTIONS[0];

  const currentVoiceScripts =
    SAMPLE_VOICE_SCRIPTS_BY_LANG[selectedLanguage] || SAMPLE_VOICE_SCRIPTS;

  // Once sale is confirmed, redirect to success screen with receipt details
  useEffect(() => {
    if (state === "success" && confirmedSale) {
      sessionStorage.setItem("lastConfirmedSale", JSON.stringify(confirmedSale));
      router.push("/billing/success");
    }
  }, [state, confirmedSale, router]);

  const handleQuickScript = (text: string) => {
    processTranscript(text, selectedLanguage);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Primary New Order Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-sm">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {t("order.newOrder")}
              </h2>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {t("order.voiceAiReady")}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("order.draftId")}{" "}
              <span className="font-mono font-bold text-slate-800">
                {billId ? `#${billId}` : t("order.newOrderDraft")}
              </span>{" "}
              • {t("order.heroInstruction")}
            </p>
          </div>
        </div>

        {/* Quick Actions Header */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="bg-white text-slate-700 hover:text-slate-900 min-h-[40px]"
              title="View daily revenue, transactions, and store performance"
            >
              <LayoutDashboard className="h-4 w-4 mr-1.5 text-slate-500" />
              <span>{t("nav.dashboard")}</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setProductPickerOpen(true)}
            className="bg-white min-h-[40px]"
          >
            <Plus className="h-4 w-4 mr-1.5 text-emerald-600" />
            <span>{t("order.addItemManually")}</span>
          </Button>
        </div>
      </div>

      {/* Main Voice Interaction Hero Panel */}
      <Card className="border-emerald-200/60 bg-gradient-to-b from-emerald-50/50 via-white to-white shadow-card overflow-hidden">
        <CardContent className="pt-6 pb-6">
          {/* Conversational Language & Dialect Readiness Selector */}
          <div className="mb-6 bg-white/80 p-3.5 sm:p-4 rounded-2xl border border-emerald-100/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Languages className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      Voice Recognition Language
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      1-Tap Quick Switch
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 hidden sm:block">
                    Select your primary counter language for speech recognition and instant audio readback
                  </p>
                </div>
              </div>
              <div className="text-xs text-slate-600 sm:text-right">
                Active: <span className="font-bold text-emerald-700">{activeLanguageMeta.name}</span>
              </div>
            </div>

            {/* 4 Regional Language Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {LANGUAGE_OPTIONS.map((lang) => {
                const isSelected = selectedLanguage === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setSelectedLanguage(lang.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between group min-h-[68px] ${
                      isSelected
                        ? "bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-600 shadow-sm"
                        : "bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full gap-1">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-950">
                        {lang.name}
                      </span>
                      <Badge variant={lang.badgeVariant} className="text-[10px] px-1.5 py-0 h-4.5 shrink-0">
                        {lang.badge}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 leading-snug">
                      {lang.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Quick Voice Demo Presets for Selected Language */}
            <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex flex-wrap items-center gap-2 justify-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Volume2 className="h-3 w-3 text-emerald-600" />
                Quick Voice Test ({activeLanguageMeta.nativeName}):
              </span>
              {currentVoiceScripts.map((script, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickScript(script.text)}
                  disabled={state === "listening" || state === "processing" || state === "saving"}
                  className="text-xs font-medium bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 shadow-xs transition-colors disabled:opacity-50 min-h-[32px] flex items-center gap-1.5"
                  title={script.text}
                >
                  <Sparkles className="h-3 w-3 text-emerald-600 shrink-0" />
                  <span>&ldquo;{script.title}&rdquo;</span>
                </button>
              ))}
            </div>
          </div>

          {/* Spoken Voice Guidance Hints */}
          <div className="mb-3 flex flex-wrap items-center gap-2 justify-center text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Volume2 className="h-3.5 w-3.5 text-emerald-600" />
              {t("order.voiceGuide")}
            </span>
            <span className="text-xs text-slate-600">
              {language === "kn" && <>Speak naturally e.g. &ldquo;2 ಕೆಜಿ ಅಕ್ಕಿ, 1 ಕೆಜಿ ಸಕ್ಕರೆ&rdquo; or &ldquo;ಸ್ಟಾಕ್‌ಗೆ 10 ಕೆಜಿ ಅಕ್ಕಿ ಸೇರಿಸಿ&rdquo;</>}
              {language === "hi" && <>Speak naturally e.g. &ldquo;2 kilo chawal, 1 kilo cheeni&rdquo; or &ldquo;Stock mein 10 kg chawal add karo&rdquo;</>}
              {language === "en" && <>Speak naturally e.g. &ldquo;2 kg rice, 1 kg sugar&rdquo; or &ldquo;Add 10 kg rice to stock&rdquo;</>}
              {language === "ta" && <>Speak naturally e.g. &ldquo;2 kg arisi, 1 kg chini&rdquo; or &ldquo;Stockil 10 kg arisi serka&rdquo;</>}
              {language === "te" && <>Speak naturally e.g. &ldquo;2 kg biyyam, 1 kg chekkera&rdquo; or &ldquo;Stock lo 10 kg biyyam kalapandi&rdquo;</>}
              {language === "mr" && <>Speak naturally e.g. &ldquo;2 kilo tandul, 1 kilo sakhar&rdquo; or &ldquo;Stock madhe 10 kilo tandul taka&rdquo;</>}
              {language === "gu" && <>Speak naturally e.g. &ldquo;2 kilo chokha, 1 kilo khand&rdquo; or &ldquo;Stock ma 10 kilo chokha umelo&rdquo;</>}
              {language === "bn" && <>Speak naturally e.g. &ldquo;2 kg chal, 1 kg chini&rdquo; or &ldquo;Stock-e 10 kg chal jog koro&rdquo;</>}
            </span>
          </div>

          {/* Language Selection on top of the mic */}
          <div className="mb-4 flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Languages className="h-3.5 w-3.5 text-emerald-600" />
              {t("order.language")}
            </span>
            <div className="flex flex-wrap justify-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm max-w-xl">
              {[
                { code: "kn", label: "ಕನ್ನಡ", name: "Kannada" },
                { code: "hi", label: "हिंदी", name: "Hindi" },
                { code: "en", label: "English", name: "English" },
                { code: "ta", label: "தமிழ்", name: "Tamil" },
                { code: "te", label: "తెలుగు", name: "Telugu" },
                { code: "mr", label: "मराठी", name: "Marathi" },
                { code: "gu", label: "ગુજરાતી", name: "Gujarati" },
                { code: "bn", label: "বাংলা", name: "Bengali" },
              ].map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLanguage(l.code)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    language === l.code
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                  title={`${l.name} (${l.label})`}
                >
                  {l.label} ({l.name})
                </button>
              ))}
            </div>
          </div>

          {/* Central Microphone Button (MediaRecorder) */}
          <MicrophoneButton
            state={state}
            onStart={startListening}
            onStop={stopListening}
          />

          {/* Audio Waveform Live Visualizer */}
          <AudioWaveform isListening={state === "listening"} audioLevel={audioLevel} />

          {/* Recognized Speech Transcript & Assistant Spoken Response */}
          <TranscriptPanel
            transcript={transcript}
            spokenMessage={spokenMessage}
            isSpeaking={isSpeaking}
            onReplayAudio={replayAudio}
            onStopAudio={stopAudio}
            onRetry={startListening}
            onEditSubmit={processTranscript}
          />

          {/* Error Message banner with retry action */}
          {errorMessage && (
            <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start sm:items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-900">
                    {t("order.voiceOperationNotice")}
                  </p>
                  <p className="text-xs sm:text-sm text-red-700 mt-0.5">{errorMessage}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={startListening}
                className="self-start sm:self-auto bg-white border-red-200 text-red-700 hover:bg-red-100 min-h-[36px]"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                <span>{t("common.retry")}</span>
              </Button>
            </div>
          )}

          {/* Low Stock Warning Banner if returned by server */}
          {lowStockWarnings && lowStockWarnings.length > 0 && (
            <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-950">
                  {t("order.lowStockAlert")}
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  {t("order.lowStockDesc")}:{" "}
                  {lowStockWarnings
                    .map((item) => `${item.name || item.item_id} (${item.quantity ?? 0} left)`)
                    .join(", ")}
                  .
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill Items Review & Summary Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recognized Bill Items List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-emerald-600" />
                <span>{t("order.billItems")} ({items.length})</span>
              </h3>
              {hasUnsavedEdits && (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  {t("order.localEditsApplied")}
                </span>
              )}
            </div>

            {items.length > 0 && (
              <button
                type="button"
                onClick={() => setProductPickerOpen(true)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 min-h-[36px] px-2"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t("order.addMore")}</span>
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title={t("order.noItemsTitle")}
              description={t("order.noItemsDesc")}
              actionLabel={t("order.addFromStock")}
              onAction={() => setProductPickerOpen(true)}
            />
          ) : (
            <div className="space-y-2.5">
              <AnimatePresence>
                {items.map((item) => (
                  <BillItemRow
                    key={item.id}
                    item={item}
                    onUpdateQuantity={updateItemQuantity}
                    onRemove={removeItem}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right Col: Bill Totals & Confirm Sale */}
        <div className="lg:col-span-1">
          <div className="sticky top-20">
            <BillSummary
              subtotal={subtotal}
              total={total}
              itemCount={items.length}
              paymentMode={paymentMode}
              onPaymentModeChange={setPaymentMode}
              onAddItem={() => setProductPickerOpen(true)}
              onCancel={resetBill}
              onConfirm={confirmSale}
              isSaving={state === "saving"}
              disabled={state === "processing"}
            />
          </div>
        </div>
      </div>

      {/* Product Selection Modal */}
      <ProductPicker
        open={productPickerOpen}
        onOpenChange={setProductPickerOpen}
        products={allProducts}
        onSelectProduct={addItem}
      />
    </div>
  );
}
