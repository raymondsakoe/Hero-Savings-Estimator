import type { FormData, SavingsData } from '../types';

// In a real app, these would be secure environment variables.
const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL || 'https://webhook.site/d2b5a19e-e380-4c3e-9c6d-530e1363e77f';
const HIGHLEVEL_API_KEY = import.meta.env.VITE_HIGHLEVEL_API_KEY;
const HIGHLEVEL_LOCATION_ID = import.meta.env.VITE_HIGHLEVEL_LOCATION_ID;

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const sendToGoHighLevel = async (formData: FormData, savingsData: SavingsData): Promise<void> => {
  if (!HIGHLEVEL_API_KEY || !HIGHLEVEL_LOCATION_ID) {
    console.warn('GoHighLevel credentials not configured; skipping GoHighLevel sync.');
    return;
  }

  const nameParts = formData.name.trim().split(/\s+/);
  const firstName = nameParts[0] || 'Lead';
  const lastName = nameParts.slice(1).join(' ');

  const notes = [
    `Hero Role: ${formData.heroRole ?? 'Not specified'}`,
    `Home Price: ${formatCurrency(formData.homePrice)}`,
    `Down Payment: ${formData.downPaymentPercent}%`,
    `Loan Amount: ${formatCurrency(savingsData.loanAmount)}`,
    `Savings Range: ${formatCurrency(savingsData.minSavings)} - ${formatCurrency(savingsData.maxSavings)}`,
    `Opted Into SMS: ${formData.wantsText ? 'Yes' : 'No'}`,
  ].join('\n');

  const payload = {
    locationId: HIGHLEVEL_LOCATION_ID,
    firstName,
    lastName,
    name: formData.name || firstName,
    email: formData.email,
    phone: formData.phone,
    source: 'Hero Savings Estimator',
    tags: ['KFEH-Estimator'],
    notes,
  };

  try {
    const response = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${HIGHLEVEL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`GoHighLevel responded with ${response.status}: ${errorBody}`);
    }

    console.log('GoHighLevel contact created.');
  } catch (error) {
    console.error('Error sending data to GoHighLevel:', error);
    throw error;
  }
};

const postWebhook = async (payload: Record<string, unknown>): Promise<void> => {
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors', // Use no-cors to prevent CORS issues with webhook receivers
    });

    console.log('Webhook POST request sent.');
  } catch (error) {
    console.error('Error sending webhook:', error);
    throw error;
  }
};

/**
 * Sends lead data to configured downstream services.
 * This is a "fire and forget" operation from the user's perspective.
 */
export const sendLeadData = async (
  formData: FormData,
  savingsData: SavingsData
): Promise<void> => {
  const firstName = formData.name.split(' ')[0] || formData.name;

  const payload = {
    first_name: firstName,
    email: formData.email,
    phone: formData.phone,
    hero_role: formData.heroRole,
    home_price: formData.homePrice,
    down_payment_percent: formData.downPaymentPercent,
    loan_amount_calc: savingsData.loanAmount,
    savings_hero_credit: savingsData.heroCredit,
    savings_guaranteed: 850,
    savings_bonus_min: 250,
    savings_bonus_max: 550,
    savings_total_min: savingsData.minSavings,
    savings_total_max: savingsData.maxSavings,
    opt_in_sms: formData.wantsText,
    tcpa_consent_text:
      'By submitting, you agree that Downtown Financial Group may contact you by call, text, and email at the number and address provided, including with automated technology and prerecorded messages, about your inquiry and related services. Consent is not required to obtain services. Message and data rates may apply. You also agree to our Privacy Policy and Terms.',
    tcpa_consent_time: new Date().toISOString(),
    source: 'Hero App',
    campaign: 'KFEH-Estimator',
    medium: 'Paid/Organic',
  };

  const results = await Promise.allSettled([
    postWebhook(payload),
    sendToGoHighLevel(formData, savingsData),
  ]);

  const errors = results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  );

  if (errors.length > 0) {
    throw errors[0].reason;
  }
};
