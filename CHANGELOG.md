# Changelog

## ContentManifest and BlockContent Restructure (Design Phase)

### Overview
This major update introduces ContentManifest (replacing ContentItem) and BlockContent structure, providing clear separation between storage format, delivery format, and alternative representations. Resolves client-side vs server-side rendering needs.

### Breaking Changes

#### 1. ContentItem → ContentManifest
- **Before**: `ContentItem` as root container
- **After**: `ContentManifest` as root container (resolves naming collision with block content)

#### 2. Block Structure Redesign
- **Before**: `payload` + `variants` structure
  ```json
  {
    "kind": "mermaid",
    "payload": { "source": "graph TD; A-->B;" },
    "variants": [{"mediaType": "image/svg+xml", "uri": "https://..."}]
  }
  ```

- **After**: `content` structure with `primary`, `source`, `alternatives`
  ```json
  {
    "kind": "mermaid",
    "content": {
      "primary": {
        "type": "external",
        "mediaType": "image/svg+xml",
        "uri": "https://...",
        "width": 800,
        "height": 400
      },
      "source": {
        "type": "inline",
        "mediaType": "text/plain",
        "source": "graph TD; A-->B;"
      },
      "alternatives": [
        {"mediaType": "image/png", "uri": "https://..."}
      ]
    }
  }
  ```

#### 3. Clear Separation of Concerns
- **Primary**: Main delivery format for clients (what they render)
- **Source**: Optional storage/editing format (backend use, like mermaid text)
- **Alternatives**: Optional alternative delivery formats (different sizes, formats)

#### 4. Schema Updates
- All block kind schemas now use BlockContent structure
- JSON Schema uses `oneOf` discriminator pattern for PayloadSource
- Specialized schemas: TextPayloadSource, ImagePayloadSource

### New Features

#### 1. Client-Server Separation
- **Mermaid example**: Text stored in `source`, SVG delivered in `primary`
- **Backend flexibility**: Maintain source while delivering rendered formats
- **Client simplicity**: Optional `source` field, clients only need `primary`

#### 2. Inline Content Support
- Small images (icons, etc.) can be stored inline using base64 data URIs
- Inline markdown for simple content
- Reduces HTTP requests for small elements

#### 3. Enhanced Type Safety
- Clear discrimination between storage and delivery formats
- Specialized content types with appropriate fields
- Optional alternatives for different client capabilities

### Migration Guide

#### JSON Data Migration
```javascript
// Old MarkdownBlock payload
const oldPayload = { "source": "# Hello World" };

// New MarkdownBlock payload  
const newPayload = {
  "type": "inline",
  "mediaType": "text/markdown",
  "source": "# Hello World"
};

// Old DocumentBlock payload
const oldDocPayload = {
  "uri": "https://example.com/doc.pdf",
  "contentType": "application/pdf"
};

// New DocumentBlock payload
const newDocPayload = {
  "type": "external", 
  "mediaType": "application/pdf",
  "uri": "https://example.com/doc.pdf"
};
```

#### TypeScript Interface Migration
```typescript
// Old interfaces
interface MarkdownBlockPayload {
  source: string;
}

interface ImageBlockPayload {
  uri: string;
  alt?: string;
}

// New unified interfaces
interface PayloadSource {
  type: 'inline' | 'external';
  mediaType: string;
}

interface TextPayloadSource extends PayloadSource {
  // Can be inline or external
}

interface ImagePayloadSource extends PayloadSource {
  width?: number;
  height?: number;
  alt?: string;
}
```

### Benefits

1. **Consistency**: Same pattern for all external content references
2. **Flexibility**: Support for both inline and external content per block type
3. **Type Safety**: Clear discrimination with JSON Schema validation
4. **Performance**: Inline support for small content reduces HTTP requests
5. **Scalability**: External references for large content with proper metadata

### Files Updated

#### New Schema Files
- `schemas/block-content.schema.json`
- `schemas/payload-source.schema.json`
- `schemas/text-payload-source.schema.json`
- `schemas/image-payload-source.schema.json`

#### Updated Schema Files
- `schemas/content-manifest.schema.json` (renamed from content-item)
- `schemas/block.schema.json` (now uses BlockContent)
- `registry/kinds/markdown.schema.json`
- `registry/kinds/image.schema.json`
- `registry/kinds/document.schema.json`
- `registry/kinds/mermaid.schema.json`

#### Updated Examples
- `examples/pcm.example.json`
- `examples/note-with-content.example.json` (fixed structure)
- `examples/graphql-response.example.json`

#### New Examples
- `examples/large-document.example.json`
- `examples/inline-image.example.json`

#### Updated Documentation
- `spec.md` (updated to ContentManifest and BlockContent)
- `graphql/schema.graphql` (updated to BlockContent structure)
- `implementation/phase-1c/task-2-data-models.md` (updated TypeScript interfaces)
- `implementation/04-api-design.md` (updated GraphQL schema)
- `content-representation-design.md` (updated examples and terminology)

### Validation

All examples now validate against the updated JSON schemas and demonstrate:
- Primary delivery formats for client rendering
- Optional source formats for backend storage/editing
- Alternative formats for different client capabilities
- Clear separation between storage and delivery concerns
