# Synchronization Architecture Design

## Overview

This document outlines the synchronization architecture for the Portable Content SDK to support multi-source, multi-device collaborative content editing with real-time synchronization. The design maintains transport agnosticism while enabling sophisticated collaborative features.

## Use Case Requirements

### Bidirectional Synchronization Hub

The system requires **three-way synchronization** between:

1. **Client UI** (User Interface)
   - User makes changes through traditional UI
   - Needs to receive updates from AI agent
   - Needs to sync with persistence layer

2. **AI Agent** (Autonomous Content Modification)
   - AI agent modifies content on behalf of user
   - Needs to receive user changes to maintain context
   - Needs to sync with persistence layer

3. **Persistence Layer** (Server-Side Storage)
   - Central source of truth for content state
   - Receives changes from both client and AI agent
   - Broadcasts changes to all connected entities

### Synchronization Flows

```
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│   Client    │◄──►│   Persistence   │◄──►│  AI Agent   │
│     UI      │    │     Layer       │    │             │
└─────────────┘    └─────────────────┘    └─────────────┘
       ▲                     ▲                     ▲
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             │
                    ┌─────────────────┐
                    │  Sync Engine    │
                    │ (Orchestrator)  │
                    └─────────────────┘
```

**Flow Examples:**
- **User → Persistence → AI Agent**: User edits content, AI agent sees changes and can respond
- **AI Agent → Persistence → User**: AI agent modifies content, user sees updates in real-time
- **Persistence → Both**: Server-side changes (from other users/devices) propagate to both client and AI agent

### Synchronization Goals
- **Bidirectional real-time updates**: All entities stay synchronized
- **Context awareness**: AI agent maintains awareness of user changes
- **Conflict resolution**: Handle concurrent modifications from multiple sources
- **Attribution tracking**: Know who/what made each change
- **Event ordering**: Maintain causal consistency across all entities

## Bidirectional Sync Architecture

### Core Sync Hub Pattern

The recommended architecture uses a **Sync Hub** that orchestrates bidirectional communication:

```typescript
export interface SyncHub {
  // Register different types of sync participants
  registerClient(clientId: string, transport: SyncCapableTransport): void;
  registerAIAgent(agentId: string, transport: SyncCapableTransport): void;
  registerPersistence(transport: SyncCapableTransport): void;

  // Broadcast changes to all relevant participants
  broadcastChange(change: ContentChange, excludeSource?: string): Promise<void>;

  // Handle bidirectional sync flows
  syncFromClient(change: ContentChange): Promise<SyncResult>;
  syncFromAIAgent(change: ContentChange): Promise<SyncResult>;
  syncFromPersistence(change: ContentChange): Promise<SyncResult>;
}
```

### Option 1: Event-Driven Bidirectional Sync (Recommended)

Enhanced synchronization layer supporting bidirectional communication:

```typescript
// Enhanced sync interfaces for bidirectional communication
export interface BidirectionalSyncManager {
  // Subscribe to content changes from any source
  subscribeToContent(contentId: string, callback: (change: ContentChange) => void): () => void;

  // Apply changes with source attribution and bidirectional sync
  applyChange(change: ContentChange, syncTargets?: SyncTarget[]): Promise<SyncResult>;

  // Handle conflicts when they occur
  resolveConflict(conflict: ChangeConflict): Promise<ContentItem>;

  // Get current sync status across all participants
  getSyncStatus(contentId: string): BidirectionalSyncStatus;

  // Enable/disable sync with specific targets
  configureSyncTargets(targets: SyncTargetConfig[]): void;
}

export interface SyncTarget {
  type: 'client' | 'ai-agent' | 'persistence' | 'other-user';
  id: string;
  transport: SyncCapableTransport;
}

export interface BidirectionalSyncStatus extends SyncStatus {
  participants: {
    clients: ParticipantStatus[];
    aiAgents: ParticipantStatus[];
    persistence: ParticipantStatus;
  };
}

export interface ParticipantStatus {
  id: string;
  state: 'connected' | 'disconnected' | 'syncing' | 'conflict';
  lastSync: string;
  pendingChanges: number;
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

export interface SyncStatus {
  state: 'synced' | 'syncing' | 'conflict' | 'offline';
  lastSync: string;
  pendingChanges: number;
  conflicts: ChangeConflict[];
}

export interface ChangeConflict {
  contentId: string;
  blockId?: string;
  localChange: ContentChange;
  remoteChange: ContentChange;
  resolutionStrategy: 'manual' | 'auto';
}
```

