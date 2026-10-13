'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Split, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { SplitSmartRepository } from '@/lib/storage/repository';
import { toast } from 'sonner';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isSupabaseConfigured = SplitSmartRepository.isSupabaseConfigured();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error('All fields are required');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createClient();
      if (supabase && isSupabaseConfigured) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
      }

      const newUser = {
        id: `user-${Date.now()}`,
        full_name: fullName,
        email,
      };
      SplitSmartRepository.setCurrentUser(newUser);

      toast.success('Account created successfully! Welcome to SplitSmart AI.');
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('An error occurred during account creation');
    } finally {
      setIsLoading(false);
    }
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
          Create your SplitSmart account
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Start planning trips and splitting expenses effortlessly.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="p-2 sm:p-4 shadow-xl shadow-slate-200/50">
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="e.g. Alex Patel"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <div className="text-[11px] text-slate-500 leading-relaxed">
                By signing up, you agree to fair ledger distribution and transparent group expense sharing.
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                className="w-full shadow-sm shadow-indigo-200"
              >
                Create Account <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
