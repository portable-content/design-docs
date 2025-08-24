# Transport Sync Interfaces

## Overview

This document defines the real-time synchronization interfaces that extend the base transport layer to support bidirectional sync capabilities. These interfaces enable real-time content updates, subscriptions, and collaborative features while maintaining transport agnosticism.

## Real-Time Transport Interface

### SyncCapableTransport Interface

```typescript
export interface SyncCapableTransport extends Transport {
  /**
   * Subscribe to content changes for real-time updates
   */
  subscribeToChanges?(
    contentId: string, 
    callback: (change: ContentChange) => void
  ): () => void;
  
  /**
   * Batch sync for offline scenarios
   */
  syncChanges?(changes: ContentChange[]): Promise<SyncResult>;
  
  /**
   * Get sync strategy info
   */
  getSyncCapabilities(): SyncCapabilities;
}

export interface SyncCapabilities {
  realTime: boolean;
  conflictResolution: 'last-write-wins' | 'operational-transform' | 'crdt';
  offlineSupport: boolean;
  changeGranularity: 'document' | 'block' | 'character';
}

export interface SyncResult {
  applied: ContentChange[];
  conflicts: ChangeConflict[];
  rejected: ContentChange[];
}

export interface ContentChange {
  id: string;
  contentId: string;
  blockId?: string;
  changeType: 'create' | 'update' | 'delete' | 'reorder';
  payload: any;
  attribution: ChangeAttribution;
  timestamp: string;
  version: number;
}

export interface ChangeAttribution {
  source: 'user' | 'ai-agent' | 'sync';
  userId?: string;
  deviceId?: string;
  agentId?: string;
}

export interface ChangeConflict {
  contentId: string;
  blockId?: string;
  localChange: ContentChange;
  remoteChange: ContentChange;
  resolutionStrategy: 'manual' | 'auto';
}
```

## API Client Real-Time Extensions

### Real-Time Subscription Methods

```typescript
export interface APIClientSyncExtensions {
  /**
   * Subscribe to content changes (optional, for real-time transports)
   */
  subscribeToContent?(id: string, callback: (content: ContentItem) => void): () => void;
  
  /**
   * Subscribe to search result changes (optional, for real-time transports)
   */
  subscribeToSearch?(
    query: string, 
    options: SearchOptions,
    callback: (results: SearchResult) => void
  ): () => void;
}
```

### Base API Client Real-Time Support

```typescript
export abstract class BaseAPIClient {
  /**
   * Check if real-time subscriptions are supported
   */
  get supportsRealTime(): boolean {
    return typeof this.transport.subscribe === 'function';
  }

  /**
   * Subscribe to content changes (if supported)
   */
  subscribeToContent?(id: string, callback: (content: ContentItem) => void): () => void {
    if (!this.transport.subscribe) {
      throw new Error('Real-time subscriptions not supported by this transport');
    }

    const operation: TransportOperation = {
      type: 'subscription',
      name: 'contentUpdated',
      document: CONTENT_SUBSCRIPTION
    };

    return this.transport.subscribe(operation, { id }, callback);
  }

  /**
   * Subscribe to search changes (if supported)
   */
  subscribeToSearch?(
    query: string,
    options: SearchOptions,
    callback: (results: SearchResult) => void
  ): () => void {
    if (!this.transport.subscribe) {
      throw new Error('Real-time subscriptions not supported by this transport');
    }

    const operation: TransportOperation = {
      type: 'subscription',
      name: 'searchUpdated',
      document: SEARCH_SUBSCRIPTION
    };

    return this.transport.subscribe(operation, { query, options }, callback);
  }
}
```

## Client Real-Time Integration

### PortableContentClient Extensions

```typescript
export class PortableContentClient {
  /**
   * Subscribe to content changes (if supported by transport)
   */
  subscribeToContent(id: string, callback: (content: ContentItem) => void): () => void {
    if (!this.apiClient.subscribeToContent) {
      throw new Error('Real-time subscriptions not supported by this transport');
    }
    
    return this.apiClient.subscribeToContent(id, callback);
  }

  /**
   * Subscribe to search result changes (if supported by transport)
   */
  subscribeToSearch(
    query: string,
    options: SearchOptions,
    callback: (results: SearchResult) => void
  ): () => void {
    if (!this.apiClient.subscribeToSearch) {
      throw new Error('Real-time search subscriptions not supported by this transport');
    }
    
    return this.apiClient.subscribeToSearch(query, options, callback);
  }

  /**
   * Check if real-time subscriptions are supported
   */
  get supportsRealTime(): boolean {
    return typeof this.apiClient.subscribeToContent === 'function';
  }

  /**
   * Check if real-time search is supported
   */
  get supportsRealTimeSearch(): boolean {
    return typeof this.apiClient.subscribeToSearch === 'function';
  }
}
```

## Transport Operation Extensions

### Real-Time Transport Operations

```typescript
export interface Transport {
  request<TData>(operation: TransportOperation, variables?: any): Promise<TData>;
  
  /**
   * Subscribe to real-time updates (optional)
   */
  subscribe?<TData = any>(
    operation: TransportOperation,
    variables?: any,
    callback?: (data: TData) => void
  ): () => void;
  
  isReady(): boolean;
  close?(): void;
}
```

## Usage Examples

### Basic Real-Time Subscription

```typescript
// Check if transport supports real-time
if (client.supportsRealTime) {
  // Subscribe to content changes
  const unsubscribe = client.subscribeToContent('content-123', (updatedContent) => {
    console.log('Content updated:', updatedContent);
    // Update UI with new content
  });
  
  // Cleanup subscription
  // unsubscribe();
}
```

### Real-Time Search

```typescript
// Subscribe to search result changes
if (client.supportsRealTimeSearch) {
  const unsubscribe = client.subscribeToSearch(
    'search query',
    { limit: 10 },
    (results) => {
      console.log('Search results updated:', results);
      // Update search UI
    }
  );
}
```

## Integration Notes

- These interfaces extend the base transport layer without breaking existing functionality
- Real-time features are optional and gracefully degrade when not supported
- Transport implementations can choose which real-time features to support
- The sync capabilities interface allows clients to adapt behavior based on transport features

## Related Documents

- [Sync Architecture Design](./sync-architecture-design.md) - Overall sync architecture
- [GraphQL Sync Transport](./graphql-sync-transport.md) - GraphQL-specific sync implementation
- [Task 3a: Transport Interface](../task-3a-transport-interface.md) - Base transport interface
