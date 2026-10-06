import type {
  IntakeStructuredState,
  IntakeCategory,
  IntakeLocation,
  IntakeBudget,
  FieldSource,
} from '../../../shared/types/intake.ts';
import { geminiProvider } from '../ai/gemini.provider.ts';
import { logger } from '../config/logger.ts';

export interface ExtractionResult {
  extracted: Partial<IntakeStructuredState>;
  fieldSources: Record<string, FieldSource>;
  assistantMessage: string;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

const MAJOR_INDIAN_CITIES: Record<string, string> = {
  mumbai: 'Mumbai, Maharashtra',
  pune: 'Pune, Maharashtra',
  nagpur: 'Nagpur, Maharashtra',
  nashik: 'Nashik, Maharashtra',
  bengaluru: 'Bengaluru, Karnataka',
  bangalore: 'Bengaluru, Karnataka',
  mysore: 'Mysuru, Karnataka',
  delhi: 'New Delhi, Delhi NCR',
  'new delhi': 'New Delhi, Delhi NCR',
  noida: 'Noida, Uttar Pradesh',
  gurgaon: 'Gurugram, Haryana',
  gurugram: 'Gurugram, Haryana',
  hyderabad: 'Hyderabad, Telangana',
  chennai: 'Chennai, Tamil Nadu',
  coimbatore: 'Coimbatore, Tamil Nadu',
  kolkata: 'Kolkata, West Bengal',
  ahmedabad: 'Ahmedabad, Gujarat',
  surat: 'Surat, Gujarat',
  jaipur: 'Jaipur, Rajasthan',
  lucknow: 'Lucknow, Uttar Pradesh',
  chandigarh: 'Chandigarh, Punjab/Haryana',
  indore: 'Indore, Madhya Pradesh',
  kochi: 'Kochi, Kerala',
  trivandrum: 'Thiruvananthapuram, Kerala',
  patna: 'Patna, Bihar',
  bhubaneswar: 'Bhubaneswar, Odisha',
};

/**
 * Normalizes Indian currency input strings into numeric INR amount or ranges.
 */
export function normalizeIndianBudget(text: string): IntakeBudget | null {
  const lower = text.toLowerCase().trim();

  // 1. Check for explicit uncertainty
  if (
    lower.includes("don't know") ||
    lower.includes('dont know') ||
    lower.includes('not sure') ||
    lower.includes('unsure') ||
    lower.includes('no idea') ||
    lower.includes('undecided')
  ) {
    return {
      amount: null,
      minAmount: null,
      maxAmount: null,
      currency: 'INR',
      source: 'ai_estimated',
      confidence: 0.9,
    };
  }

  // 2. Check for ranges like "3-5 lakh" or "₹3 to ₹5 lakhs"
  const rangeMatch = lower.match(
    /(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:-|to)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(lakh|lakhs|lac|lacs|crore|crores|cr|k|thousand)?/i
  );

  if (rangeMatch) {
    const minVal = parseFloat(rangeMatch[1]);
    const maxVal = parseFloat(rangeMatch[2]);
    const unit = rangeMatch[3]?.toLowerCase();

    let multiplier = 1;
    if (unit && (unit.startsWith('lakh') || unit.startsWith('lac'))) multiplier = 100000;
    else if (unit && (unit.startsWith('cr') || unit.startsWith('crore'))) multiplier = 10000000;
    else if (unit && (unit === 'k' || unit === 'thousand')) multiplier = 1000;
    else if (maxVal <= 100) multiplier = 100000; // Default reasonable Indian startup assumption

    const minAmount = Math.round(minVal * multiplier);
    const maxAmount = Math.round(maxVal * multiplier);

    return {
      amount: Math.round((minAmount + maxAmount) / 2),
      minAmount,
      maxAmount,
      currency: 'INR',
      source: 'user_provided',
      confidence: 0.95,
    };
  }

  // 3. Check for single amount with lakh / crore / k
  const lakhMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs)/i);
  if (lakhMatch) {
    const amount = Math.round(parseFloat(lakhMatch[1]) * 100000);
    return {
      amount,
      minAmount: null,
      maxAmount: null,
      currency: 'INR',
      source: 'user_provided',
      confidence: 0.95,
    };
  }

  const croreMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:crore|crores|cr)/i);
  if (croreMatch) {
    const amount = Math.round(parseFloat(croreMatch[1]) * 10000000);
    return {
      amount,
      minAmount: null,
      maxAmount: null,
      currency: 'INR',
      source: 'user_provided',
      confidence: 0.95,
    };
  }

  const kMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:k|thousand)/i);
  if (kMatch) {
    const amount = Math.round(parseFloat(kMatch[1]) * 1000);
    return {
      amount,
      minAmount: null,
      maxAmount: null,
      currency: 'INR',
      source: 'user_provided',
      confidence: 0.95,
    };
  }

  // 4. Raw digits (e.g. "500000", "5,00,000", "₹500000")
  const digitMatch = lower.match(/(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{2,3})*|\d+)/i);
  if (digitMatch) {
    const cleanNumber = parseInt(digitMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(cleanNumber) && cleanNumber > 0) {
      return {
        amount: cleanNumber,
        minAmount: null,
        maxAmount: null,
        currency: 'INR',
        source: 'user_provided',
        confidence: 0.9,
      };
    }
  }

  return null;
}

