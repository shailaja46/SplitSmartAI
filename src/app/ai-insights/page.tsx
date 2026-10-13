'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Wand2,
  PieChart,
  Compass,
  DollarSign,
  TrendingUp,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SplitSmartRepository } from '@/lib/storage/repository';
import { Trip, TripMember, Expense } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function AIInsightsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [budgetForm, setBudgetForm] = useState({
    destination: 'Goa, India',
    durationDays: 5,
    travelersCount: 4,
    estimatedBudget: 50000,
    travelStyle: 'moderate',
    currency: 'INR',
  });
  const [budgetRecommendation, setBudgetRecommendation] = useState<any>(null);
  const [isGeneratingBudget, setIsGeneratingBudget] = useState(false);

  useEffect(() => {
    async function init() {
      const allTrips = await SplitSmartRepository.getTrips();
      setTrips(allTrips);
      if (allTrips.length > 0) {
        setSelectedTripId(allTrips[0].id);
        setBudgetForm((prev) => ({
          ...prev,
          destination: allTrips[0].destination,
          currency: allTrips[0].currency,
          estimatedBudget: allTrips[0].budget || 50000,
        }));
      }
    }
    init();
  }, []);

  const handleGenerateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsGeneratingBudget(true);
      const res = await fetch('/api/ai/budget-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetForm),
      });

      if (!res.ok) throw new Error('Budget generation failed');
      const data = await res.json();
      setBudgetRecommendation(data);
      toast.success(
        data.aiGenerated
          ? 'Gemini created custom budget allocation!'
          : 'Budget recommendations generated!'
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate budget recommendation');
    } finally {
      setIsGeneratingBudget(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-16 md:pb-6">
        <Header
          title="AI Insights Hub"
          subtitle="Google Gemini 2.5 powered group travel financial intelligence"
          selectedTripId={selectedTripId}
        />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-800/80 border border-indigo-700 text-xs font-semibold text-indigo-200">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Official Google Gen AI SDK
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                AI Budget Planner &amp; Spending Auditor
              </h1>
              <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed">
                Generate smart budget targets before you leave, parse bills written in plain language, and identify saving opportunities across accommodation, food, and activities.
              </p>
            </div>
          </div>

          {/* Smart Budget Recommendations Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Form (1 col) */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-indigo-600" />
                  <div>
                    <CardTitle>Plan Trip Budget</CardTitle>
                    <CardDescription>Configure parameters for AI model</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <form onSubmit={handleGenerateBudget} className="space-y-3">
                  <Input
                    label="Destination"
                    placeholder="e.g. North Goa, Paris, Manali"
                    value={budgetForm.destination}
                    onChange={(e) =>
                      setBudgetForm({ ...budgetForm, destination: e.target.value })
                    }
                    required
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Duration (Days)"
                      type="number"
                      min="1"
                      value={budgetForm.durationDays}
                      onChange={(e) =>
                        setBudgetForm({
                          ...budgetForm,
                          durationDays: parseInt(e.target.value) || 1,
                        })
                      }
                      required
                    />
                    <Input
                      label="Travelers"
                      type="number"
                      min="1"
                      value={budgetForm.travelersCount}
                      onChange={(e) =>
                        setBudgetForm({
                          ...budgetForm,
                          travelersCount: parseInt(e.target.value) || 1,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label={`Total Budget (${budgetForm.currency})`}
                      type="number"
                      step="any"
                      value={budgetForm.estimatedBudget}
                      onChange={(e) =>
                        setBudgetForm({
                          ...budgetForm,
                          estimatedBudget: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                    />
                    <Select
                      label="Travel Style"
                      value={budgetForm.travelStyle}
                      onChange={(e) =>
                        setBudgetForm({ ...budgetForm, travelStyle: e.target.value })
                      }
                      options={[
                        { value: 'budget', label: 'Budget' },
                        { value: 'moderate', label: 'Moderate' },
                        { value: 'luxury', label: 'Luxury' },
                      ]}
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full shadow-sm shadow-indigo-200"
                      isLoading={isGeneratingBudget}
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" /> Generate Budget Breakdown
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Results Breakdown (2 cols) */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>AI Budget Allocation Breakdown</CardTitle>
                    <CardDescription>
                      Estimated category targets and emergency reserves
                    </CardDescription>
                  </div>
                  {budgetRecommendation && (
                    <Badge variant={budgetRecommendation.aiGenerated ? 'purple' : 'default'}>
                      {budgetRecommendation.aiGenerated ? 'Gemini 2.5 Flash' : 'Rule-Based Model'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {budgetRecommendation ? (
                  <div className="space-y-6">
                    {/* Header stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Total Budget</span>
                        <span className="text-base font-bold text-slate-900">
                          {formatCurrency(
                            budgetRecommendation.totalBudget,
                            budgetRecommendation.currency
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Duration</span>
                        <span className="text-base font-bold text-slate-900">
                          {budgetRecommendation.durationDays} days
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Group Size</span>
                        <span className="text-base font-bold text-slate-900">
                          {budgetRecommendation.travelersCount} travelers
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Daily / Person</span>
                        <span className="text-base font-bold text-indigo-600">
                          {formatCurrency(
                            budgetRecommendation.dailyTargetPerPerson,
                            budgetRecommendation.currency
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Breakdown bars */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Category Distribution
                      </h4>
                      {budgetRecommendation.breakdown.map((item: any, idx: number) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-800">{item.category}</span>
                            <span className="text-slate-900 font-bold">
                              {formatCurrency(item.amount, budgetRecommendation.currency)} (
                              {item.percentage}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-400 italic">{item.notes}</p>
                        </div>
                      ))}
                    </div>

                    {/* Tips */}
                    {budgetRecommendation.tips && budgetRecommendation.tips.length > 0 && (
                      <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                        <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Destination Advice
                        </span>
                        <ul className="space-y-1 text-xs text-indigo-800">
                          {budgetRecommendation.tips.map((tip: string, tIdx: number) => (
                            <li key={tIdx} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-3">
                      * {budgetRecommendation.disclaimer}
                    </p>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <Compass className="w-10 h-10 text-slate-300 mx-auto" />
                    <p>Enter your destination parameters and click &quot;Generate Budget Breakdown&quot; to see recommendations.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
