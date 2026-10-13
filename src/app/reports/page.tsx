'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Users,
  Compass,
  Receipt,
  Scale,
  CheckCircle2,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SplitSmartRepository } from '@/lib/storage/repository';
import { calculateMemberBalances, optimizeSettlements } from '@/lib/calculations/settlement';
import { Trip, TripMember, Expense, Settlement, MemberBalance } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  exportExpensesToCsv,
  exportSettlementsToCsv,
  exportTripSummaryReport,
} from '@/lib/exports/csv';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [reportDate, setReportDate] = useState('');

  useEffect(() => {
    setReportDate(new Date().toLocaleDateString());
    async function init() {
      const allTrips = await SplitSmartRepository.getTrips();
      setTrips(allTrips);
      if (allTrips.length > 0) {
        setSelectedTripId(allTrips[0].id);
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function loadTripReport() {
      if (!selectedTripId) return;
      const tripExp = await SplitSmartRepository.getExpenses(selectedTripId);
      const tripStl = await SplitSmartRepository.getSettlements(selectedTripId);
      const tripMem = await SplitSmartRepository.getTripMembers(selectedTripId);

      setExpenses(tripExp);
      setSettlements(tripStl);
      setMembers(tripMem);
    }
    loadTripReport();
  }, [selectedTripId]);

  const currentTrip = trips.find((t) => t.id === selectedTripId) || trips[0];

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const memberProfiles = members.map((m) => m.user || {
    id: m.user_id,
    full_name: 'Member',
    email: '',
  });

  const memberBalances: MemberBalance[] = calculateMemberBalances(memberProfiles, expenses, settlements);
  const optimizedSettlements = optimizeSettlements(memberBalances, currentTrip?.currency || 'INR');

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  for (const exp of expenses) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-16 md:pb-6">
        <Header
          title="Reports &amp; Export"
          subtitle="Generate audit-ready spreadsheets, summaries, and print sheets"
          selectedTripId={selectedTripId}
        />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Trip Selector & Export Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs no-print">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Select Trip:
              </span>
              <select
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.currency})
                  </option>
                ))}
              </select>
            </div>

            {currentTrip && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportExpensesToCsv(currentTrip, expenses)}
                >
                  <Download className="w-4 h-4 mr-1.5" /> Export Expenses CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    exportSettlementsToCsv(currentTrip, settlements, optimizedSettlements)
                  }
                >
                  <Download className="w-4 h-4 mr-1.5" /> Export Settlements CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    exportTripSummaryReport(
                      currentTrip,
                      expenses,
                      memberProfiles,
                      optimizedSettlements
                    )
                  }
                >
                  <Download className="w-4 h-4 mr-1.5" /> Download Summary TXT
                </Button>
                <Button size="sm" variant="primary" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-1.5" /> Print / Save as PDF
                </Button>
              </div>
            )}
          </div>

          {currentTrip && (
            <div className="space-y-6">
              {/* Financial Snapshot Card */}
              <Card className="p-6 bg-white">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      Official Financial Ledger
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 mt-1">
                      {currentTrip.name}
                    </h2>
                    <p className="text-xs text-slate-500">{currentTrip.destination}</p>
                  </div>
                  <div className="sm:text-right text-xs text-slate-500">
                    <p>Report Date: {reportDate}</p>
                    <p>Currency: {currentTrip.currency}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Total Group Spend</span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(totalSpent, currentTrip.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Trip Budget</span>
                    <span className="text-lg font-bold text-slate-900">
                      {currentTrip.budget
                        ? formatCurrency(currentTrip.budget, currentTrip.currency)
                        : 'Uncapped'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Recorded Items</span>
                    <span className="text-lg font-bold text-slate-900">
                      {expenses.length} expenses
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Debts Pending</span>
                    <span className="text-lg font-bold text-indigo-600">
                      {optimizedSettlements.length} transactions
                    </span>
                  </div>
                </div>
              </Card>

              {/* Category Breakdown Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Spending by Category</CardTitle>
                  <CardDescription>Aggregation of all group receipts</CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-semibold uppercase">
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Total Amount</th>
                        <th className="py-3 px-4 text-right">Percentage of Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(categoryTotals).map(([cat, amt]) => {
                        const pct = totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0;
                        return (
                          <tr key={cat} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-semibold text-slate-800">{cat}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {formatCurrency(amt, currentTrip.currency)}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-slate-600">
                              {pct}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Member Contribution and Balance Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Member Contribution and Net Balances</CardTitle>
                  <CardDescription>
                    Who paid, who consumed, and final receivables
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-semibold uppercase">
                        <th className="py-3 px-4">Member</th>
                        <th className="py-3 px-4">Total Paid (Contributions)</th>
                        <th className="py-3 px-4">Assigned Share (Expense)</th>
                        <th className="py-3 px-4 text-right">Net Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {memberBalances.map((b) => (
                        <tr key={b.userId} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {b.user.full_name}
                          </td>
                          <td className="py-3 px-4">
                            {formatCurrency(b.totalPaid, currentTrip.currency)}
                          </td>
                          <td className="py-3 px-4">
                            {formatCurrency(b.totalShare, currentTrip.currency)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-bold ${
                              b.netBalance > 0
                                ? 'text-emerald-600'
                                : b.netBalance < 0
                                ? 'text-rose-600'
                                : 'text-slate-600'
                            }`}
                          >
                            {b.netBalance >= 0 ? '+' : ''}
                            {formatCurrency(b.netBalance, currentTrip.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
