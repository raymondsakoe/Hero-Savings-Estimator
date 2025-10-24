import { GoogleGenAI, Type } from "@google/genai";
import type { FormData, SavingsData, GeneratedContent } from "../types";
import { GUARANTEED_SAVINGS, MIN_BONUS_SAVINGS, MAX_BONUS_SAVINGS } from "../constants";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const getFirstName = (fullName: string) => {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return "Hero";
  }
  const [first] = trimmed.split(/\s+/);
  return first || "Hero";
};

const calendlyLink = 'https://calendly.com/malcolm-downtownfinancialgroup/quickintakecall';
const longDisclaimer = `For information purposes only. This is not a commitment to lend or extend credit. Information and/or dates are subject to change without notice. All loans are subject to credit approval. Program availability, terms, and savings vary by state and are subject to change without notice. Estimated savings include a lender closing credit determined by loan amount tier and may include partner discounts; partner discounts are provided by third parties and are not guaranteed. Insurance premium comparisons reflect quoted differences versus alternative carriers and will vary by property, coverage, and carrier underwriting. Moving and inspection discounts are subject to vendor participation and availability. This tool provides estimates only and does not constitute financial, legal, or tax advice.`;
const smsDisclaimer = `Reply STOP to opt out. Not a commitment to lend. Subject to credit approval. Terms & savings vary by state & are not guaranteed. NMLS #1830011 & #2072896.`;

const buildStandardContent = (formData: FormData, savingsData: SavingsData): GeneratedContent => {
  const firstName = getFirstName(formData.name);
  const downPaymentAmount = (formData.homePrice * formData.downPaymentPercent) / 100;
  const formattedGuaranteedSavings = formatCurrency(GUARANTEED_SAVINGS);
  const formattedMinBonusSavings = formatCurrency(MIN_BONUS_SAVINGS);
  const formattedMaxBonusSavings = formatCurrency(MAX_BONUS_SAVINGS);

  return {
    email: {
      subject: "Your Hero Savings Report",
      body: `Hi ${firstName},\n\nHere’s your personalized Hero Savings Report.\n\nHome Price: ${formatCurrency(formData.homePrice)}\nDown Payment: ${formData.downPaymentPercent}% (${formatCurrency(downPaymentAmount)})\nEstimated Loan Amount: ${formatCurrency(savingsData.loanAmount)}\n\nYour Savings\n• Hero Credit (loan-based tier): ${formatCurrency(savingsData.heroCredit)}\n• Guaranteed Partner Savings: ${formattedGuaranteedSavings}\n• Potential Bonus Savings: ${formattedMinBonusSavings}–${formattedMaxBonusSavings}\n\nTotal Estimated Savings: ${formatCurrency(savingsData.minSavings)}–${formatCurrency(savingsData.maxSavings)}\n\nBook your free call to confirm numbers and next steps:\n${calendlyLink}\n\n—\nDowntown Financial Group | NMLS #1830011 & #2072896\nPowered by Go Rascal\n\n${longDisclaimer}`
    },
    sms: {
      body: `Hi ${firstName}, your Hero Savings Report is ready.\n\nHome Price: ${formatCurrency(formData.homePrice)} | Down: ${formData.downPaymentPercent}% (${formatCurrency(downPaymentAmount)}) | Loan: ${formatCurrency(savingsData.loanAmount)}\nHero Credit: ${formatCurrency(savingsData.heroCredit)} | Partner: ${formattedGuaranteedSavings} | Bonus: ${formattedMinBonusSavings}–${formattedMaxBonusSavings}\nTotal Est. Savings: ${formatCurrency(savingsData.minSavings)}–${formatCurrency(savingsData.maxSavings)}\n\nBook your free call: ${calendlyLink}\n\n${smsDisclaimer}`
    }
  };
};

const getFallbackContent = (formData: FormData, savingsData: SavingsData): GeneratedContent => {
  return buildStandardContent(formData, savingsData);
};

const normalizeContent = (value: string) => value.replace(/\r\n/g, '\n').trim();

const isValidGeneratedContent = (value: unknown): value is GeneratedContent => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const content = value as Record<string, unknown>;
  const email = content.email;
  const sms = content.sms;
  if (!email || typeof email !== 'object' || !sms || typeof sms !== 'object') {
    return false;
  }
  const emailSubject = (email as Record<string, unknown>).subject;
  const emailBody = (email as Record<string, unknown>).body;
  const smsBody = (sms as Record<string, unknown>).body;
  return (
    typeof emailSubject === 'string' &&
    typeof emailBody === 'string' &&
    typeof smsBody === 'string'
  );
};

const isContentConsistent = (content: GeneratedContent, template: GeneratedContent) => {
  const emailMatches =
    normalizeContent(content.email.subject) === normalizeContent(template.email.subject) &&
    normalizeContent(content.email.body) === normalizeContent(template.email.body);
  const smsMatches = normalizeContent(content.sms.body) === normalizeContent(template.sms.body);
  return emailMatches && smsMatches;
};

