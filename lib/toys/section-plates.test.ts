import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

import butterflyJson from '@/data/toys/butterfly-exe.json';
import justiceJson from '@/data/toys/justice-porn.json';
import shootJson from '@/data/toys/shoot-em-up.json';
import splitJson from '@/data/toys/the-day-i-split-in-two.json';
import type { RawTwineStory } from './twine-engine';

const games = [
  {
    file: 'app/components/toys/ButterflyGame.tsx',
    scenes: 'butterflyScenes',
    story: butterflyJson as RawTwineStory,
    sectionCount: 7,
  },
  {
    file: 'app/components/toys/JusticePornGame.tsx',
    scenes: 'justicePornScenes',
    story: justiceJson as RawTwineStory,
    sectionCount: 3,
  },
  {
    file: 'app/components/toys/ShootEmUpGame.tsx',
    scenes: 'shootEmUpScenes',
    story: shootJson as RawTwineStory,
    sectionCount: 4,
  },
  {
    file: 'app/components/toys/SplitInTwoGame.tsx',
    scenes: 'splitInTwoScenes',
    story: splitJson as RawTwineStory,
    sectionCount: 6,
  },
] as const;

function property(
  object: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression {
  const match = object.properties.find(
    (candidate): candidate is ts.PropertyAssignment =>
      ts.isPropertyAssignment(candidate) &&
      ts.isIdentifier(candidate.name) &&
      candidate.name.text === name,
  );

  assert.ok(match, `scene is missing ${name}`);
  return match.initializer;
}

function strings(
  expression: ts.Expression,
  arrays: Map<string, ts.ArrayLiteralExpression>,
): string[] {
  const resolved = ts.isIdentifier(expression)
    ? arrays.get(expression.text)
    : expression;

  assert.ok(resolved && ts.isArrayLiteralExpression(resolved));
  return resolved.elements.map((element) => {
    assert.ok(ts.isStringLiteral(element));
    return element.text;
  });
}

function inspectSceneConfig(file: string, variableName: string) {
  const absolutePath = path.join(process.cwd(), file);
  const source = ts.createSourceFile(
    absolutePath,
    readFileSync(absolutePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const arrays = new Map<string, ts.ArrayLiteralExpression>();

  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;

    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.initializer &&
        ts.isArrayLiteralExpression(declaration.initializer)
      ) {
        arrays.set(declaration.name.text, declaration.initializer);
      }
    }
  }

  const scenes = arrays.get(variableName);
  assert.ok(scenes, `${file} does not export ${variableName}`);

  const passageIds: string[] = [];
  const sceneIds = new Set<string>();

  for (const element of scenes.elements) {
    assert.ok(ts.isObjectLiteralExpression(element));

    const id = property(element, 'id');
    const src = property(element, 'src');
    assert.ok(ts.isStringLiteral(id));
    assert.ok(ts.isStringLiteral(src));
    assert.match(
      src.text,
      /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\/toys\//,
    );
    assert.ok(!sceneIds.has(id.text), `duplicate scene id: ${id.text}`);

    sceneIds.add(id.text);
    passageIds.push(...strings(property(element, 'passages'), arrays));
  }

  return { passageIds, sectionCount: scenes.elements.length };
}

for (const game of games) {
  test(`${game.story.title}: section plates cover every passage exactly once`, () => {
    const configured = inspectSceneConfig(game.file, game.scenes);
    const authored = game.story.passages.map(({ id }) => id).sort();

    assert.equal(configured.sectionCount, game.sectionCount);
    assert.equal(
      new Set(configured.passageIds).size,
      configured.passageIds.length,
      'a passage is assigned to more than one section',
    );
    assert.deepEqual(configured.passageIds.sort(), authored);
  });
}
