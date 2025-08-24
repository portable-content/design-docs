# Linear-Inspired Sync Architecture for Portable Content

## Overview

This document outlines a Linear-inspired synchronization architecture adapted for the Portable Content System's bidirectional sync requirements. Linear's offline-first, operation-based sync engine provides an excellent foundation for handling real-time collaboration between users, AI agents, and persistence layers.

## Linear's Core Principles Applied

### 1. Offline-First Architecture

**Linear's Approach**: Local SQLite database stores all data, enabling full offline functionality.

**Our Adaptation**: Each client maintains a local operation log and content state, enabling offline content editing and AI interaction.

```typescript
interface LocalContentStore {
  // Store operations locally for offline-first sync
  storeOperation(op: ContentOperation): Promise<void>;
  
  // Get operations since timestamp for incremental sync
  getOperationsSince(timestamp: number): Promise<ContentOperation[]>;
  
  // Apply operations to rebuild content state
  applyOperation(op: ContentOperation): Promise<void>;
  
  // Get current content state derived from operations
  getContentState(contentId: string): Promise<ContentItem>;
  
  // Store AI context for offline AI interactions
  storeAIContext(contentId: string, context: AIContext): Promise<void>;
}
```

### 2. Operation-Based Event Sourcing

**Linear's Approach**: All changes are immutable operations that can be replayed to reconstruct state.

**Our Adaptation**: Content changes are operations that can be applied by users, AI agents, or sync processes.

```typescript
interface ContentOperation {
  // Unique operation identifier
  id: string;
  
  // Operation metadata
  type: 'create_content' | 'update_content' | 'delete_content' | 
        'create_block' | 'update_block' | 'delete_block' | 'reorder_blocks' |
        'update_variants' | 'refresh_variants';
  
  // Target identifiers
  contentId: string;
  blockId?: string;
  variantId?: string;
  
  // Operation payload
  data: {
    before?: any; // Previous state for rollback
    after: any;   // New state to apply
    metadata?: {
      blockKind?: string;
      variantType?: string;
      capabilities?: Capabilities;
    };
  };
  
  // Temporal and attribution data
  timestamp: number;
  clientTimestamp: number;
  version: number;
  
  // Source attribution for bidirectional sync
  attribution: {
    source: 'user' | 'ai-agent' | 'sync' | 'system';
    userId?: string;
    deviceId?: string;
    agentId?: string;
    sessionId?: string;
  };
  
  // Operational transform data
  dependencies: string[]; // Operations this depends on
  causality: {
    happensBefore: string[]; // Operations that must happen before this
    concurrent: string[];    // Operations that can happen concurrently
  };
}
```

### 3. Incremental Synchronization

**Linear's Approach**: Only sync operations since the last sync timestamp.

**Our Adaptation**: Bidirectional incremental sync between client, AI agent, and persistence.

```typescript
interface IncrementalSyncManager {
  // Sync operations from client to server and AI agent
  syncFromClient(since: number): Promise<SyncResult>;
  
  // Sync operations from AI agent to server and client
  syncFromAIAgent(since: number): Promise<SyncResult>;
  
  // Sync operations from server to client and AI agent
  syncFromServer(since: number): Promise<SyncResult>;
  
  // Get last sync timestamps for each participant
  getLastSyncTimestamps(): Promise<{
    client: number;
    aiAgent: number;
    server: number;
  }>;
}
```

## Linear-Inspired Sync Engine Implementation

### Core Sync Engine

