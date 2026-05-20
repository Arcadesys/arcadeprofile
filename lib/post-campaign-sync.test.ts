import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ActiveCampaignError,
  type CreateScheduledCampaignOptions,
  type CreateScheduledCampaignResult,
} from './activecampaign';
import {
  resolveCampaignListIds,
  syncPostCampaign,
  type PostAcCampaignState,
  type SyncPostCampaignDeps,
  type SyncPostCampaignInput,
} from './post-campaign-sync';

const NOW = new Date('2030-06-01T12:00:00Z');
const FUTURE = new Date('2030-07-01T09:00:00Z');
const LATER = new Date('2030-08-15T09:00:00Z');

const baseInput: SyncPostCampaignInput = {
  slug: 'my-post',
  subject: 'My Post',
  htmlBody: '<p>body</p>',
  textBody: 'body',
  scheduledPublishDate: FUTURE,
  groupCategory: null,
};

function makeDeps(overrides: Partial<SyncPostCampaignDeps> = {}): SyncPostCampaignDeps & {
  createCalls: CreateScheduledCampaignOptions[];
  rescheduleCalls: Array<{ campaignId: string; scheduledSendAt: Date }>;
  statusCalls: string[];
} {
  const createCalls: CreateScheduledCampaignOptions[] = [];
  const rescheduleCalls: Array<{ campaignId: string; scheduledSendAt: Date }> = [];
  const statusCalls: string[] = [];
  return {
    createCalls,
    rescheduleCalls,
    statusCalls,
    now: () => NOW,
    resolveListIds: () => ['7', '10'],
    createScheduledCampaign: async (options): Promise<CreateScheduledCampaignResult> => {
      createCalls.push(options);
      return {
        campaignId: 'camp-1',
        messageId: 'msg-1',
        scheduledFor: options.scheduledSendAt ?? NOW,
        listIds: options.listIds,
      };
    },
    updateCampaignSendDate: async (options) => {
      rescheduleCalls.push(options);
      return { scheduledFor: options.scheduledSendAt };
    },
    getCampaignStatus: async (options) => {
      statusCalls.push(options.campaignId);
      return { status: 1, raw: '1' };
    },
    ...overrides,
  };
}

test('resolveCampaignListIds: fiction → [ALL, FICTION]', () => {
  process.env.AC_LIST_ID_ALL_PERPOST = '7';
  process.env.AC_LIST_ID_FICTION_PERPOST = '9';
  process.env.AC_LIST_ID_ESSAYS_PERPOST = '10';
  try {
    assert.deepEqual(resolveCampaignListIds('fiction'), ['7', '9']);
  } finally {
    delete process.env.AC_LIST_ID_ALL_PERPOST;
    delete process.env.AC_LIST_ID_FICTION_PERPOST;
    delete process.env.AC_LIST_ID_ESSAYS_PERPOST;
  }
});

test('resolveCampaignListIds: non-fiction category → [ALL, ESSAYS]', () => {
  process.env.AC_LIST_ID_ALL_PERPOST = '7';
  process.env.AC_LIST_ID_FICTION_PERPOST = '9';
  process.env.AC_LIST_ID_ESSAYS_PERPOST = '10';
  try {
    assert.deepEqual(resolveCampaignListIds('writing'), ['7', '10']);
    assert.deepEqual(resolveCampaignListIds(null), ['7', '10']);
  } finally {
    delete process.env.AC_LIST_ID_ALL_PERPOST;
    delete process.env.AC_LIST_ID_FICTION_PERPOST;
    delete process.env.AC_LIST_ID_ESSAYS_PERPOST;
  }
});

test('syncPostCampaign: suppressNewsletter short-circuits without calling AC', async () => {
  const deps = makeDeps();
  const outcome = await syncPostCampaign(
    { ...baseInput, suppressNewsletter: true, acCampaign: null },
    deps,
  );
  assert.equal(outcome.kind, 'skipped');
  if (outcome.kind === 'skipped') assert.equal(outcome.reason, 'suppressNewsletter');
  assert.equal(deps.createCalls.length, 0);
  assert.equal(deps.rescheduleCalls.length, 0);
});

test('syncPostCampaign: missing scheduledPublishDate is skipped', async () => {
  const deps = makeDeps();
  const outcome = await syncPostCampaign(
    { ...baseInput, scheduledPublishDate: new Date(NaN) },
    deps,
  );
  assert.equal(outcome.kind, 'skipped');
  if (outcome.kind === 'skipped') assert.equal(outcome.reason, 'no-scheduled-date');
});

