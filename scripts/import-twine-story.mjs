#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const [inputArg, outputArg, slugArg, ...excludeArgs] = process.argv.slice(2);

if (!inputArg || !outputArg || !slugArg) {
  console.error(
    'Usage: node scripts/import-twine-story.mjs <compiled-html> <output-json> <slug> [excluded-passage-id...]',
  );
  process.exit(1);
}

// Author-only passages (outlines, notes) that should never ship as story text.
const excludedIds = new Set(['StoryTitle', 'StoryAuthor', ...excludeArgs]);

const inputPath = resolve(inputArg);
const outputPath = resolve(outputArg);
const html = readFileSync(inputPath, 'utf8');
const formatMatch = html.match(/<!--\s*([A-Za-z]+)\s+([0-9.]+)\s+is based on:/);

function decodePassageText(value) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('\\n', '\n')
    // Twine 1 escapes a literal space as \s so leading indentation survives
    // the store format. Butterfly.exe uses it to indent its poem.
    .replaceAll('\\s', ' ')
    .replaceAll('â€™', '’');
}

const passages = [];
const passagePattern = /<div tiddler="([^"]+)"[^>]*>([\s\S]*?)<\/div>/g;

for (const match of html.matchAll(passagePattern)) {
  passages.push({
    id: match[1],
    text: decodePassageText(match[2]).trim(),
  });
}

const passageMap = new Map(passages.map((passage) => [passage.id, passage.text]));
const title = passageMap.get('StoryTitle');
const author = passageMap.get('StoryAuthor');

if (!title || !passageMap.has('Start')) {
  throw new Error('The compiled Twine file is missing StoryTitle or Start.');
}

const storyPassages = passages.filter(({ id }) => !excludedIds.has(id));

const story = {
  schemaVersion: 1,
  slug: slugArg,
  title,
  author: author ?? null,
  start: 'Start',
  source: {
    format: formatMatch
      ? `Twine 1 / ${formatMatch[1]} ${formatMatch[2]}`
      : 'Twine 1',
    importedFrom: inputPath,
  },
  passages: storyPassages,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(story, null, 2)}\n`);

console.log(
  `Imported ${storyPassages.length} passages from ${inputPath} to ${outputPath}`,
);
