'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Compass,
  Plus,
  Search,
  Calendar,
  Users,
  DollarSign,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CreateTripModal } from '@/components/trips/create-trip-modal';
import { SplitSmartRepository } from '@/lib/storage/repository';
import { Expense, Trip, TripMember, TripStatus } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [membersMap, setMembersMap] = useState<Record<string, TripMember[]>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | TripStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);

  const loadTrips = async () => {
    const allTrips = await SplitSmartRepository.getTrips();
    setTrips(allTrips);

    const expList: Expense[] = [];
    const mList: Record<string, TripMember[]> = {};

    for (const trip of allTrips) {
      const tripExp = await SplitSmartRepository.getExpenses(trip.id);
      const tripM = await SplitSmartRepository.getTripMembers(trip.id);
      expList.push(...tripExp);
      mList[trip.id] = tripM;
    }

    setExpenses(expList);
    setMembersMap(mList);
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const filteredTrips = trips.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.destination.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-16 md:pb-6">
        <Header
          title="Group Trips"
          subtitle="Manage travel groups, itineraries, budgets, and member permissions."
          onOpenNewTrip={() => setIsCreateTripOpen(true)}
        />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search trip by name or destination..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                {(['all', 'active', 'planning', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                      statusFilter === status
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsCreateTripOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> New Trip
              </Button>
            </div>
          </div>

          {/* Trips Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip) => {
              const tripExpenses = expenses.filter((e) => e.trip_id === trip.id);
              const totalSpent = tripExpenses.reduce((sum, e) => sum + e.amount, 0);
              const tripMembers = membersMap[trip.id] || [];
              const budget = trip.budget || 0;
              const budgetPct = budget > 0 ? Math.min(Math.round((totalSpent / budget) * 100), 100) : 0;

              return (
                <Card key={trip.id} className="hover:border-indigo-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="p-5 border-b border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
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
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {trip.currency}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                        <Link href={`/trips/${trip.id}`} className="hover:text-indigo-600 transition-colors">
                          {trip.name}
                        </Link>
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1">{trip.destination}</p>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="space-y-1 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Dates
                          </span>
                          <span className="font-medium text-slate-800">
                            {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <Users className="w-3.5 h-3.5 text-indigo-500" /> Travelers
                          </span>
                          <span className="font-medium text-slate-800">
                            {tripMembers.length} members
                          </span>
                        </div>
                      </div>

                      {/* Spending vs Budget Progress */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Total Spent</span>
                          <span className="font-extrabold text-slate-900">
                            {formatCurrency(totalSpent, trip.currency)}
                          </span>
                        </div>

                        {budget > 0 ? (
                          <>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  budgetPct > 90 ? 'bg-rose-500' : 'bg-indigo-600'
                                }`}
                                style={{ width: `${budgetPct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-400">
                              <span>Budget: {formatCurrency(budget, trip.currency)}</span>
                              <span>{budgetPct}% used</span>
                            </div>
                          </>
                        ) : (
                          <p className="text-[11px] text-slate-400">No budget cap set</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/70 border-t border-slate-100 rounded-b-2xl flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      {tripExpenses.length} expenses
                    </span>
                    <Link href={`/trips/${trip.id}`}>
                      <Button size="sm" variant="subtle">
                        Manage Trip <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>

          {filteredTrips.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8">
              <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No trips found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No trips matching your filter. Create a new trip to start recording and splitting expenses.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => setIsCreateTripOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> Create Your First Trip
              </Button>
            </div>
          )}
        </main>
      </div>

      <MobileNav />

      <CreateTripModal
        isOpen={isCreateTripOpen}
        onClose={() => setIsCreateTripOpen(false)}
        onTripCreated={loadTrips}
      />
    </div>
  );
}
