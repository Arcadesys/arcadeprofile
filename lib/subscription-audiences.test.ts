import assert from 'node:assert/strict';
import test from 'node:test';
import { isArcadesAudience, resendTopicId } from './subscription-audiences';

test('seven Resend topic IDs are deployment-configured and writing welcomes exclude Work / AI and TH4F', () => {
  process.env.RESEND_TOPIC_QUEER_COLUMNS_ID = 'qc-topic';
  assert.equal(resendTopicId('queer-columns'), 'qc-topic');
  assert.equal(isArcadesAudience('queer-columns'), true);
  assert.equal(isArcadesAudience('work-ai'), false);
  assert.equal(isArcadesAudience('th4f'), false);
});
