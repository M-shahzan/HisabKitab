"use client";

import { useState, useCallback, useRef } from "react";
import {
  BillingState,
  BillItem,
  ConfirmApiResponse,
  ConfirmSaleResponse,
  VoiceApiResponse,
} from "@/types/billing";
import {
  sendVoiceAudio,
  parseTranscriptFallback,
  confirmBill,
  cancelBill,
  mapBackendLineToBillItem,
} from "@/services/billing-service";
import { audioRecorder } from "@/services/audio-recorder";
import { ttsService } from "@/services/tts-service";
import { deductStockForSale } from "@/services/stock-service";
import { recordNewTransaction } from "@/services/summary-service";
import { multiplyMoney, sumMoney } from "@/lib/formatters";

export type SupportedLanguage = "en" | "hi" | "kn" | "ur";

const LANG_TTS_CODE: Record<SupportedLanguage, string> = {
  en: "en-IN",
  hi: "hi-IN",
  kn: "kn-IN",
  ur: "ur-IN",
};

export function useVoiceBilling() {
  const [state, setState] = useState<BillingState>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const [items, setItems] = useState<BillItem[]>([]);
  const [billId, setBillId] = useState<string | null>(null);
  const [spokenMessage, setSpokenMessage] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lowStockWarnings, setLowStockWarnings] = useState<any[]>([]);
  const [confirmedSale, setConfirmedSale] = useState<ConfirmSaleResponse | null>(null);
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "khata">("cash");
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState<boolean>(false);

  // Active voice language (synced with settings and persisted)
  const [selectedLanguage, setSelectedLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hisabkitab_voice_lang");
      if (saved && (saved === "en" || saved === "hi" || saved === "kn" || saved === "ur")) {
        return saved as SupportedLanguage;
      }
    }
    return "en";
  });

  const setSelectedLanguage = useCallback((lang: SupportedLanguage) => {
    setSelectedLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("hisabkitab_voice_lang", lang);
    }
  }, []);

  // Subtotal & Grand total recalculated from current items
  const subtotal = sumMoney(items.map((i) => i.lineTotal));
  const total = subtotal;

  /**
   * Helper to process a voice API response and sync state
   */
  const handleVoiceResponse = useCallback(
    (response: VoiceApiResponse, langToSpeak?: SupportedLanguage) => {
      setTranscript(response.transcript || "");

      if (response.bill) {
        if (response.bill.bill_id) {
          setBillId(response.bill.bill_id);
        }
        if (Array.isArray(response.bill.lines)) {
          const mapped = response.bill.lines.map(mapBackendLineToBillItem);
          setItems(mapped);
        }
      }

      setHasUnsavedEdits(false);
      setState("review");

      // Spoken response playback with localized dialect voice
      if (response.message) {
        setSpokenMessage(response.message);
        const voiceLang = langToSpeak || selectedLanguage;
        ttsService.speak(response.message, LANG_TTS_CODE[voiceLang] || "en-IN", {
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      }
    },
    [selectedLanguage]
  );

  /**
   * Start microphone audio recording on user click
   */
  const startListening = useCallback(async () => {
    if (state === "listening" || state === "processing" || state === "saving") return;

    setErrorMessage(null);
    ttsService.stop();
    setIsSpeaking(false);

    try {
      setState("listening");
      await audioRecorder.start({
        onAudioLevel: (level) => {
          setAudioLevel(level);
        },
        onError: (err) => {
          setState("error");
          setErrorMessage(err);
          setAudioLevel(0);
        },
      });
    } catch (err: any) {
      setState("error");
      setErrorMessage(
        err?.message || "Microphone access could not be established. Please check permissions."
      );
      setAudioLevel(0);
    }
  }, [state]);

  /**
   * Stop recording and send audio blob to POST /voice
   */
  const stopListening = useCallback(async () => {
    if (state !== "listening") return;

    setState("processing");
    setAudioLevel(0);
    setErrorMessage(null);

    try {
      const audioBlob = await audioRecorder.stop();

      if (!audioBlob || audioBlob.size === 0) {
        setState("error");
        setErrorMessage("Empty audio recording. Please speak and try again.");
        return;
      }

      // Send to backend /voice with active bill_id and selected language
      const response = await sendVoiceAudio(audioBlob, billId || undefined, selectedLanguage);
      handleVoiceResponse(response, selectedLanguage);
    } catch (err: any) {
      audioRecorder.cancel();
      setState("error");
      setErrorMessage(
        err?.message || "Failed to process audio with server. Please try speaking again."
      );
    }
  }, [state, billId, selectedLanguage, handleVoiceResponse]);

  /**
   * Process manual text transcript (e.g. from editing text or demo presets)
   */
  const processTranscript = useCallback(
    async (textToParse: string, langOverride?: SupportedLanguage) => {
      if (!textToParse.trim()) return;

      setState("processing");
      setErrorMessage(null);
      ttsService.stop();
      setIsSpeaking(false);

      try {
        const activeLang = langOverride || selectedLanguage;
        const result = await parseTranscriptFallback(textToParse, billId || undefined, activeLang);
        handleVoiceResponse(result, activeLang);
      } catch (err: any) {
        setState("error");
        setErrorMessage(err?.message || "Failed to process spoken items. Please retry.");
      }
    },
    [billId, selectedLanguage, handleVoiceResponse]
  );

  /**
   * Replay the spoken response
   */
  const replayAudio = useCallback(() => {
    if (!spokenMessage) return;
    ttsService.speak(spokenMessage, LANG_TTS_CODE[selectedLanguage] || "en-IN", {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [spokenMessage, selectedLanguage]);

  /**
   * Stop any ongoing speech playback
   */
  const stopAudio = useCallback(() => {
    ttsService.stop();
    setIsSpeaking(false);
  }, []);

  /**
   * Tap-based line quantity stepper (+ / -)
   */
  const updateItemQuantity = useCallback((itemId: string, newQuantity: number) => {
    setHasUnsavedEdits(true);
    if (newQuantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity: newQuantity,
            lineTotal: multiplyMoney(item.unitPrice, newQuantity),
          };
        }
        return item;
      })
    );
  }, []);

  /**
   * Tap-based remove item
   */
  const removeItem = useCallback((itemId: string) => {
    setHasUnsavedEdits(true);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  /**
   * Manual product picker addition
   */
  const addItem = useCallback(
    (product: Omit<BillItem, "id" | "lineTotal">) => {
      setHasUnsavedEdits(true);
      const newItem: BillItem = {
        ...product,
        id: `line-manual-${Date.now()}-${Math.random()}`,
        lineTotal: multiplyMoney(product.unitPrice, product.quantity),
      };
      setItems((prev) => [...prev, newItem]);
      if (state === "idle" || state === "error") {
        setState("review");
      }
    },
    [state]
  );

  /**
   * Cancel sale and notify backend POST /cancel
   */
  const cancelSale = useCallback(async () => {
    ttsService.stop();
    setIsSpeaking(false);

    if (billId) {
      try {
        await cancelBill(billId);
      } catch (err) {
        console.warn("Error calling /cancel on backend:", err);
      }
    }

    // Reset local state
    setState("idle");
    setTranscript("");
    setItems([]);
    setBillId(null);
    setSpokenMessage("");
    setErrorMessage(null);
    setLowStockWarnings([]);
    setConfirmedSale(null);
    setHasUnsavedEdits(false);
  }, [billId]);

  /**
   * Confirm sale via backend POST /confirm
   */
  const confirmSale = useCallback(async () => {
    if (items.length === 0 || state === "saving") return null;

    setState("saving");
    setErrorMessage(null);
    ttsService.stop();
    setIsSpeaking(false);

    if (!billId) {
      setErrorMessage("No active draft bill to confirm. Please create a draft bill first.");
      setState("review");
      return null;
    }

    try {
      const response: ConfirmApiResponse = await confirmBill(billId);

      // Extract low stock warnings if any
      const lowStockList = response.low_stock || [];
      setLowStockWarnings(lowStockList);

      const saleReceipt: ConfirmSaleResponse = {
        success: true,
        billNumber: String(response.sale_id || response.billNumber || billId),
        transactionId: `txn-${Date.now()}`,
        total: response.total ?? total,
        itemCount: items.length,
        timestamp: new Date().toISOString(),
        paymentMode,
        items: items.map((i) => ({ ...i })),
        lowStockItems: lowStockList,
        stockUpdates: items.map((i) => ({
          productId: i.productId,
          newQuantity: Math.max(0, 50 - i.quantity),
        })),
      };

      // Record in local session and update inventory
      await deductStockForSale(items);
      recordNewTransaction({
        id: saleReceipt.transactionId,
        billNumber: saleReceipt.billNumber,
        itemCount: saleReceipt.itemCount,
        total: saleReceipt.total,
        paymentMode,
        createdAt: saleReceipt.timestamp,
        status: "completed",
        items,
      });

      // Clear draft bill only after successful server confirmation!
      setConfirmedSale(saleReceipt);
      setBillId(null);
      setItems([]);
      setState("success");
      return saleReceipt;
    } catch (err: any) {
      // Keep draft bill intact on failure so user can retry without losing items!
      setState("review");
      setErrorMessage(
        err?.message || "Failed to confirm sale with backend server. Your draft bill is preserved. Please retry."
      );
      return null;
    }
  }, [items, state, billId, total, paymentMode]);

  return {
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
    resetBill: cancelSale,
    confirmSale,
  };
}
