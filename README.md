# Portable Content System (PCS)

A cross-language, extensible system for modeling, transforming, and delivering heterogeneous content across platforms and applications.

## Overview

The Portable Content System enables you to create, store, and deliver rich content (markdown, images, diagrams, documents, code, etc.) in a platform-agnostic way. Content is stored once and can be delivered in multiple formats optimized for different clients and use cases.

### Key Features

- **Universal Content Model**: JSON-based content manifests work across any language or platform
- **Flexible Delivery**: Same content can be delivered as HTML, SVG, PNG, PDF, or other formats
- **Client-Server Separation**: Clear distinction between storage format and delivery format
- **Type Safety**: JSON Schema validation with language-specific type definitions
- **Extensible**: Plugin architecture for new content types and transformations

## Core Concepts

### ContentManifest
A container that holds multiple content blocks with metadata:

```json
{
  "id": "content_123",
  "type": "article",
  "title": "Getting Started Guide",
  "blocks": [...]
}
```

### Blocks
Individual pieces of content with a specific type (kind):

```json
{
  "id": "block_456",
  "kind": "markdown",
  "content": {
    "primary": {
      "type": "inline",
      "mediaType": "text/markdown",
      "source": "# Hello World"
    }
  }
}
```

### BlockContent Structure
Each block has structured content with three components:

- **`primary`**: Main delivery format for clients (what gets rendered)
- **`source`**: Optional storage/editing format (backend use)
- **`alternatives`**: Optional alternative delivery formats

### Example: Mermaid Diagram
```json
{
  "kind": "mermaid",
  "content": {
    "primary": {
      "type": "external",
      "mediaType": "image/svg+xml",
      "uri": "https://cdn.example.com/diagram.svg"
    },
    "source": {
      "type": "inline",
      "mediaType": "text/plain",
      "source": "graph TD; A-->B;"
    },
    "alternatives": [
      {"mediaType": "image/png", "uri": "https://cdn.example.com/diagram.png"}
    ]
  }
}
```
## Supported Content Types

| Kind | Description | Primary Format | Source Format |
|------|-------------|----------------|---------------|
| `markdown` | Markdown text | text/markdown | text/markdown |
| `mermaid` | Diagrams | image/svg+xml | text/plain |
| `image` | Images | image/* | image/* (raw) |
| `document` | Documents | application/pdf | N/A |
| `code` | Source code | text/plain | text/plain |

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   API Layer      │    │  Storage Layer  │
│                 │    │                  │    │                 │
│ • React Native  │◄──►│ • GraphQL API    │◄──►│ • JSON Manifests│
│ • Web Apps      │    │ • REST API       │    │ • Object Storage│
│ • Mobile Apps   │    │ • Capability     │    │ • Databases     │
│                 │    │   Negotiation    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Transform Layer  │
                       │                  │
                       │ • Markdown→HTML  │
                       │ • Mermaid→SVG    │
                       │ • Image Resize   │
                       │ • PDF Thumbnail  │
                       └──────────────────┘
```

## Getting Started

### 1. Understanding the Data Model
- Read the [Core Specification](spec.md) for the complete data model
- Review [JSON Schemas](schemas/) for validation rules
- Check [Examples](examples/) for real-world usage patterns

### 2. Implementation Guides
- [Data Models](implementation/phase-1c/task-2-data-models.md) - TypeScript interfaces and validation
- [API Design](implementation/04-api-design.md) - GraphQL schema and endpoints
- [Content Representation](content-representation-design.md) - Detailed architecture

### 3. Language-Specific Implementation

#### TypeScript/JavaScript
```typescript
interface ContentManifest {
  id: string;
  type: string;
  title?: string;
  blocks: Block[];
}

interface Block {
  id: string;
  kind: string;
  content: BlockContent;
}
```

#### PHP
```php
final class ContentManifest {
    public function __construct(
        public readonly string $id,
        public readonly string $type,
        public readonly array $blocks,
        public readonly ?string $title = null,
    ) {}
}
```

#### Python
```python
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class ContentManifest:
    id: str
    type: str
    blocks: List[Block]
    title: Optional[str] = None
```

## Key Documents

### Core Specification
- **[spec.md](spec.md)** - Complete specification and data model
- **[schemas/](schemas/)** - JSON Schema definitions for validation

### Implementation Guides
- **[implementation/phase-1c/task-2-data-models.md](implementation/phase-1c/task-2-data-models.md)** - TypeScript interfaces and validation
- **[implementation/04-api-design.md](implementation/04-api-design.md)** - GraphQL API design
- **[implementation/01-data-model.md](implementation/01-data-model.md)** - Detailed data model documentation

### Architecture & Design
- **[content-representation-design.md](content-representation-design.md)** - Complete architecture overview
- **[design/payload-source-unification.md](design/payload-source-unification.md)** - Design rationale and decisions

### Examples & References
- **[examples/](examples/)** - JSON examples for all content types
- **[registry/](registry/)** - Content type registry and schemas
- **[graphql/schema.graphql](graphql/schema.graphql)** - GraphQL schema definition

### Migration & Changes
- **[CHANGELOG.md](CHANGELOG.md)** - Recent changes and migration guide

## Use Cases

### Content Management Systems
Store articles with mixed content (text, images, diagrams) and deliver optimized versions for web, mobile, and print.

### Documentation Platforms
Author technical docs with code examples and diagrams, automatically generate multiple output formats.

### Educational Platforms
Create interactive content with embedded media, deliver appropriate formats based on device capabilities.

### API Documentation
Generate API docs from code with examples, diagrams, and interactive elements.

## Implementation Checklist

### Basic Implementation
- [ ] Parse ContentManifest JSON structure
- [ ] Validate against JSON schemas
- [ ] Handle basic content types (markdown, image)
- [ ] Implement content rendering for your platform

### Advanced Features
- [ ] Content transformation pipeline
- [ ] Capability-based format selection
- [ ] Caching and optimization
- [ ] Custom content type plugins

### Production Ready
- [ ] Error handling and validation
- [ ] Performance optimization
- [ ] Security considerations
- [ ] Monitoring and logging

## Contributing

This is a design specification project. Contributions should focus on:
- Clarifying specifications
- Adding examples and use cases
- Improving documentation
- Identifying edge cases and requirements

## License

Apache 2.0 License - See LICENSE file for details.

---

## Specification Contents

This directory contains the complete Portable Content Specification:

- **spec.md** — Core Spec (data model, semantics, capability negotiation)
- **registry.md** — Registry packages, extensions, composition, and pinning
- **transforms.md** — Transform contract, orchestration, runners, provenance
- **security.md** — Sanitization profiles, allowlists, safety constraints
- **versioning.md** — SemVer policy and manifest compatibility
- **compliance.md** — Conformance requirements and tests
- **graphql/schema.graphql** — Spec-local GraphQL SDL
- **schemas/*.json** — Spec-local JSON Schemas
- **registry/** — Core registry skeleton (kinds, alternatives, policies, transforms)
- **examples/** — Example ContentManifests and GraphQL responses
- **publishing.md** — How to publish the spec and registry packages

## Extraction Plan

This folder is designed to be moved to a new GitHub org/repo (portable-content/spec). After extraction:
- Publish npm package(s) for the registry (@portable-content/registry)
- Publish GitHub Release tarballs for universal consumption
- Optionally create SDK repos: sdk-ts, sdk-php, sdk-py
- Set up portablecontent.dev with a docs site linking to the spec and SDKs
