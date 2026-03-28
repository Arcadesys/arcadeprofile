import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import configPromise from '@payload-config';
import {
  BridgeValidationError,
  assertWritableFields,
  authenticateBridgeRequest,
  authorizeBridgeRequest,
  buildBridgeConfigFromEnv,
  buildPayloadSelect,
  clampRequestedDepth,
  clampRequestedLimit,
  parseBridgeRequest,
  resolveReadableFields,
  sanitizeDocument,
  type CollectionRule,
  type PaperclipPayloadBridgeRequest,
} from '@/lib/paperclip-payload-bridge';

export const runtime = 'nodejs';

type BridgeSuccessPayload = {
  ok: true;
  requestId: string;
  op: PaperclipPayloadBridgeRequest['op'];
  collection: PaperclipPayloadBridgeRequest['collection'];
  result: Record<string, unknown>;
};

type BridgeAuditEvent = {
  requestId: string;
  agentId: string;
  collection: string;
  op: string;
  success: boolean;
  reason?: string;
  durationMs: number;
};

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? randomUUID();
  const startedAt = Date.now();
  let agentId = 'unknown';
  let collection = 'unknown';
  let op = 'unknown';

  try {
    const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('application/json')) {
      throw new BridgeValidationError(415, 'Expected an application/json request');
    }

    const config = buildBridgeConfigFromEnv();
    const rawBody = await request.text();

    if (Buffer.byteLength(rawBody, 'utf8') > config.maxBodyBytes) {
      throw new BridgeValidationError(413, 'Request body exceeds the configured size limit');
    }

    const auth = authenticateBridgeRequest({
      headers: request.headers,
      rawBody,
      config,
    });
    agentId = auth.agentId;

    const bridgeRequest = parseBridgeRequest(rawBody);
    collection = bridgeRequest.collection;
    op = bridgeRequest.op;

    const collectionRule = authorizeBridgeRequest({
      config,
      agentId,
      request: bridgeRequest,
    });

    await runPreflightGuards({
      request,
      requestId,
      agentId,
      collection,
      op,
    });

    const result = await executeBridgeRequest({
      bridgeRequest,
      collectionRule,
      defaultLimit: config.defaultLimit,
    });

    const responseBody: BridgeSuccessPayload = {
      ok: true,
      requestId,
      op: bridgeRequest.op,
      collection: bridgeRequest.collection,
      result,
    };

    logAuditEvent({
      requestId,
      agentId,
      collection,
      op,
      success: true,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(responseBody, {
      status: bridgeRequest.op === 'create' ? 201 : 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const bridgeError = normalizeBridgeError(error);

    logAuditEvent({
      requestId,
      agentId,
      collection,
      op,
      success: false,
      reason: bridgeError.message,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        ok: false,
        requestId,
        error: bridgeError.message,
      },
      {
        status: bridgeError.status,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}

async function executeBridgeRequest({
  bridgeRequest,
  collectionRule,
  defaultLimit,
}: {
  bridgeRequest: PaperclipPayloadBridgeRequest;
  collectionRule: CollectionRule;
  defaultLimit: number;
}): Promise<Record<string, unknown>> {
  const payload = await getPayload({ config: configPromise });
  const readableFields = resolveReadableFields(
    'select' in bridgeRequest ? bridgeRequest.select : undefined,
    collectionRule,
  );
  const select = buildPayloadSelect(readableFields);
  const collection = bridgeRequest.collection;

  switch (bridgeRequest.op) {
    case 'find': {
      const limit = clampRequestedLimit(bridgeRequest.limit, collectionRule, defaultLimit);
      const depth = clampRequestedDepth(bridgeRequest.depth, collectionRule);
      const result = await payload.find({
        collection,
        where: bridgeRequest.where as never,
        limit,
        page: bridgeRequest.page,
        sort: bridgeRequest.sort,
        depth,
        overrideAccess: false,
        select: select as never,
      });

      return {
        docs: result.docs.map((doc) => sanitizeDocument(doc, readableFields)),
        totalDocs: result.totalDocs,
        limit,
        totalPages: result.totalPages,
        page: result.page,
        pagingCounter: result.pagingCounter,
        hasPrevPage: result.hasPrevPage,
        hasNextPage: result.hasNextPage,
        prevPage: result.prevPage,
        nextPage: result.nextPage,
      };
    }

    case 'findByID': {
      const depth = clampRequestedDepth(bridgeRequest.depth, collectionRule);
      const result = await payload.findByID({
        collection,
        id: bridgeRequest.id as never,
        depth,
        overrideAccess: false,
        select: select as never,
      });

      return {
        doc: sanitizeDocument(result, readableFields),
      };
    }

    case 'create': {
      assertWritableFields(bridgeRequest.data, collectionRule);
      const result = await payload.create({
        collection,
        data: bridgeRequest.data as never,
        overrideAccess: false,
      });

      return {
        doc: sanitizeDocument(result, readableFields),
      };
    }

    case 'update': {
      assertWritableFields(bridgeRequest.data, collectionRule);
      const result = await payload.update({
        collection,
        id: bridgeRequest.id as never,
        data: bridgeRequest.data as never,
        overrideAccess: false,
      });

      return {
        doc: sanitizeDocument(result, readableFields),
      };
    }

    case 'delete': {
      const result = await payload.delete({
        collection,
        id: bridgeRequest.id as never,
        overrideAccess: false,
      });

      return {
        doc: sanitizeDocument(result, readableFields),
      };
    }
  }
}

function normalizeBridgeError(error: unknown): BridgeValidationError {
  if (error instanceof BridgeValidationError) {
    return error;
  }

  reportBridgeError(error);
  return new BridgeValidationError(500, 'Unexpected bridge error');
}

function logAuditEvent(event: BridgeAuditEvent): void {
  console.info(
    JSON.stringify({
      event: 'paperclip_payload_bridge',
      ...event,
    }),
  );
}

async function runPreflightGuards({
  request,
  requestId,
  agentId,
  collection,
  op,
}: {
  request: NextRequest;
  requestId: string;
  agentId: string;
  collection: string;
  op: string;
}): Promise<void> {
  void request;
  void requestId;
  void agentId;
  void collection;
  void op;

  // TODO: add per-agent and per-IP rate limiting before exposing this route broadly.
  // TODO: enforce an IP allowlist or private-network ingress for trusted Paperclip traffic.
  // TODO: persist a replay-protection nonce keyed by agent/timestamp/signature before mutation ops.
}

function reportBridgeError(error: unknown): void {
  // TODO: forward bridge failures to Sentry or the production monitoring sink.
  console.error(error);
}
