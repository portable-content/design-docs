# GraphQL Sync Transport

## Overview

This document outlines the GraphQL-specific implementation of real-time synchronization features using GraphQL subscriptions. It extends the base GraphQL transport to support bidirectional sync capabilities for collaborative content editing.

## GraphQL Subscriptions for Real-Time Sync

### Content Change Subscriptions

```graphql
# Content update subscription
subscription ContentUpdated($contentId: ID!) {
  contentUpdated(contentId: $contentId) {
    id
    title
    type
    summary
    blocks {
      id
      kind
      variants {
        id
        type
        payload
        capabilities
      }
    }
    representations {
      type
      data
    }
    createdAt
    updatedAt
    createdBy
  }
}

# Block-level change subscription
subscription BlockUpdated($contentId: ID!, $blockId: ID!) {
  blockUpdated(contentId: $contentId, blockId: $blockId) {
    id
    kind
    variants {
      id
      type
      payload
      capabilities
    }
    updatedAt
    updatedBy
  }
}

# Search result subscription
subscription SearchUpdated($query: String!, $options: SearchOptionsInput) {
  searchUpdated(query: $query, options: $options) {
    items {
      id
      title
      type
      summary
      score
      highlights
    }
    total
    hasMore
  }
}
```

### Sync Event Subscriptions

```graphql
# Generic sync event subscription
subscription SyncEvents($contentId: ID!) {
  syncEvents(contentId: $contentId) {
    id
    type
    contentId
    blockId
    changeType
    payload
    attribution {
      source
      userId
      deviceId
      agentId
    }
    timestamp
    version
  }
}

# AI agent activity subscription
subscription AIAgentActivity($contentId: ID!) {
  aiAgentActivity(contentId: $contentId) {
    agentId
    activity
    contentId
    blockId
    status
    timestamp
  }
}
```

## GraphQL Transport Sync Implementation

### Enhanced GraphQL Transport

```typescript
export class GraphQLSyncTransport extends GraphQLTransport implements SyncCapableTransport {
  private subscriptions = new Map<string, () => void>();

  subscribeToChanges(contentId: string, callback: (change: ContentChange) => void): () => void {
    const operation: TransportOperation = {
      type: 'subscription',
      name: 'SyncEvents',
      document: SYNC_EVENTS_SUBSCRIPTION
    };

    const unsubscribe = this.subscribe(operation, { contentId }, (data: any) => {
      const change: ContentChange = {
        id: data.syncEvents.id,
        contentId: data.syncEvents.contentId,
        blockId: data.syncEvents.blockId,
        changeType: data.syncEvents.changeType,
        payload: data.syncEvents.payload,
        attribution: data.syncEvents.attribution,
        timestamp: data.syncEvents.timestamp,
        version: data.syncEvents.version
      };
      callback(change);
    });

    this.subscriptions.set(contentId, unsubscribe);
    return unsubscribe;
  }

  async syncChanges(changes: ContentChange[]): Promise<SyncResult> {
    const operation: TransportOperation = {
      type: 'mutation',
      name: 'SyncChanges',
      document: SYNC_CHANGES_MUTATION
    };

    const result = await this.request(operation, { changes });
    return {
      applied: result.syncChanges.applied,
      conflicts: result.syncChanges.conflicts,
      rejected: result.syncChanges.rejected
    };
  }

  getSyncCapabilities(): SyncCapabilities {
    return {
      realTime: true,
      conflictResolution: 'operational-transform',
      offlineSupport: true,
      changeGranularity: 'block'
    };
  }
}
```

### GraphQL Subscription Mutations

```graphql
# Sync changes mutation
mutation SyncChanges($changes: [ContentChangeInput!]!) {
  syncChanges(changes: $changes) {
    applied {
      id
      contentId
      changeType
      timestamp
    }
    conflicts {
      contentId
      blockId
      localChange {
        id
        changeType
        payload
      }
      remoteChange {
        id
        changeType
        payload
      }
      resolutionStrategy
    }
    rejected {
      id
      reason
    }
  }
}

# Apply AI agent change
mutation ApplyAIChange($change: AIChangeInput!) {
  applyAIChange(change: $change) {
    success
    contentId
    blockId
    version
    conflicts {
      type
      description
      resolution
    }
  }
}
```

## Apollo Client Sync Integration

### Apollo Subscription Setup

