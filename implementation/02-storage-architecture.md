# Storage Architecture

## Overview

The storage architecture separates metadata from content assets, supporting multiple storage paradigms (relational, vector, graph databases) for searchable metadata and object storage for binary assets and generated variants. The core content system is domain-agnostic, with ownership and workspace management handled separately.

## Object Storage Strategy

### Storage Backend Options
- **Development**: Local filesystem with MinIO
- **Production**: AWS S3, Google Cloud Storage, or Azure Blob Storage
- **CDN**: CloudFlare, AWS CloudFront, or similar for global distribution

### Bucket Structure
```
portable-content-{env}/
├── content/
│   └── {content_id}/
│       ├── item.json                 # ContentItem manifest
│       ├── blocks/
│       │   └── {block_id}/
│       │       ├── payload.{ext}     # Original block payload
│       │       └── variants/
│       │           ├── html/         # text/html variants
│       │           │   └── content.html
│       │           ├── svg/          # image/svg+xml variants  
│       │           │   └── diagram.svg
│       │           ├── png-192dpi/   # image/png;dpi=192 variants
│       │           │   └── diagram.png
│       │           └── webp-800w/    # image/webp;width=800 variants
│       │               └── image.webp
│       └── extracts/
│           ├── summary.txt           # Content-level extract
│           └── blocks/
│               └── {block_id}.txt    # Block-level extracts
└── temp/
    └── transforms/                   # Temporary transform workspace
        └── {job_id}/
            ├── input/
            └── output/
```

### Content-Addressed Storage

#### Naming Strategy
- **Payloads**: `{content_id}/blocks/{block_id}/payload.{ext}`
- **Variants**: `{content_id}/blocks/{block_id}/variants/{variant_key}/content.{ext}`
- **Variant Key**: `{media_type_encoded}` (e.g., `html`, `svg`, `png-192dpi`, `webp-800w`)

#### Media Type Encoding
```
text/html;profile=markdown → html-markdown
image/svg+xml;profile=mermaid → svg-mermaid  
image/png;profile=mermaid;dpi=192 → png-mermaid-192dpi
image/webp;width=800 → webp-800w
text/plain;role=extract → txt-extract
```

### Access Patterns

#### Read Operations
1. **Content Retrieval**: Load `item.json` manifest
2. **Variant Selection**: Choose best variant based on capabilities
3. **Asset Delivery**: Serve variant content via CDN

#### Write Operations
1. **Content Creation**: Store payload, queue transforms
2. **Variant Generation**: Transform workers write variants
3. **Manifest Update**: Update `item.json` with new variants

## CDN Configuration

### Cache Headers
```http
# Immutable content (variants with content hash)
Cache-Control: public, max-age=31536000, immutable
ETag: "sha256:abc123..."

# Mutable content (manifests, payloads)
Cache-Control: public, max-age=3600, must-revalidate
ETag: "version-123"
```

### URL Structure
```
https://cdn.example.com/content/{content_id}/blocks/{block_id}/variants/{variant_key}/content.{ext}
https://cdn.example.com/content/{content_id}/item.json
```

### Signed URLs (Optional)
For private content, generate time-limited signed URLs:
```
https://cdn.example.com/content/{content_id}/...?signature=...&expires=...
```

## Database Integration Options

### Core Content Properties (Domain-Agnostic)
```json
{
  "id": "content_uuid",
  "type": "note",
  "title": "Example Content",
  "summary": "Human-readable summary",
  "kinds": ["markdown", "mermaid", "image"],
  "manifest_uri": "s3://bucket/content/content_uuid/item.json",
  "summary_extract": "Algorithmic text extract for search",
  "block_extracts": ["Block 1 text...", "Block 2 text..."],
  "flags": ["processed"],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 1. Relational Database Integration

**SQLite (Recommended for Development/Testing):**
```sql
-- Core content table (database-agnostic)
CREATE TABLE content_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'note',
    title TEXT,
    summary TEXT,
    kinds TEXT, -- JSON array as text
    manifest_uri TEXT,
    summary_extract TEXT,
    block_extracts TEXT, -- JSON array as text
    flags TEXT, -- JSON array as text
    created_at TEXT NOT NULL, -- ISO 8601 timestamp
    updated_at TEXT NOT NULL
);

-- Separate ownership/domain tables (if needed by application)
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
CREATE INDEX IF NOT EXISTS idx_content_type ON content_items(type);
CREATE INDEX IF NOT EXISTS idx_content_created ON content_items(created_at);
```

**PostgreSQL (Production Option):**
```sql
-- Same schema with PostgreSQL-specific optimizations
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

