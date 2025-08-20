# Phase 1A: Markdown MVP Implementation

## Overview

This phase focuses on getting the absolute minimum viable system working with just markdown content. Pure content storage and retrieval - database agnostic, no search, no transforms. Just the essential content entity operations.

## Simplified Data Model

### Database Schema (Database Agnostic)

```sql
-- Core content table (works with SQLite, PostgreSQL, MySQL, etc.)
CREATE TABLE content_items (
    id TEXT PRIMARY KEY,  -- UUID as string for compatibility
    type TEXT NOT NULL DEFAULT 'note',
    title TEXT,
    summary TEXT,
    created_at TEXT NOT NULL,  -- ISO 8601 timestamp
    updated_at TEXT NOT NULL
);

-- Markdown blocks table
CREATE TABLE markdown_blocks (
    id TEXT PRIMARY KEY,
    content_id TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (content_id) REFERENCES content_items(id) ON DELETE CASCADE
);

-- Basic indexes (optional - for performance only)
CREATE INDEX IF NOT EXISTS idx_content_created ON content_items(created_at);
CREATE INDEX IF NOT EXISTS idx_blocks_content ON markdown_blocks(content_id);
```

### Data Structure (No Manifests for MVP)

**Database Records:**
```sql
-- content_items table
INSERT INTO content_items (id, type, title, summary)
VALUES ('content_uuid', 'note', 'My First Note', 'A simple markdown note');

-- markdown_blocks table
INSERT INTO markdown_blocks (id, content_id, source)
VALUES ('block_uuid', 'content_uuid', '# Hello World\n\nThis is my **first** markdown note!');
```

**API Response Format:**
```json
{
  "id": "content_uuid",
  "type": "note",
  "title": "My First Note",
  "summary": "A simple markdown note",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "blocks": [
    {
      "id": "block_uuid",
      "kind": "markdown",
      "source": "# Hello World\n\nThis is my **first** markdown note!"
    }
  ]
}
```

## PHP Implementation

### Data Classes

```php
<?php

final class ContentItem
{
    public function __construct(
        public string $id,
        public string $type,
        public ?string $title = null,
        public ?string $summary = null,
        /** @var MarkdownBlock[] */
        public array $blocks = [],
        public ?\DateTimeImmutable $createdAt = null,
        public ?\DateTimeImmutable $updatedAt = null,
    ) {}
    
    public static function create(string $type, ?string $title = null, ?string $summary = null): self
    {
        return new self(
            id: Uuid::uuid4()->toString(),
            type: $type,
            title: $title,
            summary: $summary,
            createdAt: new \DateTimeImmutable(),
            updatedAt: new \DateTimeImmutable()
        );
    }
}

final class MarkdownBlock
{
    public function __construct(
        public string $id,
        public string $source,
        public ?\DateTimeImmutable $createdAt = null,
    ) {}

    public static function create(string $source): self
    {
        return new self(
            id: Uuid::uuid4()->toString(),
            source: $source,
            createdAt: new \DateTimeImmutable()
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'kind' => 'markdown',
            'source' => $this->source
        ];
    }
}
```

### Repository Implementation

```php
<?php

interface ContentRepositoryInterface
{
    public function save(ContentItem $content): void;
    public function findById(string $id): ?ContentItem;
    public function findAll(int $limit = 20, int $offset = 0): array;
    public function delete(string $id): void;
}

class ContentRepository implements ContentRepositoryInterface
{
    public function __construct(private \PDO $db) {}

    public function save(ContentItem $content): void
    {
        $this->db->beginTransaction();

        try {
            // Store content metadata
            $stmt = $this->db->prepare('
                INSERT INTO content_items (id, type, title, summary, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET
                    type = EXCLUDED.type,
                    title = EXCLUDED.title,
                    summary = EXCLUDED.summary,
                    updated_at = EXCLUDED.updated_at
            ');

            $stmt->execute([
                $content->id,
                $content->type,
                $content->title,
                $content->summary,
                $content->createdAt->format('c'), // ISO 8601
                $content->updatedAt->format('c')
            ]);

            // Delete existing blocks for updates
            $stmt = $this->db->prepare('DELETE FROM markdown_blocks WHERE content_id = ?');
            $stmt->execute([$content->id]);

            // Store markdown blocks
            $stmt = $this->db->prepare('
                INSERT INTO markdown_blocks (id, content_id, source, created_at)
                VALUES (?, ?, ?, ?)
            ');

            foreach ($content->blocks as $block) {
                $stmt->execute([
                    $block->id,
                    $content->id,
                    $block->source,
                    $block->createdAt->format('c')
                ]);
            }

            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
    
    public function findById(string $id): ?ContentItem
    {
        // Get content metadata
        $stmt = $this->db->prepare('SELECT * FROM content_items WHERE id = ?');
        $stmt->execute([$id]);
        $contentRow = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$contentRow) {
            return null;
        }

        // Get markdown blocks
        $stmt = $this->db->prepare('SELECT * FROM markdown_blocks WHERE content_id = ? ORDER BY created_at');
        $stmt->execute([$id]);
        $blockRows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $blocks = [];
        foreach ($blockRows as $blockRow) {
            $blocks[] = new MarkdownBlock(
                id: $blockRow['id'],
                source: $blockRow['source'],
                createdAt: new \DateTimeImmutable($blockRow['created_at'])
            );
        }

        return new ContentItem(
            id: $contentRow['id'],
            type: $contentRow['type'],
            title: $contentRow['title'],
            summary: $contentRow['summary'],
            blocks: $blocks,
            createdAt: new \DateTimeImmutable($contentRow['created_at']),
            updatedAt: new \DateTimeImmutable($contentRow['updated_at'])
        );
    }
    
    public function findAll(int $limit = 20, int $offset = 0): array
    {
        $stmt = $this->db->prepare('
            SELECT * FROM content_items
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ');

        $stmt->execute([$limit, $offset]);
        $contentRows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $results = [];
        foreach ($contentRows as $contentRow) {
            $content = $this->findById($contentRow['id']);
            if ($content) {
                $results[] = $content;
            }
        }

        return $results;
    }

    public function delete(string $id): void
    {
        // Cascade delete will handle markdown_blocks
        $stmt = $this->db->prepare('DELETE FROM content_items WHERE id = ?');
        $stmt->execute([$id]);
    }
}
```

