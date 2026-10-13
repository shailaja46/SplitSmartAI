import { describe, it, expect } from 'vitest';
import {
  calculateEqualSplits,
  validateAndCalculateExactSplits,
  calculatePercentageSplits,
  calculateSharesSplits,
  calculateMemberBalances,
  optimizeSettlements,
  roundCurrency,
} from '../lib/calculations/settlement';
import { Expense, Settlement, UserProfile } from '../types';

describe('Expense Splitting Calculations', () => {
  it('splits ₹1,200 equally among 4 members with zero rounding remainder', () => {
    const participants = ['user-a', 'user-b', 'user-c', 'user-d'];
    const splits = calculateEqualSplits(1200, participants);

    expect(splits).toHaveLength(4);
    splits.forEach((s) => {
      expect(s.amount).toBe(300);
      expect(s.percentage).toBe(25);
    });

    const sum = splits.reduce((acc, curr) => acc + curr.amount, 0);
    expect(roundCurrency(sum)).toBe(1200);
  });

  it('splits ₹100 equally among 3 members and resolves 1 paisa rounding disparity correctly', () => {
    const participants = ['u1', 'u2', 'u3'];
    const splits = calculateEqualSplits(100, participants);

    expect(splits).toHaveLength(3);
    // 10000 cents / 3 = 3333 with remainder 1
    expect(splits[0].amount).toBe(33.34);
    expect(splits[1].amount).toBe(33.33);
    expect(splits[2].amount).toBe(33.33);

    const sum = splits.reduce((acc, curr) => acc + curr.amount, 0);
    expect(roundCurrency(sum)).toBe(100.00);
  });

  it('validates exact amount splits when sum matches', () => {
    const exactInputs = [
      { userId: 'u1', amount: 450.50 },
      { userId: 'u2', amount: 549.50 },
    ];
    const result = validateAndCalculateExactSplits(1000, exactInputs);
    expect(result.valid).toBe(true);
    expect(result.splits).toHaveLength(2);
    expect(result.splits[0].amount).toBe(450.50);
    expect(result.splits[1].amount).toBe(549.50);
  });

  it('rejects exact amount splits when sum does not match total amount', () => {
    const exactInputs = [
      { userId: 'u1', amount: 400 },
      { userId: 'u2', amount: 500 },
    ];
    const result = validateAndCalculateExactSplits(1000, exactInputs);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('does not equal total amount');
  });

  it('calculates percentage splits correctly and reconciles penny rounding', () => {
    const participants = [
      { userId: 'u1', percentage: 50 },
      { userId: 'u2', percentage: 30 },
      { userId: 'u3', percentage: 20 },
    ];
    const result = calculatePercentageSplits(250, participants);
    expect(result.valid).toBe(true);
    expect(result.splits[0].amount).toBe(125);
    expect(result.splits[1].amount).toBe(75);
    expect(result.splits[2].amount).toBe(50);

    const sum = result.splits.reduce((acc, curr) => acc + curr.amount, 0);
    expect(roundCurrency(sum)).toBe(250);
  });

  it('calculates shares-based splits correctly', () => {
    const participants = [
      { userId: 'u1', shares: 2 },
      { userId: 'u2', shares: 1 },
      { userId: 'u3', shares: 1 },
    ];
    const result = calculateSharesSplits(400, participants);
    expect(result.valid).toBe(true);
    expect(result.splits[0].amount).toBe(200);
    expect(result.splits[1].amount).toBe(100);
    expect(result.splits[2].amount).toBe(100);

    const sum = result.splits.reduce((acc, curr) => acc + curr.amount, 0);
    expect(roundCurrency(sum)).toBe(400);
  });
});

