import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, getGeminiModel } from '@/lib/gemini/client';

export interface ParsedExpenseResponse {
  title: string;
  amount: number;
  category: string;
  payerId: string;
  payerName: string;
  expenseDate: string;
  splitMethod: 'equal' | 'exact' | 'percentage' | 'shares';
  participantIds: string[];
  notes?: string;
  confidence: number;
  aiGenerated: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, members, currency = 'INR' } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text input is required' }, { status: 400 });
    }

    if (!members || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: 'Trip members are required for resolution' }, { status: 400 });
    }

    const memberListStr = members.map((m: { id: string; name: string }) => `${m.name} (id: ${m.id})`).join(', ');

    const ai = getGeminiClient();

    if (ai) {
      try {
        const prompt = `You are a financial natural-language parser for SplitSmart AI.
Analyze this expense sentence: "${text}".
The trip members available to match against are:
${memberListStr}
Currency is: ${currency}
Today's date is: ${new Date().toISOString().split('T')[0]}

Extract and return a strict JSON object with these keys:
{
  "title": "Short descriptive title of the expense (e.g. Seafood Dinner)",
  "amount": <number, e.g. 2000>,
  "category": "One of: Accommodation, Food and drinks, Transportation, Shopping, Activities, Fuel, Tickets, Miscellaneous",
  "payerId": "id of the member who paid, or matching the person who paid",
  "payerName": "name of payer",
  "expenseDate": "YYYY-MM-DD (e.g. yesterday or today's date)",
  "splitMethod": "equal" | "exact" | "percentage" | "shares",
  "participantIds": ["array of user ids who share this expense"],
  "notes": "Any extra notes mentioned"
}
Ensure all IDs in participantIds and payerId match the provided trip member IDs. If "me" or "I" is mentioned, select the first member or matching member. Return ONLY the JSON object.`;

        const response = await ai.models.generateContent({
          model: getGeminiModel(),
          contents: prompt,
        });

        const rawText = response.text || '';
        // Extract JSON from potential code fences
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json({
            ...parsed,
            confidence: 0.95,
            aiGenerated: true,
          });
        }
      } catch (geminiError) {
        console.warn('Gemini API call failed, falling back to rule-based parser:', geminiError);
      }
    }

    // Rule-based / Local NLP fallback parser
    const fallbackParsed = fallbackParseExpense(text, members);
    return NextResponse.json({
      ...fallbackParsed,
      confidence: 0.8,
      aiGenerated: false,
      note: 'Parsed using offline rule-based parser. Configure GEMINI_API_KEY for advanced AI reasoning.',
    });
  } catch (error) {
    console.error('Error in parse-expense route:', error);
    return NextResponse.json({ error: 'Failed to parse expense description' }, { status: 500 });
  }
}

function fallbackParseExpense(
  text: string,
  members: Array<{ id: string; name: string }>
): ParsedExpenseResponse {
  const lower = text.toLowerCase();

  // Extract amount
  const amountMatch = text.match(/(?:₹|rs\.?|usd|\$|eur|€)?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i);
  let amount = 500;
  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  // Detect category
  let category = 'Food and drinks';
  if (/hotel|villa|airbnb|resort|stay|room/i.test(lower)) category = 'Accommodation';
  else if (/taxi|cab|uber|flight|train|bus|rental/i.test(lower)) category = 'Transportation';
  else if (/petrol|fuel|diesel|gas/i.test(lower)) category = 'Fuel';
  else if (/ticket|entry|pass|museum|movie/i.test(lower)) category = 'Tickets';
  else if (/scuba|parasail|trek|rafting|tour|activity/i.test(lower)) category = 'Activities';
  else if (/shop|souvenir|clothes|market/i.test(lower)) category = 'Shopping';
  else if (/misc|other|tip/i.test(lower)) category = 'Miscellaneous';

  // Detect payer
  let payer = members[0];
  for (const m of members) {
    const firstName = m.name.split(' ')[0].toLowerCase();
    if (lower.includes(firstName)) {
      payer = m;
      break;
    }
  }

  // Detect participants
  const participants = members.filter((m) => {
    const firstName = m.name.split(' ')[0].toLowerCase();
    return lower.includes(firstName) || lower.includes('everyone') || lower.includes('all');
  });

  const participantIds = participants.length > 0 ? participants.map((p) => p.id) : members.map((m) => m.id);

  // Detect date
  let expenseDate = new Date().toISOString().split('T')[0];
  if (lower.includes('yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expenseDate = d.toISOString().split('T')[0];
  }

  return {
    title: text.length > 40 ? text.substring(0, 37) + '...' : text,
    amount,
    category,
    payerId: payer.id,
    payerName: payer.name,
    expenseDate,
    splitMethod: 'equal',
    participantIds,
    notes: text,
    confidence: 0.8,
    aiGenerated: false,
  };
}
