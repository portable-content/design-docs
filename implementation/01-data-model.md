# Data Model Implementation

## Database Schema

The system supports multiple storage paradigms for content metadata. The core content schema is domain-agnostic.

#### Core ContentItem Schema (Domain-Agnostic)
```json
{
  "collection": "ContentItem",
  "description": "Content aggregates with block variants and extracts",
  "properties": [
    {"name": "id", "type": "text", "description": "Unique content identifier"},
    {"name": "type", "type": "text", "description": "Content type (note, article, etc.)"},
    {"name": "title", "type": "text", "description": "Content title"},
    {"name": "summary", "type": "text", "description": "Content summary for AI/search"},
    {"name": "kinds", "type": "text[]", "description": "Block kinds present in content"},
    {"name": "manifest_uri", "type": "text", "description": "URI to full JSON manifest"},
    {"name": "summary_extract", "type": "text", "description": "Algorithmic text extract"},
    {"name": "block_extracts", "type": "text[]", "description": "Text extracts from each block"},
    {"name": "flags", "type": "text[]", "description": "Processing flags (pending, error, etc.)"},
    {"name": "created_at", "type": "datetime", "description": "Creation timestamp"},
    {"name": "updated_at", "type": "datetime", "description": "Last update timestamp"}
  ]
}
```

> **Note**: Ownership and access control are application-domain concerns and should be handled separately from the core content representation.

## Storage Implementation Options

### 1. Relational Database Approach

**SQLite (Recommended for Development/Testing):**
```sql
-- Core content table (domain-agnostic, database-portable)
CREATE TABLE content_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'note',
    title TEXT,
    summary TEXT,
    kinds TEXT, -- JSON array as text for SQLite compatibility
    manifest_uri TEXT,
    summary_extract TEXT,
    block_extracts TEXT, -- JSON array as text
    flags TEXT, -- JSON array as text
    created_at TEXT NOT NULL, -- ISO 8601 timestamp
    updated_at TEXT NOT NULL
);

-- Separate domain-specific ownership table (if needed by application)
CREATE TABLE content_ownership (
    content_id TEXT,
    owner_type TEXT,
    owner_id TEXT,
    workspace_id TEXT,
    permissions TEXT, -- JSON as text
    created_at TEXT,
    FOREIGN KEY (content_id) REFERENCES content_items(id)
);

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_content_created ON content_items(created_at);
CREATE INDEX IF NOT EXISTS idx_content_type ON content_items(type);
```

**PostgreSQL (Production Option):**
```sql
-- Same schema but with PostgreSQL-specific optimizations
CREATE TABLE content_items (
    id UUID PRIMARY KEY,
    type VARCHAR(50) NOT NULL DEFAULT 'note',
    title TEXT,
    summary TEXT,
    kinds TEXT[], -- Native array type
    manifest_uri TEXT,
    summary_extract TEXT,
    block_extracts TEXT[],
    flags TEXT[],
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Optional: Add vector search if needed
-- ALTER TABLE content_items ADD COLUMN embedding vector(1536);
-- CREATE INDEX ON content_items USING ivfflat (embedding vector_cosine_ops);
```

### 2. Graph Database Approach

**Neo4j Example:**
```cypher
// Pure content nodes (no ownership embedded)
CREATE (c:Content {
  id: 'content_123',
  type: 'note',
  title: 'Example Content',
  manifest_uri: 's3://bucket/content_123/item.json',
  created_at: datetime()
})

// Ownership through relationships
CREATE (u:User {id: 'user_456', name: 'John Doe'})
CREATE (w:Workspace {id: 'workspace_789', name: 'My Workspace'})

// Relationship-based ownership
CREATE (u)-[:OWNS {created_at: datetime()}]->(c)
CREATE (w)-[:CONTAINS {added_at: datetime()}]->(c)
CREATE (u)-[:MEMBER_OF {role: 'admin'}]->(w)

// Query content by ownership
MATCH (u:User {id: 'user_456'})-[:OWNS]->(c:Content)
RETURN c
```

