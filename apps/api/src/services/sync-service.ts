import type { SyncBatchInput, SyncBatchResponse } from '@facturacion/contracts';

import type { StoredSyncChange, SyncRepository } from '../repositories/sync-repository.js';

export class SyncService {
  constructor(private readonly repository: SyncRepository) {}

  async syncBatch(input: SyncBatchInput): Promise<SyncBatchResponse> {
    const acknowledgements = [] as SyncBatchResponse['acknowledgements'];

    for (const event of input.events) {
      const result = await this.repository.recordEvent(event);
      acknowledgements.push(result.acknowledgement);
    }

    const remoteChanges = await this.repository.listRemoteChanges({
      organizationId: input.organizationId,
      cursor: input.cursor,
      excludeDeviceId: input.actor.deviceId,
      limit: 100,
    });

    return {
      acknowledgements,
      remoteChanges: remoteChanges.map(mapRemoteChange),
      nextCursor: resolveNextCursor(input, remoteChanges),
      serverTime: new Date().toISOString(),
    };
  }
}

function mapRemoteChange(change: StoredSyncChange): SyncBatchResponse['remoteChanges'][number] {
  return {
    remoteEventId: change.remoteEventId,
    organizationId: change.organizationId,
    entityType: change.entityType,
    entityId: change.entityId,
    operation: change.operation,
    committedAt: change.committedAt,
    source: change.source,
    payload: change.payload,
  };
}

function resolveNextCursor(input: SyncBatchInput, remoteChanges: StoredSyncChange[]): SyncBatchResponse['nextCursor'] {
  const lastRemoteChange = remoteChanges.at(-1);

  if (!lastRemoteChange) {
    return {
      lastRemoteEventId: input.cursor?.lastRemoteEventId,
      lastSyncedAt: input.cursor?.lastSyncedAt,
    };
  }

  return {
    lastRemoteEventId: lastRemoteChange.remoteEventId,
    lastSyncedAt: lastRemoteChange.committedAt,
  };
}