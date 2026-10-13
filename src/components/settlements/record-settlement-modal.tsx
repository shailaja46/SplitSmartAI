'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { Modal } from '../ui/modal';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Button } from '../ui/button';
import { Trip, TripMember, UserProfile } from '@/types';
import { SplitSmartRepository } from '@/lib/storage/repository';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface RecordSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  members: TripMember[];
  initialPayerId?: string;
  initialReceiverId?: string;
  initialAmount?: number;
  onSettled?: () => void;
}

export function RecordSettlementModal({
  isOpen,
  onClose,
  trip,
  members,
  initialPayerId,
  initialReceiverId,
  initialAmount,
  onSettled,
}: RecordSettlementModalProps) {
  const [payerId, setPayerId] = useState(initialPayerId || members[0]?.user_id || '');
  const [receiverId, setReceiverId] = useState(
    initialReceiverId || members[1]?.user_id || members[0]?.user_id || ''
  );
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (payerId === receiverId) {
      toast.error('Payer and receiver cannot be the same member');
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid positive settlement amount');
      return;
    }

    try {
      setIsLoading(true);
      await SplitSmartRepository.recordSettlement({
        tripId: trip.id,
        payerId,
        receiverId,
        amount: numAmount,
        status: 'completed',
      });

      // Confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (confettiErr) {
        // Safe fallback if canvas not available
      }

      toast.success(
        `Debt settled! ${formatCurrency(numAmount, trip.currency)} recorded as Paid.`
      );
      if (onSettled) onSettled();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to record settlement');
    } finally {
      setIsLoading(false);
    }
  };

  const payerName = members.find((m) => m.user_id === payerId)?.user?.full_name || 'Member';
  const receiverName = members.find((m) => m.user_id === receiverId)?.user?.full_name || 'Member';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Debt Settlement"
      description={`Mark an actual payment as paid and update net balances for ${trip.name}.`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-emerald-50/70 border border-emerald-100 p-3.5 rounded-xl flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-800">
            Confirming this will officially decrement the debtor&apos;s liability and credit the receiver in
            the balance engine.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Who Paid? (Payer)"
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
            options={members.map((m) => ({
              value: m.user_id,
              label: m.user?.full_name || 'Member',
            }))}
          />
          <Select
            label="Who Received? (Receiver)"
            value={receiverId}
            onChange={(e) => setReceiverId(e.target.value)}
            options={members.map((m) => ({
              value: m.user_id,
              label: m.user?.full_name || 'Member',
            }))}
          />
        </div>

        <Input
          label={`Amount Paid (${trip.currency})`}
          type="number"
          step="any"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        {payerId && receiverId && payerId !== receiverId && amount && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs flex items-center justify-between">
            <span className="font-medium text-slate-700">{payerName}</span>
            <div className="flex items-center gap-1 font-bold text-emerald-600">
              <span>pays {formatCurrency(parseFloat(amount) || 0, trip.currency)}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium text-slate-700">{receiverName}</span>
          </div>
        )}

        <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirm Settlement
          </Button>
        </div>
      </form>
    </Modal>
  );
}
