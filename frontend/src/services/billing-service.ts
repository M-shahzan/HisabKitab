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
 * Matches FastAPI endpoint fields: audio (UploadFile), bill_id (Form str), language (Form str)
 */
export async function sendVoiceAudio(
  audioBlob: Blob,
  billId?: string,
  language: string = "hi"
): Promise<VoiceApiResponse> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");

  if (billId) {
    formData.append("bill_id", billId);
  }
  if (language) {
    formData.append("language", language);
  }

  return await apiFetch<VoiceApiResponse>("/voice", {
    method: "POST",
    body: formData,
  });
}

/**
 * Direct transcript processing requires speech audio for backend pipeline
 */
export async function parseTranscriptFallback(
  text: string,
  billId?: string
): Promise<VoiceApiResponse> {
  throw new Error("Text-only parsing is not supported; please record audio using the microphone button.");
}

/**
 * POST /confirm
 * Sends { "bill_id": "..." } to complete the sale on the backend
 */
export async function confirmBill(billId: string): Promise<ConfirmApiResponse> {
  if (!billId) {
    throw new Error("Cannot confirm sale: Missing valid draft bill ID.");
  }

  return await apiFetch<ConfirmApiResponse>("/confirm", {
    method: "POST",
    body: JSON.stringify({ bill_id: billId }),
  });
}

/**
 * POST /cancel
 * Sends { "bill_id": "..." } to cancel an active draft bill on the server
 */
export async function cancelBill(billId: string): Promise<CancelApiResponse> {
  if (!billId) {
    return { ok: true };
  }

  return await apiFetch<CancelApiResponse>("/cancel", {
    method: "POST",
    body: JSON.stringify({ bill_id: billId }),
  });
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
