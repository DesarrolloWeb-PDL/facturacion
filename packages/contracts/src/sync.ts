import { z } from 'zod';

const syncEntityTypeSchema = z.enum(['client', 'voucher', 'voucher_status', 'organization']);
const syncOperationSchema = z.enum(['upsert', 'delete']);
const syncAckStatusSchema = z.enum(['accepted', 'duplicate', 'rejected']);

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)]),
);

const syncCursorSchema = z.object({
  lastRemoteEventId: z.string().uuid().optional(),
  lastSyncedAt: z.string().datetime().optional(),
});

const syncActorSchema = z.object({
  deviceId: z.string().uuid(),
  userId: z.string().uuid().optional(),
});

export const syncEventSchema = z.object({
  eventId: z.string().uuid(),
  organizationId: z.string().uuid(),
  entityType: syncEntityTypeSchema,
  entityId: z.string().min(1).max(120),
  operation: syncOperationSchema,
  occurredAt: z.string().datetime(),
  actor: syncActorSchema,
  payload: jsonValueSchema,
});

export const syncBatchInputSchema = z.object({
  organizationId: z.string().uuid(),
  actor: syncActorSchema,
  cursor: syncCursorSchema.optional(),
  events: z.array(syncEventSchema).max(100).default([]),
});

export const syncEventAckSchema = z.object({
  eventId: z.string().uuid(),
  status: syncAckStatusSchema,
  reason: z.string().trim().min(1).max(240).optional(),
  acceptedAt: z.string().datetime().optional(),
});

export const remoteSyncChangeSchema = z.object({
  remoteEventId: z.string().uuid(),
  organizationId: z.string().uuid(),
  entityType: syncEntityTypeSchema,
  entityId: z.string().min(1).max(120),
  operation: syncOperationSchema,
  committedAt: z.string().datetime(),
  source: z.enum(['server', 'device']),
  payload: jsonValueSchema,
});

export const syncBatchResponseSchema = z.object({
  acknowledgements: z.array(syncEventAckSchema),
  remoteChanges: z.array(remoteSyncChangeSchema),
  nextCursor: syncCursorSchema,
  serverTime: z.string().datetime(),
});

export type SyncEntityType = z.infer<typeof syncEntityTypeSchema>;
export type SyncOperation = z.infer<typeof syncOperationSchema>;
export type SyncCursor = z.infer<typeof syncCursorSchema>;
export type SyncActor = z.infer<typeof syncActorSchema>;
export type SyncEvent = z.infer<typeof syncEventSchema>;
export type SyncBatchInput = z.infer<typeof syncBatchInputSchema>;
export type SyncEventAck = z.infer<typeof syncEventAckSchema>;
export type RemoteSyncChange = z.infer<typeof remoteSyncChangeSchema>;
export type SyncBatchResponse = z.infer<typeof syncBatchResponseSchema>;