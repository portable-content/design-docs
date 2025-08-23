# Automerge-Based Sync Architecture for Portable Content

## Overview

This document outlines how to implement bidirectional synchronization for the Portable Content System using Automerge, a JSON-like CRDT library. Automerge provides immutable document versions with automatic merging and complete change history, making it ideal for content management systems requiring version control and attribution.

## Why Automerge for Portable Content

### Key Advantages
- **JSON-Like API**: Familiar JavaScript object syntax for easy adoption
- **Immutable Versions**: Each change creates a new document version
- **Complete History**: Full audit trail of all changes with attribution
- **Flexible Data Structures**: Any JSON-compatible data can be stored
- **Time Travel**: Access to any previous version of the document
- **Automatic Merging**: Concurrent changes merge without conflicts
- **Fine-Grained Changes**: Track individual property changes

### CRDT Benefits
- **Conflict-Free Merging**: Concurrent edits merge automatically
- **Eventual Consistency**: All participants converge to same state
- **Offline-First**: Works completely offline with sync when reconnected
- **Causal Consistency**: Changes maintain proper ordering relationships

## Automerge Data Structure for Portable Content

### Core Document Structure

```typescript
import * as Automerge from '@automerge/automerge'

// Initialize content document
let contentDoc = Automerge.init<ContentDocument>()

interface ContentDocument {
  id: string
  title: string
  type: string
  summary?: string
  blocks: Block[]
  metadata: {
    createdAt: string
    updatedAt: string
    createdBy: string
    version: number
  }
  variants: Record<string, Variant[]>
  changeHistory: ChangeRecord[]
}

interface Block {
  id: string
  kind: 'markdown' | 'mermaid' | 'image'
  payload: any
  variants: Record<string, Variant>
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
}

interface ChangeRecord {
  id: string
  timestamp: string
  attribution: {
    source: 'user' | 'ai-agent' | 'sync'
    userId?: string
    deviceId?: string
    agentId?: string
  }
  changeType: string
  description: string
}

// Create initial content
contentDoc = Automerge.change(contentDoc, 'Initialize content', doc => {
  doc.id = 'content-123'
  doc.title = 'New Document'
  doc.type = 'article'
  doc.blocks = []
  doc.metadata = {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-123',
    version: 1
  }
  doc.variants = {}
  doc.changeHistory = []
})
```

### Change Attribution System

