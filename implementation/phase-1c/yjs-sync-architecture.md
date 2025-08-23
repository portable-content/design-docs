# Yjs-Based Sync Architecture for Portable Content

## Overview

This document outlines how to implement bidirectional synchronization for the Portable Content System using Yjs, a high-performance CRDT library. Yjs provides excellent real-time collaboration capabilities and can be extended to support our specific use case of user + AI agent + persistence synchronization.

## Why Yjs for Portable Content

### Key Advantages
- **High Performance**: Optimized for large documents and frequent updates
- **Battle-Tested**: Used by Notion, Figma, and other production applications
- **Real-Time Ready**: Built-in support for live collaboration
- **Offline-First**: Works seamlessly offline with automatic sync when reconnected
- **Rich Ecosystem**: Multiple sync providers and integrations available
- **Transport Agnostic**: Can work with WebSocket, WebRTC, HTTP, or custom transports

### CRDT Benefits
- **Automatic Conflict Resolution**: Concurrent changes merge without manual intervention
- **Eventual Consistency**: All participants eventually converge to the same state
- **No Central Coordinator**: Can work in peer-to-peer or client-server architectures
- **Partition Tolerance**: Handles network splits and reconnections gracefully

## Yjs Data Structure for Portable Content

### Core Document Structure

```typescript
import * as Y from 'yjs'

// Create shared document
const ydoc = new Y.Doc()

// Content structure using Yjs types
const contentMap = ydoc.getMap('content')
const blocksArray = ydoc.getArray('blocks')
const metadataMap = ydoc.getMap('metadata')
const variantsMap = ydoc.getMap('variants')

// Content metadata
contentMap.set('id', 'content-123')
contentMap.set('title', 'Document Title')
contentMap.set('type', 'article')
contentMap.set('createdAt', new Date().toISOString())
contentMap.set('updatedAt', new Date().toISOString())

// Blocks as Yjs Maps in Array
const block1 = new Y.Map()
block1.set('id', 'block-1')
block1.set('kind', 'markdown')
block1.set('content', new Y.Text('Initial markdown content'))
block1.set('createdBy', 'user-123')
block1.set('createdAt', Date.now())

blocksArray.push([block1])
```

### Attribution and Change Tracking

```typescript
// Custom attribution system on top of Yjs
interface ChangeAttribution {
  source: 'user' | 'ai-agent' | 'sync';
  userId?: string;
  deviceId?: string;
  agentId?: string;
  timestamp: number;
  changeId: string;
}

class AttributedYDoc {
  private ydoc: Y.Doc
  private attributions = new Map<string, ChangeAttribution>()
  
  constructor() {
    this.ydoc = new Y.Doc()
    
    // Track all changes with attribution
    this.ydoc.on('update', (update, origin) => {
      if (origin && typeof origin === 'object') {
        const attribution = origin as ChangeAttribution
        this.attributions.set(attribution.changeId, attribution)
      }
    })
  }
  
  applyUserChange(changeFn: (doc: Y.Doc) => void, userId: string, deviceId: string) {
    const attribution: ChangeAttribution = {
      source: 'user',
      userId,
      deviceId,
      timestamp: Date.now(),
      changeId: this.generateChangeId()
    }
    
    this.ydoc.transact(changeFn, attribution)
  }
  
  applyAIChange(changeFn: (doc: Y.Doc) => void, agentId: string, userId: string) {
    const attribution: ChangeAttribution = {
      source: 'ai-agent',
      agentId,
      userId,
      timestamp: Date.now(),
      changeId: this.generateChangeId()
    }
    
    this.ydoc.transact(changeFn, attribution)
  }
}
```

## Bidirectional Sync Implementation

### Custom AI Agent Provider

