'use client';

import React from 'react';
import Link from 'next/link';
import {
  Split,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  PieChart,
  Users,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  ChevronRight,
  TrendingDown,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation Header */}
      <nav className="h-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Split className="w-5 h-5 rotate-45" />
            </div>
            <div>
              <span className="font-extrabold text-xl text-slate-900 tracking-tight">
                SplitSmart<span className="text-indigo-600 ml-0.5">AI</span>
              </span>
              <span className="hidden sm:inline-block text-[11px] text-slate-400 ml-2 font-medium border-l border-slate-200 pl-2">
                Group Trip Expense Splitter
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              Sign In
            </Link>
            <Link href="/dashboard">
              <Button size="sm" variant="primary" className="shadow-sm shadow-indigo-200">
                Launch Dashboard <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/80 text-xs font-semibold text-indigo-700 mb-6 shadow-xs animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Powered by Google Gemini 2.5 Flash &amp; Supabase PostgreSQL</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.15]">
            Every trip. Every expense.{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 bg-clip-text text-transparent">
              Perfectlys&nbsp;split.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            The intelligent travel finance platform for students, families, and travel groups.
            Track shared bills, parse natural-language expenses with Gemini AI, and settle debts with the minimum number of payments.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" variant="primary" className="w-full sm:w-auto shadow-md shadow-indigo-200 text-base">
                Try Live Interactive App <ArrowRight className="w-5 h-5 ml-1.5" />
              </Button>
            </Link>
            <Link href="/trips" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base">
                Explore Demo Trips
              </Button>
            </Link>
          </div>

          {/* Interactive Settlement Demonstration Box */}
          <div className="mt-14 max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-200/50 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  Live Settlement Engine Invariant
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">
                  Deterministic Transaction Minimization (Min-Cash-Flow)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reduces tangled group debts down to at most N-1 simple payments.
                </p>
              </div>
              <Badge variant="success" className="self-start sm:self-auto py-1 px-3">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Zero Discrepancy
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
              {/* Contributor Alice */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Alice Sharma</span>
                  <Badge variant="purple">Paid ₹24,000</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">Paid for Candidate Villa</p>
                <div className="mt-3 pt-3 border-t border-indigo-100 text-xs font-semibold text-emerald-600 flex justify-between">
                  <span>Net Balance:</span>
                  <span>+₹18,000 (To Receive)</span>
                </div>
              </div>

              {/* Contributor Rahul */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Rahul Verma</span>
                  <Badge variant="info">Paid ₹5,600</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">Paid Seafood Dinner</p>
                <div className="mt-3 pt-3 border-t border-slate-200 text-xs font-semibold text-rose-600 flex justify-between">
                  <span>Net Balance:</span>
                  <span>-₹1,800 (Owes)</span>
                </div>
              </div>

              {/* Settlement recommendation */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" /> Optimal Solution
                  </span>
                  <p className="text-xs text-emerald-700 mt-1 font-medium">
                    Rahul &amp; Kabir pay Alice directly. Avoids 6 separate transactions.
                  </p>
                </div>
                <div className="mt-3 text-xs font-bold text-emerald-900 bg-emerald-100/60 p-2 rounded-xl text-center">
                  2 Payments Settle Entire Trip
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Designed for fair, zero-stress group travel
            </h2>
            <p className="mt-3 text-slate-500 text-sm">
              Everything needed to manage finances from touchdown to checkout.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">4 Flexible Split Methods</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Equal split, exact amounts, percentage shares, or arbitrary ratios. Our calculation engine handles integer penny remainders so the sum always matches 100%.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-100">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Google Gemini AI Intelligence</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Type natural sentences to log expenses, request personalized destination budget breakdowns, generate spending audits, and chat with an AI assistant.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-100">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Reports &amp; 1-Click CSV</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Export clean, audit-ready CSV spreadsheets for expenses and settlements. Print clean PDF financial summaries to share over WhatsApp or email.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Banner */}
      <section className="py-12 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-6">
            Production-Ready Architecture
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-slate-300 text-sm font-semibold">
            <span className="flex items-center gap-2">Next.js 16 (App Router)</span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-2">Supabase PostgreSQL &amp; Auth</span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-2">Google Gemini 2.5 SDK</span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-2">Tailwind CSS</span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-2">Recharts</span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-2">Vitest Tested</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              <Split className="w-4 h-4 rotate-45" />
            </div>
            <span className="font-bold text-sm text-slate-900">SplitSmart AI</span>
            <span className="text-xs text-slate-400 ml-2">
              &copy; 2026 SplitSmart AI. Built for fair group travels.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500 font-medium">
            <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
            <Link href="/trips" className="hover:text-indigo-600">Trips</Link>
            <Link href="/ai-insights" className="hover:text-indigo-600">AI Insights</Link>
            <Link href="/reports" className="hover:text-indigo-600">Reports</Link>
            <Link href="/settings" className="hover:text-indigo-600">Settings</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
