import type { FormData, SavingsData } from '../types';

// In a real app, these would be secure environment variables.
const HIGHLEVEL_API_KEY = import.meta.env.VITE_HIGHLEVEL_API_KEY;
const HIGHLEVEL_LOCATION_ID = import.meta.env.VITE_HIGHLEVEL_LOCATION_ID;

const sendToGoHighLevel = async (formData: FormData, _savingsData: SavingsData): Promise<void> => {
  if (!HIGHLEVEL_API_KEY || !HIGHLEVEL_LOCATION_ID) {
    console.warn('GoHighLevel credentials not configured; skipping GoHighLevel sync.');
    return;
  }

  const nameParts = formData.name.trim().split(/\s+/);
  const firstName = nameParts[0] || 'Lead';
  const lastName = nameParts.slice(1).join(' ');

  const payload = {
    locationId: HIGHLEVEL_LOCATION_ID,
    firstName,
    lastName,
    name: formData.name || firstName,
    email: formData.email,
    phone: formData.phone,
    source: 'Hero Savings Estimator',
    tags: ['KFEH-Estimator'],
  };

  try {
    const response = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Version: '2021-07-28',
        Authorization: `Bearer ${HIGHLEVEL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`GoHighLevel responded with ${response.status}: ${errorBody}`);
    }
  } catch (error) {
    console.error('Error sending data to GoHighLevel:', error);
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
  await sendToGoHighLevel(formData, savingsData);
};