### Option 2: Observable Content State

Make content items observable with automatic synchronization:

```typescript
export interface ObservableContentItem extends ContentItem {
  // Subscribe to any changes on this content
  subscribe(callback: (item: ContentItem, change: ContentChange) => void): () => void;
  
  // Get real-time sync status
  syncStatus: Observable<SyncStatus>;
  
  // Apply optimistic updates
  updateBlock(blockId: string, payload: any, optimistic?: boolean): Promise<void>;
  
  // Get change history
  getChangeHistory(): ContentChange[];
}

// Usage example
const content = await client.getObservableContent(id);
content.subscribe((updatedContent, change) => {
  console.log(`Content updated by ${change.attribution.source}`);
  // Update UI automatically
});
```

### Option 3: Multi-Strategy Sync Transport

Extend the transport interface to support different sync strategies:

```typescript
export interface SyncCapableTransport extends Transport {
  // Real-time subscription capabilities
  subscribeToChanges?(
    contentId: string, 
    callback: (change: ContentChange) => void
  ): () => void;
  
  // Batch sync for offline scenarios
  syncChanges?(changes: ContentChange[]): Promise<SyncResult>;
  
  // Get sync strategy info
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

// Different transport implementations
const webSocketTransport = new WebSocketSyncTransport(wsUrl);
const pollingTransport = new PollingTransport(apiUrl, { interval: 5000 });
const hybridTransport = new HybridSyncTransport([webSocketTransport, pollingTransport]);
```

## Bidirectional Synchronization Strategies

### 1. Hub-and-Spoke Pattern

Central sync hub coordinates all bidirectional communication:

```typescript
export class SyncHub {
  private participants = new Map<string, SyncParticipant>();
  private persistenceLayer: SyncParticipant;

  // Register participants
  registerClient(clientId: string, transport: SyncCapableTransport): void {
    this.participants.set(clientId, {
      id: clientId,
      type: 'client',
      transport,
      lastSync: new Date().toISOString()
    });
  }

  registerAIAgent(agentId: string, transport: SyncCapableTransport): void {
    this.participants.set(agentId, {
      id: agentId,
      type: 'ai-agent',
      transport,
      lastSync: new Date().toISOString()
    });
  }

  // Handle bidirectional sync flows
  async syncFromClient(change: ContentChange): Promise<SyncResult> {
    // 1. Apply to persistence layer
    await this.persistenceLayer.transport.request({
      type: 'mutation',
      name: 'applyChange',
      variables: { change }
    });

    // 2. Broadcast to AI agents (exclude source client)
    const aiAgents = Array.from(this.participants.values())
      .filter(p => p.type === 'ai-agent');

    const results = await Promise.allSettled(
      aiAgents.map(agent =>
        agent.transport.request({
          type: 'mutation',
          name: 'receiveChange',
          variables: { change }
        })
      )
    );

    return this.buildSyncResult(results);
  }

  async syncFromAIAgent(change: ContentChange): Promise<SyncResult> {
    // 1. Apply to persistence layer
    await this.persistenceLayer.transport.request({
      type: 'mutation',
      name: 'applyChange',
      variables: { change }
    });

    // 2. Broadcast to clients (exclude source agent)
    const clients = Array.from(this.participants.values())
      .filter(p => p.type === 'client');

    const results = await Promise.allSettled(
      clients.map(client =>
        client.transport.subscribeToChanges?.(change.contentId, (receivedChange) => {
          // Client receives AI agent change
          this.handleClientReceiveChange(client.id, receivedChange);
        })
      )
    );

    return this.buildSyncResult(results);
  }
}

interface SyncParticipant {
  id: string;
  type: 'client' | 'ai-agent' | 'persistence';
  transport: SyncCapableTransport;
  lastSync: string;
}
```

### 2. Peer-to-Peer with Persistence Coordination

Direct communication between client and AI agent, coordinated through persistence:

