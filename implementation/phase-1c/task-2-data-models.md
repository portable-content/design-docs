# Task 2: TypeScript Data Models & Interfaces

## Overview
Create comprehensive TypeScript interfaces and data models that match the GraphQL schema and provide type-safe access to content data with runtime validation.

## Estimated Time
2-3 hours

## Dependencies
- Task 1A (SDK Project Setup) must be completed
- GraphQL schema from Phase 1B available

## Acceptance Criteria

### Core Interfaces
- [ ] ContentItem interface matches GraphQL schema exactly
- [ ] Block interface with proper inheritance/union types
- [ ] Variant interface with all optional properties
- [ ] Representation interface for content views
- [ ] Type-safe payload interfaces for each block kind

### Runtime Validation
- [ ] Zod schemas for all core interfaces
- [ ] Validation functions with proper error messages
- [ ] Type guards for block kind discrimination
- [ ] Utility functions for type checking

### Developer Experience
- [ ] Comprehensive JSDoc documentation
- [ ] Utility types for common operations
- [ ] Type-safe builders/factories
- [ ] Export all types from main index

## Implementation Steps

### 1. Create Core Type Definitions

Create `src/types/core.ts`:

```typescript
/**
 * Core content item representing a piece of portable content
 */
export interface ContentItem {
  /** Unique identifier for the content item */
  id: string;
  /** Content type (e.g., 'note', 'article', 'document') */
  type: string;
  /** Optional human-readable title */
  title?: string;
  /** Optional summary for search and AI processing */
  summary?: string;
  /** Array of content blocks */
  blocks: Block[];
  /** Named representations for different views */
  representations?: Record<string, Representation>;
  /** ISO 8601 creation timestamp */
  createdAt?: string;
  /** ISO 8601 last update timestamp */
  updatedAt?: string;
  /** Creator identifier */
  createdBy?: string;
}

/**
 * Base interface for all content blocks
 */
export interface Block {
  /** Unique identifier for the block */
  id: string;
  /** Block type identifier (e.g., 'markdown', 'mermaid', 'image') */
  kind: string;
  /** Block-specific payload data */
  payload: unknown;
  /** Available variants for this block */
  variants: Variant[];
}

/**
 * A specific representation/variant of a block's content
 */
export interface Variant {
  /** MIME media type of this variant */
  mediaType: string;
  /** URI where the variant content can be accessed */
  uri?: string;
  /** Width in pixels (for visual content) */
  width?: number;
  /** Height in pixels (for visual content) */
  height?: number;
  /** Size in bytes */
  bytes?: number;
  /** SHA-256 content hash */
  contentHash?: string;
  /** Tool that generated this variant */
  generatedBy?: string;
  /** Version of the generation tool */
  toolVersion?: string;
  /** ISO 8601 creation timestamp */
  createdAt?: string;
}

/**
 * Named representation defining which blocks to include
 */
export interface Representation {
  /** Array of block IDs to include in this representation */
  blocks: string[];
  /** Optional metadata for the representation */
  metadata?: Record<string, unknown>;
}
```

### 2. Create Block-Specific Payload Types

Create `src/types/blocks.ts`:

```typescript
import { Block } from './core';

/**
 * Payload for markdown content blocks
 */
export interface MarkdownBlockPayload {
  /** Raw markdown source text */
  source: string;
}

/**
 * Payload for Mermaid diagram blocks
 */
export interface MermaidBlockPayload {
  /** Mermaid diagram source code */
  source: string;
  /** Optional theme name (default, dark, forest, etc.) */
  theme?: string;
}

/**
 * Payload for image blocks
 */
export interface ImageBlockPayload {
  /** URI to the original image */
  uri: string;
  /** Alternative text for accessibility */
  alt?: string;
  /** Original image width in pixels */
  width?: number;
  /** Original image height in pixels */
  height?: number;
}

/**
 * Typed block interfaces for each kind
 */
export interface MarkdownBlock extends Block {
  kind: 'markdown';
  payload: MarkdownBlockPayload;
}

export interface MermaidBlock extends Block {
  kind: 'mermaid';
  payload: MermaidBlockPayload;
}

export interface ImageBlock extends Block {
  kind: 'image';
  payload: ImageBlockPayload;
}

/**
 * Union type for all known block types
 */
export type TypedBlock = MarkdownBlock | MermaidBlock | ImageBlock;

/**
 * Type guard to check if a block is a markdown block
 */
export function isMarkdownBlock(block: Block): block is MarkdownBlock {
  return block.kind === 'markdown';
}

/**
 * Type guard to check if a block is a mermaid block
 */
export function isMermaidBlock(block: Block): block is MermaidBlock {
  return block.kind === 'mermaid';
}

/**
 * Type guard to check if a block is an image block
 */
export function isImageBlock(block: Block): block is ImageBlock {
  return block.kind === 'image';
}

/**
 * Get typed payload for a block based on its kind
 */
export function getTypedPayload<T extends TypedBlock>(block: Block): T['payload'] | null {
  switch (block.kind) {
    case 'markdown':
      return isMarkdownBlock(block) ? block.payload : null;
    case 'mermaid':
      return isMermaidBlock(block) ? block.payload : null;
    case 'image':
      return isImageBlock(block) ? block.payload : null;
    default:
      return null;
  }
}
```

