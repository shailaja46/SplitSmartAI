'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Compass,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Receipt,
  Scale,
  Sparkles,
  Calendar,
  ChevronRight,
  Users,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateTripModal } from '@/components/trips/create-trip-modal';
import { AddExpenseModal } from '@/components/expenses/add-expense-modal';
import { SplitSmartRepository } from '@/lib/storage/repository';
import { calculateMemberBalances, optimizeSettlements } from '@/lib/calculations/settlement';
import { Expense, Settlement, Trip, TripMember, UserProfile, ActivityLog } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

export default function DashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile>(SplitSmartRepository.getCurrentUser());
  const [trips, setTrips] = useState<Trip[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allSettlements, setAllSettlements] = useState<Settlement[]>([]);
  const [membersMap, setMembersMap] = useState<Record<string, TripMember[]>>({});
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  // Modals
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const user = SplitSmartRepository.getCurrentUser();
      setCurrentUser(user);

      const userTrips = await SplitSmartRepository.getTrips();
      setTrips(userTrips);

      const expList: Expense[] = [];
      const stlList: Settlement[] = [];
      const mList: Record<string, TripMember[]> = {};

      for (const trip of userTrips) {
        const tripExpenses = await SplitSmartRepository.getExpenses(trip.id);
        const tripSettlements = await SplitSmartRepository.getSettlements(trip.id);
        const tripMembers = await SplitSmartRepository.getTripMembers(trip.id);

        expList.push(...tripExpenses);
        stlList.push(...tripSettlements);
        mList[trip.id] = tripMembers;
      }

      setAllExpenses(expList);
      setAllSettlements(stlList);
      setMembersMap(mList);

      const logs = await SplitSmartRepository.getActivityLogs();
      setActivities(logs.slice(0, 6));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    loadDashboardData();
  }, []);

  // Compute summary figures across all trips for current user
  let totalExpensesOverall = 0;
  let totalUserPaid = 0;
  let totalUserShare = 0;
  let amountUserOwes = 0;
  let amountOthersOweUser = 0;
  let outstandingSettlementsCount = 0;

  for (const trip of trips) {
    const tripExp = allExpenses.filter((e) => e.trip_id === trip.id);
    const tripStl = allSettlements.filter((s) => s.trip_id === trip.id);
    const tripM = (membersMap[trip.id] || []).map((m) => m.user || {
      id: m.user_id,
      full_name: 'Member',
      email: '',
    });

    totalExpensesOverall += tripExp.reduce((sum, e) => sum + e.amount, 0);

    const balances = calculateMemberBalances(tripM, tripExp, tripStl);
    const userBal = balances.find((b) => b.userId === currentUser.id);

    if (userBal) {
      totalUserPaid += userBal.totalPaid;
      totalUserShare += userBal.totalShare;

      if (userBal.netBalance > 0) {
        amountOthersOweUser += userBal.netBalance;
      } else if (userBal.netBalance < 0) {
        amountUserOwes += Math.abs(userBal.netBalance);
      }
    }

    const optimal = optimizeSettlements(balances, trip.currency);
    outstandingSettlementsCount += optimal.length;
  }

  // Category breakdown for charts
  const categoryTotals: Record<string, number> = {};
  for (const exp of allExpenses) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  }

  const categoryChartData = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['#4f46e5', '#7c3aed', '#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  // Monthly spending
  const monthlyTotals: Record<string, number> = {};
  for (const exp of allExpenses) {
    const month = exp.expense_date.substring(0, 7); // YYYY-MM
    monthlyTotals[month] = (monthlyTotals[month] || 0) + exp.amount;
  }

  const monthlyChartData = Object.entries(monthlyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-5)
    .map(([month, amount]) => {
      const d = new Date(month + '-01');
      return {
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        amount,
      };
    });

  const activeTripsCount = trips.filter((t) => t.status === 'active').length;
  const primaryCurrency = trips[0]?.currency || 'INR';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-16 md:pb-6">
        <Header
          title="Dashboard"
          subtitle={`Welcome back, ${currentUser.full_name}! Here is your group travel ledger.`}
          onOpenNewTrip={() => setIsCreateTripOpen(true)}
          onOpenNewExpense={() => setIsAddExpenseOpen(true)}
        />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Top Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Quick Actions
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsAddExpenseOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Expense
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCreateTripOpen(true)}
              >
                <Compass className="w-4 h-4 mr-1" /> Create Trip
              </Button>
              <Link href="/trips">
                <Button size="sm" variant="subtle">
                  <Scale className="w-4 h-4 mr-1" /> View Settlements
                </Button>
              </Link>
            </div>
          </div>

          {/* 5 Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Total Trip Expenses */}
            <Card className="hover:border-indigo-200 transition-colors">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Total Expenses
                  </span>
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <Receipt className="w-4 h-4" />
                  </div>
                </div>
                {isLoading ? (
                  <Skeleton className="h-7 w-28" />
                ) : (
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {formatCurrency(totalExpensesOverall, primaryCurrency)}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Across all group trips</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Amount You Owe */}
            <Card className="hover:border-rose-200 transition-colors">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">
                    You Owe
                  </span>
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                </div>
                {isLoading ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  <div>
                    <h3 className="text-xl font-extrabold text-rose-600 tracking-tight">
                      {formatCurrency(amountUserOwes, primaryCurrency)}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Outstanding debt</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. Amount Owed to You */}
            <Card className="hover:border-emerald-200 transition-colors">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                    Owed to You
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                {isLoading ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  <div>
                    <h3 className="text-xl font-extrabold text-emerald-600 tracking-tight">
                      {formatCurrency(amountOthersOweUser, primaryCurrency)}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Pending receivables</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 4. Active Trips */}
            <Card className="hover:border-blue-200 transition-colors">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">
                    Active Trips
                  </span>
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Compass className="w-4 h-4" />
                  </div>
                </div>
                {isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {activeTripsCount}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{trips.length} total registered</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 5. Outstanding Settlements */}
            <Card className="hover:border-violet-200 transition-colors">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-violet-500 uppercase tracking-wider">
                    Settlements
                  </span>
                  <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                    <Scale className="w-4 h-4" />
                  </div>
                </div>
                {isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {outstandingSettlementsCount}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Optimized payments left</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Visual Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Pie Chart */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Spending by Category</CardTitle>
                  <CardDescription>Actual distribution across all recorded items</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isMounted && categoryChartData.length > 0 ? (
                  <div className="h-64 flex flex-col sm:flex-row items-center justify-between">
                    <div className="w-full sm:w-1/2 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                          >
                            {categoryChartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val) =>
                              typeof val === 'number'
                                ? formatCurrency(val, primaryCurrency)
                                : String(val)
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full sm:w-1/2 space-y-1.5 pl-0 sm:pl-4 mt-4 sm:mt-0 max-h-56 overflow-y-auto">
                      {categoryChartData.map((cat, idx) => (
                        <div key={cat.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-slate-600">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            {cat.name}
                          </span>
                          <span className="font-bold text-slate-800">
                            {formatCurrency(cat.value, primaryCurrency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                    No expense data to render chart yet.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Trend Bar Chart */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Monthly Trip Spending</CardTitle>
                  <CardDescription>Expenditures grouped by date</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isMounted && monthlyChartData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          tickFormatter={(val) => `₹${val / 1000}k`}
                        />
                        <Tooltip
                          formatter={(val) =>
                            typeof val === 'number'
                              ? formatCurrency(val, primaryCurrency)
                              : String(val)
                          }
                        />
                        <Bar dataKey="amount" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                    No monthly timeline records available yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Trips & Recent Activity Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Trips (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Your Trips</h3>
                  <p className="text-xs text-slate-500">Active and upcoming group itineraries</p>
                </div>
                <Link href="/trips">
                  <Button variant="ghost" size="sm">
                    View All <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-3">
                {trips.map((trip) => {
                  const tripExp = allExpenses.filter((e) => e.trip_id === trip.id);
                  const totalSpent = tripExp.reduce((sum, e) => sum + e.amount, 0);
                  const tripM = membersMap[trip.id] || [];

                  return (
                    <Card key={trip.id} className="hover:border-indigo-300 transition-all">
                      <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/trips/${trip.id}`}
                              className="font-bold text-base text-slate-900 hover:text-indigo-600 transition-colors"
                            >
                              {trip.name}
                            </Link>
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
                          </div>
                          <p className="text-xs text-slate-500">{trip.destination}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {tripM.length} members
                            </span>
                          </div>
                        </div>

                        <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 flex sm:flex-col justify-between items-center sm:items-end">
                          <div>
                            <span className="text-[11px] text-slate-400 font-semibold block">
                              Total Spent
                            </span>
                            <span className="text-base font-extrabold text-slate-900">
                              {formatCurrency(totalSpent, trip.currency)}
                            </span>
                          </div>
                          <Link href={`/trips/${trip.id}`} className="sm:mt-2">
                            <Button size="sm" variant="subtle">
                              View Trip <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity Feed (1 col) */}
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Activity Ledger</h3>
                <p className="text-xs text-slate-500">Live ledger updates &amp; settlements</p>
              </div>

              <Card>
                <CardContent className="p-4 space-y-3">
                  {activities.length > 0 ? (
                    activities.map((act) => (
                      <div
                        key={act.id}
                        className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                            {act.action}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(act.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed">
                          {act.description}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No activity recorded yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <MobileNav />

      {/* Global Modals */}
      <CreateTripModal
        isOpen={isCreateTripOpen}
        onClose={() => setIsCreateTripOpen(false)}
        onTripCreated={loadDashboardData}
      />

      {trips.length > 0 && (
        <AddExpenseModal
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          trip={trips[0]}
          members={membersMap[trips[0].id] || []}
          onExpenseAdded={loadDashboardData}
        />
      )}
    </div>
  );
}
