import { ActivityLog, Expense, MemberRole, Settlement, Trip, TripMember, UserProfile } from '@/types';
import {
  INITIAL_ACTIVITY_LOGS,
  INITIAL_EXPENSES,
  INITIAL_MEMBERS,
  INITIAL_PROFILES,
  INITIAL_SETTLEMENTS,
  INITIAL_TRIPS,
} from './mock-data';
import { createClient } from '../supabase/client';

const STORAGE_KEYS = {
  TRIPS: 'splitsmart_trips',
  MEMBERS: 'splitsmart_members',
  EXPENSES: 'splitsmart_expenses',
  SETTLEMENTS: 'splitsmart_settlements',
  ACTIVITIES: 'splitsmart_activities',
  PROFILES: 'splitsmart_profiles',
  ACTIVE_USER: 'splitsmart_active_user',
};

// In-memory fallback if window is not defined (SSR)
let memTrips = [...INITIAL_TRIPS];
let memMembers = [...INITIAL_MEMBERS];
let memExpenses = [...INITIAL_EXPENSES];
let memSettlements = [...INITIAL_SETTLEMENTS];
let memActivities = [...INITIAL_ACTIVITY_LOGS];
let memProfiles = [...INITIAL_PROFILES];
let memActiveUser = INITIAL_PROFILES[0];

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function loadLocal<T>(key: string, defaultData: T): T {
  if (!isBrowser()) return defaultData;
  try {
    const saved = localStorage.getItem(key);
    if (!saved) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(saved) as T;
  } catch (err) {
    console.warn(`Failed to parse localStorage key ${key}:`, err);
    return defaultData;
  }
}

