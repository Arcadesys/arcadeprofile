import assert from 'node:assert/strict';
import test from 'node:test';
import {
  POST_CANONICAL_EDITIONS, WORK_SITE_URL, buildPostCanonicalUrl,
  buildPostDiscoveryUrl, canonicalDiscoveryHref, mappedPostCanonicalUrl,
  validatePostCanonicalEditions,
} from './post-canonical';
import { buildPostUrl, parsePostPartSegment } from './post-url';

for (const edition of POST_CANONICAL_EDITIONS) {
  const [, , group, slug] = edition.creativePath.split('/');
  test(`${group}/${slug}: direct cross-domain identity and retained local routes`, () => {
    assert.equal(buildPostCanonicalUrl(group, slug), edition.canonicalUrl);
    assert.equal(buildPostDiscoveryUrl(group, slug), edition.canonicalUrl);
    assert.equal(buildPostUrl(group, slug), edition.creativePath);
    assert.equal(`${buildPostUrl(group, slug)}/pdf`, `${edition.creativePath}/pdf`);
    assert.equal(mappedPostCanonicalUrl(`${edition.creativePath}?utm_source=test#read`), edition.canonicalUrl);
    assert.equal(mappedPostCanonicalUrl(`https://www.thearcades.me${edition.creativePath}?test=1`), edition.canonicalUrl);
    assert.equal(mappedPostCanonicalUrl(edition.canonicalUrl), undefined);
    assert.equal(canonicalDiscoveryHref(edition.canonicalUrl), edition.canonicalUrl);
  });
}

test('unmapped pieces, distinct case study and unrelated attributed links keep their own identity', () => {
  assert.equal(buildPostCanonicalUrl('the-singularity-log', 'rabies-capitalism'), 'https://www.thearcades.me/projects/the-singularity-log/rabies-capitalism');
  for (const href of ['/resume', '/resume/pdf', '/portfolio/open-port', `${WORK_SITE_URL}/work/bunch`, `${WORK_SITE_URL}/?utm_source=thearcades&utm_medium=site`]) {
    assert.equal(canonicalDiscoveryHref(href), href);
  }
  assert.equal(parsePostPartSegment('01'), 1);
});

test('encoded and malformed source paths cannot alias an approved mapping', () => {
  for (const href of [
    '/projects/bunch/%62unch', '/projects/bunch%2fbunch', '/projects/bunch/../bunch/bunch',
    '//www.thearcades.me/projects/bunch/bunch', 'https://evil.example/projects/bunch/bunch',
    'https://www.thearcades.me.evil.example/projects/bunch/bunch', '/projects/bunch/bunch/pdf',
  ]) assert.equal(mappedPostCanonicalUrl(href), undefined, href);
});

test('configuration rejects unsafe, ambiguous and missing work targets', () => {
  const source = '/projects/bunch/bunch';
  for (const canonicalUrl of [
    'http://work.thearcades.me/blog/bunch', '//work.thearcades.me/blog/bunch',
    'javascript:alert(1)', 'https://evil.example/blog/bunch',
    'https://work.thearcades.me.evil.example/blog/bunch',
    'https://person@work.thearcades.me/blog/bunch', 'https://work.thearcades.me:444/blog/bunch',
    `${WORK_SITE_URL}/blog/bunch?utm_source=x`, `${WORK_SITE_URL}/blog/bunch#part`,
    `${WORK_SITE_URL}/blog/%62unch`, `${WORK_SITE_URL}/blog/a/../bunch`,
    `${WORK_SITE_URL}/`, `${WORK_SITE_URL}/work/bunch`, `${WORK_SITE_URL}/blog/bunch/`,
    ' https://work.thearcades.me/blog/bunch', '',
  ]) assert.throws(() => validatePostCanonicalEditions([{ creativePath: source, canonicalUrl }]), TypeError, canonicalUrl);
  assert.throws(() => validatePostCanonicalEditions([POST_CANONICAL_EDITIONS[0], POST_CANONICAL_EDITIONS[0]]));
  assert.throws(() => validatePostCanonicalEditions([{ creativePath: '/projects/bunch/%62unch', canonicalUrl: `${WORK_SITE_URL}/blog/bunch` }]));
});
