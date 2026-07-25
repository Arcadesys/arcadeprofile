export type TwineValue = boolean | number | string;
export type TwineVariables = Record<string, TwineValue>;

export type RawTwinePassage = {
  id: string;
  text: string;
};

export type RawTwineStory = {
  schemaVersion: number;
  slug: string;
  title: string;
  author: string | null;
  start: string;
  passages: RawTwinePassage[];
};

export type StoryChoice = {
  label: string;
  target: string;
};

export type ExternalStoryLink = {
  href: string;
  label: string;
};

export type PreparedPassage = {
  id: string;
  body: string;
  choices: StoryChoice[];
  externalLinks: ExternalStoryLink[];
};

export type EnteredPassage = {
  passage: PreparedPassage;
  variables: TwineVariables;
};

const CONDITIONAL_PATTERN =
  /<<if\s+([^>]+)>>([\s\S]*?)(?:<<else>>([\s\S]*?))?<<endif>>/g;
const SET_PATTERN = /<<set\s+\$(\w+)\s*(?:=|eq)\s*([^>]+)>>/g;
const PRINT_PATTERN = /<<print\s+\$(\w+)\s*>>/g;
const DISPLAY_PATTERN = /<<display\s+["']([^"']+)["']\s*>>/g;
const INTERNAL_LINK_PATTERN = /\[\[([^\]|]*?)(?:\|([^\]]+))?\]\]/g;
const EXTERNAL_LINK_PATTERN =
  /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

function canonicalVariableName(name: string): string {
  // The original Lakeside ending checks $Makeover, while every other passage
  // names the same state $Painted. Treat it as the obvious 2013 typo.
  return name === 'Makeover' ? 'Painted' : name;
}

function getVariable(variables: TwineVariables, name: string): TwineValue {
  return variables[canonicalVariableName(name)] ?? false;
}

function parseLiteral(token: string, variables: TwineVariables): TwineValue {
  const value = token.trim();

  if (value.startsWith('$')) {
    return getVariable(variables, value.slice(1));
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function evaluateExpression(
  expression: string,
  variables: TwineVariables,
): TwineValue {
  const binary = expression
    .trim()
    .match(/^(\$\w+|-?\d+(?:\.\d+)?)\s*([+-])\s*(\$\w+|-?\d+(?:\.\d+)?)$/);

  if (!binary) return parseLiteral(expression, variables);

  const left = Number(parseLiteral(binary[1], variables));
  const right = Number(parseLiteral(binary[3], variables));
  return binary[2] === '+' ? left + right : left - right;
}

function evaluateCondition(
  condition: string,
  variables: TwineVariables,
): boolean {
  const comparison = condition
    .trim()
    .match(/^\$(\w+)(?:\s+(eq|neq|gt|gte|lt|lte)\s+(.+))?$/i);

  if (!comparison) return false;

  const left = getVariable(variables, comparison[1]);
  const operator = comparison[2]?.toLowerCase();
  if (!operator) return Boolean(left);

  const right = parseLiteral(comparison[3], variables);

  switch (operator) {
    case 'eq':
      return left === right;
    case 'neq':
      return left !== right;
    case 'gt':
      return Number(left) > Number(right);
    case 'gte':
      return Number(left) >= Number(right);
    case 'lt':
      return Number(left) < Number(right);
    case 'lte':
      return Number(left) <= Number(right);
    default:
      return false;
  }
}

function selectConditionalText(
  source: string,
  variables: TwineVariables,
): string {
  let result = source;
  let previous = '';

  while (result !== previous) {
    previous = result;
    result = result.replace(
      CONDITIONAL_PATTERN,
      (_match, condition: string, truthy: string, falsy = '') =>
        evaluateCondition(condition, variables) ? truthy : falsy,
    );
  }

  return result;
}

function expandDisplayMacros(
  story: RawTwineStory,
  source: string,
  depth = 0,
): string {
  if (depth > 8) {
    throw new Error('Twine display macro recursion limit exceeded.');
  }

  return source.replace(DISPLAY_PATTERN, (_match, passageId: string) => {
    const displayed = story.passages.find(({ id }) => id === passageId);
    if (!displayed) {
      throw new Error(`Unknown displayed Twine passage: ${passageId}`);
    }

    return expandDisplayMacros(story, displayed.text, depth + 1);
  });
}

function applySetMacros(
  source: string,
  variables: TwineVariables,
): { text: string; variables: TwineVariables } {
  const nextVariables = { ...variables };
  const text = source.replace(
    SET_PATTERN,
    (_match, rawName: string, expression: string) => {
      const name = canonicalVariableName(rawName);
      nextVariables[name] = evaluateExpression(expression, nextVariables);
      return '';
    },
  );

  return { text, variables: nextVariables };
}

function cleanBody(source: string, choices: StoryChoice[]): string {
  const choiceLabels = new Set(choices.map(({ label }) => label));
  const withReadableLinkText = source.replace(
    INTERNAL_LINK_PATTERN,
    (_match, label: string) => label,
  );

  return withReadableLinkText
    .replaceAll('<<silently>>', '')
    .replaceAll('<<endsilently>>', '')
    .replace(/<<[^>]+>>/g, '')
    .replace(/<img\b[^>]*>/gi, '')
    .split('\n')
    .filter((line) => !choiceLabels.has(line.trim()))
    .join('\n')
    .replace(/<html>|<\/html>/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
}

export function enterPassage(
  story: RawTwineStory,
  passageId: string,
  variables: TwineVariables,
): EnteredPassage {
  const rawPassage = story.passages.find(({ id }) => id === passageId);
  if (!rawPassage) {
    throw new Error(`Unknown Twine passage: ${passageId}`);
  }

  const expandedText = expandDisplayMacros(story, rawPassage.text);
  const selectedText = selectConditionalText(expandedText, variables);
  const withSetsApplied = applySetMacros(selectedText, variables);
  const externalLinks: ExternalStoryLink[] = [];
  const choices: StoryChoice[] = [];

  let visibleText = withSetsApplied.text.replace(
    PRINT_PATTERN,
    (_match, name: string) => String(getVariable(withSetsApplied.variables, name)),
  );

  visibleText = visibleText.replace(
    EXTERNAL_LINK_PATTERN,
    (_match, href: string, label: string) => {
      externalLinks.push({ href, label });
      return label;
    },
  );

  for (const match of visibleText.matchAll(INTERNAL_LINK_PATTERN)) {
    choices.push({
      label: match[1].trim(),
      target: (match[2] ?? match[1]).trim(),
    });
  }

  return {
    passage: {
      id: passageId,
      body: cleanBody(visibleText, choices),
      choices,
      externalLinks,
    },
    variables: withSetsApplied.variables,
  };
}