```typescript
import { WebsocketProvider } from 'y-websocket'

export class AIAgentSyncProvider {
  private ydoc: Y.Doc
  private aiTransport: AIAgentTransport
  private isConnected = false
  
  constructor(ydoc: Y.Doc, aiTransport: AIAgentTransport) {
    this.ydoc = ydoc
    this.aiTransport = aiTransport
    this.setupBidirectionalSync()
  }
  
  private setupBidirectionalSync() {
    // User changes → AI Agent
    this.ydoc.on('update', (update, origin) => {
      if (origin?.source === 'user' && this.isConnected) {
        this.syncToAIAgent(update, origin)
      }
    })
    
    // AI Agent changes → User
    this.aiTransport.on('update', (aiUpdate, attribution) => {
      Y.applyUpdate(this.ydoc, aiUpdate, attribution)
    })
    
    // Connection management
    this.aiTransport.on('connect', () => {
      this.isConnected = true
      this.performInitialSync()
    })
    
    this.aiTransport.on('disconnect', () => {
      this.isConnected = false
    })
  }
  
  private async syncToAIAgent(update: Uint8Array, attribution: ChangeAttribution) {
    try {
      await this.aiTransport.sendUpdate({
        update,
        attribution,
        contentId: this.getContentId(),
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Failed to sync to AI agent:', error)
      // Queue for retry
      this.queueForRetry(update, attribution)
    }
  }
  
  private async performInitialSync() {
    // Send current document state to AI agent
    const state = Y.encodeStateAsUpdate(this.ydoc)
    await this.aiTransport.sendInitialState({
      state,
      contentId: this.getContentId(),
      timestamp: Date.now()
    })
  }
}
```

### Multi-Provider Sync Coordinator

```typescript
export class PortableContentSyncCoordinator {
  private ydoc: Y.Doc
  private providers: Map<string, any> = new Map()
  
  constructor() {
    this.ydoc = new Y.Doc()
    this.setupProviders()
  }
  
  private setupProviders() {
    // WebSocket provider for server sync
    const wsProvider = new WebsocketProvider(
      'ws://localhost:4000/sync',
      'content-room',
      this.ydoc
    )
    this.providers.set('server', wsProvider)
    
    // Custom AI agent provider
    const aiProvider = new AIAgentSyncProvider(
      this.ydoc,
      new AIAgentTransport('ws://localhost:4001/ai-sync')
    )
    this.providers.set('ai-agent', aiProvider)
    
    // IndexedDB for offline persistence
    const indexeddbProvider = new IndexeddbPersistence('content-offline', this.ydoc)
    this.providers.set('offline', indexeddbProvider)
  }
  
  // Apply user changes with proper attribution
  applyUserChange(changeFn: (doc: Y.Doc) => void, userId: string, deviceId: string) {
    const attribution: ChangeAttribution = {
      source: 'user',
      userId,
      deviceId,
      timestamp: Date.now(),
      changeId: this.generateChangeId()
    }
    
    this.ydoc.transact(() => {
      changeFn(this.ydoc)
    }, attribution)
  }
  
  // Subscribe to changes from any source
  subscribeToChanges(callback: (change: YjsChange) => void) {
    this.ydoc.on('update', (update, origin) => {
      const change: YjsChange = {
        update,
        attribution: origin as ChangeAttribution,
        timestamp: Date.now(),
        contentState: this.getContentState()
      }
      callback(change)
    })
  }
  
  private getContentState(): ContentItem {
    const contentMap = this.ydoc.getMap('content')
    const blocksArray = this.ydoc.getArray('blocks')
    
    return {
      id: contentMap.get('id'),
      title: contentMap.get('title'),
      type: contentMap.get('type'),
      blocks: blocksArray.toArray().map(block => this.convertYMapToBlock(block)),
      createdAt: contentMap.get('createdAt'),
      updatedAt: contentMap.get('updatedAt')
    }
  }
}

interface YjsChange {
  update: Uint8Array
  attribution: ChangeAttribution
  timestamp: number
  contentState: ContentItem
}
```

### Integration with Portable Content Client