### 3. Vector Database Approach

**Weaviate Example:**
```json
{
  "class": "ContentItem",
  "vectorizer": "text2vec-openai",
  "properties": [
    {"name": "type", "dataType": ["text"]},
    {"name": "title", "dataType": ["text"]},
    {"name": "summary", "dataType": ["text"]},
    {"name": "kinds", "dataType": ["text[]"]},
    {"name": "manifest_uri", "dataType": ["text"]},
    {"name": "created_at", "dataType": ["date"]}
  ]
}
```

**Pinecone Example:**
```python
# Content record with minimal metadata
index.upsert(vectors=[
    {
        "id": "content_123",
        "values": embedding_vector,
        "metadata": {
            "type": "note",
            "title": "Content Title",
            "manifest_uri": "s3://bucket/content_123/item.json",
            "created_at": "2024-01-01T00:00:00Z"
        }
    }
])

# Ownership handled in separate system or through metadata filtering
```

### JSON Manifest Structure

#### ContentItem Manifest
```json
{
  "contentSpecVersion": "0.1.0",
  "registryVersion": "0.1.0",
  "id": "content_uuid",
  "type": "note",
  "title": "Example Content",
  "summary": "Human-readable summary",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "blocks": [
    {
      "id": "block_uuid",
      "kind": "markdown",
      "payload": {
        "source": "# Hello World\nThis is markdown content."
      },
      "variants": [
        {
          "mediaType": "text/markdown",
          "uri": "s3://bucket/content_uuid/blocks/block_uuid/payload.md",
          "bytes": 42,
          "contentHash": "sha256:abc123...",
          "createdAt": "2024-01-01T00:00:00Z"
        },
        {
          "mediaType": "text/html;profile=markdown",
          "uri": "s3://bucket/content_uuid/blocks/block_uuid/variants/html.html",
          "bytes": 89,
          "contentHash": "sha256:def456...",
          "generatedBy": "markdown-transform",
          "toolVersion": "1.0.0",
          "createdAt": "2024-01-01T00:00:00Z"
        }
      ]
    }
  ],
  "representations": {
    "summary": {"blocks": ["block_uuid"]}
  }
}
```

## Block-Specific Payloads

### Markdown Block
```json
{
  "id": "block_uuid",
  "kind": "markdown",
  "payload": {
    "source": "# Title\n\nMarkdown content here..."
  },
  "variants": [
    {
      "mediaType": "text/markdown",
      "uri": "s3://bucket/path/payload.md"
    },
    {
      "mediaType": "text/html;profile=markdown",
      "uri": "s3://bucket/path/variants/html.html",
      "generatedBy": "markdown-transform",
      "toolVersion": "unified@10.1.2"
    },
    {
      "mediaType": "text/plain;role=extract",
      "uri": "s3://bucket/path/variants/extract.txt",
      "generatedBy": "text-extract",
      "toolVersion": "1.0.0"
    }
  ]
}
```

### Mermaid Block
```json
{
  "id": "block_uuid", 
  "kind": "mermaid",
  "payload": {
    "source": "graph TD;\n    A-->B;\n    A-->C;",
    "theme": "default"
  },
  "variants": [
    {
      "mediaType": "text/plain",
      "uri": "s3://bucket/path/payload.mmd"
    },
    {
      "mediaType": "image/svg+xml;profile=mermaid",
      "uri": "s3://bucket/path/variants/diagram.svg",
      "width": 800,
      "height": 600,
      "generatedBy": "mermaid-cli",
      "toolVersion": "10.6.1"
    },
    {
      "mediaType": "image/png;profile=mermaid;dpi=192",
      "uri": "s3://bucket/path/variants/diagram@2x.png", 
      "width": 1600,
      "height": 1200,
      "generatedBy": "mermaid-cli",
      "toolVersion": "10.6.1"
    }
  ]
}
```