```typescript
export class P2PSyncManager {
  constructor(
    private clientTransport: SyncCapableTransport,
    private aiAgentTransport: SyncCapableTransport,
    private persistenceTransport: SyncCapableTransport
  ) {}

  async applyClientChange(change: ContentChange): Promise<SyncResult> {
    // Optimistic update pattern
    const results: SyncResult = { applied: [], conflicts: [], rejected: [] };

    try {
      // 1. Apply locally (optimistic)
      await this.applyLocalChange(change);

      // 2. Sync with persistence (authoritative)
      const persistenceResult = await this.persistenceTransport.request({
        type: 'mutation',
        name: 'applyChange',
        variables: { change }
      });

      if (persistenceResult.conflicts?.length > 0) {
        // Handle conflicts with persistence
        await this.resolveConflicts(persistenceResult.conflicts);
      }

      // 3. Notify AI agent directly
      if (this.aiAgentTransport.subscribeToChanges) {
        await this.notifyAIAgent(change);
      }

      results.applied.push(change);
    } catch (error) {
      // Rollback optimistic update
      await this.rollbackLocalChange(change);
      results.rejected.push(change);
    }

    return results;
  }

  async receiveAIAgentChange(change: ContentChange): Promise<void> {
    // AI agent change received
    // 1. Validate against current state
    const isValid = await this.validateChange(change);

    if (isValid) {
      // 2. Apply change locally
      await this.applyLocalChange(change);

      // 3. Confirm with persistence
      await this.persistenceTransport.request({
        type: 'mutation',
        name: 'confirmChange',
        variables: { change }
      });
    } else {
      // Request full sync to resolve inconsistency
      await this.requestFullSync(change.contentId);
    }
  }
}
```

## Transport-Specific Synchronization Strategies

### 1. WebSocket-Based Real-Time Sync

```typescript
export class WebSocketSyncTransport implements SyncCapableTransport {
  private ws: WebSocket;
  private changeCallbacks = new Map<string, Set<Function>>();

  subscribeToChanges(contentId: string, callback: (change: ContentChange) => void) {
    // Subscribe to WebSocket messages for this content
    this.ws.addEventListener('message', (event) => {
      const change = JSON.parse(event.data);
      if (change.contentId === contentId) {
        callback(change);
      }
    });

    return () => {
      // Cleanup subscription
    };
  }

  async applyChange(change: ContentChange): Promise<void> {
    // Send change via WebSocket
    this.ws.send(JSON.stringify({
      type: 'content-change',
      change
    }));
  }

  getSyncCapabilities(): SyncCapabilities {
    return {
      realTime: true,
      conflictResolution: 'operational-transform',
      offlineSupport: false,
      changeGranularity: 'block'
    };
  }
}
```

### 2. Server-Sent Events (SSE) Sync

```typescript
export class SSESyncTransport implements SyncCapableTransport {
  private eventSource: EventSource;

  subscribeToChanges(contentId: string, callback: (change: ContentChange) => void) {
    this.eventSource.addEventListener(`content-${contentId}`, (event) => {
      const change = JSON.parse(event.data);
      callback(change);
    });

    return () => {
      this.eventSource.removeEventListener(`content-${contentId}`, callback);
    };
  }

  getSyncCapabilities(): SyncCapabilities {
    return {
      realTime: true,
      conflictResolution: 'last-write-wins',
      offlineSupport: false,
      changeGranularity: 'block'
    };
  }
}
```

### 3. Polling-Based Sync

```typescript
export class PollingSync {
  private intervals = new Map<string, NodeJS.Timeout>();
  private lastSync = new Map<string, string>();

  subscribeToChanges(contentId: string, callback: (change: ContentChange) => void) {
    const interval = setInterval(async () => {
      const changes = await this.transport.request({
        type: 'query',
        name: 'getContentChanges',
        variables: { 
          contentId, 
          since: this.lastSync.get(contentId) 
        }
      });

      changes.forEach((change: ContentChange) => {
        callback(change);
        this.lastSync.set(contentId, change.timestamp);
      });
    }, this.pollInterval);

    this.intervals.set(contentId, interval);

    return () => {
      clearInterval(interval);
      this.intervals.delete(contentId);
    };
  }

  getSyncCapabilities(): SyncCapabilities {
    return {
      realTime: false,
      conflictResolution: 'last-write-wins',
      offlineSupport: true,
      changeGranularity: 'block'
    };
  }
}
```

### 4. Hybrid Sync Strategy

