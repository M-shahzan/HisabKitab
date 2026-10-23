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
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function NewOrderPage() {
  const router = useRouter();
  const { allProducts } = useStock();
  const [productPickerOpen, setProductPickerOpen] = useState(false);

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
  } = useVoiceBilling();

  // Once sale is confirmed, redirect to success screen with receipt details
  useEffect(() => {
    if (state === "success" && confirmedSale) {
      sessionStorage.setItem("lastConfirmedSale", JSON.stringify(confirmedSale));
      router.push("/billing/success");
    }
  }, [state, confirmedSale, router]);

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
                New Order
              </h2>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Voice AI Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Draft ID:{" "}
              <span className="font-mono font-bold text-slate-800">
                {billId ? `#${billId}` : "#New-Order"}
              </span>{" "}
              • Tap the large mic below or speak order naturally
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
              <span>Dashboard</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setProductPickerOpen(true)}
            className="bg-white min-h-[40px]"
          >
            <Plus className="h-4 w-4 mr-1.5 text-emerald-600" />
            <span>Add Item Manually</span>
          </Button>
        </div>
      </div>

      {/* Main Voice Interaction Hero Panel */}
      <Card className="border-emerald-200/60 bg-gradient-to-b from-emerald-50/50 via-white to-white shadow-card overflow-hidden">
        <CardContent className="pt-6 pb-6">
          {/* Spoken Voice Guidance Hints */}
          <div className="mb-4 flex flex-wrap items-center gap-2 justify-center text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Volume2 className="h-3.5 w-3.5 text-emerald-600" />
              Voice Guide:
            </span>
            <span className="text-xs text-slate-600">
              Speak naturally e.g. &ldquo;Do kilo chawal, ek kilo cheeni&rdquo; or &ldquo;Ek litre sarson tel&rdquo;
            </span>
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
                    Voice Operation Notice
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
                <span>Try Again</span>
              </Button>
            </div>
          )}

          {/* Low Stock Warning Banner if returned by server */}
          {lowStockWarnings && lowStockWarnings.length > 0 && (
            <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-950">
                  Low Stock Alert for Items in Bill
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  The following items are running low in stock:{" "}
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
                <span>Bill Items ({items.length})</span>
              </h3>
              {hasUnsavedEdits && (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  Local Edits Applied
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
                <span>Add More</span>
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No items in this draft bill yet"
              description="Tap the large microphone button above and speak your customer's items (e.g., '2 kg rice and 1 litre oil') or tap 'Add Item Manually'."
              actionLabel="Add from Stock"
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