### 3. Create Capability Types

Create `src/types/capabilities.ts`:

```typescript
/**
 * Client capabilities for content negotiation
 */
export interface Capabilities {
  /** Array of accepted media types (with optional quality values) */
  accept: string[];
  /** Optional hints about client preferences */
  hints?: CapabilityHints;
}

/**
 * Hints about client capabilities and preferences
 */
export interface CapabilityHints {
  /** Preferred width in pixels */
  width?: number;
  /** Preferred height in pixels */
  height?: number;
  /** Device pixel density (1.0 = standard, 2.0 = retina, etc.) */
  density?: number;
  /** Network connection type */
  network?: NetworkType;
  /** Whether client supports interactive content */
  interactive?: boolean;
  /** Maximum file size preference in bytes */
  maxBytes?: number;
}

/**
 * Network connection types for optimization
 */
export type NetworkType = 'FAST' | 'SLOW' | 'CELLULAR';

/**
 * Default capabilities for different scenarios
 */
export const DEFAULT_CAPABILITIES: Record<string, Capabilities> = {
  mobile: {
    accept: [
      'image/avif',
      'image/webp',
      'image/png',
      'image/jpeg',
      'text/html;profile=markdown',
      'text/markdown',
      'image/svg+xml'
    ],
    hints: {
      width: 375,
      density: 2.0,
      network: 'CELLULAR',
      maxBytes: 1024 * 1024 // 1MB
    }
  },
  desktop: {
    accept: [
      'image/avif',
      'image/webp',
      'image/png',
      'image/jpeg',
      'text/html;profile=markdown',
      'text/markdown',
      'image/svg+xml'
    ],
    hints: {
      width: 1200,
      density: 1.0,
      network: 'FAST',
      interactive: true
    }
  }
};
```

### 4. Create Zod Validation Schemas

Create `src/validation/schemas.ts`:

```typescript
import { z } from 'zod';

/**
 * Zod schema for Variant validation
 */
export const VariantSchema = z.object({
  mediaType: z.string().min(1),
  uri: z.string().url().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  bytes: z.number().int().positive().optional(),
  contentHash: z.string().optional(),
  generatedBy: z.string().optional(),
  toolVersion: z.string().optional(),
  createdAt: z.string().datetime().optional()
});

/**
 * Zod schema for Block validation
 */
export const BlockSchema = z.object({
  id: z.string().uuid(),
  kind: z.string().min(1),
  payload: z.unknown(),
  variants: z.array(VariantSchema).min(1)
});

/**
 * Zod schema for Representation validation
 */
export const RepresentationSchema = z.object({
  blocks: z.array(z.string().uuid()),
  metadata: z.record(z.unknown()).optional()
});

/**
 * Zod schema for ContentItem validation
 */
export const ContentItemSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  title: z.string().optional(),
  summary: z.string().optional(),
  blocks: z.array(BlockSchema),
  representations: z.record(RepresentationSchema).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  createdBy: z.string().optional()
});

/**
 * Block-specific payload schemas
 */
export const MarkdownPayloadSchema = z.object({
  source: z.string().min(1)
});

export const MermaidPayloadSchema = z.object({
  source: z.string().min(1),
  theme: z.string().optional()
});

export const ImagePayloadSchema = z.object({
  uri: z.string().url(),
  alt: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional()
});

/**
 * Capability schemas
 */
export const CapabilityHintsSchema = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  density: z.number().positive().optional(),
  network: z.enum(['FAST', 'SLOW', 'CELLULAR']).optional(),
  interactive: z.boolean().optional(),
  maxBytes: z.number().int().positive().optional()
});

export const CapabilitiesSchema = z.object({
  accept: z.array(z.string()).min(1),
  hints: CapabilityHintsSchema.optional()
});
```

### 5. Create Validation Functions

Create `src/validation/validators.ts`:

```typescript
import { z } from 'zod';
import {
  ContentItemSchema,
  BlockSchema,
  VariantSchema,
  CapabilitiesSchema,
  MarkdownPayloadSchema,
  MermaidPayloadSchema,
  ImagePayloadSchema
} from './schemas';
import type { ContentItem, Block, Variant, Capabilities } from '../types';

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validate a ContentItem
 */
export function validateContentItem(data: unknown): ValidationResult<ContentItem> {
  try {
    const result = ContentItemSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Validate a Block
 */
export function validateBlock(data: unknown): ValidationResult<Block> {
  try {
    const result = BlockSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Validate block payload based on kind
 */
export function validateBlockPayload(kind: string, payload: unknown): ValidationResult<unknown> {
  try {
    let schema: z.ZodSchema;
    
    switch (kind) {
      case 'markdown':
        schema = MarkdownPayloadSchema;
        break;
      case 'mermaid':
        schema = MermaidPayloadSchema;
        break;
      case 'image':
        schema = ImagePayloadSchema;
        break;
      default:
        return { success: false, errors: [`Unknown block kind: ${kind}`] };
    }
    
    const result = schema.parse(payload);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Validate Capabilities
 */
export function validateCapabilities(data: unknown): ValidationResult<Capabilities> {
  try {
    const result = CapabilitiesSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}
```

