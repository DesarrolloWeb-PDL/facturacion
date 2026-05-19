import type { SyncCursor, SyncEvent, SyncEventAck } from '@facturacion/contracts';

export type StoredSyncChange = {
  remoteEventId: string;
  organizationId: string;
  entityType: SyncEvent['entityType'];
  entityId: string;
  operation: SyncEvent['operation'];
  committedAt: string;
  source: 'server' | 'device';
  sourceDeviceId?: string;
  payload: unknown;
};

export type RecordSyncEventResult = {
  acknowledgement: SyncEventAck;
};

export type ListRemoteChangesOptions = {
  organizationId: string;
  cursor?: SyncCursor;
  excludeDeviceId?: string;
  limit?: number;
};

export interface SyncRepository {
  recordEvent(event: SyncEvent): Promise<RecordSyncEventResult>;
  listRemoteChanges(options: ListRemoteChangesOptions): Promise<StoredSyncChange[]>;
}