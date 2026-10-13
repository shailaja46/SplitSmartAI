# SplitSmart AI — Group Trip Expense Splitter

> **"Every trip. Every expense. Perfectly split."**

A modern, responsive, production-quality web application built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase PostgreSQL & Auth**, and **Google Gemini 2.5 Flash** (via the official `@google/genai` SDK). Designed specifically for students, backpackers, families, and travel groups to manage expenses, split bills fairly, track balances, and minimize the number of payments required to settle all debts.

---

## 🌟 Key Features

### 1. Flexible Expense Splitting Engine
- **Equal Split**: Even division among selected members with remainder penny/paise distribution so $\sum \text{splits} = \text{total}$ down to the exact currency cent.
- **Exact Amounts**: Custom per-person allocations validated to match total expenditures.
- **Percentage Split**: Custom percentages verified to sum to 100%, with rounding discrepancies automatically balanced to the largest share.
- **Shares-Based Split**: Proportional ratio allocation (e.g. 2 shares vs 1 share) with whole-cent reconciliation.

### 2. Deterministic Settlement Optimization (Min-Cash-Flow)
- Solves the debt settlement graph using a greedy minimum-cash-flow algorithm.
- Reduces $N \times (N - 1) / 2$ tangled cross-debts down to at most $N - 1$ optimal transactions.
- Invariant guarantees:
  - $\sum \text{Net Balances} = 0$
  - No self-payments ($Payer \neq Receiver$)
  - Zero negative or zero-value transactions
  - Strict distinction between *Suggested (Optimized)* and *Confirmed (Paid)* settlements
  - Confetti celebration when debts are settled!

### 3. Google Gemini AI Integration (Official `@google/genai` SDK)
- **Natural-Language Expense Entry**: Type sentences like *"Yesterday Rahul paid ₹2,400 for dinner for Priya, Alice, and me. Split it equally."* The model extracts title, amount, category, date, payer, and members. Requires user review and confirmation before persistence.
- **Smart Budget Recommendations**: Input destination, duration, traveler count, estimated budget, and travel style (*budget*, *moderate*, *luxury*) to generate structured allocations and local travel tips.
- **AI Trip Spending Insights**: Real-time audit of highest-spending categories, single-category dominance, pacing against planned budgets, and savings opportunities.
- **AI Chat Assistant**: Real-time conversational financial assistant answering *"Who owes me money?"*, *"How much did we spend on food?"*, or *"Are we over budget?"* using verified server ledger data without hallucinations.

### 4. Interactive SaaS Dashboard & Analytics
- 5 Top-line summary cards: Total expenses, Amount you owe, Amount owed to you, Active trips, and Outstanding settlements.
- **Recharts Data Visualizations**: Category breakdown donut chart and monthly spending trend bar chart.
- Real-time activity ledger tracking trip creations, expense entries, and completed settlements.
- Instant 1-click Demo Member Switcher to preview ledger views from Alice, Rahul, Priya, or Kabir's perspective.

### 5. Reporting & Audit-Ready Exports
- **CSV Expenses Export**: Standard CSV download of all trip expenses with categories, dates, and payers.
- **CSV Settlements Export**: Audit trail of completed and recommended payments.
- **Downloadable Summary TXT**: Complete plain-text trip balance sheet.
- **Print / PDF Layout**: Clean, print-styled sheet formatted for the browser's "Save as PDF" dialog.

### 6. Production Supabase PostgreSQL Architecture
- Normalized relational schema across 8 tables: `profiles`, `trips`, `trip_members`, `trip_invitations`, `expenses`, `expense_splits`, `settlements`, and `activity_logs`.
- Foreign keys, cascading deletes, unique constraints, and check constraints.
- Automated triggers:
  - `on_auth_user_created`: auto-creates profile in `public.profiles` upon Supabase Auth signup.
  - `on_trip_created_add_owner`: auto-adds trip creator to `trip_members` with `'owner'` role.
  - `set_*_updated_at`: automated timestamps.
- **Row Level Security (RLS)** policies enabled across all tables ensuring members can only view and manage authorized trips.
- Resilient hybrid storage: Works immediately in offline/local demo mode with persistent `localStorage` and transitions seamlessly to Supabase PostgreSQL when credentials are supplied.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router with TypeScript) |
| **Styling** | Tailwind CSS v4 |
| **Icons** | Lucide React |
| **Database** | Supabase PostgreSQL |
| **Authentication** | Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`) |
| **AI Integration** | Google Gemini API via official `@google/genai` SDK |
| **Data Visualizations** | Recharts |
| **Forms & Validation** | React Hook Form & Zod |
| **Notifications** | Sonner |
| **Unit Testing** | Vitest |
| **Deployment** | Vercel Ready |

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v20+ or v22+)
- npm or pnpm

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/splitsmart-ai.git
cd splitsmart-ai
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Supabase Configuration (Optional for initial demo test)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Google Gemini API (Get free key at https://aistudio.google.com/)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
```

*(Note: If credentials are left blank, SplitSmart AI runs in offline demo mode with rich seed data for Goa, Europe, and Manali trips).*

### 3. Run Automated Tests
```bash
npm test
```
All 10 unit tests for equal splits, exact allocations, percentage reconciliations, net balances, and transaction minimization will execute and pass.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Supabase Database Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Navigate to the **SQL Editor** tab in your Supabase dashboard.
3. Open `supabase/schema.sql` from this repository, paste the entire SQL script, and click **Run**.
4. This will create:
   - All 8 tables with primary keys and constraints
   - Performance indexes
   - Row Level Security (RLS) policies
   - Automated triggers for auth profile creation and trip ownership
5. Navigate to **Project Settings -> API** in Supabase and copy:
   - `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 🤖 Google Gemini AI Setup

1. Visit [Google AI Studio](https://aistudio.google.com/) and create a free API key.
2. Add the key to `GEMINI_API_KEY` in `.env.local`.
3. The server-side API routes (`/api/ai/parse-expense`, `/api/ai/budget-recommend`, `/api/ai/insights`, `/api/ai/chat`) will automatically invoke the Gemini 2.5 Flash model.

---

## 🌐 Deploying to Vercel

1. Push your repository to GitHub:
```bash
git add .
git commit -m "feat: complete SplitSmart AI application"
git branch -M main
git remote add origin https://github.com/your-username/splitsmart-ai.git
git push -u origin main
```
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL`
5. Click **Deploy**. Vercel will build and deploy the production bundle automatically.

---

## 🧪 Test Suite

Run unit tests locally anytime:
```bash
npm test
```

Verified test suites:
- `calculateEqualSplits`: ₹1,200 divided 4 ways ($₹300$ each) & ₹100 divided 3 ways ($₹33.34, ₹33.33, ₹33.33$, exact penny balance).
- `validateAndCalculateExactSplits`: validates sum equality and rejects discrepancies.
- `calculatePercentageSplits`: enforces 100% total and balances rounding cents.
- `calculateSharesSplits`: proportional share weights.
- `calculateMemberBalances`: computes exact debtor/creditor balances, satisfies the prompt's scenario (A pays ₹1,000, B pays ₹500, C pays ₹0 -> C pays A ₹500 directly).
- `optimizeSettlements`: minimizes multi-party transactions to at most $N-1$ payments without self-payments or negative amounts.

---

## 📄 License
MIT License. Built for travel groups everywhere.