## Service Setup

```php
<?php

// Simple service container for MVP
class ServiceContainer
{
    private static ?\PDO $db = null;
    private static ?ContentRepositoryInterface $contentRepository = null;

    public static function getDatabase(): \PDO
    {
        if (self::$db === null) {
            // Use SQLite for simplicity (can easily switch to PostgreSQL/MySQL later)
            $dsn = 'sqlite:' . __DIR__ . '/../../storage/content.db';
            self::$db = new \PDO($dsn, null, null, [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            ]);

            // Enable foreign keys for SQLite
            self::$db->exec('PRAGMA foreign_keys = ON');
        }

        return self::$db;
    }

    public static function getContentRepository(): ContentRepositoryInterface
    {
        if (self::$contentRepository === null) {
            self::$contentRepository = new ContentRepository(self::getDatabase());
        }

        return self::$contentRepository;
    }
}
```

## Validation

```php
<?php

class ContentValidator
{
    public function validateCreateRequest(array $data): array
    {
        $errors = [];
        
        if (empty($data['type'])) {
            $errors[] = 'Content type is required';
        }
        
        if (isset($data['title']) && strlen($data['title']) > 255) {
            $errors[] = 'Title too long (max 255 characters)';
        }
        
        if (empty($data['blocks'])) {
            $errors[] = 'At least one block is required';
        }
        
        foreach ($data['blocks'] ?? [] as $i => $block) {
            if ($block['kind'] !== 'markdown') {
                $errors[] = "Block {$i}: only markdown blocks supported in MVP";
            }
            
            if (empty($block['payload']['source'])) {
                $errors[] = "Block {$i}: markdown source is required";
            }
            
            if (strlen($block['payload']['source']) > 100000) {
                $errors[] = "Block {$i}: markdown content too long (max 100KB)";
            }
        }
        
        return $errors;
    }
}
```

## Development Setup

```bash
# Create storage directory
mkdir -p storage

# Initialize database (SQLite - zero setup!)
php -r "
require 'vendor/autoload.php';
\$db = new PDO('sqlite:storage/content.db');
\$db->exec(file_get_contents('migrations/001_create_tables.sql'));
echo 'Database initialized\n';
"
```

### Migration File (migrations/001_create_tables.sql)

```sql
-- Create content_items table (SQLite compatible)
CREATE TABLE content_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'note',
    title TEXT,
    summary TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Create markdown_blocks table
CREATE TABLE markdown_blocks (
    id TEXT PRIMARY KEY,
    content_id TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (content_id) REFERENCES content_items(id) ON DELETE CASCADE
);

-- Create basic indexes (optional)
CREATE INDEX IF NOT EXISTS idx_content_created ON content_items(created_at);
CREATE INDEX IF NOT EXISTS idx_blocks_content ON markdown_blocks(content_id);
```

### Alternative Database Configurations

```php
// PostgreSQL (if you prefer)
$dsn = 'pgsql:host=localhost;port=5432;dbname=portable_content_dev';
$db = new PDO($dsn, 'user', 'password');

// MySQL (if you prefer)
$dsn = 'mysql:host=localhost;dbname=portable_content_dev;charset=utf8mb4';
$db = new PDO($dsn, 'user', 'password');

// SQLite (recommended for MVP)
$dsn = 'sqlite:storage/content.db';
$db = new PDO($dsn);
```

## Next Steps

## Example Usage

```php
<?php

// Create content
$content = ContentItem::create('note', 'My First Note', 'A simple markdown note');
$content->blocks[] = MarkdownBlock::create('# Hello World\n\nThis is my **first** markdown note!');

$repository = ServiceContainer::getContentRepository();
$repository->save($content);

// Retrieve content
$retrieved = $repository->findById($content->id);
echo $retrieved->title; // "My First Note"
echo $retrieved->blocks[0]->source; // "# Hello World\n\n..."

// List all content
$results = $repository->findAll(10, 0); // limit 10, offset 0
foreach ($results as $result) {
    echo $result->title . "\n";
}
```

## Next Steps

This ultra-simple MVP provides:
- ✅ **Zero infrastructure complexity** - Just SQLite (single file!)
- ✅ **Database agnostic** - Works with SQLite, PostgreSQL, MySQL
- ✅ **Pure content storage** - No search, no indexing complexity
- ✅ **Simple data model** - Easy to understand and debug
- ✅ **ACID transactions** - Reliable data consistency
- ✅ **Fast development** - No external dependencies

**Separation of Concerns:**
- **Core Content System**: Pure entity storage (this MVP)
- **Search Layer**: Optional - can be added later (Elasticsearch, vector DB, etc.)
- **Application Features**: Domain-specific logic built on top

**Migration Path:**
- Phase 1B: Add GraphQL API on top of this foundation
- Phase 1C: Add object storage when images are introduced
- Phase 1C: Introduce manifest-based architecture for complex assets
- Phase 1D: Add transform pipeline for variant generation
- Later: Add search layer if needed (separate from core content)

Ready for Phase 1B: Adding GraphQL API and basic client rendering.