```typescript
export class HybridSyncTransport implements SyncCapableTransport {
  constructor(
    private primaryTransport: SyncCapableTransport,
    private fallbackTransport: SyncCapableTransport
  ) {}

  subscribeToChanges(contentId: string, callback: (change: ContentChange) => void) {
    // Try primary transport first
    if (this.primaryTransport.subscribeToChanges) {
      return this.primaryTransport.subscribeToChanges(contentId, callback);
    }
    
    // Fall back to secondary transport
    return this.fallbackTransport.subscribeToChanges!(contentId, callback);
  }

  async applyChange(change: ContentChange): Promise<void> {
    try {
      await this.primaryTransport.request(/* ... */);
    } catch (error) {
      // Fall back to secondary transport
      await this.fallbackTransport.request(/* ... */);
    }
  }

  getSyncCapabilities(): SyncCapabilities {
    const primary = this.primaryTransport.getSyncCapabilities();
    const fallback = this.fallbackTransport.getSyncCapabilities();
    
    return {
      realTime: primary.realTime || fallback.realTime,
      conflictResolution: primary.conflictResolution,
      offlineSupport: primary.offlineSupport || fallback.offlineSupport,
      changeGranularity: primary.changeGranularity
    };
  }
}
```

## Bidirectional Conflict Resolution

### Three-Way Conflict Scenarios

In bidirectional sync, conflicts can occur between any combination of participants:

1. **Client ↔ AI Agent**: User and AI agent modify same content simultaneously
2. **Client ↔ Persistence**: User change conflicts with server-side change
3. **AI Agent ↔ Persistence**: AI agent change conflicts with server-side change
4. **Three-way conflicts**: All three participants have conflicting changes

### Smart Conflict Resolution for Bidirectional Sync

```typescript
export class BidirectionalConflictResolver implements ConflictResolver {
  resolveConflict(conflicts: MultiPartyConflict): ContentChange {
    const { clientChange, aiAgentChange, persistenceChange } = conflicts;

    // Priority-based resolution with context awareness
    if (this.isAIAssistingUser(clientChange, aiAgentChange)) {
      // AI is helping user - merge intelligently
      return this.mergeAIAssistance(clientChange, aiAgentChange);
    }

    if (this.isAICorrection(aiAgentChange, clientChange)) {
      // AI is correcting user error - prefer AI with user notification
      return this.applyAICorrectionWithNotification(aiAgentChange, clientChange);
    }

    if (this.isUserOverride(clientChange, aiAgentChange)) {
      // User explicitly overriding AI - prefer user
      return clientChange;
    }

    // Default to operational transform for complex conflicts
    return this.operationalTransform(clientChange, aiAgentChange, persistenceChange);
  }

  private isAIAssistingUser(userChange: ContentChange, aiChange: ContentChange): boolean {
    // Check if AI change is complementary to user change
    return aiChange.blockId !== userChange.blockId &&
           this.isTemporallyRelated(userChange, aiChange);
  }

  private mergeAIAssistance(userChange: ContentChange, aiChange: ContentChange): ContentChange {
    // Merge user change with AI assistance
    return {
      ...userChange,
      payload: {
        ...userChange.payload,
        aiEnhancement: aiChange.payload
      },
      attribution: {
        source: 'user',
        userId: userChange.attribution.userId,
        aiAssisted: true,
        aiAgentId: aiChange.attribution.agentId
      }
    };
  }
}

interface MultiPartyConflict {
  contentId: string;
  blockId?: string;
  clientChange?: ContentChange;
  aiAgentChange?: ContentChange;
  persistenceChange?: ContentChange;
  conflictType: 'two-way' | 'three-way';
}
```

### Context-Aware Conflict Resolution

```typescript
export class ContextAwareResolver implements ConflictResolver {
  constructor(private aiContext: AIContextService) {}

  async resolveConflict(conflict: MultiPartyConflict): Promise<ContentChange> {
    // Get AI context about the conflict
    const context = await this.aiContext.analyzeConflict(conflict);

    switch (context.recommendation) {
      case 'prefer-user':
        return conflict.clientChange!;

      case 'prefer-ai':
        return conflict.aiAgentChange!;

      case 'merge-intelligent':
        return await this.intelligentMerge(conflict, context);

      case 'request-user-input':
        return await this.requestUserResolution(conflict);

      default:
        return this.fallbackResolution(conflict);
    }
  }

  private async intelligentMerge(
    conflict: MultiPartyConflict,
    context: ConflictContext
  ): Promise<ContentChange> {
    // Use AI to intelligently merge conflicting changes
    const mergedContent = await this.aiContext.mergeChanges(
      conflict.clientChange!,
      conflict.aiAgentChange!,
      context
    );

    return {
      ...conflict.clientChange!,
      payload: mergedContent,
      attribution: {
        source: 'user',
        userId: conflict.clientChange!.attribution.userId,
        aiMerged: true,
        mergeStrategy: 'intelligent'
      }
    };
  }
}
```

