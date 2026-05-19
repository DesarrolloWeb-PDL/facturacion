import type { SyncEvent } from '@facturacion/contracts';

import type { ListRemoteChangesOptions, RecordSyncEventResult, StoredSyncChange, SyncRepository } from './sync-repository.js';

export class MemorySyncRepository implements SyncRepository {
  private readonly changesByEventId = new Map<string, StoredSyncChange>();
  private readonly organizationChanges = new Map<string, StoredSyncChange[]>();

  async recordEvent(event: SyncEvent): Promise<RecordSyncEventResult> {
    const existing = this.changesByEventId.get(event.eventId);

    if (existing) {
      return {
        acknowledgement: {
          eventId: event.eventId,
          status: 'duplicate',
          reason: 'El evento ya habia sido procesado previamente.',
        },
      };
    }

    const committedAt = new Date().toISOString();
    const stored: StoredSyncChange = {
      remoteEventId: event.eventId,
      organizationId: event.organizationId,
      entityType: event.entityType,
      entityId: event.entityId,
      operation: event.operation,
      committedAt,
      source: 'device',
      sourceDeviceId: event.actor.deviceId,
      payload: event.payload,
    };

    this.changesByEventId.set(event.eventId, stored);

    const organizationChanges = this.organizationChanges.get(event.organizationId) ?? [];
    organizationChanges.push(stored);
    this.organizationChanges.set(event.organizationId, organizationChanges);

    return {
      acknowledgement: {
        eventId: event.eventId,
        status: 'accepted',
        acceptedAt: committedAt,
      },
    };
  }

  async listRemoteChanges(options: ListRemoteChangesOptions): Promise<StoredSyncChange[]> {
    const changes = this.organizationChanges.get(options.organizationId) ?? [];
    const limit = options.limit ?? 100;

    return changes
      .filter((change) => !options.excludeDeviceId || change.sourceDeviceId !== options.excludeDeviceId)
      .filter((change) => isChangeAfterCursor(change, options.cursor))
      .slice(0, limit);
  }
}

function isChangeAfterCursor(change: StoredSyncChange, cursor?: ListRemoteChangesOptions['cursor']) {
  if (!cursor?.lastSyncedAt) {
    return true;
  }

  if (change.committedAt > cursor.lastSyncedAt) {
    return true;
  }

  if (change.committedAt < cursor.lastSyncedAt) {
    return false;
  }

  if (!cursor.lastRemoteEventId) {
    return false;
  }

  return change.remoteEventId !== cursor.lastRemoteEventId;
}