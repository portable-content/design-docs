# Phase 1 Implementation Plan

## Executive Summary

This document outlines the implementation plan for Phase 1 of the Portable Content System, focusing on the 3 core block types (Markdown, Mermaid, Image) that will establish the foundational architecture and processing patterns for the entire system.

## Implementation Phases

### Phase 1A: Markdown MVP (Week 1)
**Goal**: Get basic markdown content working end-to-end with minimal infrastructure

#### Tasks:
1. **Minimal Storage Setup**
   - Simple database table for ContentItem metadata (start with SQLite)
   - No object storage needed for markdown-only MVP
   - No message queue needed yet

2. **Core Data Models (Markdown Only)**
   - Implement ContentItem and Block classes for markdown only
   - Single Variant type: `text/markdown` (stored payload)
   - JSON schema validation for markdown blocks
   - No transform pipeline - just store and retrieve

3. **Basic Storage Operations**
   - Store markdown content directly in manifest
   - Simple CRUD operations (create, read, update, delete)
   - No variant generation - just canonical markdown storage

#### Deliverables:
- Working development environment (SQLite only - zero setup!)
- Markdown content creation and storage
- Basic retrieval by ID
- Simple validation
- Foundation for adding complexity later

### Phase 1B: Basic API & Client (Week 2)
**Goal**: Add GraphQL API and basic client rendering for markdown

#### Tasks:
1. **Simple GraphQL API**
   - ContentItem and MarkdownBlock types
   - Basic queries: `content(id)` and `searchContent(query)`
   - Simple mutations: `createContent`, `updateContent`
   - No capability negotiation yet - just return markdown

2. **Basic Client Components**
   - React Native MarkdownBlockRenderer
   - Simple markdown rendering (react-native-markdown-display)
   - Basic content display and creation forms

3. **Search Foundation**
   - Simple text search on title/summary (if needed)
   - Keep search simple or defer to application layer

#### Deliverables:
- Working GraphQL API for markdown content
- Basic React Native app that can create and display markdown
- Simple search functionality
- End-to-end markdown workflow

### Phase 1C: Add Images + Transform Pipeline (Weeks 3-4)
**Goal**: Add image support and introduce transform pipeline

#### Tasks:
1. **Image Block Support**
   - Add image block type to data models
   - File upload handling for images
   - Basic image storage in object storage

2. **Transform Pipeline Introduction**
   - Redis queue setup for async processing
   - Python transform worker (simple version)
   - Image resize/format conversion (WebP, AVIF)
   - Markdown → HTML transform (optional enhancement)

3. **Variant System**
   - Multiple variants per block
   - Basic capability negotiation (prefer WebP over JPEG)
   - Variant selection in API responses

#### Deliverables:
- Image upload and storage working
- Basic transform pipeline for images
- Multiple image format variants
- Enhanced API with variant selection

### Phase 1D: Add Mermaid + Advanced Features (Weeks 5-6)
**Goal**: Add mermaid diagrams and complete the 3-block system

#### Tasks:
1. **Mermaid Block Support**
   - Add mermaid block type to data models
   - Mermaid → SVG/PNG transform containers
   - Complex variant generation (multiple formats/resolutions)

2. **Advanced Transform Pipeline**
   - Containerized transform tools
   - Transform job monitoring and error handling
   - Retry mechanisms and failure handling

3. **Enhanced API Features**
   - Full capability negotiation system
   - Advanced search (vector search if needed)
   - Variant refresh endpoints

#### Deliverables:
- Complete 3-block system (markdown, image, mermaid)
- Robust transform pipeline
- Advanced API features
- Full capability-based variant selection

### Phase 1E: Polish & Production Readiness (Weeks 7-8)
**Goal**: Complete client integration, security, and testing

#### Tasks:
1. **Client Integration**
   - React Native components for all 3 block types
   - PHP server-side integration
   - TypeScript SDK for content operations

2. **Security & Validation**
   - HTML/SVG sanitization for transforms
   - File upload validation and security
   - Input validation and rate limiting

3. **Testing & Documentation**
   - Unit tests for core functionality
   - Integration tests for API endpoints
   - End-to-end workflow tests
   - API documentation and examples

#### Deliverables:
- Complete client integration
- Security measures implemented
- Comprehensive testing
- Production-ready system

## Technical Architecture

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   GraphQL API   │    │ Transform Queue │
│                 │    │                 │    │                 │
│ • React Native  │◄──►│ • Content CRUD  │◄──►│ • Redis Queue   │
│ • Web App       │    │ • Capability    │    │ • Python Worker │
│ • PHP Server    │    │   Selection     │    │ • Docker Tools  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       ▼
         │              ┌─────────────────┐    ┌─────────────────┐
         │              │   Vector DB     │    │ Object Storage  │
         │              │                 │    │                 │
         └──────────────►│ • Metadata     │    │ • Manifests     │
                        │ • Search Index  │    │ • Payloads      │
                        │ • Extracts      │    │ • Variants      │
                        └─────────────────┘    └─────────────────┘
