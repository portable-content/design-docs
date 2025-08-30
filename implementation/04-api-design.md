# API Design

## Overview

The API layer provides GraphQL endpoints for content retrieval and REST endpoints for content ingestion. It handles capability-based variant selection and integrates with the storage and transform systems.

## GraphQL Schema

### Core Types
```graphql
scalar JSON
scalar DateTime
scalar URI

interface Block {
  id: ID!
  kind: String!
  content: BlockContent!
}

type BlockContent {
  primary: PayloadSource!
  source: PayloadSource
  alternatives: [PayloadSource!]
}

union PayloadSource = InlinePayloadSource | ExternalPayloadSource

type InlinePayloadSource {
  type: String!
  mediaType: String!
  source: String!
}

type ExternalPayloadSource {
  type: String!
  mediaType: String!
  uri: String!
  bytes: Int
  contentHash: String
  generatedBy: String
  toolVersion: String
  createdAt: DateTime
}

type ContentManifest {
  id: ID!
  type: String!
  title: String
  summary: String
  blocks: [Block!]!
  representations: JSON
  createdAt: DateTime
  updatedAt: DateTime
  createdBy: String
}

# Block implementations
type MarkdownBlock implements Block {
  id: ID!
  kind: String!
  payload: JSON
  variants: [Variant!]!
  # Convenience fields
  source: String
}

type MermaidBlock implements Block {
  id: ID!
  kind: String!
  payload: JSON
  variants: [Variant!]!
  # Convenience fields
  source: String
  theme: String
}

type ImageBlock implements Block {
  id: ID!
  kind: String!
  payload: JSON
  variants: [Variant!]!
  # Convenience fields
  alt: String
  originalWidth: Int
  originalHeight: Int
}

# Input types
input CapabilitiesInput {
  accept: [String!]!
  hints: CapabilityHintsInput
}

input CapabilityHintsInput {
  width: Int
  height: Int
  density: Float
  network: NetworkType
}

enum NetworkType {
  FAST
  SLOW
  CELLULAR
}

# Queries
type Query {
  content(
    id: ID!
    capabilities: CapabilitiesInput
    representation: String
  ): ContentItem
  
  searchContent(
    query: String!
    types: [String!]
    kinds: [String!]
    limit: Int = 20
    offset: Int = 0
    capabilities: CapabilitiesInput
  ): ContentSearchResult
}

type ContentSearchResult {
  items: [ContentItem!]!
  total: Int!
  hasMore: Boolean!
}

# Mutations
type Mutation {
  createContent(input: CreateContentInput!): CreateContentResult!
  updateContent(id: ID!, input: UpdateContentInput!): UpdateContentResult!
  deleteContent(id: ID!): DeleteContentResult!
  refreshVariants(id: ID!, blockIds: [ID!]): RefreshVariantsResult!
}

input CreateContentInput {
  type: String!
  title: String
  summary: String
  blocks: [CreateBlockInput!]!
}

input CreateBlockInput {
  kind: String!
  payload: JSON!
}

input UpdateContentInput {
  title: String
  summary: String
  blocks: [UpdateBlockInput!]
}

input UpdateBlockInput {
  id: ID
  kind: String!
  payload: JSON!
}

type CreateContentResult {
  content: ContentItem
  errors: [String!]
}

type UpdateContentResult {
  content: ContentItem
  errors: [String!]
}

type DeleteContentResult {
  success: Boolean!
  errors: [String!]
}

type RefreshVariantsResult {
  jobIds: [String!]!
  errors: [String!]
}
```

### Example Queries

#### Basic Content Retrieval
```graphql
query GetContent($id: ID!, $capabilities: CapabilitiesInput!) {
  content(id: $id, capabilities: $capabilities) {
    id
    title
    summary
    blocks {
      id
      kind
      ... on MarkdownBlock {
        source
        variants {
          mediaType
          uri
        }
      }
      ... on MermaidBlock {
        source
        theme
        variants {
          mediaType
          uri
          width
          height
        }
      }
      ... on ImageBlock {
        alt
        variants {
          mediaType
          uri
          width
          height
          bytes
        }
      }
    }
  }
}
```

#### Content Search
```graphql
query SearchContent($query: String!, $capabilities: CapabilitiesInput!) {
  searchContent(
    query: $query
    kinds: ["markdown", "mermaid", "image"]
    limit: 10
    capabilities: $capabilities
  ) {
    total
    hasMore
    items {
      id
      title
      summary
      blocks {
        id
        kind
        variants {
          mediaType
          uri
        }
      }
    }
  }
}
```

#### Content Creation
```graphql
mutation CreateContent($input: CreateContentInput!) {
  createContent(input: $input) {
    content {
      id
      title
      blocks {
        id
        kind
      }
    }
    errors
  }
}
```

## REST API Endpoints

