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
  email?: string;
}

interface GoHighLevelContactDetails extends GoHighLevelContact {
  additionalEmails?: string[];
}

const normalizePhoneDigits = (value: string) => value.replace(/\D+/g, '');

const findContactByEmail = async (email: string): Promise<GoHighLevelContactDetails | null> => {
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
      const additionalEmailsRaw = Array.isArray(record.additionalEmails) ? (record.additionalEmails as unknown[]) : [];
      if (!rawId) {
        continue;
      }
      const normalizedTarget = email.trim().toLowerCase();
      const primaryMatch = typeof rawEmail === 'string' && rawEmail.trim().toLowerCase() === normalizedTarget;
      const additionalMatch = additionalEmailsRaw
        .map((entry) => {
          if (typeof entry === 'string') {
            return entry.trim().toLowerCase();
          }
          if (!entry || typeof entry !== 'object') {
            return null;
          }
          const entryEmail = (entry as Record<string, unknown>).email;
          if (typeof entryEmail === 'string') {
            return entryEmail.trim().toLowerCase();
          }
          return null;
        })
        .filter((value): value is string => Boolean(value))
        .includes(normalizedTarget);

      if (!primaryMatch && !additionalMatch) {
        continue;
      }

      const phone = record.phone;
      const additionalEmails =
        additionalEmailsRaw
          .map((entry) => {
            if (typeof entry === 'string') {
              return entry.trim();
            }
            if (!entry || typeof entry !== 'object') {
              return null;
            }
            const entryEmail = (entry as Record<string, unknown>).email;
            return typeof entryEmail === 'string' ? entryEmail.trim() : null;
          })
          .filter((value): value is string => Boolean(value)) || [];

      return {
        id: String(rawId),
        phone: phone ? String(phone) : undefined,
        email: typeof rawEmail === 'string' ? rawEmail.trim() : undefined,
        additionalEmails,
      };
    }

    return null;
  } catch (error) {
    console.error('Error looking up GoHighLevel contact:', error);
    return null;
  }
};

const findContactByPhone = async (phone: string): Promise<GoHighLevelContactDetails | null> => {
  if (!HIGHLEVEL_API_KEY || !HIGHLEVEL_LOCATION_ID || !phone) {
    return null;
  }

  const normalizedTarget = normalizePhoneToE164(phone);
  if (!normalizedTarget) {
    return null;
  }

  const queries = Array.from(new Set([normalizePhoneDigits(normalizedTarget), normalizedTarget])).filter((value) => value);

  for (const query of queries) {
    const params = new URLSearchParams({
      locationId: HIGHLEVEL_LOCATION_ID,
      query,
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
        console.warn(`GoHighLevel contact phone lookup failed ${response.status}: ${errorBody}`);
        continue;
      }

      const data = await response.json().catch(() => null);
      if (!data || typeof data !== 'object') {
        continue;
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
        const rawPhone = record.phone;
        if (!rawId || !rawPhone) {
          continue;
        }
        const normalizedPhone = normalizePhoneToE164(String(rawPhone));
        if (!normalizedPhone || normalizedPhone !== normalizedTarget) {
          continue;
        }

        const rawEmail = record.email;
        const additionalEmailsRaw = Array.isArray(record.additionalEmails) ? (record.additionalEmails as unknown[]) : [];
        const additionalEmails =
          additionalEmailsRaw
            .map((entry) => {
              if (typeof entry === 'string') {
                return entry.trim();
              }
              if (!entry || typeof entry !== 'object') {
                return null;
              }
              const entryEmail = (entry as Record<string, unknown>).email;
              return typeof entryEmail === 'string' ? entryEmail.trim() : null;
            })
            .filter((value): value is string => Boolean(value)) || [];

        return {
          id: String(rawId),
          phone: normalizedPhone,
          email: typeof rawEmail === 'string' ? rawEmail.trim() : undefined,
          additionalEmails,
        };
      }
    } catch (error) {
      console.error('Error looking up GoHighLevel contact by phone:', error);
    }
  }

  return null;
};

const buildContactPayload = (sanitized: FormData) => {
  const normalizedName = sanitized.name.trim().length ? sanitized.name.trim() : 'Lead Hero';
  const nameParts = normalizedName.split(/\s+/);
  const firstName = nameParts.shift() || 'Lead';
  const lastName = nameParts.length ? nameParts.join(' ') : 'Hero';
  const composedName = `${firstName} ${lastName}`.trim();

  return {
    locationId: HIGHLEVEL_LOCATION_ID,
    firstName,
    lastName,
    name: composedName,
    email: sanitized.email,
    phone: sanitized.phone || undefined,
    source: 'Hero Savings Estimator',
    tags: ['KFCH-Estimator'],
  };
};