```typescript
export class LinearInspiredSyncEngine {
  constructor(
    private localStore: LocalContentStore,
    private transport: SyncCapableTransport,
    private aiContext: AIContextService,
    private conflictResolver: OperationalTransformResolver
  ) {}

  /**
   * Apply operation with Linear-style offline-first sync
   */
  async applyOperation(op: ContentOperation): Promise<SyncResult> {
    const result: SyncResult = { applied: [], conflicts: [], rejected: [] };

    try {
      // 1. Store operation locally first (offline-first)
      await this.localStore.storeOperation(op);
      
      // 2. Apply operation to local state optimistically
      await this.applyToLocalState(op);
      
      // 3. Update UI immediately (optimistic update)
      this.notifyUIUpdate(op);
      
      // 4. Attempt to sync with remote participants
      const syncResults = await this.syncWithRemoteParticipants(op);
      
      // 5. Handle any conflicts that arise
      if (syncResults.some(r => r.conflicts.length > 0)) {
        const conflicts = syncResults.flatMap(r => r.conflicts);
        const resolved = await this.resolveConflicts(conflicts);
        result.conflicts = resolved.unresolved;
        result.applied = resolved.resolved;
      } else {
        result.applied = [op];
      }
      
      // 6. Update AI context if this was a user operation
      if (op.attribution.source === 'user') {
        await this.updateAIContext(op);
      }
      
    } catch (error) {
      // Rollback optimistic update on failure
      await this.rollbackOperation(op);
      result.rejected = [op];
      throw error;
    }

    return result;
  }

  /**
   * Linear-style incremental sync
   */
  async performIncrementalSync(): Promise<void> {
    const timestamps = await this.getLastSyncTimestamps();
    
    // Concurrent sync with all participants
    await Promise.all([
      this.syncWithServer(timestamps.server),
      this.syncWithAIAgent(timestamps.aiAgent),
      this.syncWithOtherClients(timestamps.client)
    ]);
  }

  private async syncWithRemoteParticipants(op: ContentOperation): Promise<SyncResult[]> {
    const syncTargets = this.determineSyncTargets(op);
    
    return await Promise.all(
      syncTargets.map(target => this.syncWithTarget(target, op))
    );
  }

  private determineSyncTargets(op: ContentOperation): SyncTarget[] {
    const targets: SyncTarget[] = [
      { type: 'persistence', id: 'main-db' }
    ];

    // Always sync user operations with AI agent
    if (op.attribution.source === 'user') {
      targets.push({ type: 'ai-agent', id: 'content-assistant' });
    }

    // Always sync AI operations with client
    if (op.attribution.source === 'ai-agent') {
      targets.push({ type: 'client', id: op.attribution.userId! });
    }

    return targets;
  }
}
```

### Operational Transform for Content Operations

```typescript
export class ContentOperationalTransform {
  /**
   * Transform operations using Linear-inspired OT
   */
  transform(op1: ContentOperation, op2: ContentOperation): [ContentOperation, ContentOperation] {
    // Handle different operation type combinations
    if (op1.type === 'update_block' && op2.type === 'update_block') {
      return this.transformConcurrentBlockUpdates(op1, op2);
    }
    
    if (op1.type === 'create_block' && op2.type === 'reorder_blocks') {
      return this.transformCreateVsReorder(op1, op2);
    }
    
    if (op1.type === 'delete_block' && op2.type === 'update_block') {
      return this.transformDeleteVsUpdate(op1, op2);
    }
    
    // Default: operations are independent
    return [op1, op2];
  }

  private transformConcurrentBlockUpdates(
    op1: ContentOperation, 
    op2: ContentOperation
  ): [ContentOperation, ContentOperation] {
    if (op1.blockId !== op2.blockId) {
      // Different blocks, no transformation needed
      return [op1, op2];
    }

    // Same block updated concurrently
    if (op1.attribution.source === 'user' && op2.attribution.source === 'ai-agent') {
      // User-AI conflict: merge intelligently
      return this.mergeUserAIConflict(op1, op2);
    }

    // Default to timestamp-based resolution
    return op1.timestamp > op2.timestamp ? [op1, this.nullOp(op2)] : [this.nullOp(op1), op2];
  }

  private mergeUserAIConflict(
    userOp: ContentOperation, 
    aiOp: ContentOperation
  ): [ContentOperation, ContentOperation] {
    // Intelligent merge for user-AI conflicts
    const mergedData = this.intelligentMerge(userOp.data.after, aiOp.data.after);
    
    const mergedOp: ContentOperation = {
      ...userOp,
      data: {
        before: userOp.data.before,
        after: mergedData,
        metadata: {
          ...userOp.data.metadata,
          aiMerged: true,
          aiEnhancement: aiOp.data.after
        }
      },
      attribution: {
        ...userOp.attribution,
        aiAssisted: true,
        aiAgentId: aiOp.attribution.agentId
      }
    };

    return [mergedOp, this.nullOp(aiOp)];
  }

  private intelligentMerge(userData: any, aiData: any): any {
    // Content-type specific merging logic
    if (userData.kind === 'markdown' && aiData.kind === 'markdown') {
      return this.mergeMarkdownContent(userData, aiData);
    }
    
    if (userData.kind === 'image' && aiData.kind === 'image') {
      return this.mergeImageContent(userData, aiData);
    }
    
    // Default: prefer user data with AI enhancements
    return {
      ...userData,
      aiEnhancement: aiData
    };
  }

  private mergeMarkdownContent(userData: any, aiData: any): any {
    // Merge markdown content intelligently
    return {
      ...userData,
      source: userData.source, // Keep user's content
      aiSuggestions: aiData.source, // Add AI suggestions
      enhanced: true
    };
  }
}
```

### AI-Aware Conflict Resolution