```typescript
export class ApolloSyncAdapter extends ApolloGraphQLAdapter {
  subscribeToContent(contentId: string, callback: (content: ContentItem) => void): () => void {
    const subscription = this.apolloClient.subscribe({
      query: CONTENT_UPDATED_SUBSCRIPTION,
      variables: { contentId }
    });

    const subscriptionRef = subscription.subscribe({
      next: (result) => {
        if (result.data?.contentUpdated) {
          callback(result.data.contentUpdated);
        }
      },
      error: (error) => {
        console.error('Content subscription error:', error);
      }
    });

    return () => subscriptionRef.unsubscribe();
  }

  subscribeToSyncEvents(contentId: string, callback: (change: ContentChange) => void): () => void {
    const subscription = this.apolloClient.subscribe({
      query: SYNC_EVENTS_SUBSCRIPTION,
      variables: { contentId }
    });

    const subscriptionRef = subscription.subscribe({
      next: (result) => {
        if (result.data?.syncEvents) {
          const change = this.transformSyncEvent(result.data.syncEvents);
          callback(change);
        }
      },
      error: (error) => {
        console.error('Sync events subscription error:', error);
      }
    });

    return () => subscriptionRef.unsubscribe();
  }

  private transformSyncEvent(event: any): ContentChange {
    return {
      id: event.id,
      contentId: event.contentId,
      blockId: event.blockId,
      changeType: event.changeType,
      payload: event.payload,
      attribution: event.attribution,
      timestamp: event.timestamp,
      version: event.version
    };
  }
}
```

## urql Sync Integration

### urql Subscription Setup

```typescript
export class UrqlSyncAdapter extends UrqlGraphQLAdapter {
  subscribeToContent(contentId: string, callback: (content: ContentItem) => void): () => void {
    const { unsubscribe } = pipe(
      this.urqlClient.subscription(CONTENT_UPDATED_SUBSCRIPTION, { contentId }),
      subscribe((result) => {
        if (result.data?.contentUpdated) {
          callback(result.data.contentUpdated);
        }
      })
    );

    return unsubscribe;
  }

  subscribeToSyncEvents(contentId: string, callback: (change: ContentChange) => void): () => void {
    const { unsubscribe } = pipe(
      this.urqlClient.subscription(SYNC_EVENTS_SUBSCRIPTION, { contentId }),
      subscribe((result) => {
        if (result.data?.syncEvents) {
          const change = this.transformSyncEvent(result.data.syncEvents);
          callback(change);
        }
      })
    );

    return unsubscribe;
  }
}
```

## GraphQL Schema Extensions

### Sync-Related Types

```graphql
# Sync event type
type SyncEvent {
  id: ID!
  type: SyncEventType!
  contentId: ID!
  blockId: ID
  changeType: ChangeType!
  payload: JSON!
  attribution: ChangeAttribution!
  timestamp: DateTime!
  version: Int!
}

enum SyncEventType {
  CONTENT_CHANGE
  BLOCK_CHANGE
  VARIANT_REFRESH
  CONFLICT_RESOLUTION
}

enum ChangeType {
  CREATE
  UPDATE
  DELETE
  REORDER
}

type ChangeAttribution {
  source: AttributionSource!
  userId: ID
  deviceId: String
  agentId: String
}

enum AttributionSource {
  USER
  AI_AGENT
  SYNC
  SYSTEM
}

# AI agent activity
type AIAgentActivity {
  agentId: ID!
  activity: AIActivityType!
  contentId: ID!
  blockId: ID
  status: AIActivityStatus!
  timestamp: DateTime!
}

enum AIActivityType {
  ANALYZING
  GENERATING
  ENHANCING
  REVIEWING
}

enum AIActivityStatus {
  STARTED
  IN_PROGRESS
  COMPLETED
  FAILED
}
```

## Testing GraphQL Sync

### Subscription Testing

```typescript
describe('GraphQL Sync Transport', () => {
  test('should subscribe to content changes', async () => {
    const mockSubscription = {
      subscribe: jest.fn().mockReturnValue({
        unsubscribe: jest.fn()
      })
    };

    mockApolloClient.subscribe.mockReturnValue(mockSubscription);

    const callback = jest.fn();
    const unsubscribe = transport.subscribeToContent('content-123', callback);

    expect(mockApolloClient.subscribe).toHaveBeenCalledWith({
      query: CONTENT_UPDATED_SUBSCRIPTION,
      variables: { contentId: 'content-123' }
    });

    // Simulate subscription data
    const subscribeCallback = mockSubscription.subscribe.mock.calls[0][0];
    subscribeCallback.next({
      data: {
        contentUpdated: {
          id: 'content-123',
          title: 'Updated Content'
        }
      }
    });

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'content-123',
        title: 'Updated Content'
      })
    );

    unsubscribe();
  });

  test('should handle sync events', async () => {
    const callback = jest.fn();
    const unsubscribe = transport.subscribeToSyncEvents('content-123', callback);

    // Simulate sync event
    const subscribeCallback = mockSubscription.subscribe.mock.calls[0][0];
    subscribeCallback.next({
      data: {
        syncEvents: {
          id: 'event-123',
          contentId: 'content-123',
          changeType: 'UPDATE',
          attribution: { source: 'USER' }
        }
      }
    });

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'event-123',
        contentId: 'content-123',
        changeType: 'UPDATE'
      })
    );
  });
});
```

## Related Documents

- [Transport Sync Interfaces](./transport-sync-interfaces.md) - Base sync interfaces
- [Sync Architecture Design](./sync-architecture-design.md) - Overall sync architecture
- [Task 4a: GraphQL Transport](../task-4a-graphql-transport.md) - Base GraphQL transport implementation