-- Optional vector search (if needed)
-- ALTER TABLE content_items ADD COLUMN embedding vector(1536);
-- CREATE INDEX ON content_items USING ivfflat (embedding vector_cosine_ops);
```

### 2. Vector Database Integration
```json
{
  "collection": "ContentItem",
  "properties": {
    "id": "content_uuid",
    "type": "note",
    "title": "Example Content",
    "manifest_uri": "s3://bucket/content/content_uuid/item.json",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "vector": [0.1, 0.2, 0.3, ...]
}
```

### 3. Graph Database Integration
```cypher
// Content nodes (pure content, no ownership)
CREATE (c:Content {
  id: 'content_uuid',
  type: 'note',
  title: 'Example Content',
  manifest_uri: 's3://bucket/content/content_uuid/item.json',
  created_at: datetime()
})

// Ownership handled through relationships (separate domain)
CREATE (u:User {id: 'user_uuid'})
CREATE (w:Workspace {id: 'workspace_uuid'})
CREATE (u)-[:OWNS]->(c)
CREATE (w)-[:CONTAINS]->(c)
```

### Indexing Strategy
- **Search**: Title + summary + block extracts (vector or full-text)
- **Filtering**: type, kinds, flags, created_at
- **Ownership**: Handled separately in domain layer

## Storage Operations

### Content Creation Flow
1. **Validate Input**: Check schemas and permissions
2. **Generate IDs**: Create UUIDs for content and blocks
3. **Store Payloads**: Upload block payloads to object storage
4. **Create Manifest**: Generate initial `item.json` with payload variants
5. **Index Metadata**: Insert/update Weaviate record
6. **Queue Transforms**: Schedule variant generation jobs

### Transform Pipeline Integration
1. **Job Creation**: Transform worker receives job with source URIs
2. **Download Sources**: Fetch payloads from object storage
3. **Execute Transform**: Run containerized tool
4. **Upload Results**: Store variants in object storage
5. **Update Manifest**: Add variant metadata to `item.json`
6. **Update Index**: Refresh vector database record with new flags

### Content Retrieval Flow
1. **Query Storage**: Find content by ID or search criteria (any storage type)
2. **Apply Domain Filters**: Check ownership/permissions in application layer
3. **Load Manifest**: Fetch `item.json` from manifest_uri
4. **Select Variants**: Choose best variants based on capabilities
5. **Return Response**: Provide content with selected variant URIs

## Performance Considerations

### Caching Strategy
- **L1 Cache**: Application-level manifest caching (Redis)
- **L2 Cache**: CDN edge caching for variants
- **L3 Cache**: Origin object storage

### Optimization Techniques
- **Manifest Compression**: Gzip `item.json` files
- **Batch Operations**: Group related storage operations
- **Lazy Loading**: Generate variants on-demand for uncommon formats
- **Prefetching**: Pre-generate common variants (HTML, SVG, WebP)

### Monitoring Metrics
- **Storage Usage**: Total bytes, growth rate by content type
- **Access Patterns**: Most requested variants, cache hit rates
- **Transform Performance**: Queue depth, processing times
- **Error Rates**: Failed uploads, transform errors

## Security Considerations

### Access Control
- **Bucket Policies**: Restrict direct access to object storage
- **IAM Roles**: Separate read/write permissions for services
- **Signed URLs**: Time-limited access for private content

### Content Validation
- **File Type Validation**: Verify MIME types match extensions
- **Size Limits**: Enforce maximum payload and variant sizes
- **Malware Scanning**: Optional virus scanning for uploads
- **Content Sanitization**: Strip EXIF data, validate SVG content

### Audit Trail
- **Access Logs**: Track all storage operations
- **Transform Provenance**: Record tool versions and options
- **Version History**: Optional versioning for content updates

## Disaster Recovery

### Backup Strategy
- **Metadata Backup**: Regular vector database snapshots
- **Asset Backup**: Cross-region replication for object storage
- **Manifest Backup**: Separate backup of all `item.json` files

### Recovery Procedures
- **Metadata Recovery**: Restore vector database from backup
- **Asset Recovery**: Restore from replicated storage
- **Consistency Check**: Validate manifest URIs and variant availability

## Development Setup

### Minimal Setup (SQLite)
```bash
# Create storage directory
mkdir -p storage

# Initialize SQLite database
php -r "
\$db = new PDO('sqlite:storage/content.db');
\$db->exec('PRAGMA foreign_keys = ON');
\$db->exec(file_get_contents('migrations/001_create_tables.sql'));
echo 'Database initialized\n';
"
```

### Production Setup Options

**Option 1: PostgreSQL + Object Storage**
```bash
# Start PostgreSQL
docker run -d --name postgres \
  -e POSTGRES_DB=portable_content \
  -e POSTGRES_USER=content \
  -e POSTGRES_PASSWORD=secret \
  -p 5432:5432 \
  postgres:15

# Start MinIO for object storage
docker run -d --name minio \
  -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

**Option 2: SQLite + Local Storage (Simple Deployments)**
```bash
# Just create directories - no external services needed
mkdir -p storage/content storage/assets
```

### Configuration
```yaml
# config/storage.yml
database:
  # SQLite (development/simple deployments)
  driver: sqlite
  path: storage/content.db

  # PostgreSQL (production)
  # driver: pgsql
  # host: localhost
  # port: 5432
  # database: portable_content
  # username: content
  # password: secret

storage:
  # Local storage (development)
  backend: local
  path: storage/assets

  # Object storage (production)
  # backend: s3
  # bucket: portable-content-prod
  # region: us-east-1
  # access_key: your_key
  # secret_key: your_secret
```