const fetchContactById = async (contactId: string): Promise<GoHighLevelContactDetails | null> => {
  if (!contactId) {
    return null;
  }

  try {
    const response = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Version: '2021-07-28',
        Authorization: `Bearer ${HIGHLEVEL_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.warn(`GoHighLevel contact fetch failed ${response.status}: ${errorBody}`);
      return null;
    }

    const data = await response.json().catch(() => null);
    if (!data || typeof data !== 'object') {
      return null;
    }

    const record =
      'contact' in data && data.contact && typeof data.contact === 'object'
        ? (data.contact as Record<string, unknown>)
        : (data as Record<string, unknown>);

    const id = record.id ? String(record.id) : null;
    if (!id) {
      return null;
    }

    const phone = record.phone ? String(record.phone) : undefined;
    const email = typeof record.email === 'string' ? record.email.trim() : undefined;
    const additionalEmailsRaw = Array.isArray(record.additionalEmails) ? (record.additionalEmails as unknown[]) : [];
    const additionalEmails = additionalEmailsRaw
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry.trim();
        }
        if (!entry || typeof entry !== 'object') {
          return null;
        }
        const entryEmail = (entry as Record<string, unknown>).email;
        return typeof entryEmail === 'string' ? entryEmail.trim() : null;
      })
      .filter((value): value is string => Boolean(value));

    return {
      id,
      phone,
      email,
      additionalEmails,
    };
  } catch (error) {
    console.error('Error fetching GoHighLevel contact by id:', error);
    return null;
  }
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
        const email = contact.email ? String(contact.email) : undefined;
        if (id) {
          return { id, phone, email };
        }
      }
      if ('id' in data) {
        const id = data.id ? String(data.id) : null;
        if (id) {
          const phone = 'phone' in data && data.phone ? String((data as Record<string, unknown>).phone) : undefined;
          const email = 'email' in data && data.email ? String((data as Record<string, unknown>).email) : undefined;
          return { id, phone, email };
        }
      }
    }

    console.warn('GoHighLevel contact created but response lacked id.');
    return null;
  } catch (error) {
    if (extractDuplicateContactId(error)) {
      console.warn('Duplicate GoHighLevel contact detected during creation attempt.');
    } else {
      console.error('Error creating GoHighLevel contact:', error);
    }
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

const ensureContactDetails = async (
  contactId: string,
  sanitized: FormData
): Promise<GoHighLevelContactDetails | null> => {
  const details = await fetchContactById(contactId);
  if (!details) {
    return null;
  }

  const updates: Record<string, string> = {};

  if (sanitized.email && (!details.email || !details.email.trim())) {
    updates.email = sanitized.email;
  }

  if (Object.keys(updates).length === 0) {
    return details;
  }

  try {
    const response = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Version: '2021-07-28',
        Authorization: `Bearer ${HIGHLEVEL_API_KEY}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.warn(`GoHighLevel contact details update failed ${response.status}: ${errorBody}`);
      return details;
    }

    return {
      ...details,
      ...updates,
    };
  } catch (error) {
    console.error('Error updating GoHighLevel contact details:', error);
    return details;
  }
};