### Image Block
```json
{
  "id": "block_uuid",
  "kind": "image", 
  "payload": {
    "uri": "s3://bucket/path/original.jpg",
    "alt": "Description of image",
    "width": 2048,
    "height": 1536
  },
  "variants": [
    {
      "mediaType": "image/jpeg",
      "uri": "s3://bucket/path/original.jpg",
      "width": 2048,
      "height": 1536,
      "bytes": 524288
    },
    {
      "mediaType": "image/webp;width=800",
      "uri": "s3://bucket/path/variants/800w.webp",
      "width": 800,
      "height": 600,
      "bytes": 45000,
      "generatedBy": "image-transform",
      "toolVersion": "libvips-8.14"
    },
    {
      "mediaType": "image/avif;width=800", 
      "uri": "s3://bucket/path/variants/800w.avif",
      "width": 800,
      "height": 600,
      "bytes": 32000,
      "generatedBy": "image-transform",
      "toolVersion": "libvips-8.14"
    }
  ]
}
```

## Storage Layout

### Object Storage Structure
```
/content/{content_id}/
  ├── item.json                    # Full ContentItem manifest
  ├── blocks/
  │   └── {block_id}/
  │       ├── payload.{ext}        # Original payload
  │       └── variants/
  │           ├── {media-type-encoded}/
  │           │   └── content.{ext}
  │           └── ...
  └── extracts/
      ├── summary.txt              # Content summary
      └── blocks/
          └── {block_id}.txt       # Block text extract
```

### Content-Addressed Naming
- Variant keys: `{content_hash}-{transform_hash}.{ext}`
- Transform hash: SHA256 of (tool_version + options + source_hash)
- Enables deduplication and cache invalidation

## Validation Rules

### ContentManifest Validation
- `id` must be valid UUID
- `type` must be non-empty string
- `blocks` array can be empty but must be present
- All block IDs must be unique within content manifest
- Referenced blocks in representations must exist

### Block Validation
- `id` must be valid UUID
- `kind` must be registered in registry
- `content` must validate against kind schema
- `primary` content must be present
- Alternative media types must be allowed for the kind

### Variant Validation
- `mediaType` must be valid RFC 6838 format
- `uri` must be valid URI if present
- Dimensions must be positive integers if present
- `contentHash` should be SHA256 format if present

## Domain Separation

The core content system is designed to be domain-agnostic. Ownership and access control are separate concerns that should be implemented in the application layer:

```php
// Core content service (domain-agnostic)
interface ContentServiceInterface
{
    public function create(CreateContentRequest $request): ContentItem;
    public function get(string $id): ?ContentItem;
    public function search(SearchRequest $request): SearchResult;
}

// Application-layer service (domain-specific)
class WorkspaceContentService
{
    public function __construct(
        private ContentServiceInterface $contentService,
        private OwnershipService $ownershipService,
        private PermissionService $permissionService
    ) {}

    public function createContent(string $workspaceId, string $userId, CreateContentRequest $request): ContentItem
    {
        // Create content using core service
        $content = $this->contentService->create($request);

        // Handle ownership in separate domain layer
        $this->ownershipService->assignOwnership($content->id, $userId, $workspaceId);

        return $content;
    }

    public function getUserContent(string $userId, string $workspaceId): array
    {
        // Get content IDs user has access to
        $contentIds = $this->ownershipService->getAccessibleContent($userId, $workspaceId);

        // Fetch content using core service
        return array_map(
            fn($id) => $this->contentService->get($id),
            $contentIds
        );
    }
}
```

## Platform Abstraction

