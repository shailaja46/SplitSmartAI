import { Expense, ExpenseSplit, MemberBalance, OptimizedSettlement, Settlement, UserProfile } from '@/types';

/**
 * Rounds a number strictly to two decimal places to prevent floating-point anomalies.
 */
export function roundCurrency(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Converts a decimal amount to integer minor units (e.g., cents or paise)
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Converts integer minor units back to decimal currency
 */
export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Calculates equal splits among participants with exact penny/paise distribution.
 * Guarantees that sum(splits) === totalAmount down to the smallest currency unit.
 */
export function calculateEqualSplits(
  totalAmount: number,
  participantUserIds: string[]
): { userId: string; amount: number; percentage: number; shares: number }[] {
  if (participantUserIds.length === 0) return [];
  if (totalAmount <= 0) {
    return participantUserIds.map((userId) => ({
      userId,
      amount: 0,
      percentage: roundCurrency(100 / participantUserIds.length),
      shares: 1,
    }));
  }

  const totalCents = toCents(totalAmount);
  const count = participantUserIds.length;
  const baseCents = Math.floor(totalCents / count);
  let remainder = totalCents % count;

  return participantUserIds.map((userId, index) => {
    // Distribute remainder cents one by one to earlier participants
    const shareCents = baseCents + (index < remainder ? 1 : 0);
    const amount = fromCents(shareCents);
    const percentage = roundCurrency((amount / totalAmount) * 100);

    return {
      userId,
      amount,
      percentage,
      shares: 1,
    };
  });
}

/**
 * Validates and normalizes exact split inputs.
 */
export function validateAndCalculateExactSplits(
  totalAmount: number,
  splits: { userId: string; amount: number }[]
): { valid: boolean; error?: string; splits: ExpenseSplit[] } {
  if (splits.length === 0) {
    return { valid: false, error: 'At least one participant is required.', splits: [] };
  }

  const calculatedTotal = splits.reduce((sum, s) => sum + s.amount, 0);
  const roundedCalculated = roundCurrency(calculatedTotal);
  const roundedTarget = roundCurrency(totalAmount);

  if (Math.abs(roundedCalculated - roundedTarget) > 0.01) {
    return {
      valid: false,
      error: `Sum of exact splits (${roundedCalculated}) does not equal total amount (${roundedTarget}). Difference: ${roundCurrency(
        Math.abs(roundedCalculated - roundedTarget)
      )}`,
      splits: [],
    };
  }

  const resultSplits: ExpenseSplit[] = splits.map((s) => ({
    user_id: s.userId,
    amount: roundCurrency(s.amount),
    percentage: totalAmount > 0 ? roundCurrency((s.amount / totalAmount) * 100) : 0,
    shares: 1,
  }));

  return { valid: true, splits: resultSplits };
}

/**
 * Calculates percentage-based splits and adjusts rounding discrepancies to equal exact total.
 */
export function calculatePercentageSplits(
  totalAmount: number,
  participants: { userId: string; percentage: number }[]
): { valid: boolean; error?: string; splits: ExpenseSplit[] } {
  if (participants.length === 0) {
    return { valid: false, error: 'At least one participant is required.', splits: [] };
  }

  const totalPercent = roundCurrency(participants.reduce((sum, p) => sum + p.percentage, 0));
  if (Math.abs(totalPercent - 100) > 0.05) {
    return {
      valid: false,
      error: `Sum of percentages must equal 100%. Currently: ${totalPercent}%`,
      splits: [],
    };
  }

  const totalCents = toCents(totalAmount);
  let allocatedCents = 0;
  const rawSplits = participants.map((p) => {
    const shareCents = Math.round((totalCents * p.percentage) / 100);
    allocatedCents += shareCents;
    return {
      userId: p.userId,
      shareCents,
      percentage: p.percentage,
    };
  });

  // Reconcile rounding discrepancy to match totalCents exactly
  const diffCents = totalCents - allocatedCents;
  if (diffCents !== 0 && rawSplits.length > 0) {
    // Add discrepancy to highest percentage contributor
    rawSplits.sort((a, b) => b.percentage - a.percentage);
    rawSplits[0].shareCents += diffCents;
  }

  const result: ExpenseSplit[] = rawSplits.map((item) => ({
    user_id: item.userId,
    amount: fromCents(item.shareCents),
    percentage: item.percentage,
    shares: 1,
  }));

  return { valid: true, splits: result };
}

/**
 * Calculates shares-based splits and reconciles rounding discrepancies.
 */
export function calculateSharesSplits(
  totalAmount: number,
  participants: { userId: string; shares: number }[]
): { valid: boolean; error?: string; splits: ExpenseSplit[] } {
  if (participants.length === 0) {
    return { valid: false, error: 'At least one participant is required.', splits: [] };
  }

  const totalShares = participants.reduce((sum, p) => sum + p.shares, 0);
  if (totalShares <= 0) {
    return { valid: false, error: 'Total shares must be greater than zero.', splits: [] };
  }

  const totalCents = toCents(totalAmount);
  let allocatedCents = 0;
  const rawSplits = participants.map((p) => {
    const shareCents = Math.floor((totalCents * p.shares) / totalShares);
    allocatedCents += shareCents;
    return {
      userId: p.userId,
      shareCents,
      shares: p.shares,
    };
  });

  let remainderCents = totalCents - allocatedCents;
  let index = 0;
  while (remainderCents > 0) {
    rawSplits[index % rawSplits.length].shareCents += 1;
    remainderCents--;
    index++;
  }

  const result: ExpenseSplit[] = rawSplits.map((item) => {
    const amount = fromCents(item.shareCents);
    return {
      user_id: item.userId,
      amount,
      percentage: totalAmount > 0 ? roundCurrency((amount / totalAmount) * 100) : 0,
      shares: item.shares,
    };
  });

  return { valid: true, splits: result };
}

/**
 * Computes net balances for each member in a trip.
 * Net balance = Total paid - Total assigned expense shares.
 * Positive balance = Member should receive money (creditor).
 * Negative balance = Member owes money (debtor).
 * Zero balance = Settled / even.
 *
 * Accounts for confirmed settlements:
 * A confirmed payment from X to Y decreases X's debt (or increases X's net balance by +amount)
 * and satisfies Y's credit (decreases Y's net balance by -amount).
 */
export function calculateMemberBalances(
  members: UserProfile[],
  expenses: Expense[],
  confirmedSettlements: Settlement[] = []
): MemberBalance[] {
  const balanceMap = new Map<
    string,
    { user: UserProfile; totalPaidCents: number; totalShareCents: number; settlementAdjustmentCents: number }
  >();

  // Initialize for all known members
  for (const m of members) {
    balanceMap.set(m.id, {
      user: m,
      totalPaidCents: 0,
      totalShareCents: 0,
      settlementAdjustmentCents: 0,
    });
  }

  // Aggregate expenses
  for (const exp of expenses) {
    // Add to payer's total paid
    const payerEntry = balanceMap.get(exp.paid_by);
    const expCents = toCents(exp.amount);
    if (payerEntry) {
      payerEntry.totalPaidCents += expCents;
    } else {
      // Payer not in initial members list (e.g., temporary user profile)
      balanceMap.set(exp.paid_by, {
        user: exp.payer || { id: exp.paid_by, full_name: 'Unknown Member', email: '' },
        totalPaidCents: expCents,
        totalShareCents: 0,
        settlementAdjustmentCents: 0,
      });
    }

    // Add to each participant's total share
    if (exp.splits && exp.splits.length > 0) {
      for (const split of exp.splits) {
        const splitCents = toCents(split.amount);
        const participantEntry = balanceMap.get(split.user_id);
        if (participantEntry) {
          participantEntry.totalShareCents += splitCents;
        } else {
          balanceMap.set(split.user_id, {
            user: split.user || { id: split.user_id, full_name: 'Unknown Member', email: '' },
            totalPaidCents: 0,
            totalShareCents: splitCents,
            settlementAdjustmentCents: 0,
          });
        }
      }
    }
  }

  // Apply confirmed/completed settlements
  for (const st of confirmedSettlements) {
    if (st.status === 'completed') {
      const stCents = toCents(st.amount);
      const payerEntry = balanceMap.get(st.payer_id);
      const receiverEntry = balanceMap.get(st.receiver_id);

      if (payerEntry) {
        // Payer paid money towards debt, so their balance goes towards positive
        payerEntry.settlementAdjustmentCents += stCents;
      }
      if (receiverEntry) {
        // Receiver received money, so their pending receivable goes down
        receiverEntry.settlementAdjustmentCents -= stCents;
      }
    }
  }

  // Build final balance array
  const result: MemberBalance[] = [];
  for (const [userId, data] of balanceMap.entries()) {
    const netCents = data.totalPaidCents - data.totalShareCents + data.settlementAdjustmentCents;
    result.push({
      userId,
      user: data.user,
      totalPaid: fromCents(data.totalPaidCents),
      totalShare: fromCents(data.totalShareCents),
      netBalance: fromCents(netCents),
    });
  }

  return result;
}

/**
 * Deterministic settlement optimization using the greedy minimum-cash-flow algorithm.
 * Minimizes total number of transactions to at most N-1 transactions.
 * Guarantees:
 * 1. No self-payments.
 * 2. No negative settlement amounts.
 * 3. Exact balancing of debtors and creditors.
 */
export function optimizeSettlements(
  balances: MemberBalance[],
  currency: string = 'INR'
): OptimizedSettlement[] {
  // Convert to cents to avoid floating point precision issues
  interface Participant {
    id: string;
    name: string;
    balanceCents: number;
  }

  const debtors: Participant[] = [];
  const creditors: Participant[] = [];

  for (const b of balances) {
    const cents = toCents(b.netBalance);
    if (cents < 0) {
      // Debtor owes money
      debtors.push({
        id: b.userId,
        name: b.user.full_name || 'Member',
        balanceCents: -cents, // store as positive amount owed
      });
    } else if (cents > 0) {
      // Creditor should receive money
      creditors.push({
        id: b.userId,
        name: b.user.full_name || 'Member',
        balanceCents: cents,
      });
    }
  }

  // Sort debtors descending (largest debt first), creditors descending (largest credit first)
  debtors.sort((a, b) => b.balanceCents - a.balanceCents);
  creditors.sort((a, b) => b.balanceCents - a.balanceCents);

  const settlements: OptimizedSettlement[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    // Amount to settle is the minimum of debtor's debt and creditor's credit
    const settleCents = Math.min(debtor.balanceCents, creditor.balanceCents);

    if (settleCents > 0) {
      settlements.push({
        payerId: debtor.id,
        payerName: debtor.name,
        receiverId: creditor.id,
        receiverName: creditor.name,
        amount: fromCents(settleCents),
        currency,
        status: 'suggested',
      });

      debtor.balanceCents -= settleCents;
      creditor.balanceCents -= settleCents;
    }

    if (debtor.balanceCents === 0) {
      dIdx++;
    }
    if (creditor.balanceCents === 0) {
      cIdx++;
    }
  }

  return settlements;
}
