'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Split, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { SplitSmartRepository } from '@/lib/storage/repository';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isSupabaseConfigured = SplitSmartRepository.isSupabaseConfigured();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createClient();
      if (supabase && isSupabaseConfigured) {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
      }
      setIsSubmitted(true);
      toast.success('Password reset instructions sent!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to send reset instructions');
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
          Reset your password
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Enter your email and we&apos;ll send you a password recovery link.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="p-2 sm:p-4 shadow-xl shadow-slate-200/50">
          <CardContent>
            {isSubmitted ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Check your inbox</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  We sent a recovery link to <span className="font-semibold text-slate-900">{email}</span>. Click the link to update your credentials.
                </p>
                <div className="pt-4">
                  <Link href="/login">
                    <Button variant="outline" size="sm" className="w-full">
                      <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <Input
                  label="Registered Email Address"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  className="w-full shadow-sm shadow-indigo-200"
                >
                  Send Reset Link
                </Button>

                <div className="pt-2 text-center">
                  <Link
                    href="/login"
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 font-medium"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