### Storage Interface
```php
interface ContentStorageInterface
{
    public function store(ContentItem $content): void;
    public function get(string $id): ?ContentItem;
    public function findAll(int $limit = 20, int $offset = 0): array;
    public function delete(string $id): void;
}

// SQLite implementation (database-agnostic)
class SQLiteContentStorage implements ContentStorageInterface
{
    public function __construct(private PDO $db) {}

    public function store(ContentItem $content): void
    {
        $stmt = $this->db->prepare('
            INSERT OR REPLACE INTO content_items
            (id, type, title, summary, manifest_uri, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $content->id,
            $content->type,
            $content->title,
            $content->summary,
            $content->manifestUri,
            $content->createdAt->format('c'), // ISO 8601
            $content->updatedAt->format('c')
        ]);
    }

    public function get(string $id): ?ContentItem
    {
        $stmt = $this->db->prepare('SELECT * FROM content_items WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->hydrateFromRow($row) : null;
    }

    private function hydrateFromRow(array $row): ContentItem
    {
        return new ContentItem(
            id: $row['id'],
            type: $row['type'],
            title: $row['title'],
            summary: $row['summary'],
            manifestUri: $row['manifest_uri'],
            createdAt: new DateTimeImmutable($row['created_at']),
            updatedAt: new DateTimeImmutable($row['updated_at'])
        );
    }
}

// Vector database implementation
class VectorContentStorage implements ContentStorageInterface
{
    public function __construct(private VectorDatabaseClient $client) {}

    public function store(ContentItem $content): void
    {
        $vector = $this->generateEmbedding($content->title . ' ' . $content->summary);
        $this->client->upsert('content', $content->id, [
            'type' => $content->type,
            'title' => $content->title,
            'summary' => $content->summary,
            'manifest_uri' => $content->manifestUri,
            'created_at' => $content->createdAt->format('c')
        ], $vector);
    }
}

// Graph database implementation
class GraphContentStorage implements ContentStorageInterface
{
    public function __construct(private Neo4jClient $client) {}

    public function store(ContentItem $content): void
    {
        $this->client->run('
            MERGE (c:Content {id: $id})
            SET c.type = $type,
                c.title = $title,
                c.summary = $summary,
                c.manifest_uri = $manifest_uri,
                c.created_at = datetime($created_at)
        ', [
            'id' => $content->id,
            'type' => $content->type,
            'title' => $content->title,
            'summary' => $content->summary,
            'manifest_uri' => $content->manifestUri,
            'created_at' => $content->createdAt->format('c')
        ]);
    }
}
```

## Implementation Notes

### PHP Data Classes
```php
final class ContentItem {
    public function __construct(
        public string $id,
        public string $type,
        public ?string $title = null,
        public ?string $summary = null,
        /** @var Block[] */
        public array $blocks = [],
        public ?array $representations = null,
        public ?\DateTimeImmutable $createdAt = null,
        public ?\DateTimeImmutable $updatedAt = null,
        public ?string $createdBy = null,
    ) {}
}

abstract class Block {
    public function __construct(
        public string $id,
        public string $kind,
        public mixed $payload,
        /** @var Variant[] */
        public array $variants = [],
    ) {}
}

final class Variant {
    public function __construct(
        public string $mediaType,
        public ?string $uri = null,
        public ?int $width = null,
        public ?int $height = null,
        public ?int $bytes = null,
        public ?string $contentHash = null,
        public ?string $generatedBy = null,
        public ?string $toolVersion = null,
        public ?\DateTimeImmutable $createdAt = null,
    ) {}
}
```

### TypeScript Interfaces
```typescript
interface ContentItem {
  id: string;
  type: string;
  title?: string;
  summary?: string;
  blocks: Block[];
  representations?: Record<string, {blocks: string[]}>;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

interface Block {
  id: string;
  kind: string;
  payload: unknown;
  variants: Variant[];
}

interface Variant {
  mediaType: string;
  uri?: string;
  width?: number;
  height?: number;
  bytes?: number;
  contentHash?: string;
  generatedBy?: string;
  toolVersion?: string;
  createdAt?: string;
}
```
