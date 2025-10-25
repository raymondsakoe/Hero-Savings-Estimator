import type { FormData, SavingsData, GeneratedContent } from '../types';
import { sanitizeFormData, normalizePhoneToE164 } from '../utils/sanitize';

// In a real app, these would be secure environment variables.
const HIGHLEVEL_API_KEY = import.meta.env.VITE_HIGHLEVEL_API_KEY;
const HIGHLEVEL_LOCATION_ID = import.meta.env.VITE_HIGHLEVEL_LOCATION_ID;
const HIGHLEVEL_SMS_FROM_NUMBER = import.meta.env.VITE_HIGHLEVEL_SMS_FROM_NUMBER;
const HIGHLEVEL_EMAIL_FROM = import.meta.env.VITE_HIGHLEVEL_EMAIL_FROM;

interface GoHighLevelContact {
  id: string;
  phone?: string;
}

const findContactByEmail = async (email: string): Promise<GoHighLevelContact | null> => {
  if (!HIGHLEVEL_API_KEY || !HIGHLEVEL_LOCATION_ID || !email) {
    return null;
  }

  const params = new URLSearchParams({
    locationId: HIGHLEVEL_LOCATION_ID,
    query: email,
  });

  try {
    const response = await fetch(`https://services.leadconnectorhq.com/contacts/?${params.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Version: '2021-07-28',
        Authorization: `Bearer ${HIGHLEVEL_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.warn(`GoHighLevel contact lookup failed ${response.status}: ${errorBody}`);
      return null;
    }

    const data = await response.json().catch(() => null);
    if (!data || typeof data !== 'object') {
      return null;
    }

    const contacts: unknown[] = Array.isArray((data as Record<string, unknown>).contacts)
      ? ((data as Record<string, unknown>).contacts as unknown[])
      : Array.isArray(data)
        ? (data as unknown[])
        : [];

    for (const candidate of contacts) {
      if (!candidate || typeof candidate !== 'object') {
        continue;
      }
      const record =
        (candidate as Record<string, unknown>).contact && typeof (candidate as Record<string, unknown>).contact === 'object'
          ? ((candidate as Record<string, unknown>).contact as Record<string, unknown>)
          : (candidate as Record<string, unknown>);
      const rawId = record.id;
      const rawEmail = record.email;
      if (!rawId || !rawEmail) {
        continue;
      }
      if (String(rawEmail).toLowerCase() === email.toLowerCase()) {
        const phone = record.phone;
        return {
          id: String(rawId),
          phone: phone ? String(phone) : undefined,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error looking up GoHighLevel contact:', error);
    return null;
  }
};

const buildContactPayload = (sanitized: FormData) => {
  const nameParts = sanitized.name.trim().split(/\s+/);
  const firstName = nameParts[0] || 'Lead';
  const lastName = nameParts.slice(1).join(' ');

  return {
    locationId: HIGHLEVEL_LOCATION_ID,
    firstName,
    lastName,
    name: sanitized.name || firstName,
    email: sanitized.email,
    phone: sanitized.phone || undefined,
    source: 'Hero Savings Estimator',
    tags: ['KFCH-Estimator'],
  };
};

const createContact = async (payload: Record<string, unknown>): Promise<GoHighLevelContact | null> => {
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
    console.error('Error creating GoHighLevel contact:', error);
    throw error;
  }
};

const addTagToContact = async (contactId: string, tags: string[]): Promise<void> => {
  if (!tags.length) {
    return;
  }

  try {
    const response = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/tags/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Version: '2021-07-28',
        Authorization: `Bearer ${HIGHLEVEL_API_KEY}`,
      },
      body: JSON.stringify({ tags }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.warn(`GoHighLevel tag update failed ${response.status}: ${errorBody}`);
    }
  } catch (error) {
    console.error('Error adding tag to GoHighLevel contact:', error);
  }
};

const addAdditionalEmail = async (contactId: string, email: string): Promise<void> => {
  if (!email) {
    return;
  }

  const payload = {
    additionalEmails: [{ email }],
  };

  try {
    const response = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      method: 'PUT',
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
      console.warn(`GoHighLevel additional email update failed ${response.status}: ${errorBody}`);
    }
  } catch (error) {
    console.error('Error adding additional email to GoHighLevel contact:', error);
  }
};

const extractDuplicateContactId = (error: unknown): string | null => {
  if (!(error instanceof Error)) {
    return null;
  }

  const match = error.message.match(/\{.*\}/s);
  const candidate = match ? match[0] : '';
  if (!candidate) {
    return null;
  }

  try {
    const parsed = JSON.parse(candidate);
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.meta &&
      typeof parsed.meta === 'object' &&
      parsed.meta.matchingField === 'phone' &&
      parsed.meta.contactId
    ) {
      return String(parsed.meta.contactId);
    }
  } catch {
    // ignore parse errors
  }

  return null;
};

const ensureGoHighLevelContact = async (formData: FormData): Promise<GoHighLevelContact | null> => {
  if (!HIGHLEVEL_API_KEY || !HIGHLEVEL_LOCATION_ID) {
    console.warn('GoHighLevel credentials not configured; skipping GoHighLevel sync.');
    return null;
  }

  const sanitized = sanitizeFormData(formData);
  const payload = buildContactPayload(sanitized);
  const desiredTags = Array.isArray(payload.tags) ? (payload.tags as string[]) : [];

  const existing = await findContactByEmail(sanitized.email);
  if (existing) {
    await addTagToContact(existing.id, desiredTags);
    await addAdditionalEmail(existing.id, sanitized.email);
    return {
      id: existing.id,
      phone: existing.phone || sanitized.phone || undefined,
    };
  }

  try {
    const created = await createContact(payload);
    if (created) {
      await addAdditionalEmail(created.id, sanitized.email);
      return created;
    }
  } catch (error) {
    const duplicateId = extractDuplicateContactId(error);
    if (duplicateId) {
      await addTagToContact(duplicateId, desiredTags);
      await addAdditionalEmail(duplicateId, sanitized.email);
      return {
        id: duplicateId,
        phone: sanitized.phone || undefined,
      };
    }
    console.error('Error creating contact, attempting lookup fallback:', error);
  }

  const fallback = await findContactByEmail(sanitized.email);
  if (fallback) {
    await addTagToContact(fallback.id, desiredTags);
    await addAdditionalEmail(fallback.id, sanitized.email);
    return {
      id: fallback.id,
      phone: fallback.phone || sanitized.phone || undefined,
    };
  }

  console.warn('Unable to locate or create GoHighLevel contact for email:', sanitized.email);
  return null;
};

const toHtml = (text: string) => {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  return text
    .split('\n')
    .map((line) => {
      const escaped = escapeHtml(line);
      return escaped.trim().length === 0 ? '<br />' : `<p>${escaped}</p>`;
    })
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
  const contactE164 = normalizePhoneToE164(contactPhone || '');
  const inputE164 = normalizePhoneToE164(formData.phone);

  const messagePromises: Promise<void>[] = [];

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
      const fromNumber = normalizePhoneToE164(HIGHLEVEL_SMS_FROM_NUMBER);

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
  const sanitizedFormData = sanitizeFormData(formData);
  const contact = await ensureGoHighLevelContact(sanitizedFormData);
  if (contact) {
    await sendMessagesForContact(contact, sanitizedFormData, generatedContent);
  }
};
