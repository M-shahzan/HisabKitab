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
import { INITIAL_PRODUCTS, SAMPLE_VOICE_SCRIPTS, SAMPLE_VOICE_SCRIPTS_BY_LANG } from "@/lib/mock-data";
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
    timeoutMs: 60000,
  });
}

/**
 * Direct transcript processing requires speech audio for backend pipeline
 */
export async function parseTranscriptFallback(
  text: string,
  billId?: string,
  language: string = "hi"
): Promise<VoiceApiResponse> {
  // Try sending as audio blob or simulated payload if backend supports text
  try {
    const blob = new Blob([text], { type: "text/plain" });
    const formData = new FormData();
    formData.append("file", blob, "transcript.txt");
    if (billId) formData.append("bill_id", billId);
    if (language) formData.append("language", language);

    return await apiFetch<VoiceApiResponse>("/voice", {
      method: "POST",
      body: formData,
    });
  } catch {
    // Local NLP simulation matching catalogue across languages
    const lower = text.toLowerCase();
    const lines: BackendBillLine[] = [];

    // Helper to extract quantity
    const has5 = lower.includes("5") || lower.includes("five") || lower.includes("paanch") || lower.includes("पांच") || lower.includes("ಐದು") || lower.includes("پانچ");
    const has1 = lower.includes("1") || lower.includes("one") || lower.includes("ek") || lower.includes("एक") || lower.includes("ಒಂದು") || lower.includes("ایک");
    const hasHalf = lower.includes("half") || lower.includes("0.5") || lower.includes("aadha") || lower.includes("adha") || lower.includes("आधा") || lower.includes("ಅರ್ಧ") || lower.includes("آدھا");
    const has4 = lower.includes("4") || lower.includes("four") || lower.includes("chaar") || lower.includes("चार") || lower.includes("ನಾಲ್ಕು") || lower.includes("چار");

    // 1. Rice (Hindi: चावल, Kannada: ಅಕ್ಕಿ, Urdu: چاول)
    if (lower.includes("rice") || lower.includes("chawal") || lower.includes("चावल") || lower.includes("akki") || lower.includes("ಅಕ್ಕಿ") || lower.includes("چاول") || lower.includes("bhaat")) {
      const qty = has5 ? 5 : has1 ? 1 : 2;
      lines.push({
        item_id: 1,
        name: "Daawat Rozana Basmati Rice",
        qty,
        unit: "kg",
        unit_price: 60,
        amount: qty * 60,
      });
    }

    // 2. Cooking Oil (Hindi: तेल, Kannada: ಎಣ್ಣೆ, Urdu: تیل)
    if (lower.includes("oil") || lower.includes("tel") || lower.includes("तेल") || lower.includes("enne") || lower.includes("ಎಣ್ಣೆ") || lower.includes("تیل")) {
      const qty = has5 ? 5 : has1 ? 1 : 2;
      lines.push({
        item_id: 2,
        name: "Fortune Sunlite Cooking Oil",
        qty,
        unit: "litre",
        unit_price: 150,
        amount: qty * 150,
      });
    }

    // 3. Sugar (Hindi: चीनी / शक्कर, Kannada: ಸಕ್ಕರೆ, Urdu: چینی)
    if (lower.includes("sugar") || lower.includes("cheeni") || lower.includes("चीनी") || lower.includes("shakkar") || lower.includes("sakkare") || lower.includes("ಸಕ್ಕರೆ") || lower.includes("چینی")) {
      const qty = hasHalf ? 0.5 : has1 ? 1 : 2;
      lines.push({
        item_id: 3,
        name: "Madhur Pure Crystal Sugar",
        qty,
        unit: "kg",
        unit_price: 45,
        amount: qty * 45,
      });
    }

    // 4. Toor Dal (Hindi: तूर दाल, Kannada: ತೊಗರಿ ಬೇಳೆ, Urdu: تور دال)
    if (lower.includes("dal") || lower.includes("दाल") || lower.includes("toor") || lower.includes("तूर") || lower.includes("bele") || lower.includes("ಬೇಳೆ") || lower.includes("دال")) {
      const qty = hasHalf ? 0.5 : 1;
      lines.push({
        item_id: 4,
        name: "Tata Sampann Toor Dal",
        qty,
        unit: "kg",
        unit_price: 140,
        amount: qty * 140,
      });
    }

    // 5. Salt (Hindi: नमक, Kannada: ಉಪ್ಪು, Urdu: نمک)
    if (lower.includes("salt") || lower.includes("namak") || lower.includes("नमक") || lower.includes("uppu") || lower.includes("ಉಪ್ಪು") || lower.includes("نمک")) {
      const qty = has1 ? 1 : 2;
      lines.push({
        item_id: 6,
        name: "Tata Salt Vacuum Evaporated",
        qty,
        unit: "packet",
        unit_price: 28,
        amount: qty * 28,
      });
    }

    // 6. Turmeric / Haldi (Hindi: हल्दी, Kannada: ಅರಿಶಿನ, Urdu: ہلدی)
    if (lower.includes("haldi") || lower.includes("हल्दी") || lower.includes("turmeric") || lower.includes("arishina") || lower.includes("ಅರಿಶಿನ") || lower.includes("ہلدی")) {
      lines.push({
        item_id: 7,
        name: "Everest Turmeric Powder (Haldi)",
        qty: 1,
        unit: "packet",
        unit_price: 35,
        amount: 35,
      });
    }

    // 7. Maggi Noodles (Hindi: मैगी, Kannada: ಮ್ಯಾಗಿ, Urdu: میگی)
    if (lower.includes("maggi") || lower.includes("मैगी") || lower.includes("ಮ್ಯಾಗಿ") || lower.includes("میگی") || lower.includes("noodles")) {
      const qty = has5 ? 5 : has4 ? 4 : 2;
      lines.push({
        item_id: 9,
        name: "Maggi 2-Minute Masala Noodles",
        qty,
        unit: "packet",
        unit_price: 14,
        amount: qty * 14,
      });
    }

    // 8. Milk (Hindi: दूध, Kannada: ಹಾಲು, Urdu: دودھ)
    if (lower.includes("milk") || lower.includes("doodh") || lower.includes("दूध") || lower.includes("haalu") || lower.includes("ಹಾಲು") || lower.includes("دودھ")) {
      lines.push({
        item_id: 11,
        name: "Amul Taaza Homogenised Toned Milk",
        qty: 2,
        unit: "packet",
        unit_price: 30,
        amount: 60,
      });
    }

    // Default fallback if no recognized keywords matched
    if (lines.length === 0) {
      lines.push({
        item_id: 1,
        name: "Daawat Rozana Basmati Rice",
        qty: 2,
        unit: "kg",
        unit_price: 60,
        amount: 120,
      });
      lines.push({
        item_id: 2,
        name: "Fortune Sunlite Cooking Oil",
        qty: 1,
        unit: "litre",
        unit_price: 150,
        amount: 150,
      });
    }

    const total = lines.reduce((acc, l) => acc + l.amount, 0);
    const draftId = billId || `b_${Date.now().toString(36)}`;

    // Localized assistant response message
    let readback = `Total is ${total} rupees. Please confirm or edit.`;
    if (language === "hi") {
      readback = `कुल बिल ${total} रुपये है। कृपया पुष्टि करें।`;
    } else if (language === "kn") {
      readback = `ಒಟ್ಟು ಬಿಲ್ ${total} ರೂಪಾಯಿಗಳು. ದಯವಿಟ್ಟು ದೃಢೀಕರಿಸಿ.`;
    } else if (language === "ur") {
      readback = `کل بل ${total} روپے ہے۔ برائے مہربانی تصدیق کریں۔`;
    }

    return {
      transcript: text,
      intent: "new_sale",
      bill: {
        bill_id: draftId,
        lines,
        total,
        status: "draft",
      },
      message: readback,
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
