import { UnitOfMeasure } from "@/types/product";

/**
 * Decimal-safe currency calculations using paise
 */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function fromPaise(paise: number): number {
  return paise / 100;
}

export function multiplyMoney(unitPrice: number, quantity: number): number {
  const priceInPaise = toPaise(unitPrice);
  const totalPaise = Math.round(priceInPaise * quantity);
  return fromPaise(totalPaise);
}

export function sumMoney(amounts: number[]): number {
  const totalPaise = amounts.reduce((acc, curr) => acc + toPaise(curr), 0);
  return fromPaise(totalPaise);
}

/**
 * Formats a numeric value into INR Indian numbering system
 * e.g. 8450 -> ₹8,450 or ₹8,450.00
 */
export function formatINR(amount: number, showDecimals: boolean = false): string {
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

/**
 * Formats date to Indian retail standard
 * e.g. "23 Oct, 02:45 PM" or "Today, 02:45 PM"
 */
export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) {
      return `Today, ${timeStr}`;
    }

    const dateStr = date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });

    return `${dateStr}, ${timeStr}`;
  } catch {
    return isoString;
  }
}

/**
 * Human readable quantity format
 * e.g. 2 kg, 500 g, 1.5 litre
 */
export function formatQuantity(quantity: number, unit: UnitOfMeasure): string {
  const rounded = Number.isInteger(quantity) ? quantity.toString() : quantity.toFixed(2).replace(/\.?0+$/, "");
  return `${rounded} ${unit}`;
}
