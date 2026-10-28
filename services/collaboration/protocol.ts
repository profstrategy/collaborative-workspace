import { z } from "zod";

export const COLLABORATION_PROTOCOL_VERSION = 1;
export const MAX_COLLABORATION_MESSAGE_BYTES = 16 * 1024;

const identifierSchema = z.string().trim().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/);
const envelopeSchema = z.object({
  version: z.number().int().positive(),
  id: z.string().uuid(),
  type: z.string().min(1).max(64),
  sentAt: z.string().datetime(),
}).passthrough();

export const clientMessageSchema = z.discriminatedUnion("type", [
  envelopeSchema.extend({
    type: z.literal("room/join"),
    boardId: identifierSchema,
  }),
  envelopeSchema.extend({
    type: z.literal("room/leave"),
    boardId: identifierSchema,
  }),
  envelopeSchema.extend({
    type: z.literal("heartbeat/ping"),
  }),
]);

const serverEnvelopeSchema = envelopeSchema.extend({
  version: z.literal(COLLABORATION_PROTOCOL_VERSION),
});

export const serverMessageSchema = z.discriminatedUnion("type", [
  serverEnvelopeSchema.extend({
    type: z.literal("connection/ready"),
    connectionId: z.string().min(1),
  }),
  envelopeSchema.extend({
    type: z.literal("room/joined"),
    boardId: identifierSchema,
  }),
  envelopeSchema.extend({
    type: z.literal("room/left"),
    boardId: identifierSchema,
  }),
  envelopeSchema.extend({
    type: z.literal("heartbeat/pong"),
    replyTo: z.string().uuid(),
  }),
  envelopeSchema.extend({
    type: z.literal("server/error"),
    code: z.enum(["INVALID_MESSAGE", "UNSUPPORTED_VERSION", "UNKNOWN_TYPE", "NOT_ALLOWED", "INTERNAL_ERROR"]),
    message: z.string().max(256),
    replyTo: z.string().uuid().optional(),
  }),
]);

export type ClientCollaborationMessage = z.infer<typeof clientMessageSchema>;
export type ServerCollaborationMessage = z.infer<typeof serverMessageSchema>;
export type CollaborationConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export type ParsedClientMessage =
  | { success: true; data: ClientCollaborationMessage }
  | { success: false; reason: "oversized" | "invalid-json" | "invalid-envelope" | "unsupported-version" | "unknown-type" };

export function parseClientMessage(raw: string | ArrayBuffer | ArrayBufferView): ParsedClientMessage {
  let text: string;
  if (typeof raw === "string") {
    text = raw;
  } else if (raw instanceof ArrayBuffer) {
    if (raw.byteLength > MAX_COLLABORATION_MESSAGE_BYTES) return { success: false, reason: "oversized" };
    text = new TextDecoder().decode(raw);
  } else {
    if (raw.byteLength > MAX_COLLABORATION_MESSAGE_BYTES) return { success: false, reason: "oversized" };
    text = new TextDecoder().decode(raw);
  }

  if (new TextEncoder().encode(text).byteLength > MAX_COLLABORATION_MESSAGE_BYTES) {
    return { success: false, reason: "oversized" };
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { success: false, reason: "invalid-json" };
  }

  const envelope = envelopeSchema.safeParse(value);
  if (!envelope.success) return { success: false, reason: "invalid-envelope" };
  if (envelope.data.version !== COLLABORATION_PROTOCOL_VERSION) {
    return { success: false, reason: "unsupported-version" };
  }

  const message = clientMessageSchema.safeParse(value);
  if (message.success) return { success: true, data: message.data };

  const type = (value as { type?: unknown }).type;
  if (typeof type !== "string" || !["room/join", "room/leave", "heartbeat/ping"].includes(type)) {
    return { success: false, reason: "unknown-type" };
  }
  return { success: false, reason: "invalid-envelope" };
}

export function createClientMessage<T extends ClientCollaborationMessage["type"]>(
  type: T,
  fields: Omit<Extract<ClientCollaborationMessage, { type: T }>, "version" | "id" | "type" | "sentAt">,
): Extract<ClientCollaborationMessage, { type: T }> {
  return {
    version: COLLABORATION_PROTOCOL_VERSION,
    id: crypto.randomUUID(),
    type,
    sentAt: new Date().toISOString(),
    ...fields,
  } as Extract<ClientCollaborationMessage, { type: T }>;
}

export function createServerMessage<T extends ServerCollaborationMessage["type"]>(
  type: T,
  fields: Omit<Extract<ServerCollaborationMessage, { type: T }>, "version" | "id" | "type" | "sentAt">,
): Extract<ServerCollaborationMessage, { type: T }> {
  return {
    version: COLLABORATION_PROTOCOL_VERSION,
    id: crypto.randomUUID(),
    type,
    sentAt: new Date().toISOString(),
    ...fields,
  } as Extract<ServerCollaborationMessage, { type: T }>;
}
