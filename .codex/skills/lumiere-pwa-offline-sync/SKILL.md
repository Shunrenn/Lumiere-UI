---
name: lumiere-pwa-offline-sync
description: Change Lumiere PWA caching or offline queues without breaking checkpoint-based synchronization or user data integrity.
disable-model-invocation: true
---

# Lumiere PWA offline and synchronization

Use this skill for service-worker, local cache, offline queue, or refetch changes.

## Principles

- Local storage and IndexedDB may support UI cache and recoverable queued work; they are not the system of record.
- The API remains authoritative for identity, permissions, inventory, dispatch, and persisted workflow state.
- Synchronization is checkpoint-based: periodic 30-second polling and focus-triggered refetch.
- Never introduce WebSockets, SignalR, Supabase Realtime, or a second durable database to solve cache freshness.

## Safe change sequence

1. Map cache keys, queue payloads, retry logic, and conflict behavior before editing.
2. Make queued mutations idempotent with stable request identifiers where the API supports them.
3. Preserve retry limits, visible failures, and a user path to recover or discard a failed queued action.
4. Invalidate or reconcile cached records after a confirmed server response and on focus/poll checkpoints.
5. Ensure offline data never substitutes for a server authorization decision.

## Verify

Test online creation, transient-network retry, duplicate submission protection, reload recovery, focus refetch, and a denied/expired session. Run `pnpm build`; do not treat it as workflow proof.