describe('Net Balance Calculations and Settlement Invariants', () => {
  const userA: UserProfile = { id: 'user-a', full_name: 'Alice', email: 'alice@example.com' };
  const userB: UserProfile = { id: 'user-b', full_name: 'Bob', email: 'bob@example.com' };
  const userC: UserProfile = { id: 'user-c', full_name: 'Charlie', email: 'charlie@example.com' };

  it('computes exact net balances matching prompt scenario: A pays 1000, B pays 500, C pays 0, split 500 each', () => {
    const members = [userA, userB, userC];
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        trip_id: 'trip-1',
        title: 'Hotel',
        amount: 1500,
        category: 'Accommodation',
        paid_by: 'user-a',
        expense_date: '2026-10-10',
        split_method: 'exact',
        created_at: new Date().toISOString(),
        splits: [
          { user_id: 'user-a', amount: 500 },
          { user_id: 'user-b', amount: 500 },
          { user_id: 'user-c', amount: 500 },
        ],
      },
    ];

    // Wait, let's also account for B having paid 500 in another expense:
    const expensesScenario: Expense[] = [
      {
        id: 'exp-1',
        trip_id: 'trip-1',
        title: 'Hotel',
        amount: 1000,
        category: 'Accommodation',
        paid_by: 'user-a',
        expense_date: '2026-10-10',
        split_method: 'equal',
        created_at: new Date().toISOString(),
        splits: [
          { user_id: 'user-a', amount: 333.34 },
          { user_id: 'user-b', amount: 333.33 },
          { user_id: 'user-c', amount: 333.33 },
        ],
      },
      {
        id: 'exp-2',
        trip_id: 'trip-1',
        title: 'Food',
        amount: 500,
        category: 'Food and drinks',
        paid_by: 'user-b',
        expense_date: '2026-10-11',
        split_method: 'equal',
        created_at: new Date().toISOString(),
        splits: [
          { user_id: 'user-a', amount: 166.67 },
          { user_id: 'user-b', amount: 166.67 },
          { user_id: 'user-c', amount: 166.66 },
        ],
      },
    ];

    const balances = calculateMemberBalances(members, expensesScenario);
    const balanceA = balances.find((b) => b.userId === 'user-a');
    const balanceB = balances.find((b) => b.userId === 'user-b');
    const balanceC = balances.find((b) => b.userId === 'user-c');

    // A paid 1000, share is 333.34 + 166.67 = 500.01 -> Net balance ~ +500
    // B paid 500, share is 333.33 + 166.67 = 500.00 -> Net balance ~ 0
    // C paid 0, share is 333.33 + 166.66 = 499.99 -> Net balance ~ -500
    expect(balanceA?.netBalance).toBeCloseTo(499.99, 1);
    expect(balanceB?.netBalance).toBeCloseTo(0.00, 1);
    expect(balanceC?.netBalance).toBeCloseTo(-499.99, 1);

    // Sum of net balances must sum strictly to 0
    const totalNet = balances.reduce((sum, b) => sum + b.netBalance, 0);
    expect(Math.abs(roundCurrency(totalNet))).toBeLessThanOrEqual(0.01);
  });

  it('optimizes settlements minimizing transactions: C pays A 500 directly, bypassing B', () => {
    const balances = [
      { userId: 'user-a', user: userA, totalPaid: 1000, totalShare: 500, netBalance: 500 },
      { userId: 'user-b', user: userB, totalPaid: 500, totalShare: 500, netBalance: 0 },
      { userId: 'user-c', user: userC, totalPaid: 0, totalShare: 500, netBalance: -500 },
    ];

    const settlements = optimizeSettlements(balances, 'INR');

    expect(settlements).toHaveLength(1);
    expect(settlements[0].payerId).toBe('user-c');
    expect(settlements[0].receiverId).toBe('user-a');
    expect(settlements[0].amount).toBe(500);
    expect(settlements[0].currency).toBe('INR');
  });

  it('handles multi-debtor multi-creditor group without self-payments or negative amounts', () => {
    const userD: UserProfile = { id: 'user-d', full_name: 'David', email: 'david@example.com' };
    const balances = [
      { userId: 'user-a', user: userA, totalPaid: 900, totalShare: 200, netBalance: 700 },
      { userId: 'user-b', user: userB, totalPaid: 400, totalShare: 200, netBalance: 200 },
      { userId: 'user-c', user: userC, totalPaid: 0, totalShare: 500, netBalance: -500 },
      { userId: 'user-d', user: userD, totalPaid: 0, totalShare: 400, netBalance: -400 },
    ];

    const settlements = optimizeSettlements(balances, 'USD');

    // Total debt: 900. Total credit: 900.
    // Optimal transactions should be <= 3 (at most N-1)
    expect(settlements.length).toBeLessThanOrEqual(3);
    const sumSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
    expect(roundCurrency(sumSettled)).toBe(900);

    settlements.forEach((s) => {
      expect(s.amount).toBeGreaterThan(0);
      expect(s.payerId).not.toBe(s.receiverId);
    });
  });

  it('updates net balances when a confirmed settlement is recorded', () => {
    const members = [userA, userB, userC];
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        trip_id: 'trip-1',
        title: 'Dinner',
        amount: 300,
        category: 'Food and drinks',
        paid_by: 'user-a',
        expense_date: '2026-10-10',
        split_method: 'equal',
        created_at: new Date().toISOString(),
        splits: [
          { user_id: 'user-a', amount: 100 },
          { user_id: 'user-b', amount: 100 },
          { user_id: 'user-c', amount: 100 },
        ],
      },
    ];

    // C pays A 100 via settlement
    const confirmedSettlements: Settlement[] = [
      {
        id: 'st-1',
        trip_id: 'trip-1',
        payer_id: 'user-c',
        receiver_id: 'user-a',
        amount: 100,
        status: 'completed',
        created_at: new Date().toISOString(),
      },
    ];

    const balances = calculateMemberBalances(members, expenses, confirmedSettlements);
    const balanceC = balances.find((b) => b.userId === 'user-c');
    const balanceA = balances.find((b) => b.userId === 'user-a');
    const balanceB = balances.find((b) => b.userId === 'user-b');

    // C's net debt was -100, after paying 100 it is 0!
    expect(balanceC?.netBalance).toBe(0);
    // A's net receivable was +200, after receiving 100 it is now +100!
    expect(balanceA?.netBalance).toBe(100);
    // B still owes 100
    expect(balanceB?.netBalance).toBe(-100);
  });
});
