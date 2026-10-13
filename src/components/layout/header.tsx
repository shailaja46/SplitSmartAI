'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Plus,
  Compass,
  UserCheck,
  ChevronDown,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { SplitSmartRepository } from '@/lib/storage/repository';
import { Trip, UserProfile, ActivityLog } from '@/types';
import { INITIAL_PROFILES } from '@/lib/storage/mock-data';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onOpenNewTrip?: () => void;
  onOpenNewExpense?: () => void;
  selectedTripId?: string;
}

export function Header({
  title = 'SplitSmart AI',
  subtitle,
  onOpenNewTrip,
  onOpenNewExpense,
  selectedTripId,
}: HeaderProps) {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [showActivities, setShowActivities] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(SplitSmartRepository.getCurrentUser());

  useEffect(() => {
    async function loadData() {
      const allTrips = await SplitSmartRepository.getTrips();
      setTrips(allTrips);
      const logs = await SplitSmartRepository.getActivityLogs(selectedTripId);
      setActivities(logs.slice(0, 5));
    }
    loadData();
  }, [selectedTripId]);

  const handleSwitchUser = (user: UserProfile) => {
    SplitSmartRepository.setCurrentUser(user);
    setCurrentUser(user);
    setShowUserMenu(false);
    window.location.reload();
  };

  const currentTrip = trips.find((t) => t.id === selectedTripId);

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Title & Active Trip Picker */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && <p className="text-xs text-slate-500 hidden sm:block">{subtitle}</p>}
        </div>

        {trips.length > 0 && (
          <div className="hidden lg:flex items-center ml-2 pl-4 border-l border-slate-200">
            <span className="text-xs text-slate-400 mr-2 flex items-center gap-1 font-medium">
              <Compass className="w-3.5 h-3.5 text-indigo-500" /> Trip:
            </span>
            <select
              value={selectedTripId || ''}
              onChange={(e) => {
                if (e.target.value) {
                  router.push(`/trips/${e.target.value}`);
                } else {
                  router.push('/dashboard');
                }
              }}
              className="text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">All Trips (Overview)</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.currency})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Action Controls & User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenNewExpense && (
          <Button
            size="sm"
            variant="primary"
            onClick={onOpenNewExpense}
            className="shadow-sm shadow-indigo-200"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Expense
          </Button>
        )}

        {onOpenNewTrip && (
          <Button size="sm" variant="outline" onClick={onOpenNewTrip} className="hidden sm:inline-flex">
            New Trip
          </Button>
        )}

        {/* Activity Feed dropdown toggle */}
        <div className="relative">
          <button
            onClick={() => setShowActivities(!showActivities)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative cursor-pointer"
            title="Activity Feed"
          >
            <Bell className="w-4 h-4" />
            {activities.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600" />
            )}
          </button>

          {showActivities && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-40 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Recent Activities
                </h4>
                <span className="text-[10px] text-indigo-600 font-medium">Realtime</span>
              </div>
              <div className="divide-y divide-slate-100 mt-2 max-h-64 overflow-y-auto">
                {activities.map((act) => (
                  <div key={act.id} className="py-2 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-slate-700 font-medium leading-relaxed">{act.description}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Demo User Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/70"
            title="Switch Demo Member"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden">
              {currentUser.avatar_url ? (
                <img src={currentUser.avatar_url} alt={currentUser.full_name} className="w-full h-full object-cover" />
              ) : (
                currentUser.full_name.slice(0, 1)
              )}
            </div>
            <span className="text-xs font-semibold text-slate-700 hidden md:block max-w-[100px] truncate">
              {currentUser.full_name.split(' ')[0]}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-40 animate-in fade-in">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Logged In As
                </p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">{currentUser.full_name}</p>
                <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
              </div>

              <div className="py-1">
                <p className="px-3 py-1 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                  Switch Member View
                </p>
                {INITIAL_PROFILES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSwitchUser(p)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between hover:bg-slate-100 transition-colors cursor-pointer',
                      p.id === currentUser.id && 'bg-indigo-50 font-bold text-indigo-700'
                    )}
                  >
                    <span>{p.full_name}</span>
                    {p.id === currentUser.id && <UserCheck className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