```

### Data Flow
1. **Content Creation**: Client → API → Storage → Transform Queue
2. **Transform Processing**: Queue → Worker → Container → Storage → Manifest Update
3. **Content Retrieval**: Client → API → Capability Selection → Storage → Response

## Success Metrics

### Functional Requirements

**Phase 1A (Markdown MVP):**
- [ ] Create content with markdown blocks only
- [ ] Store content metadata and markdown directly in SQLite
- [ ] Basic content retrieval by ID
- [ ] Simple validation and error handling

**Phase 1B (Basic API):**
- [ ] GraphQL API for markdown content operations
- [ ] Basic search functionality
- [ ] React Native markdown rendering

**Phase 1C (Images + Transforms):**
- [ ] Add image block support with file uploads
- [ ] Transform pipeline for image format conversion
- [ ] Multiple variants per block

**Phase 1D (Mermaid + Advanced):**
- [ ] Add mermaid block support
- [ ] Generate SVG/PNG from mermaid diagrams
- [ ] Full capability-based variant selection

**Phase 1E (Production Ready):**
- [ ] Complete client integration for all 3 block types
- [ ] Security measures and comprehensive testing
- [ ] Performance optimization and monitoring

### Performance Requirements
- [ ] Content creation: < 500ms for API response (excluding async transforms)
- [ ] Content retrieval: < 200ms for cached content
- [ ] Transform processing: < 30s for mermaid diagrams, < 10s for image conversion
- [ ] API throughput: 100+ requests/second per instance

### Security Requirements
- [ ] All HTML output properly sanitized
- [ ] SVG content sanitized to remove dangerous elements
- [ ] File uploads validated for type, size, and content
- [ ] Transform containers run with minimal privileges
- [ ] Rate limiting implemented for all endpoints

## Risk Mitigation

### Technical Risks
1. **Transform Reliability**: Containerized tools may fail or produce inconsistent output
   - *Mitigation*: Comprehensive testing, golden file validation, graceful error handling

2. **Storage Consistency**: Race conditions between manifest updates and variant generation
   - *Mitigation*: Atomic operations, eventual consistency patterns, retry mechanisms

3. **Performance Bottlenecks**: Transform queue may become overwhelmed
   - *Mitigation*: Horizontal scaling, priority queues, resource monitoring

### Operational Risks
1. **Security Vulnerabilities**: User-generated content may contain malicious code
   - *Mitigation*: Multi-layer sanitization, container isolation, security testing

2. **Data Loss**: Storage failures could lose content or variants
   - *Mitigation*: Backup strategies, cross-region replication, consistency checks

## Development Environment Setup

### Prerequisites
- Docker and Docker Compose
- PHP 8.3+ with required extensions
- Node.js 20+ with npm
- Python 3.11+ with pip

### Platform Choices
The implementation is designed to be platform-agnostic where possible:

**Database Options:**
- **SQLite** (recommended for development/testing): Zero setup, single file, perfect for MVP
- **PostgreSQL** (production option): Mature ecosystem, good performance, optional vector extensions
- **MySQL** (production option): Widely supported, good performance
- **Vector Databases** (optional for search): Weaviate, Pinecone, Qdrant - separate from core content storage

**Object Storage Options:**
- **MinIO** (development): S3-compatible, easy local setup
- **AWS S3** (production): Industry standard, excellent ecosystem
- **Google Cloud Storage** (production): Good integration with other GCP services
- **Azure Blob Storage** (production): Good for Microsoft-centric environments

**Message Queue Options:**
- **Redis** (simple deployments): In-memory, fast, good for development
- **AWS SQS** (cloud deployments): Managed service, reliable
- **RabbitMQ** (complex routing): Feature-rich, good for complex workflows

### Quick Start
```bash
# Clone repository
git clone <repo-url>
cd portable-content

# Start development services
docker-compose up -d

# Install dependencies
composer install
npm install
pip install -r requirements.txt

# Run database migrations
php artisan migrate
php artisan db:seed

# Start development servers
php artisan serve &
npm run dev &
python worker.py &
```

### Environment Configuration
```env
# .env.development
APP_ENV=development
DB_CONNECTION=pgsql
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=portable_content_dev

REDIS_HOST=localhost
REDIS_PORT=6379

STORAGE_BACKEND=minio
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=portable-content-dev

DATABASE_URL=sqlite:storage/content.db
# OR for production:
# DATABASE_URL=postgresql://user:pass@localhost:5432/portable_content_prod
# DATABASE_URL=mysql://user:pass@localhost:3306/portable_content_prod

TRANSFORM_QUEUE=redis
TRANSFORM_WORKER_CONCURRENCY=4
```

## Next Steps After Phase 1

### Phase 2 Preparation
- Document lessons learned and architectural decisions
- Identify performance bottlenecks and optimization opportunities
- Plan for additional block types (video, documents, embeds)
- Design editor interface requirements

### Scaling Considerations
- Kubernetes deployment strategies
- Multi-region content distribution
- Advanced caching and CDN integration
- Monitoring and observability improvements

### Feature Expansion
- Advanced transform options (themes, sizing, quality)
- Content versioning and history
- Collaborative editing capabilities
- Advanced search and filtering

## Conclusion

Phase 1 establishes the foundational architecture for the Portable Content System with 3 core block types that exercise different processing patterns. This implementation provides a solid base for future expansion while ensuring security, performance, and reliability from the start.

The modular architecture allows for independent scaling of components and easy addition of new block types in future phases. The comprehensive testing strategy ensures system reliability and maintainability as the system grows.
