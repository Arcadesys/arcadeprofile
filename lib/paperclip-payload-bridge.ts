import { createHmac, timingSafeEqual } from 'crypto';

const SUPPORTED_COLLECTIONS = ['posts', 'groups', 'books', 'projects', 'demos'] as const;
const BRIDGE_OPERATIONS = ['find', 'findByID', 'create', 'update', 'delete'] as const;
const SORT_PATTERN = /^-?[A-Za-z0-9_.]+(?:,-?[A-Za-z0-9_.]+)*$/;
const MAX_JSON_DEPTH = 25;
const DEFAULT_MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const DEFAULT_MAX_BODY_BYTES = 256 * 1024;
const DEFAULT_LIMIT = 10;

export type PayloadCollectionSlug = (typeof SUPPORTED_COLLECTIONS)[number];
export type BridgeOperation = (typeof BRIDGE_OPERATIONS)[number];
export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };
export type BridgeId = number | string;

export interface CollectionRule {
  operations: BridgeOperation[];
  maxLimit?: number;
  maxDepth?: number;
  readFields: string[];
  writeFields?: string[];
}

export interface AgentRule {
  collections: PayloadCollectionSlug[];
}

export interface PaperclipPayloadBridgeConfig {
  sharedSecret: string;
  maxClockSkewMs: number;
  maxBodyBytes: number;
  defaultLimit: number;
  collections: Partial<Record<PayloadCollectionSlug, CollectionRule>>;
  agents: Record<string, AgentRule>;
}

export interface AuthenticatedBridgeRequest {
  agentId: string;
  timestamp: string;
  timestampMs: number;
}

export type PaperclipPayloadBridgeRequest =
  | {
      op: 'find';
      collection: PayloadCollectionSlug;
      where?: JsonObject;
      limit?: number;
      page?: number;
      sort?: string;
      depth?: number;
      select?: string[];
    }
  | {
      op: 'findByID';
      collection: PayloadCollectionSlug;
      id: BridgeId;
      depth?: number;
      select?: string[];
    }
  | {
      op: 'create';
      collection: PayloadCollectionSlug;
      data: JsonObject;
      select?: string[];
    }
  | {
      op: 'update';
      collection: PayloadCollectionSlug;
      id: BridgeId;
      data: JsonObject;
      select?: string[];
    }
  | {
      op: 'delete';
      collection: PayloadCollectionSlug;
      id: BridgeId;
    };

export class BridgeValidationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'BridgeValidationError';
    this.status = status;
  }
}

export function buildBridgeConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): PaperclipPayloadBridgeConfig {
  const sharedSecret = env.PAPERCLIP_PAYLOAD_SHARED_SECRET ?? env.PAPERCLIP_SHARED_SECRET;

  if (!sharedSecret) {
    throw new BridgeValidationError(
      503,
      'Missing PAPERCLIP_PAYLOAD_SHARED_SECRET (or PAPERCLIP_SHARED_SECRET fallback)',
    );
  }

  const collectionRules = parseCollectionRules(
    env.PAPERCLIP_PAYLOAD_COLLECTION_RULES,
    'PAPERCLIP_PAYLOAD_COLLECTION_RULES',
  );
  const agents = parseAgentRules(
    env.PAPERCLIP_PAYLOAD_AGENT_RULES,
    'PAPERCLIP_PAYLOAD_AGENT_RULES',
    collectionRules,
  );

  return {
    sharedSecret,
    maxClockSkewMs: readPositiveInteger(
      env.PAPERCLIP_PAYLOAD_MAX_CLOCK_SKEW_MS,
      'PAPERCLIP_PAYLOAD_MAX_CLOCK_SKEW_MS',
      DEFAULT_MAX_CLOCK_SKEW_MS,
      1,
    ),
    maxBodyBytes: readPositiveInteger(
      env.PAPERCLIP_PAYLOAD_MAX_BODY_BYTES,
      'PAPERCLIP_PAYLOAD_MAX_BODY_BYTES',
      DEFAULT_MAX_BODY_BYTES,
      1024,
    ),
    defaultLimit: readPositiveInteger(
      env.PAPERCLIP_PAYLOAD_DEFAULT_LIMIT ?? env.PAPERCLIP_MAX_LIMIT,
      'PAPERCLIP_PAYLOAD_DEFAULT_LIMIT',
      DEFAULT_LIMIT,
      1,
    ),
    collections: collectionRules,
    agents,
  };
}