### 6. Create Utility Types and Builders

Create `src/types/utils.ts`:

```typescript
import type { ContentItem, Block, Variant } from './core';
import type { MarkdownBlockPayload, MermaidBlockPayload, ImageBlockPayload } from './blocks';

/**
 * Utility type to extract payload type from block kind
 */
export type PayloadForKind<K extends string> = 
  K extends 'markdown' ? MarkdownBlockPayload :
  K extends 'mermaid' ? MermaidBlockPayload :
  K extends 'image' ? ImageBlockPayload :
  unknown;

/**
 * Utility type for partial updates
 */
export type PartialContentItem = Partial<Omit<ContentItem, 'id' | 'blocks'>> & {
  id: string;
  blocks?: Partial<Block>[];
};

/**
 * Builder class for creating ContentItems
 */
export class ContentItemBuilder {
  private item: Partial<ContentItem> = {
    blocks: []
  };

  constructor(id: string, type: string) {
    this.item.id = id;
    this.item.type = type;
  }

  title(title: string): this {
    this.item.title = title;
    return this;
  }

  summary(summary: string): this {
    this.item.summary = summary;
    return this;
  }

  addBlock(block: Block): this {
    this.item.blocks = [...(this.item.blocks || []), block];
    return this;
  }

  createdBy(createdBy: string): this {
    this.item.createdBy = createdBy;
    return this;
  }

  build(): ContentItem {
    const now = new Date().toISOString();
    return {
      ...this.item,
      blocks: this.item.blocks || [],
      createdAt: this.item.createdAt || now,
      updatedAt: this.item.updatedAt || now
    } as ContentItem;
  }
}

/**
 * Builder class for creating Blocks
 */
export class BlockBuilder<K extends string> {
  private block: Partial<Block> = {
    variants: []
  };

  constructor(id: string, kind: K) {
    this.block.id = id;
    this.block.kind = kind;
  }

  payload(payload: PayloadForKind<K>): this {
    this.block.payload = payload;
    return this;
  }

  addVariant(variant: Variant): this {
    this.block.variants = [...(this.block.variants || []), variant];
    return this;
  }

  build(): Block {
    return this.block as Block;
  }
}
```

### 7. Create Main Export Index

Create `src/types/index.ts`:

```typescript
// Core types
export type {
  ContentItem,
  Block,
  Variant,
  Representation
} from './core';

// Block-specific types
export type {
  MarkdownBlockPayload,
  MermaidBlockPayload,
  ImageBlockPayload,
  MarkdownBlock,
  MermaidBlock,
  ImageBlock,
  TypedBlock
} from './blocks';

// Block type guards
export {
  isMarkdownBlock,
  isMermaidBlock,
  isImageBlock,
  getTypedPayload
} from './blocks';

// Capability types
export type {
  Capabilities,
  CapabilityHints,
  NetworkType
} from './capabilities';

export { DEFAULT_CAPABILITIES } from './capabilities';

// Utility types and builders
export type {
  PayloadForKind,
  PartialContentItem
} from './utils';

export {
  ContentItemBuilder,
  BlockBuilder
} from './utils';

// Validation
export type { ValidationResult } from '../validation/validators';
export {
  validateContentItem,
  validateBlock,
  validateBlockPayload,
  validateCapabilities
} from '../validation/validators';
```

## Validation Steps

1. **Type Compilation**: Run `npx tsc --noEmit` to verify all types compile correctly
2. **Schema Validation**: Create test data and verify Zod schemas work
3. **Type Guards**: Test type guard functions with sample data
4. **Builders**: Test builder classes create valid objects
5. **Documentation**: Verify JSDoc generates proper documentation
6. **Export Structure**: Verify all types are properly exported

## Testing

Create `tests/unit/types.test.ts`:

```typescript
import {
  ContentItemBuilder,
  BlockBuilder,
  validateContentItem,
  isMarkdownBlock,
  DEFAULT_CAPABILITIES
} from '../index';

describe('Type System', () => {
  test('ContentItemBuilder creates valid content', () => {
    const content = new ContentItemBuilder('test-id', 'note')
      .title('Test Content')
      .summary('Test summary')
      .build();

    expect(content.id).toBe('test-id');
    expect(content.type).toBe('note');
    expect(content.title).toBe('Test Content');
  });

  test('Block type guards work correctly', () => {
    const markdownBlock = new BlockBuilder('block-id', 'markdown')
      .payload({ source: '# Hello' })
      .build();

    expect(isMarkdownBlock(markdownBlock)).toBe(true);
  });

  test('Validation catches invalid data', () => {
    const result = validateContentItem({ invalid: 'data' });
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });
});
```

## Next Steps

After completing this task:
1. Verify all types compile and tests pass
2. Generate documentation from JSDoc comments
3. Begin Task 3A: Transport-Agnostic API Interface
