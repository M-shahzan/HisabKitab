"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BillSummaryRecord, BillDetailRecord } from "@/types/bill";
import { fetchBills, fetchBillDetails } from "@/services/bills-service";
import { BillDetailsModal } from "@/components/bills/BillDetailsModal";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatDateTime } from "@/lib/formatters";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import {
  Receipt,
  Eye,
  RefreshCw,
  ShoppingBag,
  Calendar,
  Layers,
  ChevronRight,
  PlusCircle,
  FileText,
} from "lucide-react";

export default function BillsHistoryPage() {
  const { t, formatCurrency } = useLanguage();

  const [bills, setBills] = useState<BillSummaryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bill detail modal state
  const [selectedBill, setSelectedBill] = useState<BillDetailRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadBills = async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await fetchBills();
      setBills(data);
    } catch (err: any) {
      setError(err?.message || t("bills.errorLoading"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  const handleOpenBill = async (saleId: number | string) => {
    setIsModalOpen(true);
    setIsModalLoading(true);
    setModalError(null);
    setSelectedBill(null);

    try {
      const detail = await fetchBillDetails(saleId);
      setSelectedBill(detail);
    } catch (err: any) {
      setModalError(err?.message || "Failed to load bill details.");
    } finally {
      setIsModalLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header with Title and Refresh action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {t("bills.title")}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {t("bills.subtitle")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadBills(true)}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span>{isRefreshing ? t("common.loading") : t("stock.refresh")}</span>
          </Button>

          <Link href="/">
            <Button size="sm" variant="primary" className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              <span>{t("nav.newOrder")}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content Area: Loading, Error, Empty, or Table */}
      {isLoading ? (
        <LoadingState message={t("bills.loading")} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadBills()} />
      ) : bills.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Receipt}
              title={t("bills.emptyTitle")}
              description={t("bills.emptyDesc")}
              actionLabel={t("bills.startNewSale")}
              onAction={() => (window.location.href = "/")}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-slate-200/90 shadow-sm">
          <CardHeader className="py-4 px-6 bg-slate-50/70 border-b border-slate-200/80 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>{t("bills.title")}</span>
              <Badge variant="gray">
                {bills.length} {t("common.items")}
              </Badge>
            </CardTitle>
          </CardHeader>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/70 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">{t("bills.billNumber")}</th>
                  <th className="py-3.5 px-6">{t("bills.dateTime")}</th>
                  <th className="py-3.5 px-6 text-center">{t("bills.itemsCount")}</th>
                  <th className="py-3.5 px-6 text-right">{t("bills.totalAmount")}</th>
                  <th className="py-3.5 px-6 text-right">{t("bill.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {bills.map((bill) => (
                  <tr
                    key={bill.id}
                    className="hover:bg-emerald-50/40 transition-colors group cursor-pointer"
                    onClick={() => handleOpenBill(bill.id)}
                  >
                    <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-100 transition-colors">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <span>#{bill.bill_number}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 whitespace-nowrap">
                      {formatDateTime(bill.created_at)}
                    </td>
                    <td className="py-4 px-6 text-center text-slate-700 font-medium whitespace-nowrap">
                      <Badge variant="gray">
                        {bill.item_count} {t("common.items")}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-slate-900 text-base whitespace-nowrap">
                      {formatCurrency(bill.total)}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs font-semibold gap-1.5 hover:bg-emerald-100 hover:text-emerald-900 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenBill(bill.id);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{t("bills.viewFullBill")}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-slate-100 bg-white">
            {bills.map((bill) => (
              <div
                key={bill.id}
                onClick={() => handleOpenBill(bill.id)}
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between gap-3 active:bg-emerald-50/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">
                      #{bill.bill_number}
                    </span>
                    <Badge variant="gray">
                      {bill.item_count} {t("common.items")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDateTime(bill.created_at)}</span>
                  </div>
                  <div className="text-emerald-700 font-black text-base pt-0.5">
                    {formatCurrency(bill.total)}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-emerald-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 h-auto text-emerald-700 hover:bg-emerald-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenBill(bill.id);
                    }}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Bill Details Modal */}
      <BillDetailsModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        bill={selectedBill}
        isLoading={isModalLoading}
        error={modalError}
      />
    </div>
  );
}