export function computePaperclipSignature({
  timestamp,
  rawBody,
  sharedSecret,
}: {
  timestamp: string;
  rawBody: string;
  sharedSecret: string;
}): string {
  return createHmac('sha256', sharedSecret).update(`${timestamp}.${rawBody}`).digest('hex');
}

export function authenticateBridgeRequest({
  headers,
  rawBody,
  config,
  nowMs = Date.now(),
}: {
  headers: Headers;
  rawBody: string;
  config: PaperclipPayloadBridgeConfig;
  nowMs?: number;
}): AuthenticatedBridgeRequest {
  const agentId = headers.get('x-paperclip-agent')?.trim();
  const timestamp = headers.get('x-paperclip-timestamp')?.trim();
  const signature = headers.get('x-paperclip-signature')?.trim().toLowerCase();

  if (!agentId || !timestamp || !signature) {
    throw new BridgeValidationError(401, 'Missing Paperclip authentication headers');
  }

  if (!config.agents[agentId]) {
    throw new BridgeValidationError(403, 'Unknown Paperclip agent');
  }

  const timestampMs = parseTimestamp(timestamp);
  if (Math.abs(nowMs - timestampMs) > config.maxClockSkewMs) {
    throw new BridgeValidationError(401, 'Stale Paperclip timestamp');
  }

  const expectedSignature = computePaperclipSignature({
    timestamp,
    rawBody,
    sharedSecret: config.sharedSecret,
  });

  if (!timingSafeHexEquals(expectedSignature, signature)) {
    throw new BridgeValidationError(401, 'Invalid Paperclip signature');
  }

  return { agentId, timestamp, timestampMs };
}

export function parseBridgeRequest(rawBody: string): PaperclipPayloadBridgeRequest {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new BridgeValidationError(400, 'Malformed JSON body');
  }

  const body = ensureJsonObject(parsed, 'request body');
  const op = parseOperation(body.op);
  const collection = parseCollection(body.collection);

  switch (op) {
    case 'find':
      assertExactKeys(body, ['op', 'collection', 'where', 'limit', 'page', 'sort', 'depth', 'select']);
      return {
        op,
        collection,
        where: body.where === undefined ? undefined : ensureJsonObject(body.where, 'where'),
        limit: parseOptionalInteger(body.limit, 'limit', 1),
        page: parseOptionalInteger(body.page, 'page', 1),
        sort: parseOptionalSort(body.sort),
        depth: parseOptionalInteger(body.depth, 'depth', 0),
        select: parseOptionalSelect(body.select),
      };

    case 'findByID':
      assertExactKeys(body, ['op', 'collection', 'id', 'depth', 'select']);
      return {
        op,
        collection,
        id: parseId(body.id),
        depth: parseOptionalInteger(body.depth, 'depth', 0),
        select: parseOptionalSelect(body.select),
      };

    case 'create':
      assertExactKeys(body, ['op', 'collection', 'data', 'select']);
      return {
        op,
        collection,
        data: ensureNonEmptyJsonObject(body.data, 'data'),
        select: parseOptionalSelect(body.select),
      };

    case 'update':
      assertExactKeys(body, ['op', 'collection', 'id', 'data', 'select']);
      return {
        op,
        collection,
        id: parseId(body.id),
        data: ensureNonEmptyJsonObject(body.data, 'data'),
        select: parseOptionalSelect(body.select),
      };

    case 'delete':
      assertExactKeys(body, ['op', 'collection', 'id']);
      return {
        op,
        collection,
        id: parseId(body.id),
      };
  }
}