```typescript
export class AttributedAutomergeDoc {
  private doc: Automerge.Doc<ContentDocument>
  private changeCallbacks: Set<(change: AttributedChange) => void> = new Set()
  
  constructor(initialDoc?: Automerge.Doc<ContentDocument>) {
    this.doc = initialDoc || Automerge.init<ContentDocument>()
  }
  
  applyUserChange(
    description: string,
    changeFn: (doc: ContentDocument) => void,
    userId: string,
    deviceId: string
  ): Automerge.Doc<ContentDocument> {
    const oldDoc = this.doc
    
    this.doc = Automerge.change(this.doc, description, doc => {
      changeFn(doc)
      
      // Add change record with attribution
      doc.changeHistory.push({
        id: this.generateChangeId(),
        timestamp: new Date().toISOString(),
        attribution: {
          source: 'user',
          userId,
          deviceId
        },
        changeType: 'user-edit',
        description
      })
      
      doc.metadata.updatedAt = new Date().toISOString()
      doc.metadata.version += 1
    })
    
    this.notifyChange(oldDoc, this.doc, 'user')
    return this.doc
  }
  
  applyAIChange(
    description: string,
    changeFn: (doc: ContentDocument) => void,
    agentId: string,
    userId: string
  ): Automerge.Doc<ContentDocument> {
    const oldDoc = this.doc
    
    this.doc = Automerge.change(this.doc, description, doc => {
      changeFn(doc)
      
      // Add change record with AI attribution
      doc.changeHistory.push({
        id: this.generateChangeId(),
        timestamp: new Date().toISOString(),
        attribution: {
          source: 'ai-agent',
          agentId,
          userId
        },
        changeType: 'ai-generation',
        description
      })
      
      doc.metadata.updatedAt = new Date().toISOString()
      doc.metadata.version += 1
    })
    
    this.notifyChange(oldDoc, this.doc, 'ai-agent')
    return this.doc
  }
  
  merge(remoteDoc: Automerge.Doc<ContentDocument>): Automerge.Doc<ContentDocument> {
    const oldDoc = this.doc
    this.doc = Automerge.merge(this.doc, remoteDoc)
    this.notifyChange(oldDoc, this.doc, 'sync')
    return this.doc
  }
  
  private notifyChange(
    oldDoc: Automerge.Doc<ContentDocument>,
    newDoc: Automerge.Doc<ContentDocument>,
    source: string
  ) {
    const changes = Automerge.getChanges(oldDoc, newDoc)
    const attributedChange: AttributedChange = {
      oldDoc,
      newDoc,
      changes,
      source,
      timestamp: new Date().toISOString()
    }
    
    this.changeCallbacks.forEach(callback => callback(attributedChange))
  }
  
  subscribe(callback: (change: AttributedChange) => void): () => void {
    this.changeCallbacks.add(callback)
    return () => this.changeCallbacks.delete(callback)
  }
  
  getDoc(): Automerge.Doc<ContentDocument> {
    return this.doc
  }
}

interface AttributedChange {
  oldDoc: Automerge.Doc<ContentDocument>
  newDoc: Automerge.Doc<ContentDocument>
  changes: Automerge.Change[]
  source: string
  timestamp: string
}
```

## Bidirectional Sync Implementation

### Automerge Sync Manager

```typescript
export class AutomergeSyncManager {
  private localDoc: AttributedAutomergeDoc
  private syncStates = new Map<string, Automerge.SyncState>()
  private transports = new Map<string, SyncCapableTransport>()
  
  constructor() {
    this.localDoc = new AttributedAutomergeDoc()
    this.setupChangeHandling()
  }
  
  registerTransport(id: string, transport: SyncCapableTransport) {
    this.transports.set(id, transport)
    this.syncStates.set(id, Automerge.initSyncState())
    this.setupBidirectionalSync(id, transport)
  }
  
  private setupChangeHandling() {
    this.localDoc.subscribe((change) => {
      // Sync changes to all registered transports
      this.syncToAllTransports(change)
    })
  }
  
  private setupBidirectionalSync(transportId: string, transport: SyncCapableTransport) {
    // Receive changes from remote
    transport.subscribeToChanges?.('*', (remoteChange) => {
      this.handleRemoteChange(transportId, remoteChange)
    })
  }
  
  private async syncToAllTransports(change: AttributedChange) {
    const changes = Automerge.getChanges(change.oldDoc, change.newDoc)
    
    for (const [transportId, transport] of this.transports) {
      try {
        await this.syncToTransport(transportId, transport, changes)
      } catch (error) {
        console.error(`Sync failed for transport ${transportId}:`, error)
        // Queue for retry
        this.queueForRetry(transportId, changes)
      }
    }
  }
  
  private async syncToTransport(
    transportId: string,
    transport: SyncCapableTransport,
    changes: Automerge.Change[]
  ) {
    const syncState = this.syncStates.get(transportId)!
    const doc = this.localDoc.getDoc()
    
    // Generate sync message
    const [nextSyncState, message] = Automerge.generateSyncMessage(doc, syncState)
    this.syncStates.set(transportId, nextSyncState)
    
    if (message) {
      await transport.request({
        type: 'mutation',
        name: 'syncAutomergeChanges',
        variables: {
          message: Array.from(message),
          changes: changes.map(c => Array.from(c))
        }
      })
    }
  }
  
  private handleRemoteChange(transportId: string, remoteChange: any) {
    try {
      const syncState = this.syncStates.get(transportId)!
      const doc = this.localDoc.getDoc()
      
      // Process sync message
      const message = new Uint8Array(remoteChange.message)
      const [nextSyncState, nextDoc] = Automerge.receiveSyncMessage(doc, syncState, message)
      
      this.syncStates.set(transportId, nextSyncState)
      
      if (nextDoc) {
        // Merge remote changes
        this.localDoc.merge(nextDoc)
      }
    } catch (error) {
      console.error('Failed to handle remote change:', error)
    }
  }
  
  // Public API for applying changes
  applyUserChange(
    description: string,
    changeFn: (doc: ContentDocument) => void,
    userId: string,
    deviceId: string
  ) {
    return this.localDoc.applyUserChange(description, changeFn, userId, deviceId)
  }
  
  applyAIChange(
    description: string,
    changeFn: (doc: ContentDocument) => void,
    agentId: string,
    userId: string
  ) {
    return this.localDoc.applyAIChange(description, changeFn, agentId, userId)
  }
  
  getContent(): ContentDocument {
    return this.localDoc.getDoc()
  }
  
  subscribe(callback: (change: AttributedChange) => void): () => void {
    return this.localDoc.subscribe(callback)
  }
}
```

