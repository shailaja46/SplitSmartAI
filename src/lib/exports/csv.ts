import { Expense, OptimizedSettlement, Settlement, Trip, UserProfile } from '@/types';

/**
 * Escapes a cell value for standard CSV compliance
 */
function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates and downloads a CSV file directly in the browser
 */
export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports Trip Expenses to structured CSV
 */
export function exportExpensesToCsv(trip: Trip, expenses: Expense[]): void {
  const headers = [
    'Expense ID',
    'Date',
    'Title',
    'Category',
    `Amount (${trip.currency})`,
    'Paid By',
    'Split Method',
    'Participants Count',
    'Notes',
  ];

  const rows = expenses.map((e) => [
    e.id,
    e.expense_date,
    e.title,
    e.category,
    e.amount.toFixed(2),
    e.payer?.full_name || 'Member',
    e.split_method,
    e.splits ? e.splits.length : 0,
    e.notes || '',
  ]);

  const csvRows = [
    headers.map(escapeCsv).join(','),
    ...rows.map((r) => r.map(escapeCsv).join(',')),
  ];

  const filename = `${trip.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_expenses_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCsv(filename, csvRows.join('\n'));
}

/**
 * Exports Trip Settlements to structured CSV
 */
export function exportSettlementsToCsv(
  trip: Trip,
  settlements: Settlement[],
  suggestedSettlements: OptimizedSettlement[] = []
): void {
  const headers = [
    'Settlement ID',
    'Payer Name',
    'Receiver Name',
    `Amount (${trip.currency})`,
    'Status',
    'Paid At',
    'Created At',
  ];

  // Completed / Recorded settlements
  const recordedRows = settlements.map((s) => [
    s.id,
    s.payer?.full_name || 'Member',
    s.receiver?.full_name || 'Member',
    s.amount.toFixed(2),
    s.status.toUpperCase(),
    s.paid_at || 'Pending',
    s.created_at,
  ]);

  // Suggested pending settlements
  const suggestedRows = suggestedSettlements.map((s, idx) => [
    `SUGGESTED-${idx + 1}`,
    s.payerName,
    s.receiverName,
    s.amount.toFixed(2),
    'SUGGESTED (OPTIMIZED)',
    'Unpaid',
    new Date().toISOString(),
  ]);

  const csvRows = [
    headers.map(escapeCsv).join(','),
    ...recordedRows.map((r) => r.map(escapeCsv).join(',')),
    ...suggestedRows.map((r) => r.map(escapeCsv).join(',')),
  ];

  const filename = `${trip.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_settlements_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCsv(filename, csvRows.join('\n'));
}

/**
 * Exports full Trip Summary text report
 */
export function exportTripSummaryReport(
  trip: Trip,
  expenses: Expense[],
  members: UserProfile[],
  suggestedSettlements: OptimizedSettlement[]
): void {
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const budget = trip.budget || 0;
  const budgetPct = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0;

  const content = `
============================================================
SPLITSMART AI — OFFICIAL TRIP FINANCIAL SUMMARY REPORT
============================================================
Trip Name:        ${trip.name}
Destination:      ${trip.destination}
Duration:         ${trip.start_date} to ${trip.end_date}
Status:           ${trip.status.toUpperCase()}
Currency:         ${trip.currency}
Generated On:     ${new Date().toLocaleString()}
------------------------------------------------------------
FINANCIAL OVERVIEW:
Total Expenses:   ${trip.currency} ${totalSpent.toLocaleString()}
Total Budget:     ${budget > 0 ? `${trip.currency} ${budget.toLocaleString()} (${budgetPct}% utilized)` : 'No Budget Set'}
Recorded Items:   ${expenses.length} expenses
Group Members:    ${members.length} members (${members.map((m) => m.full_name).join(', ')})
------------------------------------------------------------
RECOMMENDED OPTIMAL SETTLEMENTS:
${
  suggestedSettlements.length > 0
    ? suggestedSettlements
        .map(
          (s, idx) =>
            `${idx + 1}. ${s.payerName} pays ${s.receiverName} -> ${trip.currency} ${s.amount.toLocaleString()}`
        )
        .join('\n')
    : 'All debts are fully settled! No pending payments required.'
}
------------------------------------------------------------
EXPENSE LISTING:
${expenses
  .map(
    (e, idx) =>
      `${idx + 1}. [${e.expense_date}] ${e.title} - ${trip.currency} ${e.amount.toLocaleString()} (${e.category}) - Paid by ${e.payer?.full_name || 'Member'}`
  )
  .join('\n')}
============================================================
SplitSmart AI: "Every trip. Every expense. Perfectly split."
============================================================
  `.trim();

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${trip.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_summary.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
