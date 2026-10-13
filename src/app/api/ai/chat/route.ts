import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, getGeminiModel } from '@/lib/gemini/client';
import { calculateMemberBalances, optimizeSettlements } from '@/lib/calculations/settlement';
import { Expense, Settlement, Trip, UserProfile } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, trip, expenses, members, settlements, currentUserId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!trip) {
      return NextResponse.json({ error: 'Trip context is required' }, { status: 400 });
    }

    // 1. Perform strict server-side calculations
    const memberProfiles: UserProfile[] = (members || []).map((m: { user?: UserProfile; user_id?: string; id?: string }) => m.user || {
      id: m.user_id || m.id || '',
      full_name: 'Member',
      email: '',
    });

    const activeExpenses: Expense[] = expenses || [];
    const activeSettlements: Settlement[] = settlements || [];

    const totalSpent = activeExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const categoryTotals: Record<string, number> = {};
    for (const exp of activeExpenses) {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + (Number(exp.amount) || 0);
    }

    // Calculate balances & optimal settlements
    const balances = calculateMemberBalances(memberProfiles, activeExpenses, activeSettlements);
    const optimized = optimizeSettlements(balances, trip.currency || 'INR');

    // Find current user's balance
    const myBalance = balances.find((b) => b.userId === currentUserId);
    const moneyOwedToMe = myBalance && myBalance.netBalance > 0 ? myBalance.netBalance : 0;
    const moneyIOwe = myBalance && myBalance.netBalance < 0 ? Math.abs(myBalance.netBalance) : 0;

    // People who owe current user in optimized settlements
    const whoOwesMe = optimized
      .filter((s) => s.receiverId === currentUserId)
      .map((s) => `${s.payerName} owes you ${trip.currency} ${s.amount}`);

    // People current user owes
    const whoIOwe = optimized
      .filter((s) => s.payerId === currentUserId)
      .map((s) => `You owe ${s.receiverName} ${trip.currency} ${s.amount}`);

    const verifiedFacts = `
VERIFIED FINANCIAL FACTS (calculated directly by SplitSmart calculations engine):
- Trip Name: "${trip.name}" (${trip.destination})
- Currency: ${trip.currency}
- Total Trip Spending: ${trip.currency} ${totalSpent}
- Trip Budget: ${trip.budget ? `${trip.currency} ${trip.budget}` : 'No budget set'}
- Budget Used: ${trip.budget ? `${Math.round((totalSpent / trip.budget) * 100)}%` : 'N/A'}
- Spending By Category:
${Object.entries(categoryTotals).map(([cat, amt]) => `  • ${cat}: ${trip.currency} ${amt}`).join('\n')}
- Member Net Balances:
${balances.map((b) => `  • ${b.user.full_name}: Paid ${trip.currency} ${b.totalPaid}, Share ${trip.currency} ${b.totalShare}, Net ${b.netBalance >= 0 ? '+' : ''}${trip.currency} ${b.netBalance}`).join('\n')}
- Optimal Debt Settlements:
${optimized.length > 0 ? optimized.map((s) => `  • ${s.payerName} should pay ${s.receiverName} ${trip.currency} ${s.amount}`).join('\n') : '  • All debts are completely settled!'}
- Current User Status:
  • Paid: ${trip.currency} ${myBalance?.totalPaid || 0}
  • Fair Share: ${trip.currency} ${myBalance?.totalShare || 0}
  • Net: ${myBalance ? (myBalance.netBalance >= 0 ? `To receive +${trip.currency} ${myBalance.netBalance}` : `Owes -${trip.currency} ${Math.abs(myBalance.netBalance)}`) : '0'}
  • Debts to settle: ${whoIOwe.join(', ') || 'None'}
  • Receivables: ${whoOwesMe.join(', ') || 'None'}
`;

    const ai = getGeminiClient();

    if (ai) {
      try {
        const prompt = `You are SplitSmart AI's personal trip finance assistant.
A group member asked: "${message}".

Here is the exact server-verified mathematical ledger data for this trip:
${verifiedFacts}

CRITICAL RULES:
1. NEVER invent or hallucinate financial figures. ALWAYS quote the exact numbers from the verified facts above.
2. If asked "who owes me money?", "how much did we spend on X?", "are we over budget?", use the specific numbers calculated above.
3. Be friendly, concise, encouraging, and clear.
4. If providing recommendations to reduce expenses, relate them to the highest spending category shown in the verified facts.
5. Format numbers cleanly with the currency symbol.`;

        const response = await ai.models.generateContent({
          model: getGeminiModel(),
          contents: prompt,
        });

        const reply = response.text || '';
        return NextResponse.json({
          reply,
          aiGenerated: true,
          facts: {
            totalSpent,
            myBalance: myBalance?.netBalance || 0,
            whoOwesMe,
            whoIOwe,
          },
        });
      } catch (geminiError) {
        console.warn('Gemini chat failed, falling back:', geminiError);
      }
    }

    // Heuristic assistant fallback
    const lower = message.toLowerCase();
    let reply = `Here is your trip financial summary for "${trip.name}": Total expenditure is ${trip.currency} ${totalSpent.toLocaleString()}.`;

    if (lower.includes('food') || lower.includes('eat') || lower.includes('drink')) {
      const foodTotal = categoryTotals['Food and drinks'] || 0;
      reply = `The group has spent ${trip.currency} ${foodTotal.toLocaleString()} on Food & Drinks so far, which is ${totalSpent > 0 ? Math.round((foodTotal / totalSpent) * 100) : 0}% of total trip expenses.`;
    } else if (lower.includes('who owes') || lower.includes('owe me')) {
      if (whoOwesMe.length > 0) {
        reply = `According to the settlement engine:\n${whoOwesMe.join('\n')}\nTotal owed to you: ${trip.currency} ${moneyOwedToMe.toLocaleString()}.`;
      } else {
        reply = `No one currently owes you money! All receivables for your account are even.`;
      }
    } else if (lower.includes('i owe') || lower.includes('my debt')) {
      if (whoIOwe.length > 0) {
        reply = `You have outstanding debts to settle:\n${whoIOwe.join('\n')}\nTotal you owe: ${trip.currency} ${moneyIOwe.toLocaleString()}.`;
      } else {
        reply = `You do not owe anyone money on this trip! Your share is fully covered.`;
      }
    } else if (lower.includes('budget')) {
      if (trip.budget) {
        const pct = Math.round((totalSpent / trip.budget) * 100);
        reply = `Your trip budget is ${trip.currency} ${Number(trip.budget).toLocaleString()}. You have used ${trip.currency} ${totalSpent.toLocaleString()} (${pct}%). ${pct > 100 ? '⚠️ You are currently over budget!' : '✅ You are within your budget limit.'}`;
      } else {
        reply = `There is no budget cap set for this trip yet. Total spent so far is ${trip.currency} ${totalSpent.toLocaleString()}.`;
      }
    } else if (lower.includes('category') || lower.includes('most')) {
      let topCat = 'None';
      let topAmt = 0;
      for (const [c, a] of Object.entries(categoryTotals)) {
        if (a > topAmt) {
          topAmt = a;
          topCat = c;
        }
      }
      reply = `The highest expense category is ${topCat} with ${trip.currency} ${topAmt.toLocaleString()} (${totalSpent > 0 ? Math.round((topAmt / totalSpent) * 100) : 0}% of all spending).`;
    } else if (lower.includes('reduce') || lower.includes('save')) {
      reply = `To optimize expenses for "${trip.name}":\n1. Food & drinks and activities are great places to save by booking group excursions.\n2. Settle current balances before new expenses are recorded.\n3. Keep tracking daily expenses so no surprise bills arise at the end!`;
    }

    return NextResponse.json({
      reply,
      aiGenerated: false,
      facts: {
        totalSpent,
        myBalance: myBalance?.netBalance || 0,
        whoOwesMe,
        whoIOwe,
      },
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json({ error: 'Failed to process AI chat message' }, { status: 500 });
  }
}