/**
 * Normalizes India location input strings.
 */
export function normalizeIndianLocation(text: string): IntakeLocation | null {
  const lower = text.toLowerCase().trim();

  // 1. National scope
  if (
    lower.includes('all india') ||
    lower.includes('pan india') ||
    lower.includes('nationwide') ||
    lower.includes('entire country') ||
    lower.includes('whole india') ||
    lower === 'national' ||
    lower === 'india'
  ) {
    return {
      country: 'India',
      scope: 'national',
      locations: ['All India'],
      source: 'user_provided',
    };
  }

  // 2. Check for major cities
  const detectedCities: string[] = [];
  for (const [key, formatted] of Object.entries(MAJOR_INDIAN_CITIES)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(lower)) {
      detectedCities.push(formatted);
    }
  }

  if (detectedCities.length > 1) {
    return {
      country: 'India',
      scope: 'region',
      locations: detectedCities,
      source: 'user_provided',
    };
  }

  if (detectedCities.length === 1) {
    return {
      country: 'India',
      scope: 'city',
      locations: detectedCities,
      source: 'user_provided',
    };
  }

  // 3. Check for states
  for (const state of INDIAN_STATES) {
    const regex = new RegExp(`\\b${state}\\b`, 'i');
    if (regex.test(text)) {
      return {
        country: 'India',
        scope: 'state',
        locations: [state],
        source: 'user_provided',
      };
    }
  }

  // 4. Region or multiple cities explicitly mentioned
  if (lower.includes('region') || lower.includes('tier') || lower.includes('cities')) {
    return {
      country: 'India',
      scope: 'region',
      locations: [text.trim()],
      source: 'user_provided',
    };
  }

  return null;
}

/**
 * Normalizes analysis depth selection.
 */
export function normalizeAnalysisDepth(text: string): 'quick' | 'standard' | 'deep' | null {
  const lower = text.toLowerCase().trim();
  if (lower.includes('quick') || lower.includes('rapid') || lower.includes('fast')) {
    return 'quick';
  }
  if (lower.includes('deep') || lower.includes('comprehensive') || lower.includes('detailed')) {
    return 'deep';
  }
  if (lower.includes('standard') || lower.includes('normal') || lower.includes('balanced')) {
    return 'standard';
  }
  return null;
}

/**
 * Normalizes startup name or "no name yet".
 */
