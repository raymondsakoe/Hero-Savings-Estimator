import type { FormData, SavingsData } from '../types';

// In a real app, this would be a secure environment variable.
const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL || 'https://webhook.site/d2b5a19e-e380-4c3e-9c6d-530e1363e77f';

/**
 * Sends lead data to a webhook endpoint.
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
      tcpa_consent_text: "By submitting, you agree that Downtown Financial Group may contact you by call, text, and email at the number and address provided, including with automated technology and prerecorded messages, about your inquiry and related services. Consent is not required to obtain services. Message and data rates may apply. You also agree to our Privacy Policy and Terms.",
      tcpa_consent_time: new Date().toISOString(),
      source: "Hero App",
      campaign: "KFEH-Estimator",
      medium: "Paid/Organic"
    };

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
        // We re-throw so that an external error reporting service could catch this.
        throw error;
    }
};