### Content Ingestion
```http
POST /api/v1/content
Content-Type: application/json
Authorization: Bearer {token}

{
  "type": "note",
  "title": "Example Content",
  "summary": "Content with multiple blocks",
  "blocks": [
    {
      "kind": "markdown",
      "payload": {
        "source": "# Hello World\n\nThis is markdown content."
      }
    },
    {
      "kind": "mermaid", 
      "payload": {
        "source": "graph TD;\n    A-->B;\n    A-->C;",
        "theme": "default"
      }
    }
  ]
}
```

### File Upload
```http
POST /api/v1/content/{content_id}/blocks/{block_id}/upload
Content-Type: multipart/form-data
Authorization: Bearer {token}

file: [binary data]
```

### Variant Refresh
```http
POST /api/v1/content/{content_id}/refresh
Content-Type: application/json
Authorization: Bearer {token}

{
  "blockIds": ["block_uuid_1", "block_uuid_2"]
}
```

## Capability-Based Variant Selection

### Selection Algorithm
```python
def select_best_variant(variants: List[Variant], capabilities: Capabilities) -> Optional[Variant]:
    """Select the best variant based on client capabilities"""
    
    # Filter by accepted media types
    acceptable = []
    for variant in variants:
        for accept in capabilities.accept:
            if media_type_matches(variant.media_type, accept):
                acceptable.append((variant, calculate_quality_score(accept)))
                break
    
    if not acceptable:
        # Return fallback variant
        return find_fallback_variant(variants)
    
    # Sort by quality score and capability hints
    scored = []
    for variant, quality in acceptable:
        score = quality
        
        # Prefer variants that match size hints
        if capabilities.hints and capabilities.hints.width:
            if variant.width:
                size_diff = abs(variant.width - capabilities.hints.width)
                score -= size_diff / 1000  # Penalty for size mismatch
        
        # Prefer smaller files on slow networks
        if capabilities.hints and capabilities.hints.network == 'SLOW':
            if variant.bytes:
                score -= variant.bytes / 100000  # Penalty for large files
        
        scored.append((variant, score))
    
    # Return highest scoring variant
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[0][0]

def media_type_matches(variant_type: str, accept_type: str) -> bool:
    """Check if variant media type matches accept pattern"""
    # Handle wildcards: image/* matches image/png
    if accept_type.endswith('/*'):
        return variant_type.startswith(accept_type[:-1])
    
    # Handle parameters: image/png;width=800 matches image/png
    variant_base = variant_type.split(';')[0]
    accept_base = accept_type.split(';')[0]
    
    return variant_base == accept_base
```

### Capability Examples
```json
{
  "accept": [
    "image/avif",
    "image/webp", 
    "image/png",
    "text/html;profile=markdown",
    "text/markdown"
  ],
  "hints": {
    "width": 800,
    "density": 2.0,
    "network": "FAST"
  }
}
```

## API Implementation (PHP)

### GraphQL Resolver
```php
<?php

class ContentResolver
{
    public function __construct(
        private ContentRepository $repository,
        private VariantSelector $variantSelector,
    ) {}

    public function content(array $args): ?ContentItem
    {
        $id = $args['id'];
        $capabilities = $args['capabilities'] ?? null;
        $representation = $args['representation'] ?? null;

        $content = $this->repository->findById($id);
        if (!$content) {
            return null;
        }

        // Apply capability-based variant selection
        if ($capabilities) {
            $content = $this->selectVariants($content, $capabilities);
        }

        // Apply representation filtering
        if ($representation && $content->representations) {
            $content = $this->applyRepresentation($content, $representation);
        }

        return $content;
    }

    public function searchContent(array $args): ContentSearchResult
    {
        $query = $args['query'];
        $types = $args['types'] ?? null;
        $kinds = $args['kinds'] ?? null;
        $limit = $args['limit'] ?? 20;
        $offset = $args['offset'] ?? 0;
        $capabilities = $args['capabilities'] ?? null;

        $searchParams = new ContentSearchParams(
            query: $query,
            types: $types,
            kinds: $kinds,
            limit: $limit,
            offset: $offset
        );

        $result = $this->repository->search($searchParams);

        // Apply variant selection to results
        if ($capabilities) {
            $result->items = array_map(
                fn($item) => $this->selectVariants($item, $capabilities),
                $result->items
            );
        }

        return $result;
    }

    private function selectVariants(ContentItem $content, array $capabilities): ContentItem
    {
        $blocks = [];
        foreach ($content->blocks as $block) {
            $bestVariants = [];
            foreach ($block->variants as $variant) {
                if ($this->variantSelector->isAcceptable($variant, $capabilities)) {
                    $bestVariants[] = $variant;
                }
            }
            
            // Keep only the best variant for each media type family
            $selected = $this->variantSelector->selectBest($bestVariants, $capabilities);
            $blocks[] = $block->withVariants($selected);
        }

        return $content->withBlocks($blocks);
    }

    private function applyRepresentation(ContentItem $content, string $representation): ContentItem
    {
        if (!isset($content->representations[$representation])) {
            return $content;
        }

        $allowedBlockIds = $content->representations[$representation]['blocks'];
        $filteredBlocks = array_filter(
            $content->blocks,
            fn($block) => in_array($block->id, $allowedBlockIds)
        );

        return $content->withBlocks($filteredBlocks);
    }
}
```

