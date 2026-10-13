import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, getGeminiModel } from '@/lib/gemini/client';

export interface BudgetRecommendationResponse {
  destination: string;
  durationDays: number;
  travelersCount: number;
  totalBudget: number;
  currency: string;
  travelStyle: string;
  breakdown: {
    category: string;
    amount: number;
    percentage: number;
    notes: string;
  }[];
  dailyTargetPerPerson: number;
  tips: string[];
  disclaimer: string;
  aiGenerated: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      destination,
      durationDays = 5,
      travelersCount = 4,
      estimatedBudget = 50000,
      travelStyle = 'moderate',
      currency = 'INR',
    } = body;

    if (!destination) {
      return NextResponse.json({ error: 'Destination is required' }, { status: 400 });
    }

    const ai = getGeminiClient();

    if (ai) {
      try {
        const prompt = `You are an expert travel financial planner for SplitSmart AI.
Plan a realistic budget allocation for a trip:
Destination: ${destination}
Duration: ${durationDays} days
Travelers: ${travelersCount} people
Total Estimated Budget: ${currency} ${estimatedBudget}
Travel Style: ${travelStyle} (options: budget, moderate, luxury)

Generate a JSON response conforming strictly to this format:
{
  "breakdown": [
    { "category": "Accommodation", "percentage": 35, "notes": "Expected standard hotels or Airbnb" },
    { "category": "Food and drinks", "percentage": 25, "notes": "Local cafes and restaurants" },
    { "category": "Transportation", "percentage": 20, "notes": "Cabs, local transit, or vehicle rental" },
    { "category": "Activities", "percentage": 12, "notes": "Sightseeing, entry tickets, and tours" },
    { "category": "Emergency buffer", "percentage": 8, "notes": "Unforeseen medical or transit contingencies" }
  ],
  "dailyTargetPerPerson": <calculated daily per-person amount>,
  "tips": [
    "Tip 1 for saving money in this specific destination",
    "Tip 2 specific to group dynamics and booking",
    "Tip 3 specific to seasonality or local transit"
  ]
}
Ensure the sum of breakdown percentages is exactly 100. Return ONLY valid JSON.`;

        const response = await ai.models.generateContent({
          model: getGeminiModel(),
          contents: prompt,
        });

        const rawText = response.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const breakdown = (parsed.breakdown || []).map((b: { category: string; percentage: number; notes: string }) => ({
            category: b.category,
            percentage: b.percentage,
            amount: Math.round((estimatedBudget * b.percentage) / 100),
            notes: b.notes,
          }));

          return NextResponse.json({
            destination,
            durationDays,
            travelersCount,
            totalBudget: estimatedBudget,
            currency,
            travelStyle,
            breakdown,
            dailyTargetPerPerson:
              parsed.dailyTargetPerPerson ||
              Math.round(estimatedBudget / (durationDays * travelersCount)),
            tips: parsed.tips || [],
            disclaimer:
              'AI-generated estimates are heuristic guidelines based on travel patterns, not guaranteed real-world vendor quotations.',
            aiGenerated: true,
          });
        }
      } catch (geminiError) {
        console.warn('Gemini budget recommend failed, using local model:', geminiError);
      }
    }

    // Heuristic fallback
    const percentages: Record<string, { pct: number; notes: string }> = {
      budget: {
        pct: 30,
        notes: 'Hostels, guesthouses, or shared apartments',
      },
      moderate: {
        pct: 35,
        notes: 'Mid-range hotels or comfortable private vacation rentals',
      },
      luxury: {
        pct: 45,
        notes: 'Premium 4/5-star resorts and beachfront villas',
      },
    };

    const styleKey = (travelStyle.toLowerCase() as 'budget' | 'moderate' | 'luxury') || 'moderate';
    const accomPct = percentages[styleKey]?.pct || 35;
    const foodPct = 25;
    const transPct = 20;
    const actPct = 12;
    const bufferPct = 100 - (accomPct + foodPct + transPct + actPct);

    const breakdown = [
      {
        category: 'Accommodation',
        percentage: accomPct,
        amount: Math.round((estimatedBudget * accomPct) / 100),
        notes: percentages[styleKey]?.notes || 'Hotels and stays',
      },
      {
        category: 'Food and drinks',
        percentage: foodPct,
        amount: Math.round((estimatedBudget * foodPct) / 100),
        notes: 'Meals, snacks, drinks, and local specialty delicacies',
      },
      {
        category: 'Transportation',
        percentage: transPct,
        amount: Math.round((estimatedBudget * transPct) / 100),
        notes: 'Airport transfers, local scooters, cabs, and transit passes',
      },
      {
        category: 'Activities',
        percentage: actPct,
        amount: Math.round((estimatedBudget * actPct) / 100),
        notes: 'Sightseeing admissions, excursions, and equipment rentals',
      },
      {
        category: 'Emergency buffer',
        percentage: bufferPct,
        amount: Math.round((estimatedBudget * bufferPct) / 100),
        notes: 'Reserve fund for unexpected medical, weather, or transit delays',
      },
    ];

    return NextResponse.json({
      destination,
      durationDays,
      travelersCount,
      totalBudget: estimatedBudget,
      currency,
      travelStyle,
      breakdown,
      dailyTargetPerPerson: Math.round(estimatedBudget / (durationDays * travelersCount)),
      tips: [
        `Book group accommodation in ${destination} at least 3 weeks ahead for best group rates.`,
        'Use local scooter or public transit rentals rather than on-demand private cabs.',
        'Split common grocery and beverage staples at local supermarkets to save on cafe margins.',
      ],
      disclaimer:
        'AI-generated estimates are heuristic guidelines based on historical travel data, not guaranteed real-world vendor quotations.',
      aiGenerated: false,
    });
  } catch (error) {
    console.error('Error in budget-recommend route:', error);
    return NextResponse.json({ error: 'Failed to generate budget recommendation' }, { status: 500 });
  }
}