export function authorizeBridgeRequest({
  config,
  agentId,
  request,
}: {
  config: PaperclipPayloadBridgeConfig;
  agentId: string;
  request: PaperclipPayloadBridgeRequest;
}): CollectionRule {
  const agentRule = config.agents[agentId];
  if (!agentRule.collections.includes(request.collection)) {
    throw new BridgeValidationError(403, 'Agent is not allowed to access this collection');
  }

  const collectionRule = config.collections[request.collection];
  if (!collectionRule) {
    throw new BridgeValidationError(403, 'Collection is not configured for Paperclip access');
  }

  if (!collectionRule.operations.includes(request.op)) {
    throw new BridgeValidationError(403, 'Operation is not allowed for this collection');
  }

  return collectionRule;
}

export function resolveReadableFields(
  requestedSelect: string[] | undefined,
  collectionRule: CollectionRule,
): string[] {
  const allowedFields = new Set(collectionRule.readFields);
  const selectedFields = requestedSelect ?? collectionRule.readFields;

  for (const field of selectedFields) {
    if (!allowedFields.has(field)) {
      throw new BridgeValidationError(400, `Field "${field}" is not readable through this bridge`);
    }
  }

  return [...selectedFields];
}

export function assertWritableFields(data: JsonObject, collectionRule: CollectionRule): void {
  const allowedFields = new Set(collectionRule.writeFields ?? []);

  if (allowedFields.size === 0) {
    throw new BridgeValidationError(403, 'Writes are not configured for this collection');
  }

  for (const field of Object.keys(data)) {
    if (!allowedFields.has(field)) {
      throw new BridgeValidationError(400, `Field "${field}" is not writable through this bridge`);
    }
  }
}

export function clampRequestedLimit(
  requestedLimit: number | undefined,
  collectionRule: CollectionRule,
  defaultLimit: number,
): number {
  const upperBound = collectionRule.maxLimit ?? defaultLimit;
  const candidate = requestedLimit ?? defaultLimit;
  return Math.min(candidate, upperBound);
}

export function clampRequestedDepth(
  requestedDepth: number | undefined,
  collectionRule: CollectionRule,
): number {
  const upperBound = collectionRule.maxDepth ?? 0;
  const candidate = requestedDepth ?? 0;
  return Math.min(candidate, upperBound);
}

export function buildPayloadSelect(fields: string[]): Record<string, true> {
  return Object.fromEntries(fields.map((field) => [field, true])) as Record<string, true>;
}

export function sanitizeDocument<T>(doc: T, readableFields: string[]): Partial<Record<string, unknown>> {
  if (!isPlainObject(doc)) {
    return {};
  }

  const sanitized: Record<string, unknown> = {};
  for (const field of readableFields) {
    if (Object.hasOwn(doc, field)) {
      sanitized[field] = doc[field];
    }
  }

  return sanitized;
}

function parseCollectionRules(
  value: string | undefined,
  envName: string,
): Partial<Record<PayloadCollectionSlug, CollectionRule>> {
  const parsed = parseJsonObjectEnv(value, envName);
  const rules: Partial<Record<PayloadCollectionSlug, CollectionRule>> = {};

  for (const [collection, rawRule] of Object.entries(parsed)) {
    if (!isCollectionSlug(collection)) {
      throw new BridgeValidationError(503, `Unsupported collection "${collection}" in ${envName}`);
    }

    rules[collection] = parseCollectionRule(rawRule, collection);
  }

  if (Object.keys(rules).length === 0) {
    throw new BridgeValidationError(503, `${envName} must define at least one collection`);
  }

  return rules;
}

