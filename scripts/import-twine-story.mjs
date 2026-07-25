#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const [inputArg, outputArg, slugArg] = process.argv.slice(2);

if (!inputArg || !outputArg || !slugArg) {
  console.error(
    'Usage: node scripts/import-twine-story.mjs <compiled-html> <output-json> <slug>',
  );
  process.exit(1);
}

const inputPath = resolve(inputArg);
const outputPath = resolve(outputArg);
const html = readFileSync(inputPath, 'utf8');

function decodePassageText(value) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('\\n', '\n')
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

const storyPassages = passages.filter(
  ({ id }) => id !== 'StoryTitle' && id !== 'StoryAuthor',
);

const story = {
  schemaVersion: 1,
  slug: slugArg,
  title,
  author: author ?? null,
  start: 'Start',
  source: {
    format: 'Twine 1 / Sugarcane',
    importedFrom: inputPath,
  },
  passages: storyPassages,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(story, null, 2)}\n`);

console.log(
  `Imported ${storyPassages.length} passages from ${inputPath} to ${outputPath}`,
);