### AI-Aware Conflict Resolution

```typescript
export class AutomergeAIResolver {
  constructor(private aiService: AIContextService) {}
  
  async resolveConflicts(
    baseDoc: Automerge.Doc<ContentDocument>,
    userDoc: Automerge.Doc<ContentDocument>,
    aiDoc: Automerge.Doc<ContentDocument>
  ): Promise<Automerge.Doc<ContentDocument>> {
    
    // Automerge handles most conflicts automatically, but we can add semantic resolution
    const automaticMerge = Automerge.merge(Automerge.merge(baseDoc, userDoc), aiDoc)
    
    // Detect semantic conflicts that need AI resolution
    const conflicts = await this.detectSemanticConflicts(baseDoc, userDoc, aiDoc, automaticMerge)
    
    if (conflicts.length === 0) {
      return automaticMerge
    }
    
    // Use AI to resolve semantic conflicts
    const resolution = await this.aiService.resolveAutomergeConflicts({
      baseDoc,
      userDoc,
      aiDoc,
      automaticMerge,
      conflicts
    })
    
    return this.applyAIResolution(automaticMerge, resolution)
  }
  
  private async detectSemanticConflicts(
    baseDoc: Automerge.Doc<ContentDocument>,
    userDoc: Automerge.Doc<ContentDocument>,
    aiDoc: Automerge.Doc<ContentDocument>,
    mergedDoc: Automerge.Doc<ContentDocument>
  ): Promise<SemanticConflict[]> {
    const conflicts: SemanticConflict[] = []
    
    // Compare user and AI changes to same blocks
    const userChanges = Automerge.getChanges(baseDoc, userDoc)
    const aiChanges = Automerge.getChanges(baseDoc, aiDoc)
    
    // Find blocks modified by both user and AI
    const userModifiedBlocks = this.extractModifiedBlocks(userChanges)
    const aiModifiedBlocks = this.extractModifiedBlocks(aiChanges)
    
    const conflictingBlocks = userModifiedBlocks.filter(blockId => 
      aiModifiedBlocks.includes(blockId)
    )
    
    for (const blockId of conflictingBlocks) {
      conflicts.push({
        type: 'concurrent-block-edit',
        blockId,
        userVersion: this.getBlockFromDoc(userDoc, blockId),
        aiVersion: this.getBlockFromDoc(aiDoc, blockId),
        mergedVersion: this.getBlockFromDoc(mergedDoc, blockId)
      })
    }
    
    return conflicts
  }
  
  private async applyAIResolution(
    doc: Automerge.Doc<ContentDocument>,
    resolution: AIResolution
  ): Promise<Automerge.Doc<ContentDocument>> {
    return Automerge.change(doc, 'AI conflict resolution', doc => {
      resolution.blockResolutions.forEach(blockRes => {
        const blockIndex = doc.blocks.findIndex(b => b.id === blockRes.blockId)
        if (blockIndex !== -1) {
          doc.blocks[blockIndex] = blockRes.resolvedBlock
        }
      })
      
      // Add resolution record
      doc.changeHistory.push({
        id: this.generateChangeId(),
        timestamp: new Date().toISOString(),
        attribution: {
          source: 'ai-agent',
          agentId: 'conflict-resolver'
        },
        changeType: 'conflict-resolution',
        description: 'AI-assisted conflict resolution'
      })
    })
  }
}

interface SemanticConflict {
  type: 'concurrent-block-edit' | 'structural-conflict'
  blockId: string
  userVersion: Block
  aiVersion: Block
  mergedVersion: Block
}

interface AIResolution {
  strategy: 'merge' | 'prefer-user' | 'prefer-ai' | 'custom'
  blockResolutions: Array<{
    blockId: string
    resolvedBlock: Block
  }>
}
```