## Conflict Resolution Strategies

### 1. Last-Write-Wins with Attribution

```typescript
export class LastWriteWinsResolver implements ConflictResolver {
  resolveConflict(local: ContentChange, remote: ContentChange): ContentChange {
    // Prefer AI agent changes over user changes in some cases
    if (remote.attribution.source === 'ai-agent' && 
        local.attribution.source === 'user' &&
        this.isAIAssisted(local)) {
      return remote;
    }
    
    // Otherwise, use timestamp
    return remote.timestamp > local.timestamp ? remote : local;
  }

  private isAIAssisted(change: ContentChange): boolean {
    // Logic to determine if this change was AI-assisted
    return change.payload?.aiGenerated === true;
  }
}
```

### 2. Operational Transform

```typescript
export class OperationalTransformResolver implements ConflictResolver {
  resolveConflict(local: ContentChange, remote: ContentChange): ContentChange {
    // Transform operations to maintain consistency
    const transformedLocal = this.transform(local, remote);
    const transformedRemote = this.transform(remote, local);
    
    return this.merge(transformedLocal, transformedRemote);
  }

  private transform(op1: ContentChange, op2: ContentChange): ContentChange {
    // Implement operational transform logic
    // This is a simplified example
    if (op1.changeType === 'update' && op2.changeType === 'update') {
      // Handle concurrent updates
      return this.transformUpdate(op1, op2);
    }
    
    return op1;
  }

  private merge(op1: ContentChange, op2: ContentChange): ContentChange {
    // Merge transformed operations
    return {
      ...op1,
      payload: this.mergePayloads(op1.payload, op2.payload)
    };
  }
}
```

### 3. CRDT-Based Resolution

```typescript
export class CRDTResolver implements ConflictResolver {
  resolveConflict(local: ContentChange, remote: ContentChange): ContentChange {
    // Use CRDT (Conflict-free Replicated Data Type) logic
    const localCRDT = this.toCRDT(local);
    const remoteCRDT = this.toCRDT(remote);
    
    const mergedCRDT = localCRDT.merge(remoteCRDT);
    
    return this.fromCRDT(mergedCRDT);
  }

  private toCRDT(change: ContentChange): CRDT {
    // Convert change to CRDT representation
    return new CRDT(change);
  }

  private fromCRDT(crdt: CRDT): ContentChange {
    // Convert CRDT back to ContentChange
    return crdt.toContentChange();
  }
}
```

## Bidirectional Client Usage Examples

### Client-Side Bidirectional Sync Setup

```typescript
// Set up bidirectional sync client
const clientTransport = new WebSocketSyncTransport('wss://api.example.com/client');
const aiAgentTransport = new WebSocketSyncTransport('wss://api.example.com/ai-agent');
const persistenceTransport = new GraphQLTransport(apolloClient);

const syncHub = new SyncHub();
syncHub.registerClient('user-123-device-456', clientTransport);
syncHub.registerAIAgent('content-assistant-v1', aiAgentTransport);
syncHub.registerPersistence(persistenceTransport);

const client = new PortableContentClient(clientTransport, {
  syncManager: new BidirectionalSyncManager(syncHub)
});
```

### User Makes Change → Syncs to AI Agent

```typescript
// User edits content through UI
const userChange: ContentChange = {
  id: generateChangeId(),
  contentId: 'content-123',
  blockId: 'block-456',
  changeType: 'update',
  payload: {
    source: 'Updated markdown content by user'
  },
  attribution: {
    source: 'user',
    userId: 'user-123',
    deviceId: 'device-456'
  },
  timestamp: new Date().toISOString(),
  version: 5
};

// Apply change with bidirectional sync
const result = await client.syncManager.applyChange(userChange, [
  { type: 'persistence', id: 'main-db', transport: persistenceTransport },
  { type: 'ai-agent', id: 'content-assistant-v1', transport: aiAgentTransport }
]);

console.log(`Change synced to ${result.applied.length} targets`);
```

