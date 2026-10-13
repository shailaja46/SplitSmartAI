'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Split, ArrowRight, ShieldCheck, Mail, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { SplitSmartRepository } from '@/lib/storage/repository';
import { INITIAL_PROFILES } from '@/lib/storage/mock-data';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isSupabaseConfigured = SplitSmartRepository.isSupabaseConfigured();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createClient();
      if (supabase && isSupabaseConfigured) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          toast.error(error.message);
          return;
        }
      }

      // Find or assign profile
      const user = INITIAL_PROFILES.find((p) => p.email.toLowerCase() === email.toLowerCase()) || {
        id: `user-${Date.now()}`,
        full_name: email.split('@')[0],
        email,
      };
      SplitSmartRepository.setCurrentUser(user);

      toast.success('Successfully logged in!');
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('An error occurred during authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (profileIndex: number) => {
    const profile = INITIAL_PROFILES[profileIndex] || INITIAL_PROFILES[0];
    SplitSmartRepository.setCurrentUser(profile);
    toast.success(`Logged in as ${profile.full_name} (${profile.email})`);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <Split className="w-5 h-5 rotate-45" />
          </div>
          <span className="font-extrabold text-2xl text-slate-900 tracking-tight">
            SplitSmart<span className="text-indigo-600">AI</span>
          </span>
        </Link>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Welcome back to SplitSmart AI
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Every trip. Every expense. Perfectly split.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="p-2 sm:p-4 shadow-xl shadow-slate-200/50">
          <CardContent>
            {/* Quick 1-Click Demo Profiles */}
            <div className="mb-6 p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> 1-Click Demo Sign-in
                </span>
                <span className="text-[10px] bg-indigo-200/60 text-indigo-800 px-1.5 py-0.5 rounded-md font-semibold">
                  Instant Access
                </span>
              </div>
              <p className="text-[11px] text-indigo-700">
                Explore as any trip member without creating an account:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoLogin(0)}
                  className="bg-white text-xs h-8 text-slate-700"
                >
                  Alice (Trip Owner)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoLogin(1)}
                  className="bg-white text-xs h-8 text-slate-700"
                >
                  Rahul (Member)
                </Button>
              </div>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-semibold tracking-wider text-[10px]">
                  Or use email &amp; password
                </span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="space-y-1">
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-[11px] text-indigo-600 hover:underline font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                className="w-full shadow-sm shadow-indigo-200"
              >
                Sign In to Dashboard <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500">
              Don&apos;t have an account yet?{' '}
              <Link href="/signup" className="text-indigo-600 font-semibold hover:underline">
                Sign up free
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
