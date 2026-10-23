"use client";

import React from "react";
import Link from "next/link";
import { Transaction } from "@/types/transaction";
import { formatINR, formatDateTime } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ArrowUpRight, ReceiptText, Wallet, QrCode, BookOpen } from "lucide-react";
import { EmptyState } from "@/components/ui/States";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Sales Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={ReceiptText}
            title="No transactions yet today"
            description="Start your first voice bill to see transaction records here."
            actionLabel="Start Voice Bill"
            onAction={() => (window.location.href = "/billing")}
          />
        </CardContent>
      </Card>
    );
  }

  const paymentIcons = {
    upi: <QrCode className="h-3 w-3 text-blue-600" />,
    cash: <Wallet className="h-3 w-3 text-emerald-600" />,
    khata: <BookOpen className="h-3 w-3 text-amber-600" />,
  };

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle>Recent Sales Transactions</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">Real-time ledger updates from shop counters</p>
        </div>
        <Link
          href="/summary"
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group"
        >
          <span>View All Sales</span>
          <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5 sm:px-6">Bill No</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-5 sm:px-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {transactions.map((txn) => {
                const itemSummary = txn.items
                  ? txn.items.map((i) => `${i.quantity} ${i.unit} ${i.productName.split(" ")[0]}`).join(", ")
                  : `${txn.itemCount} items`;

                return (
                  <tr
                    key={txn.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-3.5 px-5 sm:px-6 font-semibold text-slate-900 font-mono text-xs">
                      {txn.billNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate text-xs sm:text-sm">
                      {itemSummary}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          txn.paymentMode === "upi"
                            ? "blue"
                            : txn.paymentMode === "cash"
                            ? "emerald"
                            : "amber"
                        }
                      >
                        {paymentIcons[txn.paymentMode]}
                        <span className="uppercase text-[10px]">{txn.paymentMode}</span>
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 tabular-nums">
                      {formatDateTime(txn.createdAt)}
                    </td>
                    <td className="py-3.5 px-5 sm:px-6 text-right font-bold text-slate-900 tabular-nums">
                      {formatINR(txn.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