function parseAgentRules(
  value: string | undefined,
  envName: string,
  collectionRules: Partial<Record<PayloadCollectionSlug, CollectionRule>>,
): Record<string, AgentRule> {
  const parsed = parseJsonObjectEnv(value, envName);
  const rules: Record<string, AgentRule> = {};

  for (const [agentId, rawRule] of Object.entries(parsed)) {
    if (!agentId.trim()) {
      throw new BridgeValidationError(503, `${envName} contains an empty agent id`);
    }

    rules[agentId] = parseAgentRule(rawRule, envName, collectionRules);
  }

  if (Object.keys(rules).length === 0) {
    throw new BridgeValidationError(503, `${envName} must define at least one agent`);
  }

  return rules;
}

function parseCollectionRule(rawRule: unknown, collection: PayloadCollectionSlug): CollectionRule {
  if (!isPlainObject(rawRule)) {
    throw new BridgeValidationError(503, `Collection rule for "${collection}" must be an object`);
  }

  const operations = parseOperations(rawRule.operations, collection);
  const readFields = parseStringArray(rawRule.readFields, `${collection}.readFields`, true);
  const writeFields = rawRule.writeFields === undefined
    ? undefined
    : parseStringArray(rawRule.writeFields, `${collection}.writeFields`, true);

  if ((operations.includes('create') || operations.includes('update')) && !writeFields?.length) {
    throw new BridgeValidationError(
      503,
      `Collection "${collection}" must define writeFields when create/update is enabled`,
    );
  }

  return {
    operations,
    maxLimit: rawRule.maxLimit === undefined
      ? undefined
      : parseStrictInteger(rawRule.maxLimit, `${collection}.maxLimit`, 1),
    maxDepth: rawRule.maxDepth === undefined
      ? undefined
      : parseStrictInteger(rawRule.maxDepth, `${collection}.maxDepth`, 0),
    readFields,
    writeFields,
  };
}

function parseAgentRule(
  rawRule: unknown,
  envName: string,
  collectionRules: Partial<Record<PayloadCollectionSlug, CollectionRule>>,
): AgentRule {
  if (!isPlainObject(rawRule)) {
    throw new BridgeValidationError(503, `Agent rules in ${envName} must be objects`);
  }

  const collections = parseStringArray(rawRule.collections, 'collections', true).map((collection) => {
    if (!isCollectionSlug(collection)) {
      throw new BridgeValidationError(503, `Unsupported collection "${collection}" in ${envName}`);
    }

    if (!collectionRules[collection]) {
      throw new BridgeValidationError(
        503,
        `Agent allowlist references "${collection}" without a matching collection rule`,
      );
    }

    return collection;
  });

  return { collections };
}

function parseOperations(rawOperations: unknown, collection: string): BridgeOperation[] {
  if (!Array.isArray(rawOperations) || rawOperations.length === 0) {
    throw new BridgeValidationError(
      503,
      `Collection "${collection}" must define a non-empty operations array`,
    );
  }

  const operations = [...new Set(rawOperations.map((value) => {
    if (typeof value !== 'string' || !isBridgeOperation(value)) {
      throw new BridgeValidationError(503, `Invalid operation "${String(value)}" on "${collection}"`);
    }

    return value;
  }))];

  return operations;
}

function parseOptionalSelect(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseStringArray(value, 'select', true);
}

function parseOptionalSort(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !SORT_PATTERN.test(value)) {
    throw new BridgeValidationError(400, 'sort must be a comma-delimited field list');
  }

  return value;
}

function parseId(value: unknown): BridgeId {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BridgeValidationError(400, 'id must not be empty');
    }

    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed);
    }

    return trimmed;
  }

  throw new BridgeValidationError(400, 'id must be a string or integer');
}

function parseOperation(value: unknown): BridgeOperation {
  if (typeof value !== 'string' || !isBridgeOperation(value)) {
    throw new BridgeValidationError(400, 'Unsupported bridge operation');
  }

  return value;
}

function parseCollection(value: unknown): PayloadCollectionSlug {
  if (typeof value !== 'string' || !isCollectionSlug(value)) {
    throw new BridgeValidationError(400, 'Unsupported collection');
  }

  return value;
}

function parseOptionalInteger(value: unknown, fieldName: string, minValue: number): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseStrictInteger(value, fieldName, minValue);
}

