"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatINR, formatDateTime } from "@/lib/formatters";
import { ConfirmSaleResponse, BillItem } from "@/types/billing";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Check,
  CheckCircle2,
  ArrowRight,
  Printer,
  LayoutDashboard,
  PackageCheck,
  Share2,
  Copy,
  Download,
  Phone,
  MessageSquare,
  Send,
  Store,
  Receipt,
  FileText,
  Sparkles,
  Smartphone,
} from "lucide-react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";

interface ShopProfile {
  shopName: string;
  ownerName: string;
  phone: string;
  city: string;
  gstin: string;
}

const DEFAULT_SHOP_PROFILE: ShopProfile = {
  shopName: "Gupta Kirana & General Store",
  ownerName: "Rajesh Gupta",
  phone: "+91 98450 12345",
  city: "Bengaluru, Karnataka",
  gstin: "29ABCDE1234F1Z5",
};

export default function SaleSuccessPage() {
  const router = useRouter();
  const [sale, setSale] = useState<ConfirmSaleResponse | null>(null);
  const [shopProfile, setShopProfile] = useState<ShopProfile>(DEFAULT_SHOP_PROFILE);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  useEffect(() => {
    // 1. Read shop profile from localStorage
    try {
      const storedShop = localStorage.getItem("hisabkitab_shop_profile");
      if (storedShop) {
        const parsed = JSON.parse(storedShop);
        setShopProfile({
          shopName: parsed.shopName || DEFAULT_SHOP_PROFILE.shopName,
          ownerName: parsed.ownerName || DEFAULT_SHOP_PROFILE.ownerName,
          phone: parsed.phone || DEFAULT_SHOP_PROFILE.phone,
          city: parsed.city || DEFAULT_SHOP_PROFILE.city,
          gstin: parsed.gstin || DEFAULT_SHOP_PROFILE.gstin,
        });
      }
    } catch {}

    // 2. Read confirmed sale from session storage
    const stored = sessionStorage.getItem("lastConfirmedSale");
    if (stored) {
      try {
        const parsed: ConfirmSaleResponse = JSON.parse(stored);
        setSale(parsed);
      } catch {
        router.push("/");
      }
    } else {
      // If user directly opened without confirmed sale, provide realistic mock for demonstration & testing
      setSale({
        success: true,
        billNumber: "HK-8431",
        transactionId: "txn-1729678120",
        total: 410.0,
        itemCount: 3,
        paymentMode: "cash",
        timestamp: new Date().toISOString(),
        items: [
          {
            id: "line-1",
            productId: "prod-1",
            productName: "Daawat Rozana Basmati Rice",
            quantity: 2,
            unit: "kg",
            unitPrice: 60,
            lineTotal: 120,
          },
          {
            id: "line-2",
            productId: "prod-2",
            productName: "Fortune Sunlite Cooking Oil",
            quantity: 1,
            unit: "litre",
            unitPrice: 150,
            lineTotal: 150,
          },
          {
            id: "line-4",
            productId: "prod-4",
            productName: "Tata Sampann Toor Dal",
            quantity: 1,
            unit: "kg",
            unitPrice: 140,
            lineTotal: 140,
          },
        ],
        stockUpdates: [
          { productId: "prod-1", newQuantity: 43 },
          { productId: "prod-2", newQuantity: 2 },
          { productId: "prod-4", newQuantity: 27 },
        ],
      });
    }

    // Trigger subtle emerald confetti on entrance
    try {
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.6 },
        colors: ["#087F5B", "#10B981", "#34D399", "#D3F9E8"],
      });
    } catch {}
  }, [router]);

  if (!sale) return null;

  /**
   * Helper to generate a clean, formatted receipt text for WhatsApp, SMS, or Clipboard
   */
  const getReceiptText = () => {
    const divider = "--------------------------------";
    const itemsList = (sale.items || [])
      .map((item, idx) => {
        return `${idx + 1}. ${item.productName}\n   ${item.quantity} ${item.unit} x ₹${item.unitPrice} = ₹${item.lineTotal}`;
      })
      .join("\n");

    return `🧾 *${shopProfile.shopName.toUpperCase()}*
📍 ${shopProfile.city} | 📞 ${shopProfile.phone}${shopProfile.gstin ? `\nGSTIN: ${shopProfile.gstin}` : ""}
${divider}
*Bill No:* #${sale.billNumber}
*Date:* ${formatDateTime(sale.timestamp)}
*Payment Mode:* ${sale.paymentMode ? sale.paymentMode.toUpperCase() : "CASH"}${
      customerName ? `\n*Customer Name:* ${customerName}` : ""
    }${customerPhone ? `\n*Customer Mobile:* +91 ${customerPhone}` : ""}
${divider}
*ITEMS PURCHASED:*
${itemsList || "Store Groceries & Essentials"}
${divider}
*TOTAL AMOUNT:* ₹${sale.total.toFixed(2)}
*Total Items:* ${sale.itemCount} items
${divider}
Thank you for shopping with us! Visit again. 🙏
_Powered by Hisab Kitab Voice Billing POS_`;
  };

  /**
   * Send receipt via WhatsApp
   */
  const handleSendWhatsApp = () => {
    const text = getReceiptText();
    const encodedText = encodeURIComponent(text);
    const cleanNumber = customerPhone.trim().replace(/[^0-9]/g, "");
    const phoneWithCountry =
      cleanNumber.length === 10
        ? `91${cleanNumber}`
        : cleanNumber.length > 10
        ? cleanNumber
        : "";

    const url = phoneWithCountry
      ? `https://wa.me/${phoneWithCountry}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(url, "_blank");
    setShareFeedback("Opening WhatsApp with pre-filled customer receipt...");
    setTimeout(() => setShareFeedback(null), 4000);
  };

  /**
   * Send receipt via SMS
   */
  const handleSendSMS = () => {
    const text = getReceiptText();
    const encodedText = encodeURIComponent(text);
    const cleanNumber = customerPhone.trim().replace(/[^0-9]/g, "");

    const url = cleanNumber
      ? `sms:${cleanNumber}?body=${encodedText}`
      : `sms:?body=${encodedText}`;

    window.location.href = url;
    setShareFeedback("Opening SMS messaging composer...");
    setTimeout(() => setShareFeedback(null), 4000);
  };

  /**
   * Copy receipt text to clipboard
   */
  const handleCopyText = async () => {
    const text = getReceiptText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  /**
   * Share receipt using Web Share API
   */
  const handleShareNative = async () => {
    const text = getReceiptText();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${shopProfile.shopName} - Bill #${sale.billNumber}`,
          text: text,
        });
      } catch {
        // User dismissed
      }
    } else {
      handleCopyText();
    }
  };

  /**
   * Download receipt as a .txt file
   */
  const handleDownloadReceipt = () => {
    const text = getReceiptText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Receipt_${sale.billNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 space-y-6">
      {/* Top Banner (Hidden during Print) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="no-print bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 sm:p-6 shadow-glow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
            <Check className="h-6 w-6 text-white stroke-[3]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Bill Confirmed #{sale.billNumber}
              </h2>
              <span className="text-[10px] font-bold uppercase bg-white/20 px-2 py-0.5 rounded-full">
                Ledger Saved
              </span>
            </div>
            <p className="text-xs text-emerald-100 mt-0.5">
              Payment recorded via {sale.paymentMode?.toUpperCase() || "CASH"} • {formatDateTime(sale.timestamp)}
            </p>
          </div>
        </div>

        {/* Quick Instant Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => window.print()}
            variant="outline"
            size="sm"
            className="bg-white text-emerald-950 hover:bg-emerald-50 border-white shadow-xs font-bold"
          >
            <Printer className="h-4 w-4 mr-1.5 text-emerald-700" />
            <span>Print Receipt</span>
          </Button>

          <Button
            onClick={handleSendWhatsApp}
            size="sm"
            className="bg-[#25D366] hover:bg-[#1EBE5B] text-white font-bold border-none shadow-xs"
          >
            <MessageSquare className="h-4 w-4 mr-1.5" />
            <span>WhatsApp Bill</span>
          </Button>

          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold"
            >
              <span>New Order</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Main Grid: Left = Thermal POS Receipt | Right = Customer Sharing & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Printable Thermal Receipt Slip Card */}
        <div className="md:col-span-7">
          <Card className="printable-receipt-card border border-slate-300 bg-white shadow-card overflow-hidden">
            <CardHeader className="no-print pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600" />
                <span>Store POS Receipt</span>
              </CardTitle>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyText}
                  className="h-8 px-2 text-xs text-slate-600"
                  title="Copy receipt text"
                >
                  {copied ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Copied!
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadReceipt}
                  className="h-8 px-2 text-xs text-slate-600"
                  title="Download .txt receipt"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  <span>Text</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="h-8 px-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 border-emerald-200"
                >
                  <Printer className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  <span>Print Slip</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 font-mono text-xs text-slate-900 space-y-3">
              {/* Thermal Receipt Header */}
              <div className="text-center space-y-1 pb-2 border-b border-dashed border-slate-300">
                <h3 className="font-sans font-black text-base sm:text-lg text-slate-900 tracking-tight uppercase">
                  {shopProfile.shopName}
                </h3>
                <p className="text-[11px] text-slate-600 font-sans">
                  {shopProfile.city} • Phone: {shopProfile.phone}
                </p>
                {shopProfile.gstin && (
                  <p className="text-[10.5px] text-slate-500 font-sans">
                    GSTIN: {shopProfile.gstin}
                  </p>
                )}
                <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 py-0.5 px-2 rounded-full inline-block mt-1 font-sans">
                  TAX INVOICE / CASH MEMO
                </div>
              </div>

              {/* Receipt Meta */}
              <div className="grid grid-cols-2 text-[11px] py-1 border-b border-dashed border-slate-300 gap-y-1">
                <div>
                  <span className="text-slate-500">Bill No: </span>
                  <span className="font-bold text-slate-900">#{sale.billNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Payment: </span>
                  <span className="font-bold uppercase text-slate-900">
                    {sale.paymentMode || "CASH"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Date: </span>
                  <span className="text-slate-800">{formatDateTime(sale.timestamp)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Items: </span>
                  <span className="text-slate-800">{sale.itemCount}</span>
                </div>
                {customerPhone && (
                  <div className="col-span-2 text-slate-700">
                    <span className="text-slate-500">Customer: </span>
                    <span className="font-bold">
                      {customerName ? `${customerName} (` : ""}
                      +91 {customerPhone}
                      {customerName ? ")" : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Itemized Table */}
              <div className="py-2 border-b border-dashed border-slate-300">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10.5px] font-bold text-slate-500 uppercase">
                      <th className="pb-1.5 font-bold">Item</th>
                      <th className="pb-1.5 text-center font-bold">Qty</th>
                      <th className="pb-1.5 text-right font-bold">Rate</th>
                      <th className="pb-1.5 text-right font-bold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {(sale.items && sale.items.length > 0 ? sale.items : []).map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-1.5 pr-2 font-sans font-medium text-slate-900">
                          {item.productName}
                        </td>
                        <td className="py-1.5 text-center whitespace-nowrap text-slate-700">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-1.5 text-right whitespace-nowrap text-slate-700">
                          ₹{item.unitPrice}
                        </td>
                        <td className="py-1.5 text-right whitespace-nowrap font-bold text-slate-900">
                          ₹{item.lineTotal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Grand Total */}
              <div className="space-y-1.5 py-2 border-b border-dashed border-slate-300">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatINR(sale.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>CGST / SGST (Included):</span>
                  <span>₹0.00</span>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-slate-200 text-sm font-black text-slate-900">
                  <span>GRAND TOTAL:</span>
                  <span className="text-xl sm:text-2xl text-emerald-800 font-extrabold">
                    {formatINR(sale.total)}
                  </span>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="text-center pt-2 space-y-1 text-[11px] text-slate-500 font-sans">
                <p className="font-bold text-slate-800">
                  *** Thank you for your purchase! Visit again. ***
                </p>
                <p className="text-[10px] text-slate-400">
                  Transaction: {sale.transactionId}
                </p>
                <div className="pt-2 text-[10px] font-mono tracking-widest text-slate-400">
                  ||| | |||| | || ||||| | |||
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Customer Sharing & Store Controls (Hidden in Print) */}
        <div className="md:col-span-5 space-y-6 no-print">
          {/* Send Bill to Customer Card */}
          <Card className="border-emerald-200 shadow-card">
            <CardHeader className="pb-3 bg-emerald-50/50 border-b border-emerald-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <span>Send Bill to Customer</span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Share digital bill directly to the customer&apos;s phone via WhatsApp or SMS
              </p>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Customer Mobile Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Customer Mobile Number</span>
                  <span className="text-[11px] font-normal text-slate-400">10 Digits</span>
                </label>
                <div className="flex rounded-xl shadow-xs overflow-hidden border border-slate-300 focus-within:ring-2 focus-within:ring-emerald-600 focus-within:border-emerald-600">
                  <span className="inline-flex items-center px-3 bg-slate-50 text-slate-600 text-xs font-bold border-r border-slate-200">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="e.g. 9845012345"
                    value={customerPhone}
                    onChange={(e) =>
                      setCustomerPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))
                    }
                    className="flex-1 px-3 py-2 text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Customer Name Input (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Customer Name</span>
                  <span className="text-[11px] font-normal text-slate-400">Optional</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                />
              </div>

              {/* Primary Messaging Buttons */}
              <div className="space-y-2 pt-1">
                <Button
                  onClick={handleSendWhatsApp}
                  className="w-full bg-[#25D366] hover:bg-[#1EBE5B] text-white font-bold min-h-[44px] shadow-sm flex items-center justify-center gap-2 border-none"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Send on WhatsApp</span>
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleSendSMS}
                    variant="outline"
                    className="w-full text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 min-h-[40px]"
                  >
                    <Smartphone className="h-4 w-4 mr-1.5 text-slate-600" />
                    <span>Send SMS</span>
                  </Button>

                  <Button
                    onClick={handleShareNative}
                    variant="outline"
                    className="w-full text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 min-h-[40px]"
                  >
                    <Share2 className="h-4 w-4 mr-1.5 text-slate-600" />
                    <span>Share Bill</span>
                  </Button>
                </div>
              </div>

              {/* Feedback Alert */}
              {shareFeedback && (
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs">
                  {shareFeedback}
                </div>
              )}

              {/* Copy Bill Text */}
              <button
                type="button"
                onClick={handleCopyText}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Copied bill text to clipboard!
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Copy className="h-3.5 w-3.5 text-slate-500" /> Copy formatted bill text
                  </span>
                )}
              </button>
            </CardContent>
          </Card>

          {/* Print & Store Actions */}
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">Thermal Slip Printing</span>
                </div>
                <Badge variant="emerald" className="text-[10px] py-0 px-2">
                  80mm / A4 POS
                </Badge>
              </div>

              <Button
                onClick={() => window.print()}
                className="w-full font-bold bg-emerald-700 hover:bg-emerald-800 text-white min-h-[44px] shadow-sm flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                <span>Print Bill Now</span>
              </Button>

              {/* Stock Confirmation alert */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs">
                <PackageCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Inventory stock automatically updated ({sale.stockUpdates?.length || sale.itemCount} items).
                </span>
              </div>

              {/* Low-stock warnings returned by backend */}
              {sale.lowStockItems && sale.lowStockItems.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-start gap-2">
                  <span className="font-bold text-amber-700">⚠️ Notice:</span>
                  <span>
                    {sale.lowStockItems
                      .map((item) => `${item.name || `Item ${item.item_id}`} (${item.quantity ?? 0} left)`)
                      .join(", ")}
                  </span>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="pt-2 space-y-2">
                <Link href="/" className="block w-full">
                  <Button
                    variant="outline"
                    className="w-full font-bold text-slate-800 hover:text-slate-900 bg-white hover:bg-slate-50 min-h-[42px]"
                  >
                    <span>Start New Bill</span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <Link href="/dashboard" className="w-full">
                    <Button variant="ghost" className="w-full text-xs text-slate-600">
                      <LayoutDashboard className="h-3.5 w-3.5 mr-1 text-slate-500" />
                      <span>Dashboard</span>
                    </Button>
                  </Link>
                  <Link href="/stock" className="w-full">
                    <Button variant="ghost" className="w-full text-xs text-slate-600">
                      <Store className="h-3.5 w-3.5 mr-1 text-slate-500" />
                      <span>Stock View</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