export function normalizeStartupName(text: string): { name: string | null; isProvided: boolean } | null {
  const lower = text.toLowerCase().trim();
  if (
    lower.includes("don't have one") ||
    lower.includes('dont have one') ||
    lower.includes('no name') ||
    lower.includes('not yet') ||
    lower.includes('haven\'t decided') ||
    lower.includes('undecided') ||
    lower.includes('not decided')
  ) {
    return { name: null, isProvided: true };
  }

  // Extract from patterns like "We call it QuickPay" or "Name is StudyMate"
  const namePattern = /(?:name\s+is|called|named|it's|we're\s+calling\s+it)\s+["']?([A-Za-z0-9\s-]+?)["']?(?:\.|$|,)/i;
  const match = text.match(namePattern);
  if (match && match[1].trim().length >= 2) {
    return { name: match[1].trim(), isProvided: true };
  }

  return null;
}

/**
 * Deterministic rule-based extractor used as fallback or baseline.
 */
export function ruleBasedExtraction(
  message: string,
  currentCategory: IntakeCategory | 'complete',
  currentState: IntakeStructuredState
): ExtractionResult {
  const extracted: Partial<IntakeStructuredState> = {};
  const fieldSources: Record<string, FieldSource> = {};

  // 1. Budget extraction
  const budget = normalizeIndianBudget(message);
  if (budget) {
    extracted.budget = budget;
    fieldSources.budget = budget.source === 'ai_estimated' ? 'ai_estimated' : 'user_provided';
  }

  // 2. Location extraction
  const location = normalizeIndianLocation(message);
  if (location) {
    extracted.location = location;
    fieldSources.location = 'user_provided';
  }

  // 3. Analysis depth extraction
  const depth = normalizeAnalysisDepth(message);
  if (depth) {
    extracted.analysisDepth = depth;
    fieldSources.analysisDepth = 'user_provided';
  }

  // 4. Startup name extraction
  const nameResult = normalizeStartupName(message);
  if (nameResult) {
    extracted.startupName = nameResult.name;
    fieldSources.startupName = 'user_provided';
  }

  // 5. Current category specific extraction if user directly answered the active question
  if (currentCategory === 'startupIdea' && !extracted.startupIdea && message.trim().length >= 5) {
    extracted.startupIdea = message.trim();
    fieldSources.startupIdea = 'user_provided';
  } else if (currentCategory === 'proposedSolution' && !extracted.proposedSolution && message.trim().length >= 5) {
    extracted.proposedSolution = message.trim();
    fieldSources.proposedSolution = 'user_provided';
  } else if (currentCategory === 'targetCustomers' && !extracted.targetCustomers && message.trim().length >= 3) {
    extracted.targetCustomers = message.trim();
    fieldSources.targetCustomers = 'user_provided';
  } else if (currentCategory === 'revenueModel' && !extracted.revenueModel) {
    const lower = message.toLowerCase().trim();
    if (lower.includes("don't know") || lower.includes('not sure') || lower.includes('undecided')) {
      extracted.revenueModel = null;
    } else {
      extracted.revenueModel = message.trim();
    }
    fieldSources.revenueModel = 'user_provided';
  } else if (currentCategory === 'additionalInformation' && !extracted.additionalInformation) {
    extracted.additionalInformation = message.trim();
    fieldSources.additionalInformation = 'user_provided';
  } else if (currentCategory === 'startupName' && !extracted.startupName && !nameResult) {
    const cleanName = message.trim().replace(/^["']|["']$/g, '');
    if (cleanName.length >= 2 && cleanName.length <= 60) {
      extracted.startupName = cleanName;
      fieldSources.startupName = 'user_provided';
    }
  }

  // 6. Multi-field semantic keyword detection for combined messages (e.g. idea + customers)
  if (!extracted.targetCustomers) {
    const customerMatch = message.match(/(?:for|targeting|aimed at|serving)\s+([a-zA-Z\s-]+(?:students|engineers|businesses|farmers|professionals|users|customers|seniors|parents|freelancers|drivers|merchants|retailers|patients))/i);
    if (customerMatch && customerMatch[1]) {
      extracted.targetCustomers = customerMatch[1].trim();
      fieldSources.targetCustomers = 'user_provided';
    }
  }

  if (!extracted.startupIdea && !currentState.startupIdea && message.length >= 10) {
    extracted.startupIdea = message.trim();
    fieldSources.startupIdea = 'user_provided';
  }

  return {
    extracted,
    fieldSources,
    assistantMessage: generateAssistantResponse(extracted),
  };
}

/**
 * Builds conversational assistant guidance acknowledging extracted info.
 */
function generateAssistantResponse(extracted: Partial<IntakeStructuredState>): string {
  const notes: string[] = [];

  if (extracted.startupIdea) {
    notes.push('Understood your startup concept');
  }
  if (extracted.targetCustomers) {
    notes.push(`targeted at ${extracted.targetCustomers}`);
  }
  if (extracted.location?.scope) {
    const loc = extracted.location.scope === 'national' ? 'Pan-India' : extracted.location.locations.join(', ');
    notes.push(`launching in ${loc}`);
  }
  if (extracted.budget?.amount) {
    notes.push(`with ₹${extracted.budget.amount.toLocaleString()} budget`);
  } else if (extracted.budget?.source === 'ai_estimated') {
    notes.push('budget marked for AI estimation');
  }
  if (extracted.analysisDepth) {
    notes.push(`${extracted.analysisDepth} analysis tier selected`);
  }

  if (notes.length > 0) {
    return `Got it! I have recorded: ${notes.join(' · ')}. Let's continue.`;
  }
  return 'Thank you. I have captured this detail.';
}

/**
 * Performs smart extraction using Gemini with deterministic fallback.
 */
export async function extractIntakeInformation(
  message: string,
  currentCategory: IntakeCategory | 'complete',
  currentState: IntakeStructuredState
): Promise<ExtractionResult> {
  // Always compute rule-based baseline
  const baseline = ruleBasedExtraction(message, currentCategory, currentState);

  // If Gemini provider is available, enrich with LLM extraction
  if (geminiProvider.isAvailable()) {
    try {
      const prompt = `You are the background intelligence engine for Autonomous Startup Builder's Smart Guided Intake.
Extract any startup information present in the user's natural message into the 9 categories.

CURRENT CATEGORY BEING ASKED: ${currentCategory}

CURRENT STRUCTURED STATE:
${JSON.stringify(currentState, null, 2)}

USER MESSAGE:
"${message}"

INSTRUCTIONS:
1. Detect any of the 9 categories mentioned:
   - startupIdea (string, the core problem/concept)
   - proposedSolution (string, how it works/product)
   - startupName (string or null if user has no name yet)
   - targetCustomers (string, audience/user group)
   - location: { country: "India", scope: "national"|"state"|"city"|"region"|null, locations: string[] }
   - budget: { amount: number|null, minAmount: number|null, maxAmount: number|null, currency: "INR", source: "user_provided"|"ai_estimated"|null }
     NOTE: Convert Lakhs (1L = 100000) and Crores (1Cr = 10000000). If unsure, set source="ai_estimated" and amount=null.
   - revenueModel (string or null)
   - additionalInformation (string or null)
   - analysisDepth: "quick"|"standard"|"deep"|null
2. Detect corrections: if the user explicitly corrects a previously provided field, update it.
3. Return valid JSON only with keys:
   - "extracted": object containing any recognized fields
   - "fieldSources": mapping field name to "user_provided"|"ai_inferred"|"ai_estimated"
   - "assistantMessage": 1-2 concise, professional sentences acknowledging what was captured.

DO NOT invent fields not mentioned. Return JSON.`;

      const response = await geminiProvider.generateStructured<{
        extracted?: Partial<IntakeStructuredState>;
        fieldSources?: Record<string, FieldSource>;
        assistantMessage?: string;
      }>({
        prompt,
        systemPrompt: 'You extract structured startup data from Indian founder conversations. Return JSON only.',
        temperature: 0.1,
      });

      if (response.parsed && response.parsed.extracted) {
        // Merge Gemini's extraction over baseline
        const mergedExtracted = {
          ...baseline.extracted,
          ...response.parsed.extracted,
        };

        // Budget & Location normalization takes precedence for safety
        if (baseline.extracted.budget) {
          mergedExtracted.budget = baseline.extracted.budget;
        }
        if (baseline.extracted.location) {
          mergedExtracted.location = baseline.extracted.location;
        }
        if (baseline.extracted.analysisDepth) {
          mergedExtracted.analysisDepth = baseline.extracted.analysisDepth;
        }

        return {
          extracted: mergedExtracted,
          fieldSources: {
            ...baseline.fieldSources,
            ...(response.parsed.fieldSources || {}),
          },
          assistantMessage: response.parsed.assistantMessage || baseline.assistantMessage,
        };
      }
    } catch (err) {
      logger.warn('Gemini extraction error; falling back to rule-based extractor', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return baseline;
}
