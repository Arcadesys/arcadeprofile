import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import postcss, { type Rule } from 'postcss';

import { ORIENTATION_NAV_ITEMS } from './nav-items';

const styles = postcss.parse(readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8'));
const desktopMedia = '(min-width: 961px) and (min-height: 701px)';
const mobileMedia = '(max-width: 960px), (max-height: 700px)';
const shortDesktopMedia = '(min-width: 961px) and (min-height: 701px) and (max-height: 839px)';

function rulesFor(selector: string): Rule[] {
  const rules: Rule[] = [];
  styles.walkRules((rule) => {
    if (rule.selectors.includes(selector)) rules.push(rule);
  });
  return rules;
}

function declarations(selector: string, media: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rule of rulesFor(selector)) {
    if (rule.parent?.type !== 'atrule' || !('params' in rule.parent) || rule.parent.params !== media) continue;
    rule.walkDecls((declaration) => { values[declaration.prop] = declaration.value; });
  }
  return values;
}

test('desktop rail lets only the link list shrink and scroll when vertical space runs out', () => {
  const list = declarations('.site-nav > ul', desktopMedia);
  assert.equal(list['min-height'], '0');
  assert.equal(list['overflow-y'], 'auto');
  assert.equal(list['align-content'], 'start');
  assert.equal(list['grid-template-columns'], 'minmax(0, 1fr)');
  assert.equal(list['padding-block'], '1rem');
  assert.equal(declarations('.site-nav > ul > li > a:focus-visible', desktopMedia)['outline-offset'], '-4px', 'keep keyboard focus visible inside the scrollport');

  for (const selector of ['.site-nav > .nav-logo', '.site-nav > .site-search', '.nav-collapse-toggle']) {
    assert.equal(declarations(selector, desktopMedia)['flex-shrink'], '0', `${selector} must not be squeezed by the list`);
  }
  const toggle = declarations('.nav-collapse-toggle', desktopMedia);
  assert.equal(toggle.width, '40px');
  assert.equal(toggle.height, '40px');

  // Scrolling the whole rail would also clip the search popover outside it.
  for (const rule of rulesFor('.site-nav')) {
    rule.walkDecls(/^overflow/, (declaration) => {
      assert.equal(declaration.value, 'visible', 'keep overflow handling on the link list');
    });
  }
});

test('tall rails retain full-size links in both expanded and collapsed states', () => {
  const link = '.site-nav > ul > li:not(.nav-more) > a:not(.nav-logo)';
  assert.equal(declarations(link, desktopMedia)['min-height'], '78px');
  assert.equal(declarations(`html[data-nav-collapsed="true"] ${link}`, desktopMedia)['min-height'], '56px');
  assert.equal(declarations('.site-nav > ul', desktopMedia).height, undefined, 'use available space instead of a fixed list height');
});

test('mobile and short desktop viewports retain their menu drawer and hide the collapse toggle', () => {
  assert.equal(declarations('.nav-collapse-toggle', mobileMedia).display, 'none');
  const list = declarations('.site-nav > ul', mobileMedia);
  assert.equal(list.display, 'none');
  assert.equal(list['max-height'], 'calc(100dvh - 86px)');
  assert.equal(list['min-height'], undefined, 'desktop shrink rules must not affect the menu drawer');
  assert.equal(declarations('.site-nav.mobile-open > ul', mobileMedia).display, 'grid');

  for (const rule of rulesFor('.site-nav > ul')) {
    rule.walkDecls('min-height', () => {
      assert.ok(rule.parent && 'params' in rule.parent);
      assert.equal(rule.parent.params, desktopMedia);
    });
  }
});