test('syncPostCampaign: no prior campaign → creates and persists state', async () => {
  const deps = makeDeps();
  const outcome = await syncPostCampaign(
    { ...baseInput, groupCategory: 'fiction', acCampaign: null },
    deps,
  );
  assert.equal(outcome.kind, 'created');
  if (outcome.kind !== 'created') return;
  assert.equal(outcome.state.campaignId, 'camp-1');
  assert.equal(outcome.state.messageId, 'msg-1');
  assert.equal(outcome.state.status, 'scheduled');
  assert.equal(outcome.state.scheduledFor, FUTURE.toISOString());
  assert.equal(outcome.state.lastSyncedAt, NOW.toISOString());
  assert.equal(outcome.state.targetedLists, '7,10');
  assert.equal(outcome.state.lastError, null);
  assert.equal(deps.createCalls.length, 1);
  assert.deepEqual(deps.createCalls[0].listIds, ['7', '10']);
  assert.equal(deps.createCalls[0].slug, 'my-post');
  assert.equal(deps.rescheduleCalls.length, 0);
  assert.equal(deps.statusCalls.length, 0);
});

test('syncPostCampaign: existing scheduled campaign with same date → no AC call', async () => {
  const deps = makeDeps();
  const acCampaign: PostAcCampaignState = {
    campaignId: 'camp-existing',
    messageId: 'msg-existing',
    scheduledFor: FUTURE.toISOString(),
    status: 'scheduled',
    targetedLists: '7,10',
  };
  const outcome = await syncPostCampaign({ ...baseInput, acCampaign }, deps);
  assert.equal(outcome.kind, 'skipped');
  if (outcome.kind === 'skipped') assert.equal(outcome.reason, 'no-change');
  assert.equal(deps.createCalls.length, 0);
  assert.equal(deps.rescheduleCalls.length, 0);
  assert.equal(deps.statusCalls.length, 0);
});

test('syncPostCampaign: existing scheduled campaign + date moved → updates send date', async () => {
  const deps = makeDeps();
  const acCampaign: PostAcCampaignState = {
    campaignId: 'camp-existing',
    messageId: 'msg-existing',
    scheduledFor: FUTURE.toISOString(),
    status: 'scheduled',
    targetedLists: '7,10',
  };
  const outcome = await syncPostCampaign(
    { ...baseInput, scheduledPublishDate: LATER, acCampaign },
    deps,
  );
  assert.equal(outcome.kind, 'rescheduled');
  if (outcome.kind !== 'rescheduled') return;
  assert.equal(outcome.state.campaignId, 'camp-existing');
  assert.equal(outcome.state.scheduledFor, LATER.toISOString());
  assert.equal(outcome.state.status, 'scheduled');
  assert.equal(outcome.state.lastSyncedAt, NOW.toISOString());
  assert.equal(outcome.state.lastError, null);
  assert.equal(deps.createCalls.length, 0);
  assert.deepEqual(deps.rescheduleCalls, [
    { campaignId: 'camp-existing', scheduledSendAt: LATER },
  ]);
  assert.deepEqual(deps.statusCalls, ['camp-existing']);
});

test('syncPostCampaign: existing campaign whose AC status is past-scheduled → no AC update, warns', async () => {
  const deps = makeDeps({
    // status 3 = sent
    getCampaignStatus: async () => ({ status: 3, raw: '3' }),
  });
  const acCampaign: PostAcCampaignState = {
    campaignId: 'camp-existing',
    messageId: 'msg-existing',
    scheduledFor: FUTURE.toISOString(),
    status: 'scheduled', // Payload thinks it's still scheduled — AC says otherwise
    targetedLists: '7,10',
  };
  const outcome = await syncPostCampaign(
    { ...baseInput, scheduledPublishDate: LATER, acCampaign },
    deps,
  );
  assert.equal(outcome.kind, 'already-sent');
  if (outcome.kind !== 'already-sent') return;
  assert.equal(outcome.state.status, 'sent');
  assert.match(outcome.state.lastError ?? '', /already sent/);
  assert.equal(outcome.state.campaignId, 'camp-existing');
  assert.equal(deps.rescheduleCalls.length, 0);
});

test('syncPostCampaign: Payload-state sent + date unchanged → silent skip', async () => {
  const deps = makeDeps();
  const acCampaign: PostAcCampaignState = {
    campaignId: 'camp-existing',
    scheduledFor: FUTURE.toISOString(),
    status: 'sent',
  };
  const outcome = await syncPostCampaign({ ...baseInput, acCampaign }, deps);
  assert.equal(outcome.kind, 'skipped');
  if (outcome.kind === 'skipped') assert.equal(outcome.reason, 'already-sent-unchanged');
  assert.equal(deps.statusCalls.length, 0);
});

