'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  LayoutDashboard,
  Receipt,
  Scale,
  Sparkles,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Split,
  PlusCircle,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SplitSmartRepository } from '@/lib/storage/repository';
import { INITIAL_PROFILES } from '@/lib/storage/mock-data';

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isSupabase = SplitSmartRepository.isSupabaseConfigured();
  const currentUser = SplitSmartRepository.getCurrentUser();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Trips', href: '/trips', icon: Compass },
    { label: 'AI Insights', href: '/ai-insights', icon: Sparkles, badge: 'Gemini' },
    { label: 'Reports & Export', href: '/reports', icon: FileSpreadsheet },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-white border-r border-slate-200/80 transition-all duration-300 relative z-30 select-none',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-100 justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0">
            <Split className="w-5 h-5 rotate-45" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-base text-slate-900 tracking-tight leading-none">
                SplitSmart<span className="text-indigo-600 font-extrabold ml-1">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 mt-1 font-medium truncate">
                Every trip. Perfectly split.
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className={cn('px-3 mb-2', isCollapsed && 'sr-only')}>
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Menu
          </span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0 transition-colors',
                  isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                )}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              {!isCollapsed && item.badge && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Database / Demo Badge */}
      <div className="p-3 border-t border-slate-100">
        {!isCollapsed ? (
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full', isSupabase ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')} />
              <div className="text-xs">
                <p className="font-semibold text-slate-800">
                  {isSupabase ? 'Supabase Connected' : 'Demo Storage'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {isSupabase ? 'PostgreSQL Active' : 'Offline / Local Persistence'}
                </p>
              </div>
            </div>
            <Database className="w-4 h-4 text-slate-400" />
          </div>
        ) : (
          <div className="flex justify-center" title={isSupabase ? 'Supabase Connected' : 'Demo Local Storage'}>
            <span className={cn('w-2.5 h-2.5 rounded-full', isSupabase ? 'bg-emerald-500' : 'bg-amber-500')} />
          </div>
        )}
      </div>

      {/* User profile footer */}
      <div className="p-3 border-t border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 overflow-hidden border border-indigo-200">
          {currentUser.avatar_url ? (
            <img src={currentUser.avatar_url} alt={currentUser.full_name} className="w-full h-full object-cover" />
          ) : (
            currentUser.full_name.slice(0, 2).toUpperCase()
          )}
        </div>
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">{currentUser.full_name}</p>
            <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