### Content Creation Endpoint
```php
<?php

class ContentController
{
    public function __construct(
        private ContentRepository $repository,
        private TransformQueue $transformQueue,
        private StorageService $storage,
    ) {}

    public function create(Request $request): JsonResponse
    {
        $data = $request->json()->all();
        
        // Validate input
        $validator = new ContentValidator();
        $errors = $validator->validate($data);
        if ($errors) {
            return response()->json(['errors' => $errors], 400);
        }

        try {
            // Create content item
            $contentId = Uuid::uuid4()->toString();
            $blocks = [];

            foreach ($data['blocks'] as $blockData) {
                $blockId = Uuid::uuid4()->toString();
                
                // Store payload
                $payloadUri = $this->storePayload($contentId, $blockId, $blockData);
                
                // Create initial variant for payload
                $payloadVariant = new Variant(
                    mediaType: $this->getPayloadMediaType($blockData['kind']),
                    uri: $payloadUri,
                    bytes: strlen(json_encode($blockData['payload'])),
                    createdAt: new DateTimeImmutable()
                );

                $block = new Block(
                    id: $blockId,
                    kind: $blockData['kind'],
                    payload: $blockData['payload'],
                    variants: [$payloadVariant]
                );

                $blocks[] = $block;

                // Queue transform jobs
                $this->queueTransforms($contentId, $blockId, $blockData['kind']);
            }

            $content = new ContentItem(
                id: $contentId,
                type: $data['type'],
                title: $data['title'] ?? null,
                summary: $data['summary'] ?? null,
                blocks: $blocks,
                createdAt: new DateTimeImmutable(),
                updatedAt: new DateTimeImmutable()
            );

            // Save to repository
            $this->repository->save($content);

            return response()->json([
                'content' => $content,
                'errors' => []
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'errors' => ['Failed to create content: ' . $e->getMessage()]
            ], 500);
        }
    }

    private function storePayload(string $contentId, string $blockId, array $blockData): string
    {
        $extension = $this->getPayloadExtension($blockData['kind']);
        $key = "content/{$contentId}/blocks/{$blockId}/payload.{$extension}";
        
        $content = match($blockData['kind']) {
            'markdown' => $blockData['payload']['source'],
            'mermaid' => $blockData['payload']['source'],
            'image' => $blockData['payload']['uri'], // Handle separately for binary
            default => json_encode($blockData['payload'])
        };

        return $this->storage->store($key, $content);
    }

    private function queueTransforms(string $contentId, string $blockId, string $kind): void
    {
        $transforms = $this->getTransformsForKind($kind);
        
        foreach ($transforms as $transform) {
            $job = new TransformJob(
                contentId: $contentId,
                blockId: $blockId,
                transform: $transform
            );
            
            $this->transformQueue->push($job);
        }
    }
}
```

## Error Handling

### GraphQL Errors
```php
class ContentNotFoundError extends Error
{
    public function __construct(string $contentId)
    {
        parent::__construct("Content not found: {$contentId}");
    }
}

class VariantSelectionError extends Error
{
    public function __construct(string $message)
    {
        parent::__construct("Variant selection failed: {$message}");
    }
}
```

### HTTP Error Responses
```json
{
  "errors": [
    {
      "code": "CONTENT_NOT_FOUND",
      "message": "Content with ID 'content_123' not found",
      "field": "id"
    }
  ]
}
```

## Rate Limiting & Security

### Rate Limiting
```php
// Apply rate limiting per user
$rateLimiter = new RateLimiter(
    key: "content_api:{$userId}",
    maxAttempts: 100,
    decayMinutes: 60
);

if ($rateLimiter->tooManyAttempts()) {
    return response()->json(['error' => 'Too many requests'], 429);
}
```

### Authentication
```php
// JWT token validation
$token = $request->bearerToken();
$user = $this->authService->validateToken($token);

if (!$user) {
    return response()->json(['error' => 'Unauthorized'], 401);
}
```

### Input Validation
```php
class ContentValidator
{
    public function validate(array $data): array
    {
        $errors = [];

        if (empty($data['type'])) {
            $errors[] = 'Content type is required';
        }

        if (empty($data['blocks'])) {
            $errors[] = 'At least one block is required';
        }

        foreach ($data['blocks'] ?? [] as $i => $block) {
            if (empty($block['kind'])) {
                $errors[] = "Block {$i}: kind is required";
            }

            if (!$this->isValidKind($block['kind'])) {
                $errors[] = "Block {$i}: invalid kind '{$block['kind']}'";
            }

            $kindErrors = $this->validateBlockPayload($block);
            $errors = array_merge($errors, $kindErrors);
        }

        return $errors;
    }
}
```
