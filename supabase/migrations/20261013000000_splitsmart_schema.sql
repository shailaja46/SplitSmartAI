-- ====================================================================
-- SplitSmart AI — Supabase Database Migration & Schema
-- Tables: profiles, trips, trip_members, trip_invitations,
--         expenses, expense_splits, settlements, activity_logs
-- Includes: Triggers, Constraints, Indexes, and Row Level Security (RLS)
-- ====================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Trips table
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  budget NUMERIC(12, 2),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'planning')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Trip Members table
CREATE TABLE IF NOT EXISTS public.trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(trip_id, user_id)
);

-- 5. Trip Invitations table
CREATE TABLE IF NOT EXISTS public.trip_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitation_token_hash TEXT NOT NULL UNIQUE,
  email TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'Accommodation',
    'Food and drinks',
    'Transportation',
    'Shopping',
    'Activities',
    'Fuel',
    'Tickets',
    'Miscellaneous'
  )),
  paid_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  split_method VARCHAR(20) NOT NULL CHECK (split_method IN ('equal', 'exact', 'percentage', 'shares')),
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. Expense Splits table
CREATE TABLE IF NOT EXISTS public.expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  percentage NUMERIC(6, 2),
  shares NUMERIC(10, 2),
  UNIQUE(expense_id, user_id)
);

-- 8. Settlements table
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'pending', 'completed')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CHECK (payer_id <> receiver_id)
);

-- 9. Activity Logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- Indexes for Performance
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_trips_owner ON public.trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trip_members_trip ON public.trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user ON public.trip_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip ON public.expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON public.expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(trip_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user ON public.expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_trip ON public.settlements(trip_id, status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_trip ON public.activity_logs(trip_id, created_at DESC);

-- ====================================================================
-- Automated Triggers
-- ====================================================================

-- Function to handle new user registration in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to automatically add trip creator as 'owner' in trip_members
CREATE OR REPLACE FUNCTION public.handle_new_trip_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for trips
DROP TRIGGER IF EXISTS on_trip_created_add_owner ON public.trips;
CREATE TRIGGER on_trip_created_add_owner
  AFTER INSERT ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_trip_owner();

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS set_trips_updated_at ON public.trips;
CREATE TRIGGER set_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS set_expenses_updated_at ON public.expenses;
CREATE TRIGGER set_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- ====================================================================
-- Row Level Security (RLS) Policies
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper security function: Check if current user is member of trip
CREATE OR REPLACE FUNCTION public.is_trip_member(trip_id_arg UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = trip_id_arg AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Trips policies
CREATE POLICY "Users can view trips they are members of"
  ON public.trips FOR SELECT
  TO authenticated
  USING (public.is_trip_member(id) OR owner_id = auth.uid());

CREATE POLICY "Authenticated users can create trips"
  ON public.trips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update trips"
  ON public.trips FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Only trip owner can delete trip"
  ON public.trips FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Trip Members policies
CREATE POLICY "Members can view members of their trips"
  ON public.trip_members FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id));

CREATE POLICY "Owners and admins can add members"
  ON public.trip_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_id = trip_members.trip_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners, admins, or self can remove members"
  ON public.trip_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE id = trip_members.trip_id AND owner_id = auth.uid()
    )
  );

-- Expenses policies
CREATE POLICY "Trip members can view expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id));

CREATE POLICY "Trip members can insert expenses"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (public.is_trip_member(trip_id));

CREATE POLICY "Trip members can update expenses"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (public.is_trip_member(trip_id));

CREATE POLICY "Trip members can delete expenses"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (public.is_trip_member(trip_id));

-- Expense Splits policies
CREATE POLICY "Trip members can view expense splits"
  ON public.expense_splits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses
      WHERE id = expense_splits.expense_id AND public.is_trip_member(trip_id)
    )
  );

CREATE POLICY "Trip members can insert expense splits"
  ON public.expense_splits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses
      WHERE id = expense_splits.expense_id AND public.is_trip_member(trip_id)
    )
  );

CREATE POLICY "Trip members can update expense splits"
  ON public.expense_splits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses
      WHERE id = expense_splits.expense_id AND public.is_trip_member(trip_id)
    )
  );

CREATE POLICY "Trip members can delete expense splits"
  ON public.expense_splits FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses
      WHERE id = expense_splits.expense_id AND public.is_trip_member(trip_id)
    )
  );

-- Settlements policies
CREATE POLICY "Trip members can view settlements"
  ON public.settlements FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id));

CREATE POLICY "Trip members can insert settlements"
  ON public.settlements FOR INSERT
  TO authenticated
  WITH CHECK (public.is_trip_member(trip_id));

CREATE POLICY "Payer or receiver can update settlements"
  ON public.settlements FOR UPDATE
  TO authenticated
  USING (public.is_trip_member(trip_id));

-- Activity Logs policies
CREATE POLICY "Trip members can view activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id));

CREATE POLICY "Trip members can insert activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_trip_member(trip_id));