const addAdditionalEmail = async (
  contactId: string,
  email: string,
  details?: GoHighLevelContactDetails | null
): Promise<void> => {
  if (!email) {
    return;
  }

  const lowerTarget = email.toLowerCase();
  const hasEmailAlready =
    (details?.email && details.email.toLowerCase() === lowerTarget) ||
    (details?.additionalEmails || []).some((entry) => entry.toLowerCase() === lowerTarget);

  if (hasEmailAlready) {
    return;
  }

  if (!details) {
    const existing = await findContactByEmail(email);
    if (existing && existing.id === contactId) {
      return;
    }
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

const ensurePrimaryEmailForMessaging = async (contactId: string, email: string): Promise<boolean> => {
  if (!email) {
    return false;
  }

  try {
    const response = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Version: '2021-07-28',
        Authorization: `Bearer ${HIGHLEVEL_API_KEY}`,
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.warn(`GoHighLevel primary email ensure failed ${response.status}: ${errorBody}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error ensuring GoHighLevel primary email for messaging:', error);
    return false;
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
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const meta = (parsed as Record<string, unknown>).meta;
    if (!meta || typeof meta !== 'object') {
      return null;
    }

    const metaRecord = meta as Record<string, unknown>;
    const contactId = metaRecord.contactId;

    if (typeof contactId === 'string' || typeof contactId === 'number') {
      return String(contactId);
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
  if (!sanitized.email && !sanitized.phone) {
    console.warn('GoHighLevel sync skipped due to missing contact details.');
    return null;
  }
  sanitized.name = sanitized.name.trim().length ? sanitized.name : 'Lead Hero';
  const payload = buildContactPayload(sanitized);
  const desiredTags = Array.isArray(payload.tags) ? (payload.tags as string[]) : [];

  const phoneMatch = sanitized.phone ? await findContactByPhone(sanitized.phone) : null;
  if (phoneMatch) {
    await addTagToContact(phoneMatch.id, desiredTags);
    const updatedDetails = await ensureContactDetails(phoneMatch.id, sanitized);
    await addAdditionalEmail(phoneMatch.id, sanitized.email, updatedDetails);
    return {
      id: phoneMatch.id,
      phone: sanitized.phone || updatedDetails?.phone || phoneMatch.phone || undefined,
      email: updatedDetails?.email || phoneMatch.email || undefined,
    };
  }

  const existing = sanitized.email ? await findContactByEmail(sanitized.email) : null;
  if (existing) {
    await addTagToContact(existing.id, desiredTags);
    const updatedDetails = await ensureContactDetails(existing.id, sanitized);
    await addAdditionalEmail(existing.id, sanitized.email, updatedDetails);
    return {
      id: existing.id,
      phone: sanitized.phone || updatedDetails?.phone || existing.phone || undefined,
      email: updatedDetails?.email || existing.email || undefined,
    };
  }

  try {
    const created = await createContact(payload);
    if (created) {
      await addAdditionalEmail(created.id, sanitized.email);
      return {
        id: created.id,
        phone: sanitized.phone || created.phone || undefined,
        email: created.email || sanitized.email || undefined,
      };
    }
  } catch (error) {
    const duplicateId = extractDuplicateContactId(error);
    if (duplicateId) {
      await addTagToContact(duplicateId, desiredTags);
      const updatedDetails = await ensureContactDetails(duplicateId, sanitized);
      await addAdditionalEmail(duplicateId, sanitized.email, updatedDetails);
      return {
        id: duplicateId,
        phone: sanitized.phone || updatedDetails?.phone || undefined,
        email: updatedDetails?.email || undefined,
      };
    }
    console.error('Error creating contact, attempting lookup fallback:', error);
  }

  const fallback = sanitized.email ? await findContactByEmail(sanitized.email) : null;
  if (fallback) {
    await addTagToContact(fallback.id, desiredTags);
    const updatedDetails = await ensureContactDetails(fallback.id, sanitized);
    await addAdditionalEmail(fallback.id, sanitized.email, updatedDetails);
    return {
      id: fallback.id,
      phone: sanitized.phone || updatedDetails?.phone || fallback.phone || undefined,
      email: updatedDetails?.email || fallback.email || undefined,
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
  const submittedE164 = normalizePhoneToE164(formData.phone);
  const storedE164 = normalizePhoneToE164(contact.phone || '');
  const destinationE164 = submittedE164 || storedE164;

  const messagePromises: Promise<void>[] = [];

  if (HIGHLEVEL_EMAIL_FROM) {
    const targetEmail = (contact.email || formData.email || '').trim();
    if (!targetEmail) {
      console.warn('Contact email missing; skipping email send.');
    } else {
      let canSend = true;
      if (!contact.email || contact.email.trim().toLowerCase() !== targetEmail.toLowerCase()) {
        canSend = await ensurePrimaryEmailForMessaging(contactId, targetEmail);
      }
      if (!canSend) {
        console.warn('Unable to ensure contact email; skipping email send.');
      } else {
        const emailPayload = {
          type: 'Email',
          contactId,
          subject: generatedContent.email.subject,
          message: generatedContent.email.body,
          html: toHtml(generatedContent.email.body),
          emailFrom: HIGHLEVEL_EMAIL_FROM,
          emailTo: targetEmail,
          status: 'pending',
        };
        messagePromises.push(sendConversationMessage(emailPayload));
      }
    }
  }

  if (formData.wantsText && HIGHLEVEL_SMS_FROM_NUMBER) {
    if (!destinationE164) {
      console.warn('No valid phone number available; skipping SMS send.');
    } else if (!submittedE164) {
      console.warn('Submitted phone number invalid; skipping SMS send.');
    } else {
      const fromNumber = normalizePhoneToE164(HIGHLEVEL_SMS_FROM_NUMBER);

      const smsPayload = {
        type: 'SMS',
        contactId,
        message: generatedContent.sms.body,
        fromNumber,
        toNumber: destinationE164,
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

export const testHelpers = {
  ensureGoHighLevelContact,
  sendMessagesForContact,
};
