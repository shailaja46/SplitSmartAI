export type TripStatus = 'active' | 'completed' | 'planning';

export type MemberRole = 'owner' | 'admin' | 'member';

export type SplitMethod = 'equal' | 'exact' | 'percentage' | 'shares';

export type SettlementStatus = 'suggested' | 'pending' | 'completed';

export type ExpenseCategory =
  | 'Accommodation'
  | 'Food and drinks'
  | 'Transportation'
  | 'Shopping'
  | 'Activities'
  | 'Fuel'
  | 'Tickets'
  | 'Miscellaneous';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  created_at?: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  description?: string;
  start_date: string;
  end_date: string;
  currency: string;
  budget?: number;
  owner_id: string;
  status: TripStatus;
  created_at: string;
  updated_at?: string;
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  user?: UserProfile;
}

export interface TripInvitation {
  id: string;
  trip_id: string;
  invited_by: string;
  invitation_token_hash: string;
  email?: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

export interface ExpenseSplit {
  id?: string;
  expense_id?: string;
  user_id: string;
  amount: number;
  percentage?: number;
  shares?: number;
  user?: UserProfile;
}

export interface Expense {
  id: string;
  trip_id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  paid_by: string;
  expense_date: string;
  split_method: SplitMethod;
  notes?: string;
  receipt_url?: string;
  created_at: string;
  updated_at?: string;
  payer?: UserProfile;
  splits?: ExpenseSplit[];
}

export interface Settlement {
  id: string;
  trip_id: string;
  payer_id: string;
  receiver_id: string;
  amount: number;
  status: SettlementStatus;
  paid_at?: string;
  created_at: string;
  payer?: UserProfile;
  receiver?: UserProfile;
}

export interface ActivityLog {
  id: string;
  trip_id: string;
  user_id: string;
  action: string;
  description: string;
  created_at: string;
  user?: UserProfile;
}

export interface MemberBalance {
  userId: string;
  user: UserProfile;
  totalPaid: number;
  totalShare: number;
  netBalance: number; // positive = should receive, negative = owes
}

export interface OptimizedSettlement {
  payerId: string;
  payerName: string;
  receiverId: string;
  receiverName: string;
  amount: number;
  currency: string;
  existingSettlementId?: string;
  status?: SettlementStatus;
}
