import {
  BackendBill,
  BackendBillLine,
  BillItem,
  CancelApiResponse,
  ConfirmApiResponse,
  VoiceApiResponse,
} from "@/types/billing";
import { UnitOfMeasure } from "@/types/product";
import { apiFetch, ApiError } from "./api-client";
import { INITIAL_PRODUCTS, SAMPLE_VOICE_SCRIPTS } from "@/lib/mock-data";
import { multiplyMoney } from "@/lib/formatters";

/**
 * Maps a backend bill line to frontend BillItem model
 */
export function mapBackendLineToBillItem(line: BackendBillLine, idx: number): BillItem {
  return {
    id: `line-${line.item_id || idx}-${idx}`,
    productId: `prod-${line.item_id}`,
    productName: line.name,
    quantity: Number(line.qty) || 1,
    unit: (line.unit || "packet") as UnitOfMeasure,
    unitPrice: Number(line.unit_price) || 0,
    lineTotal: Number(line.amount) || multiplyMoney(Number(line.unit_price) || 0, Number(line.qty) || 1),
    itemId: line.item_id,
  };
}

/**
 * POST /voice
 * Sends recorded audio blob to backend speech recognition & billing pipeline
 */
export async function sendVoiceAudio(
  audioBlob: Blob,
  billId?: string,
  language: string = "hi"
): Promise<VoiceApiResponse> {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");

  if (billId) {
    formData.append("bill_id", billId);
  }
  if (language) {
    formData.append("language", language);
  }

  try {
    return await apiFetch<VoiceApiResponse>("/voice", {
      method: "POST",
      body: formData,
    });
  } catch (err: any) {
    // If backend is unavailable, provide helpful development fallback with explicit notice
    console.warn("Backend /voice unavailable, using development fallback:", err?.message);
    return getOfflineVoiceFallback(billId, language);
  }
}

/**
 * Fallback parser for text transcripts (used for manual text corrections or demo presets)
 */
export async function parseTranscriptFallback(
  text: string,
  billId?: string
): Promise<VoiceApiResponse> {
  // Try sending as audio blob or simulated payload if backend supports text
  try {
    // First try a FormData upload with a text note or wav header
    const blob = new Blob([text], { type: "text/plain" });
    const formData = new FormData();
    formData.append("file", blob, "transcript.txt");
    if (billId) formData.append("bill_id", billId);

    return await apiFetch<VoiceApiResponse>("/voice", {
      method: "POST",
      body: formData,
    });
  } catch {
    // Local NLP simulation matching catalogue
    const lower = text.toLowerCase();
    const matchedSample =
      SAMPLE_VOICE_SCRIPTS.find((s) => lower.includes(s.title.toLowerCase())) ||
      SAMPLE_VOICE_SCRIPTS[0];

    const lines: BackendBillLine[] = [];
    if (lower.includes("rice") || lower.includes("chawal")) {
      lines.push({
        item_id: 1,
        name: "Basmati Rice Premium",
        qty: lower.includes("5") ? 5 : lower.includes("1") ? 1 : 2,
        unit: "kg",
        unit_price: 65,
        amount: (lower.includes("5") ? 5 : lower.includes("1") ? 1 : 2) * 65,
      });
    }
    if (lower.includes("oil") || lower.includes("tel")) {
      lines.push({
        item_id: 2,
        name: "Fortune Sunflower Oil",
        qty: 1,
        unit: "litre",
        unit_price: 140,
        amount: 140,
      });
    }
    if (lower.includes("sugar") || lower.includes("cheeni") || lower.includes("shakkar")) {
      lines.push({
        item_id: 3,
        name: "Refined White Sugar",
        qty: lower.includes("half") || lower.includes("0.5") ? 0.5 : 1,
        unit: "kg",
        unit_price: 45,
        amount: lower.includes("half") || lower.includes("0.5") ? 22.5 : 45,
      });
    }

    if (lines.length === 0) {
      matchedSample.items.forEach((item, idx) => {
        lines.push({
          item_id: idx + 1,
          name: item.productName,
          qty: item.quantity,
          unit: item.unit,
          unit_price: item.unitPrice,
          amount: item.quantity * item.unitPrice,
        });
      });
    }

    const total = lines.reduce((acc, l) => acc + l.amount, 0);
    const draftId = billId || `b_${Date.now().toString(36)}`;

    return {
      transcript: text,
      intent: "new_sale",
      bill: {
        bill_id: draftId,
        lines,
        total,
        status: "draft",
      },
      message: `Total bill is ${total} rupees. Please confirm or edit.`,
    };
  }
}

/**
 * POST /confirm
 * Sends { "bill_id": "..." } to complete the sale on the backend
 */
export async function confirmBill(billId: string): Promise<ConfirmApiResponse> {
  if (!billId) {
    throw new Error("Cannot confirm sale: Missing valid draft bill ID.");
  }

  try {
    return await apiFetch<ConfirmApiResponse>("/confirm", {
      method: "POST",
      body: JSON.stringify({ bill_id: billId }),
    });
  } catch (err: any) {
    // If backend is unavailable, report clear offline error without faking a saved database sale
    throw new Error(
      `Confirmation failed: ${err?.message || "Backend /confirm endpoint unreachable"}. The sale was not recorded.`
    );
  }
}

/**
 * POST /cancel
 * Sends { "bill_id": "..." } to cancel an active draft bill on the server
 */
export async function cancelBill(billId: string): Promise<CancelApiResponse> {
  if (!billId) {
    return { ok: true };
  }

  try {
    return await apiFetch<CancelApiResponse>("/cancel", {
      method: "POST",
      body: JSON.stringify({ bill_id: billId }),
    });
  } catch (err: any) {
    console.warn("Backend /cancel failed, proceeding with local reset:", err?.message);
    return { ok: true, message: "Draft cleared locally." };
  }
}

/**
 * POST /correction
 * Submits shopkeeper speech correction to improve the language model
 */
export async function sendCorrection(
  heardText: string,
  itemId: number
): Promise<{ ok: boolean }> {
  try {
    return await apiFetch<{ ok: boolean }>("/correction", {
      method: "POST",
      body: JSON.stringify({ heard_text: heardText, item_id: itemId }),
    });
  } catch (err: any) {
    console.warn("Failed to record correction on backend:", err?.message);
    return { ok: false };
  }
}

/**
 * Offline simulation fallback with mock voice script when server is offline
 */
function getOfflineVoiceFallback(billId?: string, language: string = "hi"): VoiceApiResponse {
  const sample = SAMPLE_VOICE_SCRIPTS[0];
  const lines: BackendBillLine[] = sample.items.map((item, idx) => ({
    item_id: idx + 1,
    name: item.productName,
    qty: item.quantity,
    unit: item.unit,
    unit_price: item.unitPrice,
    amount: item.quantity * item.unitPrice,
  }));

  const total = lines.reduce((acc, l) => acc + l.amount, 0);
  const draftId = billId || `b_${Math.random().toString(36).substring(2, 8)}`;

  return {
    transcript: sample.text,
    intent: "new_sale",
    bill: {
      bill_id: draftId,
      lines,
      total,
      status: "draft",
    },
    message: `Total is ${total} rupees. Offline preview mode.`,
  };
}