### AI Agent Makes Change → Syncs to Client

```typescript
// AI agent receives user change and responds
client.syncManager.subscribeToContent('content-123', async (change) => {
  if (change.attribution.source === 'user') {
    console.log('User made change, AI agent can now respond contextually');

    // AI agent generates response based on user change
    const aiResponse: ContentChange = {
      id: generateChangeId(),
      contentId: 'content-123',
      blockId: 'block-789', // New block
      changeType: 'create',
      payload: {
        kind: 'markdown',
        source: `AI response based on user's change: "${change.payload.source}"`
      },
      attribution: {
        source: 'ai-agent',
        agentId: 'content-assistant-v1',
        userId: 'user-123' // On behalf of user
      },
      timestamp: new Date().toISOString(),
      version: 6
    };

    // AI agent change syncs back to client
    await client.syncManager.applyChange(aiResponse, [
      { type: 'persistence', id: 'main-db', transport: persistenceTransport },
      { type: 'client', id: 'user-123-device-456', transport: clientTransport }
    ]);
  }
});
```

### Real-Time Bidirectional Updates

```typescript
// Client receives real-time updates from both AI agent and other sources
client.syncManager.subscribeToContent('content-123', (change) => {
  switch (change.attribution.source) {
    case 'ai-agent':
      // Show AI agent changes with special styling
      showAIGeneratedContent(change);
      showNotification(`AI assistant updated content`, 'ai-update');
      break;

    case 'user':
      if (change.attribution.deviceId !== currentDeviceId) {
        showNotification(`Updated from another device`, 'sync-update');
      }
      break;

    case 'sync':
      // Changes from other users or system
      showNotification(`Content synchronized`, 'system-update');
      break;
  }

  // Update UI with new content
  updateContentDisplay(change);
});
```

### Basic Real-Time Sync

```typescript
// Set up sync-capable client
const syncTransport = new WebSocketSyncTransport('wss://api.example.com/sync');
const client = new PortableContentClient(syncTransport);

// Subscribe to content changes
const unsubscribe = client.subscribeToContentChanges(contentId, (change) => {
  switch (change.attribution.source) {
    case 'ai-agent':
      showNotification(`AI updated ${change.blockId}`);
      break;
    case 'user':
      if (change.attribution.deviceId !== currentDeviceId) {
        showNotification(`Updated from another device`);
      }
      break;
  }
  
  // Update UI
  updateContentDisplay(change);
});
```

### Multi-Device Sync

```typescript
const syncManager = new SyncManager({
  transport: hybridTransport,
  conflictResolver: new SmartConflictResolver(),
  deviceId: generateDeviceId(),
  userId: currentUser.id
});

// Handle optimistic updates
await syncManager.applyChange({
  contentId,
  blockId,
  changeType: 'update',
  payload: newContent,
  attribution: {
    source: 'user',
    userId: currentUser.id,
    deviceId: currentDevice.id
  },
  optimistic: true // Apply immediately, sync later
});
```

### AI Agent Integration

```typescript
// AI agent makes changes
const aiChange: ContentChange = {
  contentId,
  blockId,
  changeType: 'update',
  payload: aiGeneratedContent,
  attribution: {
    source: 'ai-agent',
    agentId: 'content-assistant-v1',
    userId: currentUser.id // On behalf of user
  }
};

await syncManager.applyChange(aiChange);
```

### Offline-First Sync

```typescript
const offlineSync = new OfflineSyncManager({
  storage: new IndexedDBStorage(),
  transport: hybridTransport,
  conflictResolver: new SmartConflictResolver()
});

// Queue changes when offline
await offlineSync.queueChange(change);

// Sync when back online
offlineSync.on('online', async () => {
  const results = await offlineSync.syncPendingChanges();
  console.log(`Synced ${results.applied.length} changes`);

  if (results.conflicts.length > 0) {
    showConflictResolutionUI(results.conflicts);
  }
});
```

### Advanced Conflict Resolution

```typescript
const smartResolver = new SmartConflictResolver({
  strategies: {
    'markdown': new OperationalTransformResolver(),
    'image': new LastWriteWinsResolver(),
    'mermaid': new CRDTResolver()
  },
  userPreferences: {
    aiAgentPriority: 'high',
    autoResolveSimpleConflicts: true
  }
});

const syncManager = new SyncManager({
  transport: webSocketTransport,
  conflictResolver: smartResolver
});