```typescript
export class AIAwareConflictResolver {
  constructor(private aiService: AIContextService) {}

  async resolveConflict(conflict: OperationConflict): Promise<ContentOperation> {
    const { userOp, aiOp, serverOp } = conflict;

    // Get AI analysis of the conflict
    const analysis = await this.aiService.analyzeConflict({
      userOperation: userOp,
      aiOperation: aiOp,
      serverOperation: serverOp,
      contentContext: await this.getContentContext(userOp.contentId)
    });

    switch (analysis.recommendation) {
      case 'prefer-user':
        return this.createResolutionOp(userOp, 'user-preferred');
        
      case 'prefer-ai':
        return this.createResolutionOp(aiOp, 'ai-preferred');
        
      case 'intelligent-merge':
        return await this.performIntelligentMerge(userOp, aiOp, analysis);
        
      case 'request-user-decision':
        return await this.requestUserDecision(conflict);
        
      default:
        return this.fallbackResolution(conflict);
    }
  }

  private async performIntelligentMerge(
    userOp: ContentOperation,
    aiOp: ContentOperation,
    analysis: ConflictAnalysis
  ): Promise<ContentOperation> {
    const mergedContent = await this.aiService.mergeOperations({
      userOperation: userOp,
      aiOperation: aiOp,
      mergeStrategy: analysis.suggestedStrategy,
      context: analysis.context
    });

    return {
      ...userOp,
      id: generateOperationId(),
      data: {
        before: userOp.data.before,
        after: mergedContent,
        metadata: {
          ...userOp.data.metadata,
          conflictResolution: 'ai-merged',
          originalOperations: [userOp.id, aiOp.id]
        }
      },
      attribution: {
        source: 'user',
        userId: userOp.attribution.userId,
        aiMerged: true,
        aiAgentId: aiOp.attribution.agentId
      }
    };
  }
}

interface ConflictAnalysis {
  recommendation: 'prefer-user' | 'prefer-ai' | 'intelligent-merge' | 'request-user-decision';
  confidence: number;
  suggestedStrategy: 'semantic-merge' | 'append-ai' | 'enhance-user' | 'side-by-side';
  context: {
    userIntent: string;
    aiReasoning: string;
    contentType: string;
    conflictSeverity: 'low' | 'medium' | 'high';
  };
}
```

### Local-First Storage with AI Context

```typescript
export class LocalContentStore {
  constructor(
    private db: LocalDatabase,
    private aiContextStore: AIContextStore
  ) {}

  async storeOperation(op: ContentOperation): Promise<void> {
    // Store operation in local database
    await this.db.operations.insert({
      id: op.id,
      contentId: op.contentId,
      type: op.type,
      data: JSON.stringify(op.data),
      timestamp: op.timestamp,
      attribution: JSON.stringify(op.attribution),
      synced: false
    });

    // Update AI context if relevant
    if (this.isAIRelevant(op)) {
      await this.updateAIContext(op);
    }

    // Apply operation to derived state
    await this.applyToContentState(op);
  }

  async getOperationsSince(timestamp: number): Promise<ContentOperation[]> {
    const rows = await this.db.operations.select({
      where: { timestamp: { gte: timestamp } },
      orderBy: { timestamp: 'asc' }
    });

    return rows.map(row => this.deserializeOperation(row));
  }

  async getContentState(contentId: string): Promise<ContentItem> {
    // Get all operations for this content
    const operations = await this.db.operations.select({
      where: { contentId },
      orderBy: { timestamp: 'asc' }
    });

    // Rebuild state by applying operations in order
    let state = this.getInitialContentState(contentId);
    
    for (const opRow of operations) {
      const op = this.deserializeOperation(opRow);
      state = this.applyOperationToState(state, op);
    }

    return state;
  }

  private async updateAIContext(op: ContentOperation): Promise<void> {
    const context = await this.aiContextStore.getContext(op.contentId);
    
    const updatedContext = {
      ...context,
      lastUserOperation: op.attribution.source === 'user' ? op : context.lastUserOperation,
      lastAIOperation: op.attribution.source === 'ai-agent' ? op : context.lastAIOperation,
      operationHistory: [...context.operationHistory, op].slice(-100), // Keep last 100 ops
      contentVersion: context.contentVersion + 1
    };

    await this.aiContextStore.storeContext(op.contentId, updatedContext);
  }

  private isAIRelevant(op: ContentOperation): boolean {
    // Determine if operation is relevant for AI context
    return op.type.includes('block') || 
           op.type.includes('content') || 
           op.attribution.source === 'user';
  }
}
```

### Bidirectional Sync Coordinator