```typescript
export class YjsPortableContentClient extends PortableContentClient {
  private syncCoordinator: PortableContentSyncCoordinator
  
  constructor(transport: Transport) {
    super(transport)
    this.syncCoordinator = new PortableContentSyncCoordinator()
    this.setupIntegration()
  }
  
  private setupIntegration() {
    // Subscribe to Yjs changes and update UI
    this.syncCoordinator.subscribeToChanges((change) => {
      this.handleYjsChange(change)
    })
  }
  
  // Override content operations to use Yjs
  async updateContent(id: string, input: UpdateContentInput): Promise<ContentItem> {
    return new Promise((resolve) => {
      this.syncCoordinator.applyUserChange((ydoc) => {
        const contentMap = ydoc.getMap('content')
        
        if (input.title) {
          contentMap.set('title', input.title)
        }
        
        if (input.blocks) {
          const blocksArray = ydoc.getArray('blocks')
          blocksArray.delete(0, blocksArray.length) // Clear existing
          
          input.blocks.forEach(blockInput => {
            const blockMap = new Y.Map()
            blockMap.set('id', blockInput.id || this.generateBlockId())
            blockMap.set('kind', blockInput.kind)
            
            if (blockInput.kind === 'markdown') {
              const textType = new Y.Text(blockInput.payload.source)
              blockMap.set('content', textType)
            } else {
              blockMap.set('payload', blockInput.payload)
            }
            
            blocksArray.push([blockMap])
          })
        }
        
        contentMap.set('updatedAt', new Date().toISOString())
      }, this.getCurrentUserId(), this.getDeviceId())
      
      // Return updated content state
      resolve(this.syncCoordinator.getContentState())
    })
  }
  
  // Real-time content subscription
  subscribeToContent(contentId: string, callback: (content: ContentItem) => void): () => void {
    return this.syncCoordinator.subscribeToChanges((change) => {
      if (change.contentState.id === contentId) {
        callback(change.contentState)
      }
    })
  }
  
  private handleYjsChange(change: YjsChange) {
    // Handle different types of changes
    switch (change.attribution.source) {
      case 'user':
        if (change.attribution.deviceId !== this.getDeviceId()) {
          this.notifyUI('Content updated from another device', 'sync')
        }
        break
        
      case 'ai-agent':
        this.notifyUI('AI assistant updated content', 'ai-update')
        this.highlightAIChanges(change)
        break
        
      case 'sync':
        this.notifyUI('Content synchronized', 'system')
        break
    }
    
    // Update UI with new content state
    this.updateUI(change.contentState)
  }
}
```

## AI-Aware Conflict Resolution

### Custom Conflict Resolution for Yjs

```typescript
export class AIAwareYjsResolver {
  constructor(private aiService: AIContextService) {}
  
  // Yjs doesn't have built-in conflict callbacks, so we implement post-merge analysis
  async analyzeAndResolveConflicts(
    beforeState: ContentItem,
    afterState: ContentItem,
    changes: YjsChange[]
  ): Promise<ContentItem> {
    
    const conflicts = this.detectSemanticConflicts(beforeState, afterState, changes)
    
    if (conflicts.length === 0) {
      return afterState // No conflicts, Yjs merge is sufficient
    }
    
    // Use AI to resolve semantic conflicts
    const resolution = await this.aiService.resolveConflicts({
      beforeState,
      afterState,
      conflicts,
      changes
    })
    
    return this.applyResolution(afterState, resolution)
  }
  
  private detectSemanticConflicts(
    before: ContentItem,
    after: ContentItem,
    changes: YjsChange[]
  ): SemanticConflict[] {
    const conflicts: SemanticConflict[] = []
    
    // Detect user-AI conflicts on same content
    const userChanges = changes.filter(c => c.attribution.source === 'user')
    const aiChanges = changes.filter(c => c.attribution.source === 'ai-agent')
    
    if (userChanges.length > 0 && aiChanges.length > 0) {
      // Check if they modified the same blocks
      const conflictingBlocks = this.findConflictingBlocks(userChanges, aiChanges)
      
      conflicts.push(...conflictingBlocks.map(blockId => ({
        type: 'user-ai-conflict',
        blockId,
        userChanges: userChanges.filter(c => this.affectsBlock(c, blockId)),
        aiChanges: aiChanges.filter(c => this.affectsBlock(c, blockId))
      })))
    }
    
    return conflicts
  }
}

interface SemanticConflict {
  type: 'user-ai-conflict' | 'concurrent-edit' | 'structural-conflict'
  blockId: string
  userChanges: YjsChange[]
  aiChanges: YjsChange[]
}
```

## Performance Optimizations

### Efficient Block Updates