// Handle complex conflicts
syncManager.on('conflict', (conflict: ChangeConflict) => {
  if (conflict.resolutionStrategy === 'manual') {
    showConflictResolutionDialog(conflict);
  }
});
```

## Integration with Existing Architecture

### Transport Layer Integration

The sync architecture integrates seamlessly with the existing transport-agnostic design:

```typescript
// Existing transport interface remains unchanged
export interface Transport {
  request<TData>(operation: TransportOperation, variables?: any): Promise<TData>;
  subscribe?<TData>(operation: TransportOperation, variables?: any, callback?: (data: TData) => void): () => void;
  isReady(): boolean;
  close?(): void;
}

// Sync capabilities are optional extensions
export interface SyncCapableTransport extends Transport {
  subscribeToChanges?(contentId: string, callback: (change: ContentChange) => void): () => void;
  syncChanges?(changes: ContentChange[]): Promise<SyncResult>;
  getSyncCapabilities(): SyncCapabilities;
}
```

### API Client Enhancement

```typescript
export class PortableContentClient {
  constructor(
    private transport: Transport,
    private syncManager?: SyncManager
  ) {}

  // Existing methods remain unchanged
  async getContent(id: string, capabilities?: Capabilities): Promise<ContentItem | null> {
    const content = await this.transport.request(/* ... */);

    // Optionally enable sync for this content
    if (this.syncManager) {
      return this.syncManager.wrapContent(content);
    }

    return content;
  }

  // New sync-aware methods
  async getObservableContent(id: string): Promise<ObservableContentItem> {
    if (!this.syncManager) {
      throw new Error('Sync manager required for observable content');
    }

    const content = await this.getContent(id);
    return this.syncManager.makeObservable(content);
  }

  subscribeToContentChanges(contentId: string, callback: (change: ContentChange) => void): () => void {
    if (!this.syncManager) {
      throw new Error('Sync manager required for change subscriptions');
    }

    return this.syncManager.subscribeToContent(contentId, callback);
  }
}
```

## Implementation Phases

### Phase 1: Core Sync Interfaces
- Define sync interfaces and data structures
- Implement basic SyncManager
- Add optional sync capabilities to transport interface

### Phase 2: Basic Sync Strategies
- Implement WebSocket sync transport
- Implement polling sync transport
- Add simple conflict resolution (last-write-wins)

### Phase 3: Advanced Features
- Operational transform conflict resolution
- Offline sync capabilities
- Multi-device coordination
- AI agent integration

### Phase 4: Optimization
- Performance optimizations
- Advanced conflict resolution strategies
- Real-time collaboration features
- Analytics and monitoring

## Key Benefits

1. **Bidirectional Synchronization**: True two-way communication between client, AI agent, and persistence
2. **Transport Agnostic**: Works with WebSocket, SSE, polling, or hybrid approaches
3. **Multi-Party Attribution**: Always know who/what made changes (user, AI agent, system)
4. **Context-Aware AI Integration**: AI agent receives user context and can respond appropriately
5. **Intelligent Conflict Resolution**: AI-assisted conflict resolution with user preferences
6. **Real-Time Collaboration**: User and AI agent can collaborate in real-time
7. **Optimistic Updates**: Immediate UI feedback with eventual consistency
8. **Offline Support**: Can queue changes and sync when reconnected
9. **Granular Sync**: Block-level changes, not just document-level
10. **Backwards Compatible**: Simple use cases still work without sync complexity
11. **Extensible**: New sync strategies and conflict resolvers can be plugged in
12. **Multi-Device Ready**: Handles same user across multiple devices
13. **AI Context Preservation**: AI agent maintains context across user interactions
14. **Flexible Sync Targets**: Can selectively sync with different participants

## Future Considerations

- **Operational Transform Libraries**: Integration with existing OT libraries
- **CRDT Integration**: Support for popular CRDT implementations
- **Real-time Collaboration**: Cursor positions, user presence indicators
- **Permissions System**: Fine-grained access control for collaborative editing
- **Audit Trail**: Complete change history and rollback capabilities
- **Performance Monitoring**: Sync latency and conflict resolution metrics
- **Scalability**: Handling large numbers of concurrent users and content items

This architecture provides a solid foundation for sophisticated collaborative content editing while maintaining the clean, transport-agnostic design principles of the Portable Content SDK.
```
