# PayloadSource Unification Design Rationale

## Problem Statement

The original Portable Content System had inconsistent approaches to content representation across different block types, leading to:

1. **Inconsistent field names**: `contentType` vs `mediaType`
2. **Different payload structures**: Some inline, some external-only
3. **Missing payloads**: Some examples omitted required payload fields
4. **Duplicate patterns**: Variants and DocumentBlock payloads both described external content differently

## Identified Inconsistencies

### 1. MarkdownBlock Variations
**Found across documentation:**
- Inline source: `{ "source": "# Hello" }`
- Missing payload: `{ "variants": [...] }` (payload omitted entirely)
- PHP implementation: Direct properties instead of payload structure

### 2. Field Name Conflicts
- **Variants**: Used `mediaType` field
- **DocumentBlock**: Used `contentType` field
- **Same concept, different names**: Both describing MIME types

### 3. External Content Duplication
**Variant structure:**
```json
{
  "mediaType": "text/markdown",
  "uri": "https://example.com/file.md",
  "bytes": 2048,
  "contentHash": "sha256:...",
  "generatedBy": "tool",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**DocumentBlock payload:**
```json
{
  "uri": "https://example.com/document.pdf", 
  "contentType": "application/pdf",
  "bytes": 2048576
}
```

**Problem**: Same concept (external content reference) with different structures.

## Design Solution: Unified PayloadSource

### Core Principle
**All external content references should use the same structure, whether in payloads or variants.**

### Unified Interface
```typescript
interface PayloadSource {
  type: 'inline' | 'external';
  mediaType: string; // Consistent field name
}

interface InlinePayloadSource extends PayloadSource {
  type: 'inline';
  source: string;
}

interface ExternalPayloadSource extends PayloadSource {
  type: 'external';
  uri: string;
  bytes?: number;
  contentHash?: string;
  generatedBy?: string;
  toolVersion?: string;
  createdAt?: string;
}
```

### Specialized Extensions
```typescript
interface TextPayloadSource extends PayloadSource {
  encoding?: string;
  language?: string;
}

interface ImagePayloadSource extends PayloadSource {
  width?: number;
  height?: number;
  alt?: string;
}
```

## Key Design Decisions

### 1. Inheritance Over Composition
**Chosen**: `interface TextPayloadSource extends PayloadSource`
**Rejected**: Mix-in composition patterns

**Rationale**: 
- Simpler to understand and implement
- Clear inheritance hierarchy
- Avoids complexity of multiple composition patterns
- TypeScript/JSON Schema support is better

### 2. Discriminated Union with oneOf
**Chosen**: JSON Schema `oneOf` with `type` discriminator
**Rejected**: Conditional schema with if/then/else

**Rationale**:
- More intuitive for developers
- Better tooling support
- Clearer validation errors
- Matches TypeScript discriminated unions

### 3. Minimal Granularity
**Chosen**: `TextPayloadSource` for all text content
**Rejected**: Separate `MarkdownPayloadSource`, `HTMLPayloadSource`, etc.

**Rationale**:
- No functional difference between text types at payload level
- Reduces schema complexity
- `mediaType` field already distinguishes content types
- Can add specialized types later if needed

### 4. Support for Inline Images
**Chosen**: Allow both inline and external for ImagePayloadSource
**Rejected**: External-only for all images

**Rationale**:
- Small icons benefit from inline storage (fewer HTTP requests)
- Base64 data URIs are standard web practice
- Renderer can decide lazy loading based on size
- Maintains flexibility

## Implementation Strategy

### Phase 1: Schema Foundation
1. Create base PayloadSource schema with oneOf discriminator
2. Create specialized schemas (TextPayloadSource, ImagePayloadSource)
3. Update all block kind schemas to reference new schemas

### Phase 2: Fix Examples
1. Update existing examples to use new payload structure
2. Fix missing payload issues
3. Create examples showing both inline and external patterns

### Phase 3: Documentation Updates
1. Update core spec with PayloadSource definition
2. Update GraphQL schema with union types
3. Update TypeScript interfaces in implementation guides

### Phase 4: Migration Documentation
1. Document all changes in changelog
2. Provide migration examples
3. Explain design rationale

## Benefits Achieved

### 1. Consistency
- Same field names everywhere (`mediaType`)
- Same structure for external content references
- Unified validation patterns

### 2. Flexibility
- Support for both inline and external content
- Renderer-level decisions for lazy loading
- Extensible for future content types

### 3. Developer Experience
- Clear discrimination between inline/external
- Better TypeScript support
- Intuitive JSON Schema validation
- Self-documenting structure

### 4. Performance Options
- Inline storage for small content (icons, short text)
- External storage for large content with metadata
- Size-based lazy loading decisions

## Future Considerations

### 1. Size Limits
- Implementation-specific limits (100KB soft, 1MB hard recommended)
- Database and network performance considerations
- UI warnings for large inline content

### 2. Content Splitting
- UI tools to help split large content into multiple blocks
- Natural break point detection (headers, horizontal rules)
- Linked block relationships through representations

### 3. Lazy Loading
- Renderer-level implementation based on size hints
- Progressive loading for large content items
- Cache management for external content

## Validation

All updated examples validate against the new JSON schemas and demonstrate:
- Inline markdown content
- External document references
- Inline images (icons)
- External images with variants
- Mixed content types in single ContentManifest

The unified approach resolves all identified inconsistencies while maintaining backward compatibility through clear migration paths.
