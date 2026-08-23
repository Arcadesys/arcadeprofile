import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGroupIntroUrl, buildPostUrl, parsePostPartSegment, partNum } from './post-url';

test('post URL helpers build stable Markdown routes', () => {
  assert.equal(buildGroupIntroUrl('arcade-blog'), '/projects/arcade-blog');
  assert.equal(buildPostUrl('arcade-blog', 'hello'), '/projects/arcade-blog/hello');
  assert.equal(partNum(3), '03');
});

test('parsePostPartSegment accepts padded legacy parts but rejects unsafe integers', () => {
  assert.equal(parsePostPartSegment('0'), 0);
  assert.equal(parsePostPartSegment('01'), 1);
  assert.equal(parsePostPartSegment('12'), 12);
  assert.equal(parsePostPartSegment(''), null);
  assert.equal(parsePostPartSegment('12abc'), null);
  assert.equal(parsePostPartSegment('9007199254740993'), null);
});