test('syncPostCampaign: Payload-state sent + date moved → warning without AC call', async () => {
  const deps = makeDeps();
  const acCampaign: PostAcCampaignState = {
    campaignId: 'camp-existing',
    scheduledFor: FUTURE.toISOString(),
    status: 'sent',
  };
  const outcome = await syncPostCampaign(
    { ...baseInput, scheduledPublishDate: LATER, acCampaign },
    deps,
  );
  assert.equal(outcome.kind, 'already-sent');
  if (outcome.kind !== 'already-sent') return;
  assert.match(outcome.state.lastError ?? '', /already sent/);
  assert.equal(outcome.state.campaignId, 'camp-existing');
  // Critical: must NOT have hit AC at all.
  assert.equal(deps.statusCalls.length, 0);
  assert.equal(deps.rescheduleCalls.length, 0);
});

test('syncPostCampaign: AC create failure → status=failed, error preserved, no throw', async () => {
  const deps = makeDeps({
    createScheduledCampaign: async () => {
      throw new ActiveCampaignError('boom', 500, 'AC down');
    },
  });
  const outcome = await syncPostCampaign({ ...baseInput, acCampaign: null }, deps);
  assert.equal(outcome.kind, 'failed');
  if (outcome.kind !== 'failed') return;
  assert.equal(outcome.state.status, 'failed');
  assert.match(outcome.state.lastError ?? '', /boom/);
  assert.match(outcome.state.lastError ?? '', /AC down/);
  // No campaignId existed before, so none afterwards.
  assert.equal(outcome.state.campaignId, undefined);
});

test('syncPostCampaign: previous failure + retry succeeds → kind=retried, status reset', async () => {
  const deps = makeDeps();
  const acCampaign: PostAcCampaignState = {
    status: 'failed',
    lastError: 'old',
  };
  const outcome = await syncPostCampaign({ ...baseInput, acCampaign }, deps);
  assert.equal(outcome.kind, 'retried');
  if (outcome.kind !== 'retried') return;
  assert.equal(outcome.state.status, 'scheduled');
  assert.equal(outcome.state.campaignId, 'camp-1');
  assert.equal(outcome.state.lastError, null);
});

test('syncPostCampaign: reschedule failure → status=failed, campaignId preserved', async () => {
  const deps = makeDeps({
    updateCampaignSendDate: async () => {
      throw new ActiveCampaignError('rate limited', 429);
    },
  });
  const acCampaign: PostAcCampaignState = {
    campaignId: 'camp-existing',
    scheduledFor: FUTURE.toISOString(),
    status: 'scheduled',
  };
  const outcome = await syncPostCampaign(
    { ...baseInput, scheduledPublishDate: LATER, acCampaign },
    deps,
  );
  assert.equal(outcome.kind, 'failed');
  if (outcome.kind !== 'failed') return;
  assert.equal(outcome.state.status, 'failed');
  assert.equal(outcome.state.campaignId, 'camp-existing'); // preserved for retry
  assert.match(outcome.state.lastError ?? '', /rate limited/);
});

test('syncPostCampaign: list resolution failure → status=failed, no AC call', async () => {
  const deps = makeDeps({
    resolveListIds: () => {
      throw new ActiveCampaignError('Missing AC_LIST_ID_ALL_PERPOST');
    },
  });
  const outcome = await syncPostCampaign({ ...baseInput, acCampaign: null }, deps);
  assert.equal(outcome.kind, 'failed');
  if (outcome.kind !== 'failed') return;
  assert.match(outcome.state.lastError ?? '', /Missing AC_LIST_ID/);
  assert.equal(deps.createCalls.length, 0);
  assert.equal(deps.rescheduleCalls.length, 0);
});

test('syncPostCampaign: stored scheduledFor matches to second-precision (no spurious update)', async () => {
  const deps = makeDeps();
  const acCampaign: PostAcCampaignState = {
    campaignId: 'camp-existing',
    // 500ms drift — AC's `sdate` strips sub-second precision
    scheduledFor: new Date(FUTURE.getTime() + 500).toISOString(),
    status: 'scheduled',
  };
  const outcome = await syncPostCampaign({ ...baseInput, acCampaign }, deps);
  assert.equal(outcome.kind, 'skipped');
  if (outcome.kind === 'skipped') assert.equal(outcome.reason, 'no-change');
});