```typescript
export class BidirectionalSyncCoordinator {
  constructor(
    private syncEngine: LinearInspiredSyncEngine,
    private clientTransport: SyncCapableTransport,
    private aiAgentTransport: SyncCapableTransport,
    private persistenceTransport: SyncCapableTransport
  ) {}

  /**
   * Coordinate bidirectional sync between all participants
   */
  async coordinateSync(): Promise<void> {
    // Set up bidirectional subscriptions
    this.setupClientToAISync();
    this.setupAIToClientSync();
    this.setupPersistenceSync();
    
    // Start periodic incremental sync
    this.startIncrementalSync();
  }

  private setupClientToAISync(): void {
    // When client makes changes, sync to AI agent
    this.clientTransport.subscribeToChanges?.('*', async (change) => {
      if (change.attribution.source === 'user') {
        await this.syncEngine.applyOperation({
          ...change,
          attribution: {
            ...change.attribution,
            syncTarget: 'ai-agent'
          }
        });
      }
    });
  }

  private setupAIToClientSync(): void {
    // When AI agent makes changes, sync to client
    this.aiAgentTransport.subscribeToChanges?.('*', async (change) => {
      if (change.attribution.source === 'ai-agent') {
        await this.syncEngine.applyOperation({
          ...change,
          attribution: {
            ...change.attribution,
            syncTarget: 'client'
          }
        });
      }
    });
  }

  private setupPersistenceSync(): void {
    // Bidirectional sync with persistence layer
    this.persistenceTransport.subscribeToChanges?.('*', async (change) => {
      // Server-side changes sync to both client and AI agent
      await Promise.all([
        this.syncToClient(change),
        this.syncToAIAgent(change)
      ]);
    });
  }

  private startIncrementalSync(): void {
    // Periodic incremental sync every 5 seconds
    setInterval(async () => {
      try {
        await this.syncEngine.performIncrementalSync();
      } catch (error) {
        console.error('Incremental sync failed:', error);
        // Implement exponential backoff retry logic
      }
    }, 5000);
  }
}
```

## Integration with Existing Architecture

### Transport Layer Integration

The Linear-inspired sync engine integrates with the existing transport-agnostic architecture:

```typescript
// Extend existing transport interface for operation-based sync
export interface OperationSyncTransport extends SyncCapableTransport {
  // Push operations to remote participant
  pushOperations(operations: ContentOperation[]): Promise<SyncResult>;
  
  // Pull operations from remote participant since timestamp
  pullOperations(since: number): Promise<ContentOperation[]>;
  
  // Subscribe to operation stream
  subscribeToOperations(callback: (op: ContentOperation) => void): () => void;
}
```

### API Client Enhancement

```typescript
export class LinearInspiredPortableContentClient extends PortableContentClient {
  constructor(
    transport: Transport,
    private syncEngine: LinearInspiredSyncEngine
  ) {
    super(transport);
  }

  // Override methods to use operation-based sync
  async updateContent(id: string, input: UpdateContentInput): Promise<ContentItem> {
    const operation: ContentOperation = {
      id: generateOperationId(),
      type: 'update_content',
      contentId: id,
      data: { after: input },
      timestamp: Date.now(),
      clientTimestamp: Date.now(),
      version: await this.getNextVersion(id),
      attribution: {
        source: 'user',
        userId: this.getCurrentUserId(),
        deviceId: this.getDeviceId(),
        sessionId: this.getSessionId()
      },
      dependencies: [],
      causality: { happensBefore: [], concurrent: [] }
    };

    const result = await this.syncEngine.applyOperation(operation);
    
    if (result.conflicts.length > 0) {
      throw new ConflictError('Update conflicts detected', result.conflicts);
    }

    return await this.getContent(id);
  }
}
```

## Key Benefits of Linear-Inspired Approach

1. **True Offline-First**: Full functionality without network connection
2. **Optimistic Updates**: Immediate UI feedback with conflict resolution
3. **Incremental Sync**: Efficient bandwidth usage with operation-based sync
4. **Causal Consistency**: Operations maintain proper ordering across participants
5. **AI Context Preservation**: AI agent maintains full operation history
6. **Conflict Resolution**: Sophisticated OT with AI-assisted resolution
7. **Scalable Architecture**: Proven approach from Linear's production system
8. **Bidirectional Awareness**: All participants stay synchronized
9. **Time Travel**: Complete operation history enables debugging and rollback
10. **Transport Agnostic**: Works with any underlying communication protocol

This Linear-inspired architecture provides a robust foundation for sophisticated bidirectional synchronization between users, AI agents, and persistence layers while maintaining the transport-agnostic principles of the Portable Content SDK.