### Integration with Portable Content Client

```typescript
export class AutomergePortableContentClient extends PortableContentClient {
  private syncManager: AutomergeSyncManager
  
  constructor(transport: Transport) {
    super(transport)
    this.syncManager = new AutomergeSyncManager()
    this.setupIntegration()
  }
  
  private setupIntegration() {
    // Register transports for bidirectional sync
    this.syncManager.registerTransport('server', this.createServerTransport())
    this.syncManager.registerTransport('ai-agent', this.createAIAgentTransport())
    
    // Subscribe to document changes
    this.syncManager.subscribe((change) => {
      this.handleDocumentChange(change)
    })
  }
  
  // Override content operations to use Automerge
  async updateContent(id: string, input: UpdateContentInput): Promise<ContentItem> {
    const updatedDoc = this.syncManager.applyUserChange(
      `Update content: ${input.title || 'content changes'}`,
      (doc) => {
        if (input.title) {
          doc.title = input.title
        }
        
        if (input.summary) {
          doc.summary = input.summary
        }
        
        if (input.blocks) {
          // Update blocks
          input.blocks.forEach(blockInput => {
            const existingIndex = doc.blocks.findIndex(b => b.id === blockInput.id)
            
            if (existingIndex !== -1) {
              // Update existing block
              doc.blocks[existingIndex] = {
                ...doc.blocks[existingIndex],
                kind: blockInput.kind,
                payload: blockInput.payload,
                updatedAt: new Date().toISOString(),
                updatedBy: this.getCurrentUserId()
              }
            } else {
              // Add new block
              doc.blocks.push({
                id: blockInput.id || this.generateBlockId(),
                kind: blockInput.kind,
                payload: blockInput.payload,
                variants: {},
                createdAt: new Date().toISOString(),
                createdBy: this.getCurrentUserId(),
                updatedAt: new Date().toISOString(),
                updatedBy: this.getCurrentUserId()
              })
            }
          })
        }
      },
      this.getCurrentUserId(),
      this.getDeviceId()
    )
    
    return this.convertDocToContentItem(updatedDoc)
  }
  
  // Real-time content subscription
  subscribeToContent(contentId: string, callback: (content: ContentItem) => void): () => void {
    return this.syncManager.subscribe((change) => {
      const content = this.convertDocToContentItem(change.newDoc)
      if (content.id === contentId) {
        callback(content)
      }
    })
  }
  
  // Access to document history
  async getContentHistory(contentId: string): Promise<ContentVersion[]> {
    const doc = this.syncManager.getContent()
    
    return doc.changeHistory.map(change => ({
      version: change.id,
      timestamp: change.timestamp,
      description: change.description,
      attribution: change.attribution,
      changeType: change.changeType
    }))
  }
  
  // Time travel - get content at specific version
  async getContentAtVersion(contentId: string, version: string): Promise<ContentItem> {
    // This would require storing document states at each version
    // Implementation depends on storage strategy
    throw new Error('Time travel not implemented yet')
  }
  
  private handleDocumentChange(change: AttributedChange) {
    const content = this.convertDocToContentItem(change.newDoc)
    
    // Handle different change sources
    const latestChange = change.newDoc.changeHistory[change.newDoc.changeHistory.length - 1]
    
    switch (latestChange?.attribution.source) {
      case 'user':
        if (latestChange.attribution.deviceId !== this.getDeviceId()) {
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
    
    this.updateUI(content)
  }
  
  private convertDocToContentItem(doc: Automerge.Doc<ContentDocument>): ContentItem {
    return {
      id: doc.id,
      title: doc.title,
      type: doc.type,
      summary: doc.summary,
      blocks: doc.blocks.map(block => ({
        id: block.id,
        kind: block.kind,
        variants: Object.values(block.variants)
      })),
      representations: {},
      createdAt: doc.metadata.createdAt,
      updatedAt: doc.metadata.updatedAt,
      createdBy: doc.metadata.createdBy
    }
  }
}

interface ContentVersion {
  version: string
  timestamp: string
  description: string
  attribution: any
  changeType: string
}
```