```typescript
export class OptimizedYjsBlocks {
  private ydoc: Y.Doc
  private blocksArray: Y.Array<Y.Map<any>>
  private blockIndex = new Map<string, number>()
  
  constructor(ydoc: Y.Doc) {
    this.ydoc = ydoc
    this.blocksArray = ydoc.getArray('blocks')
    this.buildBlockIndex()
    
    // Maintain index on changes
    this.blocksArray.observe(() => {
      this.rebuildBlockIndex()
    })
  }
  
  updateBlock(blockId: string, updates: Partial<BlockData>) {
    const index = this.blockIndex.get(blockId)
    if (index === undefined) return
    
    const blockMap = this.blocksArray.get(index) as Y.Map<any>
    
    // Efficient updates without recreating the entire block
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'content' && typeof value === 'string') {
        // Handle text content efficiently
        const textType = blockMap.get('content') as Y.Text
        if (textType) {
          textType.delete(0, textType.length)
          textType.insert(0, value)
        } else {
          blockMap.set('content', new Y.Text(value))
        }
      } else {
        blockMap.set(key, value)
      }
    })
  }
  
  private buildBlockIndex() {
    this.blockIndex.clear()
    this.blocksArray.forEach((block, index) => {
      const blockMap = block as Y.Map<any>
      const id = blockMap.get('id')
      if (id) {
        this.blockIndex.set(id, index)
      }
    })
  }
}
```

## Integration with Transport Layer

### Yjs-Compatible Transport

```typescript
export class YjsTransportAdapter implements SyncCapableTransport {
  constructor(
    private yjsProvider: WebsocketProvider,
    private baseTransport: Transport
  ) {}
  
  async request<TData>(operation: TransportOperation, variables?: any): Promise<TData> {
    // Use base transport for non-sync operations
    return await this.baseTransport.request(operation, variables)
  }
  
  subscribeToChanges(contentId: string, callback: (change: ContentChange) => void): () => void {
    // Convert Yjs updates to ContentChange format
    const yjsCallback = (update: Uint8Array, origin: any) => {
      const change: ContentChange = {
        id: this.generateChangeId(),
        contentId,
        changeType: this.inferChangeType(update),
        payload: this.extractPayload(update),
        attribution: origin as ChangeAttribution,
        timestamp: new Date().toISOString(),
        version: this.getDocumentVersion()
      }
      callback(change)
    }
    
    this.yjsProvider.doc.on('update', yjsCallback)
    
    return () => {
      this.yjsProvider.doc.off('update', yjsCallback)
    }
  }
  
  getSyncCapabilities(): SyncCapabilities {
    return {
      realTime: true,
      conflictResolution: 'crdt',
      offlineSupport: true,
      changeGranularity: 'character'
    }
  }
}
```

## Key Benefits of Yjs Approach

1. **Automatic Conflict Resolution**: CRDT properties eliminate most conflicts
2. **High Performance**: Optimized for real-time collaboration
3. **Offline-First**: Full functionality without network connection
4. **Character-Level Granularity**: Fine-grained conflict resolution
5. **Proven Scalability**: Used by major applications in production
6. **Rich Ecosystem**: Multiple providers and integrations
7. **Transport Agnostic**: Works with existing transport layer
8. **AI Integration Ready**: Can be extended with custom providers
9. **Real-Time Collaboration**: Built for live editing scenarios
10. **Memory Efficient**: Optimized data structures for large documents

## Implementation Roadmap

### Phase 1: Basic Yjs Integration
- Set up Yjs document structure for content
- Implement basic user change tracking
- Create WebSocket provider for server sync

### Phase 2: AI Agent Integration
- Develop custom AI agent provider
- Implement bidirectional sync between user and AI
- Add attribution system for change tracking

### Phase 3: Advanced Features
- AI-aware conflict resolution
- Performance optimizations
- Offline sync capabilities
- Multi-device coordination

### Phase 4: Production Readiness
- Error handling and recovery
- Monitoring and analytics
- Security and access control
- Scalability optimizations

This Yjs-based approach provides a robust foundation for real-time bidirectional synchronization while maintaining the transport-agnostic principles of the Portable Content SDK.