export const generateNotifications = async (
  formData: FormData,
  savingsData: SavingsData
): Promise<GeneratedContent | null> => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    console.error("VITE_API_KEY environment variable not set. Using fallback content.");
    return buildStandardContent(formData, savingsData);
  }
  
  const ai = new GoogleGenAI({ apiKey });

  const firstName = getFirstName(formData.name);
  const downPaymentAmount = (formData.homePrice * formData.downPaymentPercent) / 100;
  const formattedGuaranteedSavings = formatCurrency(GUARANTEED_SAVINGS);
  const formattedMinBonusSavings = formatCurrency(MIN_BONUS_SAVINGS);
  const formattedMaxBonusSavings = formatCurrency(MAX_BONUS_SAVINGS);
  const prompt = `
    You are an assistant for "Downtown Financial Group". Your task is to generate a personalized email and SMS notification for a user based on their savings estimation.

    User Data:
    - First Name: ${firstName}
    - Home Price: ${formatCurrency(formData.homePrice)}
    - Down Payment Percent: ${formData.downPaymentPercent}
    - Down Payment Amount: ${formatCurrency(downPaymentAmount)}
    - Estimated Loan Amount: ${formatCurrency(savingsData.loanAmount)}

    Savings Breakdown:
    - Hero Credit: ${formatCurrency(savingsData.heroCredit)}
    - Guaranteed Partner Savings: ${formattedGuaranteedSavings}
    - Potential Bonus Savings: ${formattedMinBonusSavings}–${formattedMaxBonusSavings}
    - Total Estimated Savings Range: ${formatCurrency(savingsData.minSavings)}–${formatCurrency(savingsData.maxSavings)}

    Required Link:
    - Calendly Link: ${calendlyLink}

    Instructions:
    1.  **Email Subject:** The subject must be exactly "Your Hero Savings Report".
    2.  **Email Body:**
        - Start with "Hi ${firstName},".
        - Follow this structure precisely, using newline characters for spacing:
          "Here’s your personalized Hero Savings Report.

          Home Price: [Home Price]
          Down Payment: [Down Payment Percent]% ([Down Payment Amount])
          Estimated Loan Amount: [Estimated Loan Amount]
          
          Your Savings
          • Hero Credit (loan-based tier): [Hero Credit]
          • Guaranteed Partner Savings: ${formattedGuaranteedSavings}
          • Potential Bonus Savings: ${formattedMinBonusSavings}–${formattedMaxBonusSavings}
          
          Total Estimated Savings: [Total Estimated Savings Range]
          
          Book your free call to confirm numbers and next steps:
          ${calendlyLink}
          
          —
          Downtown Financial Group | NMLS #1830011 & #2072896
          Powered by Go Rascal
          
          ${longDisclaimer}"
    3.  **SMS Body:**
        - Must be concise and follow this exact format, using newline characters for spacing:
          "Hi ${firstName}, your Hero Savings Report is ready.

          Home Price: [Home Price] | Down: [Down Payment Percent]% ([Down Payment Amount]) | Loan: [Estimated Loan Amount]
          Hero Credit: [Hero Credit] | Partner: ${formattedGuaranteedSavings} | Bonus: ${formattedMinBonusSavings}–${formattedMaxBonusSavings}
          Total Est. Savings: [Total Estimated Savings Range]
          
          Book your free call: ${calendlyLink}
          
          ${smsDisclaimer}"

    Use the provided user data to fill in the bracketed values. Do not add any extra text or deviate from the templates.
    Generate the response in the specified JSON format.
  `;
  
	  try {
	    const response = await ai.models.generateContent({
	      model: "gemini-2.5-flash",
	      contents: prompt,
	      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            email: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                body: { type: Type.STRING },
              },
              required: ["subject", "body"],
            },
            sms: {
              type: Type.OBJECT,
              properties: {
                body: { type: Type.STRING },
              },
              required: ["body"],
            },
          },
          required: ["email", "sms"],
        },
      },
    });

	    const jsonString = response.text?.trim();
	    if (!jsonString) {
	      console.error("Model response missing text payload. Using fallback content instead.");
	      return buildStandardContent(formData, savingsData);
	    }
	    const parsedJson = JSON.parse(jsonString);
	    const templateContent = buildStandardContent(formData, savingsData);
	    if (!isValidGeneratedContent(parsedJson) || !isContentConsistent(parsedJson, templateContent)) {
	      console.warn("Model content deviated from expected format. Falling back to standard template.");
	      return templateContent;
	    }
	    return templateContent;
	  } catch (error) {
	    console.error("Error generating notification content:", error);
	    return buildStandardContent(formData, savingsData);
	  }
	};
