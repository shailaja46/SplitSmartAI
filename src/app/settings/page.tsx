'use client';

import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Database,
  Sparkles,
  Key,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SplitSmartRepository } from '@/lib/storage/repository';
import { INITIAL_PROFILES } from '@/lib/storage/mock-data';
import { UserProfile } from '@/types';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(SplitSmartRepository.getCurrentUser());
  const [fullName, setFullName] = useState(currentUser.full_name);
  const [email, setEmail] = useState(currentUser.email);
  const isSupabaseConfigured = SplitSmartRepository.isSupabaseConfigured();

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = { ...currentUser, full_name: fullName, email };
    SplitSmartRepository.setCurrentUser(updated);
    setCurrentUser(updated);
    toast.success('Profile details saved!');
  };

  const handleResetDemoData = () => {
    if (confirm('Reset demo data to initial pristine seed state? This will restore Goa, Europe, and Manali trips.')) {
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      toast.success('Demo data restored! Refreshing page...');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-16 md:pb-6">
        <Header
          title="Account &amp; System Settings"
          subtitle="Configure profile, database connection status, and API environment"
        />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                <div>
                  <CardTitle>User Profile</CardTitle>
                  <CardDescription>Your identity displayed across trip ledgers</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex items-center gap-4 pb-2">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 font-extrabold text-lg flex items-center justify-center shrink-0 border border-indigo-200 overflow-hidden">
                    {currentUser.avatar_url ? (
                      <img src={currentUser.avatar_url} alt={currentUser.full_name} className="w-full h-full object-cover" />
                    ) : (
                      currentUser.full_name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{currentUser.full_name}</h4>
                    <p className="text-xs text-slate-500">{currentUser.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="primary">
                    Update Profile
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Infrastructure & Database Connection Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                <div>
                  <CardTitle>Supabase PostgreSQL Connection</CardTitle>
                  <CardDescription>Live database and Row Level Security status</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {isSupabaseConfigured
                        ? 'Supabase PostgreSQL Connected'
                        : 'Offline / Local Persistence Mode Active'}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isSupabaseConfigured
                        ? 'Connected via NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
                        : 'Using browser localStorage & memory fallback. Full features operable without external keys.'}
                    </p>
                  </div>
                </div>
                <Badge variant={isSupabaseConfigured ? 'success' : 'warning'}>
                  {isSupabaseConfigured ? 'ONLINE' : 'DEMO MODE'}
                </Badge>
              </div>

              <div className="text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-800">
                  To connect your own Supabase project:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-500 pl-1">
                  <li>Run the SQL migration script from <code className="text-indigo-600 bg-slate-100 px-1 py-0.5 rounded">supabase/schema.sql</code> in your Supabase SQL Editor.</li>
                  <li>Copy your Project URL and Anon API Key into <code className="text-indigo-600 bg-slate-100 px-1 py-0.5 rounded">.env.local</code>.</li>
                  <li>Restart the Next.js dev server.</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Google Gemini AI Configuration Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <div>
                  <CardTitle>Google Gemini AI Configuration</CardTitle>
                  <CardDescription>Official Google Gen AI SDK integration</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">SDK Status:</span>
                  <Badge variant="purple">Google Gen AI SDK (@google/genai)</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Default Model:</span>
                  <span className="font-mono text-indigo-600">gemini-2.5-flash</span>
                </div>
                <p className="text-slate-500 pt-1 text-[11px] leading-relaxed">
                  Provide <code className="bg-slate-200/60 px-1 py-0.5 rounded text-indigo-700">GEMINI_API_KEY</code> in <code className="bg-slate-200/60 px-1 py-0.5 rounded text-indigo-700">.env.local</code> to activate live model synthesis. If not provided, SplitSmart AI uses smart heuristic rule-based parsing so you can test immediately.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Reset Demo Data */}
          <Card className="border-amber-200 bg-amber-50/20">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-amber-900">Reset Demo State</h4>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Clear local additions and reload default sample trips, expenses, and members.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleResetDemoData}>
                <RotateCcw className="w-4 h-4 mr-1.5" /> Reset Data
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