## Performance Considerations

### Efficient Document Updates

```typescript
export class OptimizedAutomergeOperations {
  // Batch multiple changes into single transaction
  batchChanges(
    doc: Automerge.Doc<ContentDocument>,
    changes: Array<{
      description: string
      changeFn: (doc: ContentDocument) => void
    }>
  ): Automerge.Doc<ContentDocument> {
    return Automerge.change(doc, 'Batch update', doc => {
      changes.forEach(({ changeFn }) => changeFn(doc))
      
      // Single metadata update for all changes
      doc.metadata.updatedAt = new Date().toISOString()
      doc.metadata.version += 1
    })
  }
  
  // Efficient block updates without recreating arrays
  updateBlockEfficiently(
    doc: Automerge.Doc<ContentDocument>,
    blockId: string,
    updates: Partial<Block>
  ): Automerge.Doc<ContentDocument> {
    return Automerge.change(doc, `Update block ${blockId}`, doc => {
      const blockIndex = doc.blocks.findIndex(b => b.id === blockId)
      if (blockIndex !== -1) {
        // Update only changed properties
        Object.assign(doc.blocks[blockIndex], updates)
        doc.blocks[blockIndex].updatedAt = new Date().toISOString()
      }
    })
  }
}
```

## Key Benefits of Automerge Approach

1. **Complete Change History**: Full audit trail with attribution
2. **Time Travel**: Access to any previous document version
3. **Immutable Versions**: Each change creates new immutable version
4. **Familiar API**: JSON-like syntax for easy adoption
5. **Flexible Data**: Any JSON-compatible structure works
6. **Automatic Merging**: CRDT properties handle most conflicts
7. **Fine-Grained Changes**: Track individual property modifications
8. **Offline-First**: Full functionality without network connection
9. **Causal Consistency**: Changes maintain proper ordering
10. **Version Control**: Built-in versioning system

## Implementation Roadmap

### Phase 1: Basic Automerge Integration
- Set up Automerge document structure
- Implement change attribution system
- Create basic sync manager

### Phase 2: Bidirectional Sync
- Develop transport adapters for Automerge
- Implement user and AI change handling
- Add conflict detection and resolution

### Phase 3: Advanced Features
- Time travel and version history
- Performance optimizations
- AI-aware semantic conflict resolution

### Phase 4: Production Features
- Efficient storage and compression
- Incremental sync optimizations
- Monitoring and analytics
- Security and access control

This Automerge-based approach provides excellent version control and change attribution capabilities, making it ideal for content management systems requiring detailed audit trails and the ability to access historical versions.