function saveLocal<T>(key: string, data: T): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Failed to write to localStorage key ${key}:`, err);
  }
}

export class SplitSmartRepository {
  /**
   * Returns whether live Supabase is configured via public environment variables
   */
  static isSupabaseConfigured(): boolean {
    return !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase')
    );
  }

  static getCurrentUser(): UserProfile {
    if (isBrowser()) {
      return loadLocal<UserProfile>(STORAGE_KEYS.ACTIVE_USER, INITIAL_PROFILES[0]);
    }
    return memActiveUser;
  }

  static setCurrentUser(user: UserProfile): void {
    if (isBrowser()) {
      saveLocal(STORAGE_KEYS.ACTIVE_USER, user);
    }
    memActiveUser = user;
  }

  static getAllUsers(): UserProfile[] {
    if (isBrowser()) {
      return loadLocal<UserProfile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    }
    return memProfiles;
  }

  // ==========================================
  // TRIPS
  // ==========================================

  static async getTrips(): Promise<Trip[]> {
    const supabase = createClient();
    if (supabase && this.isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data as Trip[];
        }
      } catch (err) {
        console.warn('Supabase getTrips fallback to local storage:', err);
      }
    }

    // Local / Demo mode fallback
    return isBrowser()
      ? loadLocal<Trip[]>(STORAGE_KEYS.TRIPS, INITIAL_TRIPS)
      : memTrips;
  }

  static async getTrip(tripId: string): Promise<Trip | null> {
    const trips = await this.getTrips();
    return trips.find((t) => t.id === tripId) || null;
  }

  static async createTrip(newTrip: Omit<Trip, 'id' | 'created_at'>): Promise<Trip> {
    const currentUser = this.getCurrentUser();
    const id = `trip-${Date.now()}`;
    const trip: Trip = {
      ...newTrip,
      id,
      owner_id: currentUser.id,
      created_at: new Date().toISOString(),
    };

    const supabase = createClient();
    if (supabase && this.isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('trips').insert([trip]).select().single();
        if (!error && data) {
          await this.logActivity(data.id, currentUser.id, 'TRIP_CREATED', `${currentUser.full_name} created trip "${data.name}"`);
          return data as Trip;
        }
      } catch (err) {
        console.warn('Supabase createTrip fallback to local:', err);
      }
    }

    // Local update
    const trips = isBrowser() ? loadLocal<Trip[]>(STORAGE_KEYS.TRIPS, INITIAL_TRIPS) : memTrips;
    const updated = [trip, ...trips];
    if (isBrowser()) {
      saveLocal(STORAGE_KEYS.TRIPS, updated);
    } else {
      memTrips = updated;
    }

    // Auto-add creator as trip member
    await this.addMember(trip.id, {
      userId: currentUser.id,
      role: 'owner',
    });

    await this.logActivity(trip.id, currentUser.id, 'TRIP_CREATED', `${currentUser.full_name} created trip "${trip.name}"`);

    return trip;
  }

  static async updateTrip(tripId: string, updates: Partial<Trip>): Promise<Trip | null> {
    const supabase = createClient();
    if (supabase && this.isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('trips')
          .update(updates)
          .eq('id', tripId)
          .select()
          .single();
        if (!error && data) return data as Trip;
      } catch (err) {
        console.warn('Supabase updateTrip fallback to local:', err);
      }
    }

    const trips = isBrowser() ? loadLocal<Trip[]>(STORAGE_KEYS.TRIPS, INITIAL_TRIPS) : memTrips;
    const index = trips.findIndex((t) => t.id === tripId);
    if (index === -1) return null;

    trips[index] = { ...trips[index], ...updates, updated_at: new Date().toISOString() };
    if (isBrowser()) {
      saveLocal(STORAGE_KEYS.TRIPS, trips);
    } else {
      memTrips = trips;
    }

    return trips[index];
  }

  static async deleteTrip(tripId: string): Promise<boolean> {
    const supabase = createClient();
    if (supabase && this.isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('trips').delete().eq('id', tripId);
        if (!error) return true;
      } catch (err) {
        console.warn('Supabase deleteTrip fallback to local:', err);
      }
    }

    let trips = isBrowser() ? loadLocal<Trip[]>(STORAGE_KEYS.TRIPS, INITIAL_TRIPS) : memTrips;
    trips = trips.filter((t) => t.id !== tripId);
    if (isBrowser()) {
      saveLocal(STORAGE_KEYS.TRIPS, trips);
    } else {
      memTrips = trips;
    }
    return true;
  }

  // ==========================================
  // MEMBERS
  // ==========================================

  static async getTripMembers(tripId: string): Promise<TripMember[]> {
    const allProfiles = this.getAllUsers();
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

    const supabase = createClient();
    if (supabase && this.isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('trip_members')
          .select('*, user:profiles(*)')
          .eq('trip_id', tripId);

        if (!error && data && data.length > 0) {
          return data as TripMember[];
        }
      } catch (err) {
        console.warn('Supabase getTripMembers fallback to local:', err);
      }
    }

    const members = isBrowser() ? loadLocal<TripMember[]>(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS) : memMembers;
    return members
      .filter((m) => m.trip_id === tripId)
      .map((m) => ({
        ...m,
        user: m.user || profileMap.get(m.user_id) || { id: m.user_id, full_name: 'Member', email: '' },
      }));
  }

  static async addMember(tripId: string, memberData: { userId: string; role: MemberRole }): Promise<TripMember> {
    const allProfiles = this.getAllUsers();
    const user = allProfiles.find((p) => p.id === memberData.userId) || {
      id: memberData.userId,
      full_name: 'New Member',
      email: `${memberData.userId}@splitsmart.ai`,
    };

    const newMember: TripMember = {
      id: `tm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      trip_id: tripId,
      user_id: memberData.userId,
      role: memberData.role,
      joined_at: new Date().toISOString(),
      user,
    };

    const supabase = createClient();
    if (supabase && this.isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('trip_members').insert([newMember]).select().single();
        if (!error && data) return data as TripMember;
      } catch (err) {
        console.warn('Supabase addMember fallback to local:', err);
      }
    }

    const members = isBrowser() ? loadLocal<TripMember[]>(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS) : memMembers;
    // Prevent duplicate member
    const existing = members.find((m) => m.trip_id === tripId && m.user_id === memberData.userId);
    if (!existing) {
      members.push(newMember);
      if (isBrowser()) {
        saveLocal(STORAGE_KEYS.MEMBERS, members);
      } else {
        memMembers = members;
      }
    }

    return existing || newMember;
  }

  static async removeMember(tripId: string, memberId: string): Promise<boolean> {
    const supabase = createClient();
    if (supabase && this.isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('trip_members').delete().eq('id', memberId);
        if (!error) return true;
      } catch (err) {
        console.warn('Supabase removeMember fallback to local:', err);
      }
    }

    let members = isBrowser() ? loadLocal<TripMember[]>(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS) : memMembers;
    members = members.filter((m) => m.id !== memberId && !(m.trip_id === tripId && m.user_id === memberId));
    if (isBrowser()) {
      saveLocal(STORAGE_KEYS.MEMBERS, members);
    } else {
      memMembers = members;
    }
    return true;
  }

  // ==========================================
  // EXPENSES
  // ==========================================

  static async getExpenses(tripId: string): Promise<Expense[]> {
    const allProfiles = this.getAllUsers();
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

    const supabase = createClient();
    if (supabase && this.isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('*, splits:expense_splits(*), payer:profiles(*)')
          .eq('trip_id', tripId)
          .order('expense_date', { ascending: false });

        if (!error && data && data.length > 0) {
          return data as Expense[];
        }
      } catch (err) {
        console.warn('Supabase getExpenses fallback to local:', err);
      }
    }

    const expenses = isBrowser() ? loadLocal<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES) : memExpenses;
    return expenses
      .filter((e) => e.trip_id === tripId)
      .map((e) => ({
        ...e,
        payer: e.payer || profileMap.get(e.paid_by) || { id: e.paid_by, full_name: 'Member', email: '' },
        splits: (e.splits || []).map((s) => ({
          ...s,
          user: s.user || profileMap.get(s.user_id) || { id: s.user_id, full_name: 'Member', email: '' },
        })),
      }));
  }

  static async createExpense(newExpense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    const currentUser = this.getCurrentUser();
    const id = `exp-${Date.now()}`;
    const allProfiles = this.getAllUsers();
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

    const expense: Expense = {
      ...newExpense,
      id,
      created_at: new Date().toISOString(),
      payer: profileMap.get(newExpense.paid_by) || currentUser,
      splits: (newExpense.splits || []).map((s) => ({
        ...s,
        user: profileMap.get(s.user_id),
      })),
    };

    const supabase = createClient();
    if (supabase && this.isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('expenses').insert([{
          trip_id: expense.trip_id,
          title: expense.title,
          amount: expense.amount,
          category: expense.category,
          paid_by: expense.paid_by,
          expense_date: expense.expense_date,
          split_method: expense.split_method,
          notes: expense.notes,
          receipt_url: expense.receipt_url,
        }]).select().single();

        if (!error && data && expense.splits) {
          const splitsToInsert = expense.splits.map((s) => ({
            expense_id: data.id,
            user_id: s.user_id,
            amount: s.amount,
            percentage: s.percentage,
            shares: s.shares,
          }));
          await supabase.from('expense_splits').insert(splitsToInsert);
          await this.logActivity(expense.trip_id, currentUser.id, 'EXPENSE_ADDED', `${currentUser.full_name} added expense "${expense.title}" for ${expense.amount}`);
          return { ...expense, id: data.id };
        }
      } catch (err) {
        console.warn('Supabase createExpense fallback to local:', err);
      }
    }

    const expenses = isBrowser() ? loadLocal<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES) : memExpenses;
    const updated = [expense, ...expenses];
    if (isBrowser()) {
      saveLocal(STORAGE_KEYS.EXPENSES, updated);
    } else {
      memExpenses = updated;
    }

    await this.logActivity(expense.trip_id, currentUser.id, 'EXPENSE_ADDED', `${currentUser.full_name} added expense "${expense.title}"`);

    return expense;
  }

  static async updateExpense(expenseId: string, updates: Partial<Expense>): Promise<Expense | null> {
    const expenses = isBrowser() ? loadLocal<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES) : memExpenses;
    const index = expenses.findIndex((e) => e.id === expenseId);
    if (index === -1) return null;

    expenses[index] = { ...expenses[index], ...updates, updated_at: new Date().toISOString() };
    if (isBrowser()) {
      saveLocal(STORAGE_KEYS.EXPENSES, expenses);
    } else {
      memExpenses = expenses;
    }
    return expenses[index];
  }

  static async deleteExpense(expenseId: string): Promise<boolean> {
    let expenses = isBrowser() ? loadLocal<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES) : memExpenses;
    expenses = expenses.filter((e) => e.id !== expenseId);
    if (isBrowser()) {
      saveLocal(STORAGE_KEYS.EXPENSES, expenses);
    } else {
      memExpenses = expenses;
    }
    return true;
  }

  // ==========================================
  // SETTLEMENTS
  // ==========================================

  static async getSettlements(tripId: string): Promise<Settlement[]> {
    const allProfiles = this.getAllUsers();
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

    const supabase = createClient();
    if (supabase && this.isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('settlements')
          .select('*, payer:profiles!settlements_payer_id_fkey(*), receiver:profiles!settlements_receiver_id_fkey(*)')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data as Settlement[];
        }
      } catch (err) {
        console.warn('Supabase getSettlements fallback to local:', err);
      }
    }

    const settlements = isBrowser() ? loadLocal<Settlement[]>(STORAGE_KEYS.SETTLEMENTS, INITIAL_SETTLEMENTS) : memSettlements;
    return settlements
      .filter((s) => s.trip_id === tripId)
      .map((s) => ({
        ...s,
        payer: s.payer || profileMap.get(s.payer_id) || { id: s.payer_id, full_name: 'Payer', email: '' },
        receiver: s.receiver || profileMap.get(s.receiver_id) || { id: s.receiver_id, full_name: 'Receiver', email: '' },
      }));
  }

  static async recordSettlement(data: {
    tripId: string;
    payerId: string;
    receiverId: string;
    amount: number;
    status: 'suggested' | 'pending' | 'completed';
  }): Promise<Settlement> {
    const allProfiles = this.getAllUsers();
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));
    const currentUser = this.getCurrentUser();

    const settlement: Settlement = {
      id: `stl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      trip_id: data.tripId,
      payer_id: data.payerId,
      receiver_id: data.receiverId,
      amount: data.amount,
      status: data.status,
      paid_at: data.status === 'completed' ? new Date().toISOString() : undefined,
      created_at: new Date().toISOString(),
      payer: profileMap.get(data.payerId),
      receiver: profileMap.get(data.receiverId),
    };

    const supabase = createClient();
    if (supabase && this.isSupabaseConfigured()) {
      try {
        const { data: dbData, error } = await supabase.from('settlements').insert([settlement]).select().single();
        if (!error && dbData) {
          await this.logActivity(
            data.tripId,
            currentUser.id,
            'SETTLEMENT_RECORDED',
            `${settlement.payer?.full_name} recorded a settlement of ${settlement.amount} to ${settlement.receiver?.full_name}`
          );
          return dbData as Settlement;
        }
      } catch (err) {
        console.warn('Supabase recordSettlement fallback to local:', err);
      }
    }

    const settlements = isBrowser() ? loadLocal<Settlement[]>(STORAGE_KEYS.SETTLEMENTS, INITIAL_SETTLEMENTS) : memSettlements;
    const updated = [settlement, ...settlements];
    if (isBrowser()) {
      saveLocal(STORAGE_KEYS.SETTLEMENTS, updated);
    } else {
      memSettlements = updated;
    }

    await this.logActivity(
      data.tripId,
      currentUser.id,
      'SETTLEMENT_RECORDED',
      `${settlement.payer?.full_name || 'Member'} marked settlement of ${settlement.amount} to ${settlement.receiver?.full_name || 'Member'}`
    );

    return settlement;
  }

  static async markSettlementPaid(settlementId: string): Promise<Settlement | null> {
    const settlements = isBrowser() ? loadLocal<Settlement[]>(STORAGE_KEYS.SETTLEMENTS, INITIAL_SETTLEMENTS) : memSettlements;
    const index = settlements.findIndex((s) => s.id === settlementId);
    if (index === -1) return null;

    settlements[index] = {
      ...settlements[index],
      status: 'completed',
      paid_at: new Date().toISOString(),
    };

    if (isBrowser()) {
      saveLocal(STORAGE_KEYS.SETTLEMENTS, settlements);
    } else {
      memSettlements = settlements;
    }

    const currentUser = this.getCurrentUser();
    await this.logActivity(
      settlements[index].trip_id,
      currentUser.id,
      'SETTLEMENT_COMPLETED',
      `Settlement of ${settlements[index].amount} was marked as Paid`
    );

    return settlements[index];
  }

  // ==========================================
  // ACTIVITY LOGS
  // ==========================================

  static async getActivityLogs(tripId?: string): Promise<ActivityLog[]> {
    const allProfiles = this.getAllUsers();
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

    const activities = isBrowser() ? loadLocal<ActivityLog[]>(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITY_LOGS) : memActivities;
    const filtered = tripId ? activities.filter((a) => a.trip_id === tripId) : activities;

    return filtered
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((a) => ({
        ...a,
        user: a.user || profileMap.get(a.user_id) || { id: a.user_id, full_name: 'Member', email: '' },
      }));
  }

  static async logActivity(tripId: string, userId: string, action: string, description: string): Promise<void> {
    const allProfiles = this.getAllUsers();
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      trip_id: tripId,
      user_id: userId,
      action,
      description,
      created_at: new Date().toISOString(),
      user: profileMap.get(userId),
    };

    const activities = isBrowser() ? loadLocal<ActivityLog[]>(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITY_LOGS) : memActivities;
    const updated = [log, ...activities];
    if (isBrowser()) {
      saveLocal(STORAGE_KEYS.ACTIVITIES, updated);
    } else {
      memActivities = updated;
    }
  }
}