function parseStrictInteger(value: unknown, fieldName: string, minValue: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minValue) {
    throw new BridgeValidationError(400, `${fieldName} must be an integer >= ${minValue}`);
  }

  return value;
}

function parseStringArray(value: unknown, fieldName: string, requireValues: boolean): string[] {
  if (!Array.isArray(value)) {
    throw new BridgeValidationError(400, `${fieldName} must be an array of strings`);
  }

  const items = [...new Set(value.map((item) => {
    if (typeof item !== 'string' || !item.trim()) {
      throw new BridgeValidationError(400, `${fieldName} must contain non-empty strings`);
    }

    return item.trim();
  }))];

  if (requireValues && items.length === 0) {
    throw new BridgeValidationError(400, `${fieldName} must contain at least one entry`);
  }

  return items;
}

function parseJsonObjectEnv(value: string | undefined, envName: string): JsonObject {
  if (!value) {
    throw new BridgeValidationError(503, `Missing ${envName}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new BridgeValidationError(503, `${envName} must contain valid JSON`);
  }

  return ensureJsonObject(parsed, envName);
}

function ensureNonEmptyJsonObject(value: unknown, fieldName: string): JsonObject {
  const object = ensureJsonObject(value, fieldName);
  if (Object.keys(object).length === 0) {
    throw new BridgeValidationError(400, `${fieldName} must not be empty`);
  }

  return object;
}

function ensureJsonObject(value: unknown, fieldName: string): JsonObject {
  if (!isPlainObject(value)) {
    throw new BridgeValidationError(400, `${fieldName} must be a JSON object`);
  }

  assertJsonValue(value, fieldName);
  return value as JsonObject;
}

function assertJsonValue(value: unknown, fieldName: string, depth = 0): void {
  if (depth > MAX_JSON_DEPTH) {
    throw new BridgeValidationError(400, `${fieldName} exceeds the maximum nesting depth`);
  }

  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new BridgeValidationError(400, `${fieldName} must contain only finite numbers`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      assertJsonValue(item, `${fieldName}[${index}]`, depth + 1);
    });
    return;
  }

  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new BridgeValidationError(400, `${fieldName} contains a reserved key`);
      }
      assertJsonValue(child, `${fieldName}.${key}`, depth + 1);
    }
    return;
  }

  throw new BridgeValidationError(400, `${fieldName} contains a non-JSON value`);
}

function assertExactKeys(record: JsonObject, expectedKeys: string[]): void {
  const allowedKeys = new Set(expectedKeys);

  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      throw new BridgeValidationError(400, `Unexpected key "${key}" in request body`);
    }
  }
}

function parseTimestamp(value: string): number {
  if (!/^\d{10,13}$/.test(value)) {
    throw new BridgeValidationError(401, 'Timestamp must be a unix seconds or milliseconds string');
  }

  const numeric = Number(value);
  const timestampMs = value.length === 10 ? numeric * 1000 : numeric;
  if (!Number.isFinite(timestampMs)) {
    throw new BridgeValidationError(401, 'Timestamp is invalid');
  }

  return timestampMs;
}

function timingSafeHexEquals(expected: string, actual: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(expected) || !/^[a-f0-9]{64}$/i.test(actual)) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(actual, 'hex');

  return expectedBuffer.length === actualBuffer.length
    && timingSafeEqual(expectedBuffer, actualBuffer);
}

function readPositiveInteger(
  value: string | undefined,
  fieldName: string,
  fallback: number,
  minValue: number,
): number {
  if (!value) {
    return fallback;
  }

  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < minValue) {
    throw new BridgeValidationError(503, `${fieldName} must be an integer >= ${minValue}`);
  }

  return numeric;
}

function isCollectionSlug(value: string): value is PayloadCollectionSlug {
  return (SUPPORTED_COLLECTIONS as readonly string[]).includes(value);
}

function isBridgeOperation(value: string): value is BridgeOperation {
  return (BRIDGE_OPERATIONS as readonly string[]).includes(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