test('short desktop windows fit every rail destination without scrolling', () => {
  const link = '.site-nav > ul > li:not(.nav-more) > a:not(.nav-logo)';
  const px = (value: string) => Number.parseFloat(value) * (value.endsWith('rem') ? 16 : 1);
  const list = declarations('.site-nav > ul', shortDesktopMedia);
  const compactLink = declarations(link, shortDesktopMedia);
  const icon = declarations('.nav-rail-icon', shortDesktopMedia);

  const linkHeight = px(compactLink['min-height']);
  assert.ok(linkHeight >= 56, 'compact links stay comfortably above the 44px target size');

  // Icon, gap, one line of 1rem label and the link's own padding must fit inside it.
  const linkContent = px(icon.height) + px(compactLink.gap) + 16 + 2 * px(compactLink['padding-block']);
  assert.ok(linkContent <= linkHeight, 'the icon and label fit inside a compact link');

  // Everything in the rail that is not the list: 48px of rail padding, the logo
  // (48px + 25.6px margin), Search (70px + 8px) and the collapse toggle (40px + 12px).
  const fixedParts = 48 + 73.6 + 78 + 52;
  const count = ORIENTATION_NAV_ITEMS.length;
  const listHeight = 2 * px(list['padding-block']) + count * linkHeight + (count - 1) * px(list.gap);
  assert.ok(fixedParts + listHeight <= 701, 'the rail fits at the shortest desktop height');

  // The full-size rail must already fit where the compact range ends.
  const fullList = declarations('.site-nav > ul', desktopMedia);
  const fullHeight = 2 * px(fullList['padding-block']) + count * px(declarations(link, desktopMedia)['min-height']) + (count - 1) * px(fullList.gap);
  assert.ok(fixedParts + fullHeight <= 840, 'full-size links take over only once they fit');
});

test('the mobile bar reserves a slot for the Reading trigger instead of covering Menu', () => {
  const wrapper = declarations('.nav-wrapper', mobileMedia);
  assert.equal(wrapper['--reader-trigger-width'], '78px');
  assert.equal(wrapper['--nav-bar-inset'], '1rem');

  const dock = declarations('.nav-wrapper > .reading-dock', mobileMedia);
  assert.equal(dock.position, 'fixed');
  assert.equal(dock.right, 'var(--nav-bar-inset)');
  assert.equal(declarations('.nav-wrapper > .reading-dock .dock-trigger', mobileMedia).width, 'var(--reader-trigger-width)');

  // The trigger is outside the bar's flex row, so the bar itself keeps the
  // slot clear; Menu and Search can never sit underneath it.
  assert.equal(
    declarations('.site-nav', mobileMedia)['padding-right'],
    'calc(var(--nav-bar-inset) + var(--reader-trigger-width) + .5rem)',
  );

  // Mascot, wordmark, Menu, Search and Reading do not fit on one phone-width row.
  assert.equal(declarations('.nav-logo-copy', '(max-width: 440px)').display, 'none');
});

test('collapsed rail scrollport keeps the full icon and inset focus ring beside a scrollbar', () => {
  const collapsed = 'html[data-nav-collapsed="true"]';
  const list = declarations(`${collapsed} .site-nav > ul`, desktopMedia);
  assert.equal(list.width, 'calc(100% + 1.5rem)');
  assert.equal(list['margin-inline'], '-.75rem');
  assert.equal(declarations('.site-nav', desktopMedia).padding, '1.5rem .75rem', 'list expansion must match the rail padding');
  assert.equal(declarations(`${collapsed} .site-nav > ul > li:not(.nav-more) > a:not(.nav-logo)`, desktopMedia)['padding-inline'], '0');
  assert.equal(declarations('.nav-rail-icon', desktopMedia).width, '32px');
  assert.equal(declarations('.site-nav > ul > li > a:focus-visible', desktopMedia)['outline-offset'], '-4px');

  // At the 56px rail width, reclaiming the inline padding leaves a 54px
  // scrollport. Even a non-overlay 17px scrollbar leaves room for the 32px
  // icon and the link's two 1px borders without horizontal scrolling.
  const rail = rulesFor(collapsed).find((rule) => rule.parent?.type === 'root');
  assert.ok(rail);
  const width = rail.nodes.find((node) => node.type === 'decl' && node.prop === '--nav-rail-width');
  assert.ok(width && width.type === 'decl');
  assert.equal(width.value, '56px');
  assert.ok(Number.parseFloat(width.value) - 2 - 17 - 2 >= 32);
});
