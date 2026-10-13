'use client';

import React, { useState } from 'react';
import { Copy, Check, Link as LinkIcon, UserPlus, Shield } from 'lucide-react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Trip, TripMember, UserProfile } from '@/types';
import { SplitSmartRepository } from '@/lib/storage/repository';
import { INITIAL_PROFILES } from '@/lib/storage/mock-data';
import { toast } from 'sonner';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  currentMembers: TripMember[];
  onMemberAdded?: () => void;
}

export function InviteMemberModal({
  isOpen,
  onClose,
  trip,
  currentMembers,
  onMemberAdded,
}: InviteMemberModalProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'member' | 'admin'>('member');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Generate unpredictable invitation token
  const inviteToken = `inv_${trip.id.slice(0, 8)}_${Math.random().toString(36).substring(2, 10)}`;
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${inviteToken}` : `https://splitsmart.ai/join/${inviteToken}`;

  const currentMemberIds = new Set(currentMembers.map((m) => m.user_id));
  const availableUsers = INITIAL_PROFILES.filter((p) => !currentMemberIds.has(p.id));

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success('Invitation link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error('Please select a member to add');
      return;
    }

    try {
      setIsLoading(true);
      await SplitSmartRepository.addMember(trip.id, {
        userId: selectedUserId,
        role: selectedRole,
      });

      toast.success('Member added to trip successfully!');
      if (onMemberAdded) onMemberAdded();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add member');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Trip Members"
      description={`Add travelers to "${trip.name}" so they can track and split bills.`}
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Shareable Link Section */}
        <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
            <LinkIcon className="w-3.5 h-3.5 text-indigo-600" /> Shareable Invite Link
          </div>
          <p className="text-xs text-indigo-700">
            Anyone with this token link can join this trip and view group expenses. Link expires in 7 days.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl text-slate-700 focus:outline-none select-all"
            />
            <Button size="sm" variant="primary" onClick={handleCopyLink}>
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Add from system users */}
        {availableUsers.length > 0 && (
          <form onSubmit={handleAddDirect} className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Add Existing Contact
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <Select
                  label="Select Traveler"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  options={[
                    { value: '', label: '-- Choose a person --' },
                    ...availableUsers.map((u) => ({
                      value: u.id,
                      label: `${u.full_name} (${u.email})`,
                    })),
                  ]}
                />
              </div>
              <Select
                label="Role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as 'member' | 'admin')}
                options={[
                  { value: 'member', label: 'Member' },
                  { value: 'admin', label: 'Admin' },
                ]}
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" variant="secondary" size="sm" isLoading={isLoading}>
                <UserPlus className="w-4 h-4 mr-1" /> Add Member
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
