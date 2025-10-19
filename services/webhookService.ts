import type { FormData, SavingsData, GeneratedContent } from '../types';

// In a real app, these would be secure environment variables.
const HIGHLEVEL_API_KEY = import.meta.env.VITE_HIGHLEVEL_API_KEY;
const HIGHLEVEL_LOCATION_ID = import.meta.env.VITE_HIGHLEVEL_LOCATION_ID;
const HIGHLEVEL_SMS_FROM_NUMBER = import.meta.env.VITE_HIGHLEVEL_SMS_FROM_NUMBER;
const HIGHLEVEL_EMAIL_FROM = import.meta.env.VITE_HIGHLEVEL_EMAIL_FROM;

interface GoHighLevelContact {
  id: string;
  phone?: string;
}

const sendToGoHighLevel = async (formData: FormData): Promise<GoHighLevelContact | null> => {
  if (!HIGHLEVEL_API_KEY || !HIGHLEVEL_LOCATION_ID) {
    console.warn('GoHighLevel credentials not configured; skipping GoHighLevel sync.');
    return null;
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

    const data = await response.json().catch(() => null);
    if (data && typeof data === 'object') {
      if ('contact' in data && data.contact && typeof data.contact === 'object') {
        const contact = data.contact as Record<string, unknown>;
        const id = contact.id ? String(contact.id) : null;
        const phone = contact.phone ? String(contact.phone) : undefined;
        if (id) {
          return { id, phone };
        }
      }
      if ('id' in data) {
        const id = data.id ? String(data.id) : null;
        if (id) {
          const phone = 'phone' in data && data.phone ? String((data as Record<string, unknown>).phone) : undefined;
          return { id, phone };
        }
      }
    }

    console.warn('GoHighLevel contact created but response lacked id.');
    return null;
  } catch (error) {
    console.error('Error sending data to GoHighLevel:', error);
    throw error;
  }
};

const toHtml = (text: string) => {
  return text
    .split('\n')
    .map((line) => line.trim().length === 0 ? '<br />' : `<p>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('');
};

const sendConversationMessage = async (payload: Record<string, unknown>): Promise<void> => {
  try {
    const response = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
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
      throw new Error(`GoHighLevel message error ${response.status}: ${errorBody}`);
    }
  } catch (error) {
    console.error('Error sending GoHighLevel message:', error);
    throw error;
  }
};

const sendMessagesForContact = async (
  contact: GoHighLevelContact,
  formData: FormData,
  generatedContent: GeneratedContent
): Promise<void> => {
  if (!HIGHLEVEL_API_KEY) {
    return;
  }

  const contactId = contact.id;
  const contactPhone = contact.phone ? contact.phone : formData.phone;
  const formatE164 = (value: string) => {
    const digits = value.replace(/\D+/g, '');
    if (!digits) return '';
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    return `+${digits}`;
  };

  const messagePromises: Promise<void>[] = [];
  const contactE164 = formatE164(contactPhone || '');
  const inputE164 = formatE164(formData.phone);

  if (HIGHLEVEL_EMAIL_FROM) {
    const emailPayload = {
      type: 'Email',
      contactId,
      subject: generatedContent.email.subject,
      message: generatedContent.email.body,
      html: toHtml(generatedContent.email.body),
      emailFrom: HIGHLEVEL_EMAIL_FROM,
      emailTo: formData.email,
      status: 'pending',
    };
    messagePromises.push(sendConversationMessage(emailPayload));
  }

  if (formData.wantsText && HIGHLEVEL_SMS_FROM_NUMBER) {
    if (!contactE164) {
      console.warn('Contact phone missing; skipping SMS send.');
    } else if (!inputE164) {
      console.warn('Submitted phone number invalid; skipping SMS send.');
    } else if (contactE164 !== inputE164) {
      console.warn('Contact phone does not match submitted phone number; skipping SMS send.');
    } else {
      const fromNumber = formatE164(HIGHLEVEL_SMS_FROM_NUMBER);

      const smsPayload = {
        type: 'SMS',
        contactId,
        message: generatedContent.sms.body,
        fromNumber,
        toNumber: contactE164,
        status: 'pending',
      };
      messagePromises.push(sendConversationMessage(smsPayload));
    }
  }

  if (messagePromises.length === 0) {
    console.warn('No GoHighLevel messaging configuration present; skipping message send.');
    return;
  }

  await Promise.allSettled(messagePromises);
};

/**
 * Sends lead data to configured downstream services.
 * This is a "fire and forget" operation from the user's perspective.
 */
export const sendLeadData = async (
  formData: FormData,
  _savingsData: SavingsData,
  generatedContent: GeneratedContent
): Promise<void> => {
  const contact = await sendToGoHighLevel(formData);
  if (contact) {
    await sendMessagesForContact(contact, formData, generatedContent);
  }
};
