import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, getGeminiModel } from '@/lib/gemini/client';

export interface AIInsightsResponse {
  summary: {
    totalSpent: number;
    budget: number | null;
    budgetUtilizationPercentage: number | null;
    highestCategory: string;
    highestCategoryAmount: number;
    highestCategoryPercentage: number;
    spendingStatus: 'within_budget' | 'near_limit' | 'over_budget' | 'no_budget_set';
  };
  keyInsights: string[];
  anomalies: string[];
  savingsRecommendations: string[];
  executiveSummary: string;
  aiGenerated: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trip, expenses, members, currency = 'INR' } = body;

    if (!trip || !expenses || !Array.isArray(expenses)) {
      return NextResponse.json({ error: 'Valid trip and expense data are required' }, { status: 400 });
    }

    // 1. Calculate actual figures server-side first
    const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const categoryTotals: Record<string, number> = {};
    for (const exp of expenses) {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + (Number(exp.amount) || 0);
    }

    let highestCat = 'None';
    let highestAmt = 0;
    for (const [cat, amt] of Object.entries(categoryTotals)) {
      if (amt > highestAmt) {
        highestAmt = amt;
        highestCat = cat;
      }
    }

    const budget = trip.budget ? Number(trip.budget) : null;
    let budgetUtilizationPercentage: number | null = null;
    let spendingStatus: 'within_budget' | 'near_limit' | 'over_budget' | 'no_budget_set' = 'no_budget_set';

    if (budget && budget > 0) {
      budgetUtilizationPercentage = Math.round((totalSpent / budget) * 100);
      if (budgetUtilizationPercentage > 100) spendingStatus = 'over_budget';
      else if (budgetUtilizationPercentage >= 80) spendingStatus = 'near_limit';
      else spendingStatus = 'within_budget';
    }

    const highestPct = totalSpent > 0 ? Math.round((highestAmt / totalSpent) * 100) : 0;

    const summaryData = {
      totalSpent,
      budget,
      budgetUtilizationPercentage,
      highestCategory: highestCat,
      highestCategoryAmount: highestAmt,
      highestCategoryPercentage: highestPct,
      spendingStatus,
    };

    const ai = getGeminiClient();

    if (ai) {
      try {
        const categorySummaryStr = Object.entries(categoryTotals)
          .map(([cat, amt]) => `${cat}: ${currency} ${amt} (${totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0}%)`)
          .join('\n');

        const prompt = `You are an expert travel financial auditor for SplitSmart AI.
Analyze the following trip expenses:
Trip: ${trip.name} (${trip.destination})
Currency: ${currency}
Total Spent: ${currency} ${totalSpent}
Budget: ${budget ? `${currency} ${budget}` : 'None specified'}
Members Count: ${members?.length || 4}
Category Breakdown:
${categorySummaryStr}

List of Recent Expenses:
${expenses.slice(0, 10).map((e: { title: string; amount: number; category: string; paid_by: string }) => `- ${e.title}: ${currency} ${e.amount} (${e.category})`).join('\n')}

Generate a JSON object strictly following this structure:
{
  "keyInsights": [
    "Fact-based insight 1 about the trip spending patterns",
    "Insight 2 explaining category distribution"
  ],
  "anomalies": [
    "Any unusual single spikes or disproportionate expense items (or 'None detected' if healthy)"
  ],
  "savingsRecommendations": [
    "Practical actionable tip 1 to optimize remaining trip spend",
    "Actionable tip 2 tailored to ${trip.destination}"
  ],
  "executiveSummary": "A polished 2-3 paragraph readable summary covering total spend, highest category, budget health, and actionable advice for the group."
}
Rely strictly on the provided real financial numbers. Do not invent fake figures. Return ONLY valid JSON.`;

        const response = await ai.models.generateContent({
          model: getGeminiModel(),
          contents: prompt,
        });

        const rawText = response.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json({
            summary: summaryData,
            keyInsights: parsed.keyInsights || [],
            anomalies: parsed.anomalies || [],
            savingsRecommendations: parsed.savingsRecommendations || [],
            executiveSummary: parsed.executiveSummary || '',
            aiGenerated: true,
          });
        }
      } catch (geminiError) {
        console.warn('Gemini insights generation failed, falling back:', geminiError);
      }
    }

    // Heuristic deterministic fallback
    const keyInsights = [
      `${highestCat} accounts for ${highestPct}% of all group expenditures (${currency} ${highestAmt.toLocaleString()}).`,
      budget
        ? `The trip has utilized ${budgetUtilizationPercentage}% of the planned budget of ${currency} ${budget.toLocaleString()}.`
        : `Average spending per member across ${members?.length || 4} travelers is ${currency} ${Math.round(totalSpent / (members?.length || 4)).toLocaleString()}.`,
    ];

    const anomalies: string[] = [];
    if (highestPct > 50) {
      anomalies.push(`Single category dominance: ${highestCat} exceeds half of all recorded trip spending.`);
    }

    const savingsRecommendations = [
      `Review upcoming ${highestCat.toLowerCase()} expenditures to ensure group alignment before booking.`,
      'Settle active debts early using UPI or direct wire transfers to minimize confusion at the end of the journey.',
      'Utilize shared transit and group tickets for excursions rather than individual bookings.',
    ];

    const executiveSummary = `SplitSmart AI has analyzed your trip "${trip.name}" to ${trip.destination}. The group has accumulated a total of ${currency} ${totalSpent.toLocaleString()} across ${expenses.length} recorded items. The single largest expense category is ${highestCat}, accounting for ${highestPct}% of spending. ${budget ? `Overall, the group is at ${budgetUtilizationPercentage}% of the target budget.` : 'No strict budget cap has been set for this trip.'} Review your pending settlements to keep all member balances fair and up to date.`;

    return NextResponse.json({
      summary: summaryData,
      keyInsights,
      anomalies,
      savingsRecommendations,
      executiveSummary,
      aiGenerated: false,
    });
  } catch (error) {
    console.error('Error in insights route:', error);
    return NextResponse.json({ error: 'Failed to generate expense insights' }, { status: 500 });
  }
}
