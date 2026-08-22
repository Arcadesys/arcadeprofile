import assert from 'node:assert/strict';
import test from 'node:test';

import { loadLabCaseStudies, requireLabCaseStudy } from './lab-case-studies';

test('Lab case studies are canonical Markdown sources with unique project slugs', () => {
  const studies = loadLabCaseStudies();
  assert.deepEqual(studies.map((study) => study.slug), ['wizwor', 'toontok', 'arcadeprofile', 'conductor']);
  assert.match(requireLabCaseStudy('wizwor').body, /I split judgment from enforcement/);
  assert.match(requireLabCaseStudy('arcadeprofile').body, /web page the primary publication/);
});
