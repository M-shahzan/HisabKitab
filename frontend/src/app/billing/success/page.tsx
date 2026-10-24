"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatINR, formatDateTime } from "@/lib/formatters";
import { ConfirmSaleResponse } from "@/types/billing";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Check, CheckCircle2, ArrowRight, Printer, LayoutDashboard, Sparkles, PackageCheck, Receipt } from "lucide-react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function SaleSuccessPage() {
  const router = useRouter();
  const { t, formatCurrency } = useLanguage();
  const [sale, setSale] = useState<ConfirmSaleResponse | null>(null);

  useEffect(() => {
    // Read from session storage
    const stored = sessionStorage.getItem("lastConfirmedSale");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSale(parsed);
      } catch {
        router.push("/");
      }
    } else {
      router.push("/");
    }

    // Trigger subtle emerald confetti on entrance
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#087F5B", "#10B981", "#34D399", "#D3F9E8"],
      });
    } catch {}
  }, [router]);

  if (!sale) return null;

  return (
    <div className="max-w-lg mx-auto py-8 sm:py-12 space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-emerald-200/80 shadow-glow overflow-hidden text-center">
          {/* Header checkmark area */}
          <div className="bg-gradient-to-b from-emerald-50 to-white pt-8 pb-6 px-6 flex flex-col items-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
              className="h-20 w-20 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-pulseGlow mb-4"
            >
              <Check className="h-10 w-10 stroke-[3]" />
            </motion.div>

            <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 mb-2">
              {t("success.paymentConfirmed")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {t("success.title")}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t("success.message")}
            </p>
          </div>

          {/* Receipt Body */}
          <CardContent className="p-6 pt-2">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-500 pb-2 border-b border-slate-200/60">
                <span>{t("success.billNumber")}</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  #{sale.billNumber}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 pb-2 border-b border-slate-200/60">
                <span>{t("success.totalItems")}</span>
                <span className="font-semibold text-slate-800">{sale.itemCount} {t("common.items")}</span>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 pb-2 border-b border-slate-200/60">
                <span>{t("success.transactionTime")}</span>
                <span className="font-medium text-slate-800">
                  {formatDateTime(sale.timestamp)}
                </span>
              </div>

              <div className="flex justify-between items-baseline pt-1">
                <span className="text-sm font-bold text-slate-700">{t("success.grandTotal")}</span>
                <span className="text-2xl font-extrabold text-emerald-800 tabular-nums">
                  {formatCurrency(sale.total)}
                </span>
              </div>
            </div>

            {/* Confirmed Bill Line Items Table */}
            {sale.lines && sale.lines.length > 0 && (
              <div className="mt-4 border border-slate-200/90 rounded-2xl overflow-hidden text-left bg-white shadow-xs">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-left">{t("bill.product")}</th>
                      <th className="py-2.5 px-3 text-right">{t("bill.quantity")}</th>
                      <th className="py-2.5 px-3 text-right">{t("bill.unitPrice")}</th>
                      <th className="py-2.5 px-3 text-right">{t("bill.lineTotal")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sale.lines.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{item.name}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{item.qty} {item.unit}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-emerald-50/70 border-t border-emerald-100 font-bold">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 text-left text-slate-800 font-bold">{t("bill.grandTotal")}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-800 text-sm font-extrabold">{formatCurrency(sale.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Stock Confirmation alert */}
            <div className="mt-4 flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-xs text-left">
              <PackageCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                {t("success.autoStockDeducted")} ({sale.stockUpdates?.length || sale.itemCount} {t("common.items")}).
              </span>
            </div>

            {/* Low-stock warnings returned by backend confirm endpoint */}
            {sale.lowStockItems && sale.lowStockItems.length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/80 text-xs text-left flex items-start gap-2">
                <span className="font-bold text-amber-700">⚠️ {t("success.lowStockWarning")}</span>
                <span>
                  {sale.lowStockItems
                    .map((item) => `${item.name || `Item ${item.item_id}`} (${item.quantity ?? 0} ${t("summary.remaining")})`)
                    .join(", ")}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 space-y-3">
              <Link href="/" className="block w-full">
                <Button size="lg" className="w-full text-base font-bold shadow-sm">
                  <span>{t("success.startNewBill")}</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="w-full"
                >
                  <Printer className="h-4 w-4 mr-1.5 text-slate-600" />
                  <span>{t("success.printReceipt")}</span>
                </Button>

                <Link href="/bills" className="w-full">
                  <Button variant="ghost" className="w-full">
                    <Receipt className="h-4 w-4 mr-1.5 text-slate-600" />
                    <span>{t("nav.billsHistory")}</span>
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
