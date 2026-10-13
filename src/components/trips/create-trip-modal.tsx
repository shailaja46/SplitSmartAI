'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '../ui/modal';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Button } from '../ui/button';
import { SplitSmartRepository } from '@/lib/storage/repository';
import { toast } from 'sonner';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated?: () => void;
}

export function CreateTripModal({ isOpen, onClose, onTripCreated }: CreateTripModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    destination: '',
    start_date: '',
    end_date: '',
    currency: 'INR',
    budget: '',
    description: '',
  });

  React.useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const inFiveDays = new Date(Date.now() + 5 * 86400000);
      setFormData((prev) => ({
        ...prev,
        start_date: prev.start_date || now.toISOString().split('T')[0],
        end_date: prev.end_date || inFiveDays.toISOString().split('T')[0],
      }));
    }
  }, [isOpen]);

  const currencies = [
    { value: 'INR', label: 'INR (₹) — Indian Rupee' },
    { value: 'USD', label: 'USD ($) — US Dollar' },
    { value: 'EUR', label: 'EUR (€) — Euro' },
    { value: 'GBP', label: 'GBP (£) — British Pound' },
    { value: 'AUD', label: 'AUD (A$) — Australian Dollar' },
    { value: 'CAD', label: 'CAD (C$) — Canadian Dollar' },
    { value: 'JPY', label: 'JPY (¥) — Japanese Yen' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.destination.trim()) {
      toast.error('Trip name and destination are required');
      return;
    }

    try {
      setIsLoading(true);
      const newTrip = await SplitSmartRepository.createTrip({
        name: formData.name.trim(),
        destination: formData.destination.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        currency: formData.currency,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        description: formData.description.trim() || undefined,
        owner_id: SplitSmartRepository.getCurrentUser().id,
        status: 'active',
      });

      toast.success(`Trip "${newTrip.name}" created successfully!`);
      onClose();
      if (onTripCreated) onTripCreated();
      router.push(`/trips/${newTrip.id}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create trip');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Trip"
      description="Set up your destination, dates, and budget to start splitting expenses."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Trip Name"
          placeholder="e.g. Goa Coastal Escape, Euro Summer 2026"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <Input
          label="Destination"
          placeholder="e.g. North Goa, Paris, Manali"
          value={formData.destination}
          onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
          />
          <Input
            label="End Date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Currency"
            options={currencies}
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
          />
          <Input
            label="Target Budget (Optional)"
            type="number"
            step="any"
            placeholder="e.g. 50000"
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">Description / Notes</label>
          <textarea
            rows={2}
            className="flex w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            placeholder="Trip itinerary, cottage details, group guidelines..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Create Trip
          </Button>
        </div>
      </form>
    </Modal>
  );
}
