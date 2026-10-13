'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Users, Calculator, ArrowRight, Wand2, Receipt } from 'lucide-react';
import { Modal } from '../ui/modal';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ExpenseCategory, SplitMethod, Trip, TripMember, UserProfile } from '@/types';
import {
  calculateEqualSplits,
  calculatePercentageSplits,
  calculateSharesSplits,
  validateAndCalculateExactSplits,
  roundCurrency,
} from '@/lib/calculations/settlement';
import { SplitSmartRepository } from '@/lib/storage/repository';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  members: TripMember[];
  onExpenseAdded?: () => void;
}

export function AddExpenseModal({
  isOpen,
  onClose,
  trip,
  members,
  onExpenseAdded,
}: AddExpenseModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [isLoading, setIsLoading] = useState(false);
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food and drinks');
  const [expenseDate, setExpenseDate] = useState('');
  const [paidBy, setPaidBy] = useState(members[0]?.user_id || '');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [notes, setNotes] = useState('');

  // Participants & allocations
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    members.map((m) => m.user_id)
  );
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && !expenseDate) {
      setExpenseDate(new Date().toISOString().split('T')[0]);
    }
    if (members.length > 0) {
      if (!paidBy) setPaidBy(members[0].user_id);
      if (selectedUserIds.length === 0) {
        setSelectedUserIds(members.map((m) => m.user_id));
      }
    }
  }, [isOpen, members, paidBy, selectedUserIds.length, expenseDate]);

  const categories: ExpenseCategory[] = [
    'Accommodation',
    'Food and drinks',
    'Transportation',
    'Shopping',
    'Activities',
    'Fuel',
    'Tickets',
    'Miscellaneous',
  ];

  // AI Natural Language Parsing
  const handleParseAi = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter an expense description to parse.');
      return;
    }

    try {
      setIsAiParsing(true);
      const res = await fetch('/api/ai/parse-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: aiPrompt.trim(),
          members: members.map((m) => ({
            id: m.user_id,
            name: m.user?.full_name || 'Member',
          })),
          currency: trip.currency,
        }),
      });

      if (!res.ok) throw new Error('AI parse failed');
      const data = await res.json();

      setTitle(data.title || '');
      setAmount(String(data.amount || ''));
      if (data.category && categories.includes(data.category as ExpenseCategory)) {
        setCategory(data.category as ExpenseCategory);
      }
      if (data.payerId) {
        setPaidBy(data.payerId);
      }
      if (data.expenseDate) {
        setExpenseDate(data.expenseDate);
      }
      if (data.participantIds && Array.isArray(data.participantIds) && data.participantIds.length > 0) {
        setSelectedUserIds(data.participantIds);
      }
      if (data.notes) {
        setNotes(data.notes);
      }

      toast.success(
        data.aiGenerated
          ? 'Gemini parsed your expense! Review details below before saving.'
          : 'Expense draft parsed! Please review and confirm.'
      );
      setActiveTab('manual');
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse text. Please fill details manually.');
    } finally {
      setIsAiParsing(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      if (selectedUserIds.length === 1) {
        toast.error('At least one participant must be included');
        return;
      }
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!title.trim() || isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid title and positive amount.');
      return;
    }

    if (selectedUserIds.length === 0) {
      toast.error('Select at least one participant.');
      return;
    }

    // Compute splits based on method
    let finalSplits: { user_id: string; amount: number; percentage?: number; shares?: number }[] = [];

    if (splitMethod === 'equal') {
      const computed = calculateEqualSplits(numAmount, selectedUserIds);
      finalSplits = computed.map((s) => ({
        user_id: s.userId,
        amount: s.amount,
        percentage: s.percentage,
        shares: 1,
      }));
    } else if (splitMethod === 'exact') {
      const inputs = selectedUserIds.map((uid) => ({
        userId: uid,
        amount: parseFloat(exactAmounts[uid] || '0'),
      }));
      const validation = validateAndCalculateExactSplits(numAmount, inputs);
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid exact amounts');
        return;
      }
      finalSplits = validation.splits.map((s) => ({
        user_id: s.user_id,
        amount: s.amount,
        percentage: s.percentage,
      }));
    } else if (splitMethod === 'percentage') {
      const inputs = selectedUserIds.map((uid) => ({
        userId: uid,
        percentage: parseFloat(percentages[uid] || '0'),
      }));
      const validation = calculatePercentageSplits(numAmount, inputs);
      if (!validation.valid) {
        toast.error(validation.error || 'Percentages must total 100%');
        return;
      }
      finalSplits = validation.splits.map((s) => ({
        user_id: s.user_id,
        amount: s.amount,
        percentage: s.percentage,
      }));
    } else if (splitMethod === 'shares') {
      const inputs = selectedUserIds.map((uid) => ({
        userId: uid,
        shares: parseFloat(shares[uid] || '1'),
      }));
      const validation = calculateSharesSplits(numAmount, inputs);
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid shares allocation');
        return;
      }
      finalSplits = validation.splits.map((s) => ({
        user_id: s.user_id,
        amount: s.amount,
        shares: s.shares,
      }));
    }

    try {
      setIsLoading(true);
      await SplitSmartRepository.createExpense({
        trip_id: trip.id,
        title: title.trim(),
        amount: numAmount,
        category,
        paid_by: paidBy,
        expense_date: expenseDate,
        split_method: splitMethod,
        notes: notes.trim() || undefined,
        splits: finalSplits,
      });

      toast.success(`Expense "${title}" saved! Balances updated.`);
      onClose();
      if (onExpenseAdded) onExpenseAdded();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save expense');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Trip Expense"
      description={`Record an expense for ${trip.name} and distribute shares.`}
      maxWidth="lg"
    >
      {/* Mode Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeTab === 'manual'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Standard Form
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'ai'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Split with Gemini AI
        </button>
      </div>

      {activeTab === 'ai' ? (
        <div className="space-y-4">
          <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-xl">
            <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 mb-1">
              <Wand2 className="w-4 h-4 text-indigo-600" /> Natural Language Expense Entry
            </h4>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Describe what was paid in plain English. SplitSmart AI will extract the amount, payer,
              category, date, and members automatically.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Expense Sentence</label>
            <textarea
              rows={3}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder='e.g. "Yesterday, Rahul paid ₹2,400 for dinner for Rahul, Priya, and me. Split it equally."'
              className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] text-slate-400">Quick examples:</span>
            <button
              type="button"
              onClick={() =>
                setAiPrompt(
                  `Yesterday, ${members[0]?.user?.full_name || 'Alice'} paid 4800 for airport cab for all of us.`
                )
              }
              className="text-[11px] text-indigo-600 hover:underline bg-indigo-50 px-2 py-0.5 rounded-md"
            >
              &quot;Airport cab for everyone&quot;
            </button>
            <button
              type="button"
              onClick={() =>
                setAiPrompt(
                  `Today, ${members[1]?.user?.full_name || 'Rahul'} paid 1600 for fuel, split equally.`
                )
              }
              className="text-[11px] text-indigo-600 hover:underline bg-indigo-50 px-2 py-0.5 rounded-md"
            >
              &quot;Fuel paid today&quot;
            </button>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setActiveTab('manual')}>
              Back to Form
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleParseAi}
              isLoading={isAiParsing}
            >
              Parse &amp; Fill Form <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Expense Title"
              placeholder="e.g. Scuba diving, Dinner, Scooters"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Input
              label={`Amount (${trip.currency})`}
              type="number"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              options={categories.map((c) => ({ value: c, label: c }))}
            />
            <Select
              label="Paid By"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              options={members.map((m) => ({
                value: m.user_id,
                label: m.user?.full_name || 'Member',
              }))}
            />
            <Input
              label="Date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
            />
          </div>

          {/* Split Method Selector */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Split Method</label>
              <span className="text-[11px] text-slate-400">
                {selectedUserIds.length} participant{selectedUserIds.length > 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {(['equal', 'exact', 'percentage', 'shares'] as SplitMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSplitMethod(m)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold capitalize border transition-all text-center cursor-pointer ${
                    splitMethod === m
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Member Participant Checklist & Dynamic Split Inputs */}
          <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100 max-h-52 overflow-y-auto">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Participating Members
            </p>
            {members.map((m) => {
              const isSelected = selectedUserIds.includes(m.user_id);
              return (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white border border-slate-200/60"
                >
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleParticipant(m.user_id)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-800">
                      {m.user?.full_name || 'Member'}
                    </span>
                  </label>

                  {/* Split specific inputs */}
                  {isSelected && splitMethod === 'equal' && amount && (
                    <span className="text-xs font-semibold text-indigo-600">
                      {formatCurrency(
                        parseFloat(amount) / selectedUserIds.length,
                        trip.currency
                      )}
                    </span>
                  )}

                  {isSelected && splitMethod === 'exact' && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">{trip.currency}</span>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={exactAmounts[m.user_id] || ''}
                        onChange={(e) =>
                          setExactAmounts({ ...exactAmounts, [m.user_id]: e.target.value })
                        }
                        className="w-20 px-2 py-1 text-xs border border-slate-200 rounded-lg text-right"
                      />
                    </div>
                  )}

                  {isSelected && splitMethod === 'percentage' && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={percentages[m.user_id] || ''}
                        onChange={(e) =>
                          setPercentages({ ...percentages, [m.user_id]: e.target.value })
                        }
                        className="w-16 px-2 py-1 text-xs border border-slate-200 rounded-lg text-right"
                      />
                      <span className="text-xs text-slate-400">%</span>
                    </div>
                  )}

                  {isSelected && splitMethod === 'shares' && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="1"
                        value={shares[m.user_id] || '1'}
                        onChange={(e) =>
                          setShares({ ...shares, [m.user_id]: e.target.value })
                        }
                        className="w-16 px-2 py-1 text-xs border border-slate-200 rounded-lg text-right"
                      />
                      <span className="text-xs text-slate-400">shares</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Paid via UPI, includes tips"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Save Expense
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
