import { Pool } from 'pg';

import type { SyncEvent } from '@facturacion/contracts';

import type { ListRemoteChangesOptions, RecordSyncEventResult, StoredSyncChange, SyncRepository } from './sync-repository.js';

export class PostgresSyncRepository implements SyncRepository {
  constructor(private readonly pool: Pool) {}

  async recordEvent(event: SyncEvent): Promise<RecordSyncEventResult> {
    try {
      const acceptedAt = new Date().toISOString();

      await this.pool.query(
        `
          insert into sync_inbox (id, organization_id, device_id, event_type, payload, received_at, applied_at)
          values ($1, $2, $3, $4, $5::jsonb, $6, $6)
        `,
        [
          event.eventId,
          event.organizationId,
          event.actor.deviceId,
          buildEventType(event),
          JSON.stringify(event),
          acceptedAt,
        ],
      );

      return {
        acknowledgement: {
          eventId: event.eventId,
          status: 'accepted',
          acceptedAt,
        },
      };
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return {
          acknowledgement: {
            eventId: event.eventId,
            status: 'duplicate',
            reason: 'El evento ya habia sido procesado previamente.',
          },
        };
      }

      throw error;
    }
  }

  async listRemoteChanges(options: ListRemoteChangesOptions): Promise<StoredSyncChange[]> {
    const result = await this.pool.query<{
      remote_event_id: string;
      organization_id: string;
      entity_type: SyncEvent['entityType'];
      entity_id: string;
      operation: SyncEvent['operation'];
      committed_at: string;
      source_device_id: string | null;
      payload: unknown;
    }>(
      `
        select
          inbox.id::text as remote_event_id,
          inbox.organization_id::text as organization_id,
          inbox.payload ->> 'entityType' as entity_type,
          inbox.payload ->> 'entityId' as entity_id,
          inbox.payload ->> 'operation' as operation,
          inbox.received_at::text as committed_at,
          inbox.device_id::text as source_device_id,
          inbox.payload -> 'payload' as payload
        from sync_inbox inbox
        where inbox.organization_id = $1
          and ($2::uuid is null or inbox.device_id is distinct from $2::uuid)
          and (
            $3::timestamptz is null
            or inbox.received_at > $3::timestamptz
            or (inbox.received_at = $3::timestamptz and inbox.id::text <> coalesce($4::text, ''))
          )
        order by inbox.received_at asc, inbox.id asc
        limit $5
      `,
      [
        options.organizationId,
        options.excludeDeviceId ?? null,
        options.cursor?.lastSyncedAt ?? null,
        options.cursor?.lastRemoteEventId ?? null,
        options.limit ?? 100,
      ],
    );

    return result.rows.map((row) => ({
      remoteEventId: row.remote_event_id,
      organizationId: row.organization_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      operation: row.operation,
      committedAt: row.committed_at,
      source: 'device',
      sourceDeviceId: row.source_device_id ?? undefined,
      payload: row.payload,
    }));
  }
}

function buildEventType(event: SyncEvent) {
  return `${event.entityType}.${event.operation}`;
}

function isDuplicateKeyError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505');
}