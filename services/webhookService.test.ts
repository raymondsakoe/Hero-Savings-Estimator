import { beforeEach, describe, expect, it, vi } from 'vitest';

const createJsonResponse = (status: number, body: Record<string, unknown> | null = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  async json() {
    if (body === null) {
      throw new Error('No JSON');
    }
    return body;
  },
  async text() {
    return body ? JSON.stringify(body) : '';
  },
});

const setupEnv = () => {
  vi.stubEnv('VITE_HIGHLEVEL_API_KEY', 'test-api-key');
  vi.stubEnv('VITE_HIGHLEVEL_LOCATION_ID', 'test-location');
  vi.stubEnv('VITE_HIGHLEVEL_SMS_FROM_NUMBER', '+12223334444');
  vi.stubEnv('VITE_HIGHLEVEL_EMAIL_FROM', 'sender@example.com');
};

const baseFormData = {
  heroRole: 'Police Officer' as const,
  homePrice: 300000,
  downPaymentPercent: 5,
  name: '  Casey  ',
  email: 'Casey@example.com',
  phone: '(555) 123-4567',
  wantsText: true,
  tcpaConsent: true,
};

describe('ensureGoHighLevelContact', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    setupEnv();
  });

  it('reuses an existing contact when lookup succeeds', async () => {
    const fetchQueue = [
      // email search finds contact
      () =>
        createJsonResponse(200, {
          contacts: [
            {
              contact: {
                id: 'contact-123',
                email: 'casey@example.com',
                phone: '+15551234567',
                additionalEmails: [],
              },
            },
          ],
        }),
      // add tag
      () => createJsonResponse(200, {}),
      // fetch contact by id for primary email check
      () =>
        createJsonResponse(200, {
          contact: {
            id: 'contact-123',
            email: 'casey@example.com',
            phone: '+15551234567',
          },
        }),
    ];

    const fetchMock = vi.fn().mockImplementation(() => {
      const next = fetchQueue.shift();
      if (!next) {
        throw new Error('Unexpected fetch call');
      }
      return Promise.resolve(next());
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const module = await import('./webhookService');
    const ensure = module.testHelpers.ensureGoHighLevelContact;

    const result = await ensure({ ...baseFormData });

    expect(result).toMatchObject({
      id: 'contact-123',
      phone: '+15551234567',
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toContain('/contacts/?');
    expect(fetchMock.mock.calls[1][0]).toContain('/contacts/contact-123/tags/');
    expect(fetchMock.mock.calls[2][0]).toContain('/contacts/contact-123');
  });

  it('prefers phone match when available even if email differs', async () => {
    const fetchQueue = [
      // phone lookup finds contact with different primary email
      () =>
        createJsonResponse(200, {
          contacts: [
            {
              contact: {
                id: 'contact-789',
                email: 'owner@example.com',
                phone: '+15551234567',
                additionalEmails: [],
              },
            },
          ],
        }),
      // add tag
      () => createJsonResponse(200, {}),
      // fetch contact details
      () =>
        createJsonResponse(200, {
          contact: {
            id: 'contact-789',
            email: 'owner@example.com',
            phone: '+15551234567',
            additionalEmails: [],
          },
        }),
      // add additional email
      () => createJsonResponse(200, {}),
    ];

    const fetchMock = vi.fn().mockImplementation(() => {
      const next = fetchQueue.shift();
      if (!next) {
        throw new Error('Unexpected fetch call');
      }
      return Promise.resolve(next());
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const module = await import('./webhookService');
    const ensure = module.testHelpers.ensureGoHighLevelContact;

    const result = await ensure({ ...baseFormData });

    expect(result).toMatchObject({
      id: 'contact-789',
      phone: '+15551234567',
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0][0]).toContain('/contacts/?');
    expect(fetchMock.mock.calls[1][0]).toContain('/contacts/contact-789/tags/');
    expect(fetchMock.mock.calls[2][0]).toContain('/contacts/contact-789');
    expect(fetchMock.mock.calls[3][0]).toContain('/contacts/contact-789');
    expect((fetchMock.mock.calls[3][1] as RequestInit).method).toBe('PUT');
    const putCalls = fetchMock.mock.calls.filter(
      ([, options]) => (options as RequestInit | undefined)?.method === 'PUT'
    );
    expect(putCalls).toHaveLength(1);
    const body = JSON.parse((putCalls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ additionalEmails: [{ email: 'casey@example.com' }] });
    expect(fetchQueue.length).toBe(0);
  });

  it('handles duplicate creation errors by reusing the existing contact', async () => {
    const duplicateErrorBody = {
      statusCode: 400,
      message: 'This location does not allow duplicated contacts.',
      meta: { contactId: 'dup-contact', matchingField: 'phone' },
      traceId: 'abc',
    };

    const fetchQueue = [
      // phone lookup (digits) -> no match
      () =>
        createJsonResponse(200, {
          contacts: [],
        }),
      // phone lookup (E164) -> no match
      () =>
        createJsonResponse(200, {
          contacts: [],
        }),
      // email lookup -> no records
      () =>
        createJsonResponse(200, {
          contacts: [],
        }),
      // create contact -> 400 duplicate
      () => ({
        ok: false,
        status: 400,
        async json() {
          return duplicateErrorBody;
        },
        async text() {
          return JSON.stringify(duplicateErrorBody);
        },
      }),
      // tag existing duplicate
      () => createJsonResponse(200, {}),
      // fetch by id -> missing primary email triggers update
      () =>
        createJsonResponse(200, {
          contact: {
            id: 'dup-contact',
            email: 'owner@example.com',
            phone: '+15557990000',
            additionalEmails: [],
          },
        }),
      // add additional email
      () => createJsonResponse(200, {}),
    ];

    const fetchMock = vi.fn().mockImplementation(() => {
      const next = fetchQueue.shift();
      if (!next) {
        throw new Error('Unexpected fetch call');
      }
      return Promise.resolve(next());
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const module = await import('./webhookService');
    const ensure = module.testHelpers.ensureGoHighLevelContact;

    const result = await ensure({ ...baseFormData });

    expect(result).toMatchObject({
      id: 'dup-contact',
      phone: '+15551234567',
    });

    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(fetchMock.mock.calls[3][1]).toMatchObject({ method: 'POST' });
    expect(fetchMock.mock.calls[4][0]).toContain('/tags/');
    const putCalls = fetchMock.mock.calls.filter(
      ([, options]) => (options as RequestInit | undefined)?.method === 'PUT'
    );
    expect(putCalls).toHaveLength(1);
    const body = JSON.parse((putCalls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ additionalEmails: [{ email: 'casey@example.com' }] });
    expect(fetchQueue.length).toBe(0);
  });
});

describe('sendMessagesForContact', () => {
  const generatedContent = {
    email: {
      subject: 'Hello',
      body: 'Body',
    },
    sms: {
      body: 'SMS body',
    },
  };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    setupEnv();
  });

  it('skips email when contact email missing', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const module = await import('./webhookService');
    const { sendMessagesForContact } = module.testHelpers;

    await sendMessagesForContact(
      { id: 'contact-1', phone: '+15551234567' },
      {
        ...baseFormData,
        email: '',
        wantsText: false,
        phone: '+15551234567',
      },
      generatedContent
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ensures primary email before sending email message', async () => {
    const putResponse = {
      ok: true,
      status: 200,
      async json() {
        return {};
      },
      async text() {
        return '';
      },
    };

    const postResponse = {
      ok: true,
      status: 200,
      async json() {
        return {};
      },
      async text() {
        return '';
      },
    };

    const fetchMock = vi.fn().mockImplementation((url, options) => {
      if ((options as RequestInit | undefined)?.method === 'PUT') {
        return Promise.resolve(putResponse);
      }
      return Promise.resolve(postResponse);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const module = await import('./webhookService');
    const { sendMessagesForContact } = module.testHelpers;

    await sendMessagesForContact(
      { id: 'contact-1', phone: '+15551234567' },
      {
        ...baseFormData,
        email: 'casey@example.com',
        wantsText: false,
        phone: '+15551234567',
      },
      generatedContent
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('PUT');
    expect((fetchMock.mock.calls[1][1] as RequestInit).method).toBe('POST');
  });

  it('uses submitted phone for SMS when different from stored phone', async () => {
    const response = {
      ok: true,
      status: 200,
      async json() {
        return {};
      },
      async text() {
        return '';
      },
    };

    const fetchMock = vi.fn().mockImplementation((url, options) => {
      return Promise.resolve(response);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const module = await import('./webhookService');
    const { sendMessagesForContact } = module.testHelpers;

    await sendMessagesForContact(
      { id: 'contact-2', phone: '+14445556666' },
      {
        ...baseFormData,
        email: 'casey@example.com',
        wantsText: true,
        phone: '+15551234567',
      },
      generatedContent
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const smsCall = fetchMock.mock.calls[2];
    const [url, options] = smsCall;
    expect(String(url)).toContain('/conversations/messages');
    const payload = JSON.parse((options as RequestInit).body as string);
    expect(payload.type).toBe('SMS');
    expect(payload.toNumber).toBe('+15551234567');
  });
});
