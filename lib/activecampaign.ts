/**
 * ActiveCampaign API v3 utility.
 * Used by both the subscribe endpoint and the Payload newsletter send hook.
 */

const API_URL = process.env.ACTIVECAMPAIGN_API_URL;
const API_KEY = process.env.ACTIVECAMPAIGN_API_KEY;
const LIST_ID = process.env.ACTIVECAMPAIGN_LIST_ID || '1';

function headers() {
  return {
    'Api-Token': API_KEY!,
    'Content-Type': 'application/json',
  };
}

/** Create or update a contact and return its ID. */
export async function syncContact(email: string): Promise<string> {
  if (!API_URL || !API_KEY) throw new Error('ActiveCampaign not configured');

  const res = await fetch(`${API_URL}/api/3/contact/sync`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ contact: { email } }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AC contact sync failed: ${text}`);
  }

  const { contact } = await res.json();
  return contact.id as string;
}

/** Add a contact (by ID) to the configured list. */
export async function addToList(contactId: string, listId = LIST_ID): Promise<void> {
  if (!API_URL || !API_KEY) throw new Error('ActiveCampaign not configured');

  const res = await fetch(`${API_URL}/api/3/contactLists`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      contactList: { list: listId, contact: contactId, status: 1 },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AC list add failed: ${text}`);
  }
}

/** Add tags to a contact by tag name (looks up tag ID first). */
export async function addTagsToContact(contactId: string, tagNames: string[]): Promise<void> {
  if (!API_URL || !API_KEY) throw new Error('ActiveCampaign not configured');

  for (const tagName of tagNames) {
    const tagRes = await fetch(
      `${API_URL}/api/3/tags?search=${encodeURIComponent(tagName)}`,
      { headers: { 'Api-Token': API_KEY } },
    );
    if (!tagRes.ok) continue;

    const { tags: matchedTags } = await tagRes.json();
    const match = matchedTags?.find(
      (t: { tag: string }) => t.tag.toLowerCase() === tagName.toLowerCase(),
    );
    if (!match) continue;

    await fetch(`${API_URL}/api/3/contactTags`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ contactTag: { contact: contactId, tag: match.id } }),
    });
  }
}

export interface CampaignOptions {
  subject: string;
  /** Plain-text preheader / preview text */
  preheaderText?: string;
  /** HTML body of the campaign */
  htmlBody: string;
  /** List ID to send to; defaults to ACTIVECAMPAIGN_LIST_ID */
  listId?: string;
  /** Sender name shown in inbox */
  fromName?: string;
  /** Reply-to address */
  replyTo?: string;
}

/**
 * Create a one-time broadcast campaign and schedule it for immediate send.
 * Returns the campaign ID.
 */
export async function sendCampaign(options: CampaignOptions): Promise<string> {
  if (!API_URL || !API_KEY) throw new Error('ActiveCampaign not configured');

  const {
    subject,
    preheaderText = '',
    htmlBody,
    listId = LIST_ID,
    fromName = 'The Arcades',
    replyTo = 'austen@thearcades.me',
  } = options;

  // 1. Create the campaign
  const createRes = await fetch(`${API_URL}/api/3/campaigns`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      campaign: {
        type: 'single',
        status: 1, // 1 = active/ready to send
        public: 1,
        name: subject,
        subject,
        preheaderText,
        fromname: fromName,
        replyto: replyTo,
        bounceid: -1,
        lists: [{ id: listId }],
        htmlcontent: htmlBody,
        textcontent: htmlBody.replace(/<[^>]+>/g, ''),
      },
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`AC campaign create failed: ${text}`);
  }

  const { campaign } = await createRes.json();
  const campaignId = campaign.id as string;

  // 2. Schedule for immediate send
  const sendRes = await fetch(`${API_URL}/api/3/campaigns/${campaignId}/actions/send`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ send: {} }),
  });

  if (!sendRes.ok) {
    const text = await sendRes.text();
    throw new Error(`AC campaign send failed: ${text}`);
  }

  return campaignId;
}
