import assert from 'node:assert/strict';
import test from 'node:test';
import { isArcadesAudience, kitFormId, kitTagId } from './subscription-audiences';

test('the added topics use their existing Kit forms and tags, with separate brands', () => {
  assert.deepEqual(
    ['queer-columns', 'work-ai', 'th4f'].map((topic) => [kitFormId(topic as 'queer-columns' | 'work-ai' | 'th4f'), kitTagId(topic as 'queer-columns' | 'work-ai' | 'th4f')]),
    [['9954454', '23866437'], ['9953061', '23806915'], ['9953071', '23808390']],
  );
  assert.equal(isArcadesAudience('queer-columns'), true);
  assert.equal(isArcadesAudience('work-ai'), false);
  assert.equal(isArcadesAudience('th4f'), false);
});
