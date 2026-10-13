'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Compass,
  Plus,
  Scale,
  Users,
  Sparkles,
  FileSpreadsheet,
  Settings as SettingsIcon,
  Receipt,
  Search,
  Filter,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  Calendar,
  DollarSign,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Wand2,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AddExpenseModal } from '@/components/expenses/add-expense-modal';
import { InviteMemberModal } from '@/components/trips/invite-member-modal';
import { RecordSettlementModal } from '@/components/settlements/record-settlement-modal';
import { SplitSmartRepository } from '@/lib/storage/repository';
import { calculateMemberBalances, optimizeSettlements } from '@/lib/calculations/settlement';
import {
  Expense,
  ExpenseCategory,
  MemberBalance,
  OptimizedSettlement,
  Settlement,
  Trip,
  TripMember,
  UserProfile,
} from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  exportExpensesToCsv,
  exportSettlementsToCsv,
  exportTripSummaryReport,
} from '@/lib/exports/csv';
import { toast } from 'sonner';

export default function TripDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const tripId = resolvedParams.id;
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile>(SplitSmartRepository.getCurrentUser());
  const [reportDate, setReportDate] = useState('');

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'expenses' | 'settlements' | 'members' | 'ai' | 'reports' | 'settings'>('expenses');

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isRecordSettlementOpen, setIsRecordSettlementOpen] = useState(false);
  const [selectedSettlementPayer, setSelectedSettlementPayer] = useState<string | undefined>();
  const [selectedSettlementReceiver, setSelectedSettlementReceiver] = useState<string | undefined>();
  const [selectedSettlementAmount, setSelectedSettlementAmount] = useState<number | undefined>();

  // Filter & Search states
  const [searchExpense, setSearchExpense] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  // AI states
  const [aiInsightsData, setAiInsightsData] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    {
      role: 'assistant',
      text: 'Hello! I am your SplitSmart AI trip assistant. Ask me questions like "Who owes me money?", "How much was spent on food?", or "Are we over budget?"',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);

  // Settings form
  const [settingsName, setSettingsName] = useState('');
  const [settingsDest, setSettingsDest] = useState('');
  const [settingsBudget, setSettingsBudget] = useState('');
  const [settingsStatus, setSettingsStatus] = useState<Trip['status']>('active');

  const loadTripData = async () => {
    try {
      setIsLoading(true);
      const currentTrip = await SplitSmartRepository.getTrip(tripId);
      if (!currentTrip) {
        toast.error('Trip not found');
        router.push('/trips');
        return;
      }

      const tripMembers = await SplitSmartRepository.getTripMembers(tripId);
      const tripExpenses = await SplitSmartRepository.getExpenses(tripId);
      const tripSettlements = await SplitSmartRepository.getSettlements(tripId);

      setTrip(currentTrip);
      setMembers(tripMembers);
      setExpenses(tripExpenses);
      setSettlements(tripSettlements);
      setReportDate(new Date().toLocaleDateString());

      setSettingsName(currentTrip.name);
      setSettingsDest(currentTrip.destination);
      setSettingsBudget(currentTrip.budget ? String(currentTrip.budget) : '');
      setSettingsStatus(currentTrip.status);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load trip details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTripData();
  }, [tripId]);

  // Derived financial computations
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const memberProfiles: UserProfile[] = members.map((m) => m.user || {
    id: m.user_id,
    full_name: 'Member',
    email: '',
  });

  const memberBalances: MemberBalance[] = calculateMemberBalances(memberProfiles, expenses, settlements);
  const optimizedSettlements: OptimizedSettlement[] = optimizeSettlements(
    memberBalances,
    trip?.currency || 'INR'
  );

  // AI Insights fetch
  const handleFetchAiInsights = async () => {
    if (!trip) return;
    try {
      setIsAiLoading(true);
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip,
          expenses,
          members,
          currency: trip.currency,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiInsightsData(data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate AI insights');
    } finally {
      setIsAiLoading(false);
    }
  };

  // AI Chat send
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatSending) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userMsg }]);

    try {
      setIsChatSending(true);
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          trip,
          expenses,
          members,
          settlements,
          currentUserId: currentUser.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
      } else {
        throw new Error('Chat failed');
      }
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'I could not process that request. Please try again or check your API key in settings.',
        },
      ]);
    } finally {
      setIsChatSending(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (confirm('Are you sure you want to delete this expense? This will recalculate member debts.')) {
      await SplitSmartRepository.deleteExpense(expenseId);
      toast.success('Expense deleted and balances updated');
      loadTripData();
    }
  };

  const handleUpdateTripSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;
    await SplitSmartRepository.updateTrip(trip.id, {
      name: settingsName,
      destination: settingsDest,
      budget: settingsBudget ? parseFloat(settingsBudget) : undefined,
      status: settingsStatus,
    });
    toast.success('Trip settings updated!');
    loadTripData();
  };

  const handleDeleteTrip = async () => {
    if (!trip) return;
    if (confirm(`Permanently delete trip "${trip.name}"? This action cannot be undone.`)) {
      await SplitSmartRepository.deleteTrip(trip.id);
      toast.success('Trip deleted');
      router.push('/trips');
    }
  };

  // Trigger settled payment workflow
  const openSettlementWorkflow = (payerId: string, receiverId: string, amount: number) => {
    setSelectedSettlementPayer(payerId);
    setSelectedSettlementReceiver(receiverId);
    setSelectedSettlementAmount(amount);
    setIsRecordSettlementOpen(true);
  };

  if (isLoading || !trip) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 p-8 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // Filtered expenses
  const filteredExpenses = expenses.filter((e) => {
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    const matchesSearch =
      e.title.toLowerCase().includes(searchExpense.toLowerCase()) ||
      (e.payer?.full_name || '').toLowerCase().includes(searchExpense.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories: ExpenseCategory[] = [
    'Accommodation',
    'Food and drinks',
    'Transportation',
    'Shopping',
    'Activities',
    'Fuel',
    'Tickets',
    'Miscellaneous',
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-16 md:pb-6">
        <Header
          title={trip.name}
          subtitle={`${trip.destination} • ${formatDate(trip.start_date)} to ${formatDate(trip.end_date)}`}
          selectedTripId={trip.id}
          onOpenNewExpense={() => setIsAddExpenseOpen(true)}
        />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Trip Header Banner */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {trip.name}
                </h1>
                <Badge
                  variant={
                    trip.status === 'active'
                      ? 'success'
                      : trip.status === 'planning'
                      ? 'info'
                      : 'default'
                  }
                >
                  {trip.status}
                </Badge>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {trip.currency}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
                {trip.description || `Group trip to ${trip.destination}`}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  {members.length} members
                </span>
                {trip.budget ? (
                  <span className="flex items-center gap-1.5 font-medium">
                    <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                    Budget: {formatCurrency(trip.budget, trip.currency)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsAddExpenseOpen(true)}
                className="shadow-sm shadow-indigo-200"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Expense
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsInviteOpen(true)}
              >
                <Users className="w-4 h-4 mr-1" /> Invite
              </Button>
              <Button
                size="sm"
                variant="subtle"
                onClick={() => {
                  setSelectedSettlementPayer(undefined);
                  setSelectedSettlementReceiver(undefined);
                  setSelectedSettlementAmount(undefined);
                  setIsRecordSettlementOpen(true);
                }}
              >
                <Scale className="w-4 h-4 mr-1" /> Settle
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 gap-2 sm:gap-6 overflow-x-auto text-xs font-semibold select-none">
            {[
              { id: 'expenses', label: 'Expenses', icon: Receipt, count: expenses.length },
              { id: 'settlements', label: 'Settlements', icon: Scale, count: optimizedSettlements.length },
              { id: 'members', label: 'Members', icon: Users, count: members.length },
              { id: 'ai', label: 'AI Insights', icon: Sparkles, badge: 'Gemini' },
              { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet },
              { id: 'settings', label: 'Settings', icon: SettingsIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                      {tab.count}
                    </span>
                  )}
                  {tab.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-violet-100 text-violet-700 font-bold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ========================================================= */}
          {/* TAB 1: EXPENSES */}
          {/* ========================================================= */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search expenses by title or payer..."
                    value={searchExpense}
                    onChange={(e) => setSearchExpense(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <Button size="sm" variant="primary" onClick={() => setIsAddExpenseOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </div>

              {/* Expenses Table */}
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Title &amp; Category</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Paid By</th>
                        <th className="py-3 px-4">Split Method</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredExpenses.map((exp) => {
                        const isExpanded = expandedExpenseId === exp.id;
                        return (
                          <React.Fragment key={exp.id}>
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-900 text-xs">
                                  {exp.title}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Badge variant="default" className="text-[10px] py-0 px-2">
                                    {exp.category}
                                  </Badge>
                                  {exp.notes && (
                                    <span className="text-[10px] text-slate-400 truncate max-w-xs">
                                      {exp.notes}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                {formatDate(exp.expense_date)}
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {exp.payer?.full_name?.slice(0, 1) || 'M'}
                                  </div>
                                  <span className="text-slate-800 font-medium">
                                    {exp.payer?.full_name || 'Member'}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="capitalize font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                                  {exp.split_method}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                                {formatCurrency(exp.amount, trip.currency)}
                              </td>

                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() =>
                                      setExpandedExpenseId(isExpanded ? null : exp.id)
                                    }
                                    className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="View Split Details"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteExpense(exp.id)}
                                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Delete Expense"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Split details expansion */}
                            {isExpanded && exp.splits && (
                              <tr className="bg-indigo-50/30">
                                <td colSpan={6} className="px-6 py-3 border-t border-slate-100">
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                                      Split Breakdown ({exp.splits.length} participants):
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                      {exp.splits.map((split, sIdx) => {
                                        const memberUser = members.find(
                                          (m) => m.user_id === split.user_id
                                        )?.user;
                                        return (
                                          <div
                                            key={sIdx}
                                            className="p-2 rounded-lg bg-white border border-slate-200/80 text-xs flex justify-between items-center"
                                          >
                                            <span className="text-slate-700 font-medium truncate">
                                              {memberUser?.full_name || 'Member'}
                                            </span>
                                            <span className="font-bold text-indigo-600">
                                              {formatCurrency(split.amount, trip.currency)}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>

                  {filteredExpenses.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No expenses found for this trip. Click &quot;Add Expense&quot; to begin.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: SETTLEMENTS */}
          {/* ========================================================= */}
          {activeTab === 'settlements' && (
            <div className="space-y-6">
              {/* Member Net Balances Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Member Net Balances
                  </h3>
                  <span className="text-xs text-slate-400">
                    Net Balance = Total Paid − Fair Share
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {memberBalances.map((b) => {
                    const isCreditor = b.netBalance > 0;
                    const isDebtor = b.netBalance < 0;
                    const isSettled = b.netBalance === 0;

                    return (
                      <Card
                        key={b.userId}
                        className={`transition-all ${
                          isCreditor
                            ? 'border-emerald-200 bg-emerald-50/20'
                            : isDebtor
                            ? 'border-rose-200 bg-rose-50/20'
                            : 'border-slate-200'
                        }`}
                      >
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {b.user.full_name}
                            </span>
                            <Badge
                              variant={
                                isCreditor ? 'success' : isDebtor ? 'danger' : 'default'
                              }
                            >
                              {isCreditor ? 'To Receive' : isDebtor ? 'Owes' : 'Settled'}
                            </Badge>
                          </div>

                          <div className="space-y-1 text-xs text-slate-500">
                            <div className="flex justify-between">
                              <span>Total Paid:</span>
                              <span className="font-medium text-slate-700">
                                {formatCurrency(b.totalPaid, trip.currency)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Fair Share:</span>
                              <span className="font-medium text-slate-700">
                                {formatCurrency(b.totalShare, trip.currency)}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                            <span>Net Balance:</span>
                            <span
                              className={
                                isCreditor
                                  ? 'text-emerald-600'
                                  : isDebtor
                                  ? 'text-rose-600'
                                  : 'text-slate-600'
                              }
                            >
                              {isCreditor ? '+' : ''}
                              {formatCurrency(b.netBalance, trip.currency)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Recommended Optimal Settlement Transactions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Recommended Optimized Settlements
                    </h3>
                    <p className="text-xs text-slate-500">
                      Calculated using greedy Min-Cash-Flow to settle all debts in minimal transactions.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {optimizedSettlements.map((opt, idx) => (
                    <Card
                      key={idx}
                      className="border-indigo-100 shadow-xs hover:border-indigo-300 transition-all"
                    >
                      <CardContent className="p-5 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md">
                            Suggested Payment #{idx + 1}
                          </span>
                          <div className="flex items-center gap-2 pt-1">
                            <span className="font-bold text-sm text-slate-900">
                              {opt.payerName}
                            </span>
                            <div className="flex items-center text-xs text-slate-400 gap-1 font-medium">
                              <span>pays</span>
                              <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                            </div>
                            <span className="font-bold text-sm text-slate-900">
                              {opt.receiverName}
                            </span>
                          </div>
                          <p className="text-xs font-extrabold text-indigo-600 pt-1">
                            {formatCurrency(opt.amount, trip.currency)}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() =>
                            openSettlementWorkflow(opt.payerId, opt.receiverId, opt.amount)
                          }
                          className="shrink-0"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark as Paid
                        </Button>
                      </CardContent>
                    </Card>
                  ))}

                  {optimizedSettlements.length === 0 && (
                    <div className="col-span-2 p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-emerald-600 font-semibold flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" /> All trip debts are fully settled! No pending payments required.
                    </div>
                  )}
                </div>
              </div>

              {/* Recorded / Completed Settlements History */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Settlement History &amp; Receipts
                </h3>

                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="py-3 px-4">Payer</th>
                          <th className="py-3 px-4">Receiver</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Paid Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {settlements.map((stl) => (
                          <tr key={stl.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              {stl.payer?.full_name || 'Member'}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              {stl.receiver?.full_name || 'Member'}
                            </td>
                            <td className="py-3 px-4 font-bold text-emerald-600">
                              {formatCurrency(stl.amount, trip.currency)}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={stl.status === 'completed' ? 'success' : 'warning'}
                              >
                                {stl.status.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {stl.paid_at ? new Date(stl.paid_at).toLocaleString() : 'Unpaid'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {settlements.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No confirmed settlement records yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: MEMBERS */}
          {/* ========================================================= */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Trip Travelers ({members.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Members can log expenses, view settlements, and chat with AI.
                  </p>
                </div>
                <Button size="sm" variant="primary" onClick={() => setIsInviteOpen(true)}>
                  <Users className="w-4 h-4 mr-1" /> Add / Invite Member
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {members.map((m) => (
                  <Card key={m.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 overflow-hidden border border-indigo-200">
                        {m.user?.avatar_url ? (
                          <img
                            src={m.user.avatar_url}
                            alt={m.user.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          m.user?.full_name?.slice(0, 1) || 'U'
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">
                          {m.user?.full_name || 'Member'}
                        </h4>
                        <p className="text-[10px] text-slate-400">{m.user?.email}</p>
                      </div>
                    </div>
                    <Badge variant={m.role === 'owner' ? 'purple' : 'default'}>
                      {m.role}
                    </Badge>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: AI INSIGHTS & CHAT */}
          {/* ========================================================= */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              {/* Generate Insights Button & Overview */}
              <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-300" />
                    <h3 className="text-lg font-bold">Google Gemini Spending Insights</h3>
                  </div>
                  <p className="text-xs text-indigo-200 max-w-xl">
                    Run automated audit of category distributions, budget pace, spending anomalies, and practical tips tailored specifically to {trip.destination}.
                  </p>
                </div>
                <Button
                  size="md"
                  variant="primary"
                  onClick={handleFetchAiInsights}
                  isLoading={isAiLoading}
                  className="bg-white text-indigo-900 hover:bg-slate-100 font-bold shrink-0 shadow-md"
                >
                  <Wand2 className="w-4 h-4 mr-1.5 text-indigo-600" /> Analyze Trip with Gemini
                </Button>
              </div>

              {aiInsightsData && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Key Insights */}
                    <Card className="p-5 space-y-2 border-indigo-100 bg-white">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                        Spending Trends
                      </span>
                      <ul className="space-y-2 text-xs text-slate-700">
                        {aiInsightsData.keyInsights.map((insight: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>

                    {/* Anomalies */}
                    <Card className="p-5 space-y-2 border-rose-100 bg-white">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                        Anomalies &amp; Spikes
                      </span>
                      <ul className="space-y-2 text-xs text-slate-700">
                        {aiInsightsData.anomalies.length > 0 ? (
                          aiInsightsData.anomalies.map((ano: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                              <span>{ano}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-xs text-slate-400">No unusual spending anomalies detected.</li>
                        )}
                      </ul>
                    </Card>

                    {/* Savings Recommendations */}
                    <Card className="p-5 space-y-2 border-emerald-100 bg-white">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                        Savings Opportunities
                      </span>
                      <ul className="space-y-2 text-xs text-slate-700">
                        {aiInsightsData.savingsRecommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>

                  {/* Executive Summary */}
                  <Card className="p-6 bg-slate-50 border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Auditor Executive Summary
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {aiInsightsData.executiveSummary}
                    </p>
                  </Card>
                </div>
              )}

              {/* Realtime AI Trip Chat Assistant */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                    <div>
                      <CardTitle>Trip Finance Assistant</CardTitle>
                      <CardDescription>
                        Answers questions using server-verified financial ledger calculations.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-3 max-h-72 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-800 border border-slate-200/80 shadow-xs'
                          }`}
                        >
                          <p className="whitespace-pre-line">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendChat} className="flex gap-2">
                    <input
                      type="text"
                      placeholder='Ask assistant: "Who owes me?", "How much did we spend on food?", "Are we over budget?"'
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 text-xs px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <Button type="submit" variant="primary" size="sm" isLoading={isChatSending}>
                      Ask AI
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: REPORTS & EXPORT */}
          {/* ========================================================= */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Action row */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Official Trip Export Center</h3>
                  <p className="text-xs text-slate-500">
                    Download spreadsheets or generate print-friendly reports.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportExpensesToCsv(trip, expenses)}
                  >
                    <Download className="w-4 h-4 mr-1" /> Expenses CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      exportSettlementsToCsv(trip, settlements, optimizedSettlements)
                    }
                  >
                    <Download className="w-4 h-4 mr-1" /> Settlements CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => window.print()}
                  >
                    <Printer className="w-4 h-4 mr-1" /> Print / Save as PDF
                  </Button>
                </div>
              </div>

              {/* Printable Report Layout */}
              <Card className="p-6 sm:p-8 space-y-6 print:border-none print:shadow-none bg-white">
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-black text-slate-900">{trip.name}</h2>
                      <p className="text-xs text-slate-500">{trip.destination}</p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p>Date: {reportDate}</p>
                      <p>Currency: {trip.currency}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 border-b border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block">Total Spend</span>
                    <span className="font-extrabold text-base text-slate-900">
                      {formatCurrency(totalSpent, trip.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Planned Budget</span>
                    <span className="font-extrabold text-base text-slate-900">
                      {trip.budget ? formatCurrency(trip.budget, trip.currency) : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Expenses</span>
                    <span className="font-extrabold text-base text-slate-900">
                      {expenses.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Active Members</span>
                    <span className="font-extrabold text-base text-slate-900">
                      {members.length}
                    </span>
                  </div>
                </div>

                {/* Member balance summary table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Individual Member Balances
                  </h4>
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                        <th className="py-2">Member</th>
                        <th className="py-2">Amount Paid</th>
                        <th className="py-2">Assigned Share</th>
                        <th className="py-2 text-right">Net Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {memberBalances.map((b) => (
                        <tr key={b.userId}>
                          <td className="py-2 font-medium text-slate-800">{b.user.full_name}</td>
                          <td className="py-2">{formatCurrency(b.totalPaid, trip.currency)}</td>
                          <td className="py-2">{formatCurrency(b.totalShare, trip.currency)}</td>
                          <td
                            className={`py-2 text-right font-bold ${
                              b.netBalance > 0
                                ? 'text-emerald-600'
                                : b.netBalance < 0
                                ? 'text-rose-600'
                                : 'text-slate-600'
                            }`}
                          >
                            {b.netBalance >= 0 ? '+' : ''}
                            {formatCurrency(b.netBalance, trip.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: SETTINGS */}
          {/* ========================================================= */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Trip Information</CardTitle>
                  <CardDescription>Update trip destination, target budget, and status.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleUpdateTripSettings} className="space-y-4">
                    <Input
                      label="Trip Name"
                      value={settingsName}
                      onChange={(e) => setSettingsName(e.target.value)}
                      required
                    />
                    <Input
                      label="Destination"
                      value={settingsDest}
                      onChange={(e) => setSettingsDest(e.target.value)}
                      required
                    />
                    <Input
                      label="Target Budget"
                      type="number"
                      step="any"
                      value={settingsBudget}
                      onChange={(e) => setSettingsBudget(e.target.value)}
                    />
                    <Select
                      label="Trip Status"
                      value={settingsStatus}
                      onChange={(e) => setSettingsStatus(e.target.value as any)}
                      options={[
                        { value: 'active', label: 'Active' },
                        { value: 'planning', label: 'Planning' },
                        { value: 'completed', label: 'Completed' },
                      ]}
                    />

                    <div className="pt-2 flex justify-end">
                      <Button type="submit" variant="primary">
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-rose-200 bg-rose-50/20">
                <CardHeader>
                  <CardTitle className="text-rose-700">Danger Zone</CardTitle>
                  <CardDescription>Permanently delete this trip and all recorded data.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="text-xs text-rose-800">
                    This action will delete all expenses, settlements, and member memberships.
                  </div>
                  <Button variant="danger" size="sm" onClick={handleDeleteTrip}>
                    Delete Trip
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      <MobileNav />

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        trip={trip}
        members={members}
        onExpenseAdded={loadTripData}
      />

      <InviteMemberModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        trip={trip}
        currentMembers={members}
        onMemberAdded={loadTripData}
      />

      <RecordSettlementModal
        isOpen={isRecordSettlementOpen}
        onClose={() => setIsRecordSettlementOpen(false)}
        trip={trip}
        members={members}
        initialPayerId={selectedSettlementPayer}
        initialReceiverId={selectedSettlementReceiver}
        initialAmount={selectedSettlementAmount}
        onSettled={loadTripData}
      />
    </div>
  );
}
