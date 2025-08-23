# Task 5A: Framework-Agnostic Rendering Base

## Overview
Create a framework-agnostic rendering foundation with variant selection algorithms, content processing utilities, and extensible renderer registry system that can be used across different UI frameworks.

## Estimated Time
2-3 hours

## Dependencies
- Task 4A (GraphQL Transport) must be completed
- Understanding of variant selection algorithm from API design

## Acceptance Criteria

### Variant Selection
- [ ] Implement capability-based variant selection algorithm
- [ ] Support media type matching with wildcards and parameters
- [ ] Quality scoring based on capability hints
- [ ] Network-aware optimization (file size preferences)
- [ ] Fallback variant selection for unsupported types

### Renderer System
- [ ] Abstract renderer interfaces for different block types
- [ ] Registry system for managing block renderers
- [ ] Plugin architecture for custom block types
- [ ] Framework-agnostic base classes
- [ ] Extensible rendering pipeline

### Content Processing
- [ ] Content preprocessing utilities
- [ ] Block-level processing and transformation
- [ ] Representation filtering
- [ ] Performance optimization utilities
- [ ] Error handling and graceful degradation

## Implementation Steps

### 1. Create Variant Selection Engine

Create `packages/sdk/src/rendering/variant-selector.ts`:

```typescript
import type { Variant, Capabilities, CapabilityHints } from '../types';

export interface VariantScore {
  variant: Variant;
  score: number;
  reasons: string[];
}

/**
 * Engine for selecting optimal variants based on client capabilities
 */
export class VariantSelector {
  /**
   * Select the best variant from available options
   */
  selectBestVariant(
    variants: Variant[],
    capabilities: Capabilities
  ): Variant | null {
    if (variants.length === 0) {
      return null;
    }

    // Score all acceptable variants
    const scoredVariants = this.scoreVariants(variants, capabilities);
    
    if (scoredVariants.length === 0) {
      // No acceptable variants, return fallback
      return this.selectFallbackVariant(variants);
    }

    // Sort by score (highest first) and return best
    scoredVariants.sort((a, b) => b.score - a.score);
    return scoredVariants[0].variant;
  }

  /**
   * Score all variants based on capabilities
   */
  private scoreVariants(
    variants: Variant[],
    capabilities: Capabilities
  ): VariantScore[] {
    const scored: VariantScore[] = [];

    for (const variant of variants) {
      const score = this.scoreVariant(variant, capabilities);
      if (score.score > 0) {
        scored.push(score);
      }
    }

    return scored;
  }

  /**
   * Score a single variant against capabilities
   */
  private scoreVariant(
    variant: Variant,
    capabilities: Capabilities
  ): VariantScore {
    const reasons: string[] = [];
    let score = 0;

    // Check if media type is acceptable
    const mediaTypeScore = this.scoreMediaType(variant.mediaType, capabilities.accept);
    if (mediaTypeScore <= 0) {
      return { variant, score: 0, reasons: ['Media type not acceptable'] };
    }

    score += mediaTypeScore;
    reasons.push(`Media type score: ${mediaTypeScore}`);

    // Apply capability hints
    if (capabilities.hints) {
      const hintScore = this.applyCapabilityHints(variant, capabilities.hints);
      score += hintScore.score;
      reasons.push(...hintScore.reasons);
    }

    return { variant, score, reasons };
  }

  /**
   * Score media type against accept list
   */
  private scoreMediaType(variantType: string, acceptTypes: string[]): number {
    let bestScore = 0;

    for (const acceptType of acceptTypes) {
      if (this.mediaTypeMatches(variantType, acceptType)) {
        // Extract quality value if present (e.g., "image/webp;q=0.8")
        const quality = this.extractQuality(acceptType);
        bestScore = Math.max(bestScore, quality);
      }
    }

    return bestScore;
  }

  /**
   * Check if variant media type matches accept pattern
   */
  private mediaTypeMatches(variantType: string, acceptType: string): boolean {
    // Remove parameters for comparison
    const variantBase = variantType.split(';')[0].trim();
    const acceptBase = acceptType.split(';')[0].trim();

    // Handle wildcards (e.g., "image/*")
    if (acceptBase.endsWith('/*')) {
      const prefix = acceptBase.slice(0, -2);
      return variantBase.startsWith(prefix);
    }

    // Handle catch-all
    if (acceptBase === '*/*') {
      return true;
    }

    // Exact match
    return variantBase === acceptBase;
  }

  /**
   * Extract quality value from accept type
   */
  private extractQuality(acceptType: string): number {
    const qMatch = acceptType.match(/;q=([0-9.]+)/);
    return qMatch ? parseFloat(qMatch[1]) : 1.0;
  }

  /**
   * Apply capability hints to adjust score
   */
  private applyCapabilityHints(
    variant: Variant,
    hints: CapabilityHints
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // Size preferences
    if (hints.width && variant.width) {
      const sizeDiff = Math.abs(variant.width - hints.width);
      const sizeScore = Math.max(0, 1 - sizeDiff / hints.width);
      score += sizeScore * 0.3; // 30% weight for size matching
      reasons.push(`Size match score: ${sizeScore.toFixed(2)}`);
    }

    // Network optimization
    if (hints.network && variant.bytes) {
      const networkScore = this.scoreForNetwork(variant.bytes, hints.network);
      score += networkScore * 0.4; // 40% weight for network optimization
      reasons.push(`Network optimization score: ${networkScore.toFixed(2)}`);
    }

    // Density preferences
    if (hints.density && variant.width && variant.height) {
      const densityScore = this.scoreDensity(variant, hints.density);
      score += densityScore * 0.2; // 20% weight for density
      reasons.push(`Density score: ${densityScore.toFixed(2)}`);
    }

    // File size preferences
    if (hints.maxBytes && variant.bytes) {
      if (variant.bytes > hints.maxBytes) {
        score -= 0.5; // Penalty for exceeding max size
        reasons.push('Penalty for exceeding max file size');
      }
    }

    return { score, reasons };
  }

  /**
   * Score variant based on network type
   */
  private scoreForNetwork(bytes: number, network: string): number {
    const sizeMB = bytes / (1024 * 1024);

    switch (network) {
      case 'FAST':
        return 1.0; // No penalty for fast networks
      case 'SLOW':
        return Math.max(0, 1 - sizeMB * 0.5); // Penalty for large files
      case 'CELLULAR':
        return Math.max(0, 1 - sizeMB * 0.8); // Higher penalty for cellular
      default:
        return 0.5;
    }
  }

  /**
   * Score variant based on density requirements
   */
  private scoreDensity(variant: Variant, targetDensity: number): number {
    // This is a simplified density scoring
    // In practice, you might want more sophisticated logic
    if (targetDensity >= 2.0 && variant.width && variant.width >= 1600) {
      return 1.0; // High-res variant for high-density displays
    } else if (targetDensity < 2.0 && variant.width && variant.width < 1600) {
      return 1.0; // Standard-res variant for standard displays
    }
    return 0.5;
  }

  /**
   * Select fallback variant when no variants match capabilities
   */
  private selectFallbackVariant(variants: Variant[]): Variant | null {
    if (variants.length === 0) {
      return null;
    }

    // Prefer variants with URIs (accessible content)
    const accessibleVariants = variants.filter(v => v.uri);
    if (accessibleVariants.length > 0) {
      // Return smallest accessible variant as fallback
      return accessibleVariants.reduce((smallest, current) => {
        if (!smallest.bytes || !current.bytes) return smallest;
        return current.bytes < smallest.bytes ? current : smallest;
      });
    }

    // Return first variant as last resort
    return variants[0];
  }
}
```

### 2. Create Renderer Interfaces

Create `packages/sdk/src/rendering/interfaces.ts`:

```typescript
import type { Block, Variant, Capabilities } from '../types';

/**
 * Result of rendering a block
 */
export interface RenderResult<T = any> {
  /** Rendered content (framework-specific) */
  content: T;
  /** Selected variant used for rendering */
  variant: Variant | null;
  /** Any metadata about the rendering */
  metadata?: Record<string, unknown>;
  /** Errors that occurred during rendering */
  errors?: string[];
}

/**
 * Context passed to renderers
 */
export interface RenderContext {
  /** Client capabilities */
  capabilities: Capabilities;
  /** Additional rendering options */
  options?: Record<string, unknown>;
  /** Callback for handling errors */
  onError?: (error: Error) => void;
  /** Callback for loading states */
  onLoading?: (loading: boolean) => void;
}

/**
 * Base interface for block renderers
 */
export interface BlockRenderer<TProps = any, TResult = any> {
  /** Block kind this renderer handles */
  readonly kind: string;
  
  /** Priority for renderer selection (higher = preferred) */
  readonly priority: number;

  /**
   * Check if this renderer can handle the given block
   */
  canRender(block: Block, context: RenderContext): boolean;

  /**
   * Render the block with given props
   */
  render(block: Block, props: TProps, context: RenderContext): Promise<RenderResult<TResult>>;

  /**
   * Get default props for this renderer
   */
  getDefaultProps?(): Partial<TProps>;

  /**
   * Validate props before rendering
   */
  validateProps?(props: TProps): string[];
}

/**
 * Registry for managing block renderers
 */
export interface RendererRegistry {
  /**
   * Register a renderer for a block kind
   */
  register<TProps, TResult>(renderer: BlockRenderer<TProps, TResult>): void;

  /**
   * Unregister a renderer
   */
  unregister(kind: string, priority?: number): void;

  /**
   * Get the best renderer for a block
   */
  getRenderer(block: Block, context: RenderContext): BlockRenderer | null;

  /**
   * Get all renderers for a kind
   */
  getRenderers(kind: string): BlockRenderer[];

  /**
   * Check if a kind can be rendered
   */
  canRender(kind: string): boolean;
}

/**
 * Content processor interface
 */
export interface ContentProcessor {
  /**
   * Process content before rendering
   */
  processContent(
    content: any,
    capabilities: Capabilities,
    options?: Record<string, unknown>
  ): Promise<any>;

  /**
   * Process individual block
   */
  processBlock(
    block: Block,
    capabilities: Capabilities,
    options?: Record<string, unknown>
  ): Promise<Block>;
}
```

### 3. Implement Renderer Registry

Create `packages/sdk/src/rendering/renderer-registry.ts`:

```typescript
import type { Block } from '../types';
import type { BlockRenderer, RendererRegistry, RenderContext } from './interfaces';

/**
 * Default implementation of renderer registry
 */
export class DefaultRendererRegistry implements RendererRegistry {
  private renderers = new Map<string, BlockRenderer[]>();

  /**
   * Register a renderer for a block kind
   */
  register<TProps, TResult>(renderer: BlockRenderer<TProps, TResult>): void {
    const existing = this.renderers.get(renderer.kind) || [];
    
    // Insert in priority order (highest first)
    const insertIndex = existing.findIndex(r => r.priority < renderer.priority);
    if (insertIndex === -1) {
      existing.push(renderer);
    } else {
      existing.splice(insertIndex, 0, renderer);
    }
    
    this.renderers.set(renderer.kind, existing);
  }

  /**
   * Unregister a renderer
   */
  unregister(kind: string, priority?: number): void {
    const existing = this.renderers.get(kind);
    if (!existing) return;

    if (priority !== undefined) {
      // Remove specific renderer by priority
      const filtered = existing.filter(r => r.priority !== priority);
      if (filtered.length === 0) {
        this.renderers.delete(kind);
      } else {
        this.renderers.set(kind, filtered);
      }
    } else {
      // Remove all renderers for kind
      this.renderers.delete(kind);
    }
  }

  /**
   * Get the best renderer for a block
   */
  getRenderer(block: Block, context: RenderContext): BlockRenderer | null {
    const renderers = this.renderers.get(block.kind);
    if (!renderers) return null;

    // Find first renderer that can handle this block
    for (const renderer of renderers) {
      if (renderer.canRender(block, context)) {
        return renderer;
      }
    }

    return null;
  }

  /**
   * Get all renderers for a kind
   */
  getRenderers(kind: string): BlockRenderer[] {
    return this.renderers.get(kind) || [];
  }

  /**
   * Check if a kind can be rendered
   */
  canRender(kind: string): boolean {
    return this.renderers.has(kind);
  }

  /**
   * Get all registered kinds
   */
  getRegisteredKinds(): string[] {
    return Array.from(this.renderers.keys());
  }

  /**
   * Clear all renderers
   */
  clear(): void {
    this.renderers.clear();
  }
}
```

### 4. Create Content Processor

Create `packages/sdk/src/rendering/content-processor.ts`:

```typescript
import type { ContentItem, Block, Capabilities } from '../types';
import type { ContentProcessor } from './interfaces';
import { VariantSelector } from './variant-selector';

/**
 * Processes content for optimal rendering
 */
export class DefaultContentProcessor implements ContentProcessor {
  private variantSelector = new VariantSelector();

  /**
   * Process content before rendering
   */
  async processContent(
    content: ContentItem,
    capabilities: Capabilities,
    options?: Record<string, unknown>
  ): Promise<ContentItem> {
    // Apply representation filtering if specified
    let processedContent = content;
    if (options?.representation && content.representations) {
      processedContent = this.applyRepresentation(content, options.representation as string);
    }

    // Process each block
    const processedBlocks = await Promise.all(
      processedContent.blocks.map(block => this.processBlock(block, capabilities, options))
    );

    return {
      ...processedContent,
      blocks: processedBlocks
    };
  }

  /**
   * Process individual block
   */
  async processBlock(
    block: Block,
    capabilities: Capabilities,
    options?: Record<string, unknown>
  ): Promise<Block> {
    // Select best variant for this block
    const bestVariant = this.variantSelector.selectBestVariant(block.variants, capabilities);
    
    // Filter variants to only include the best one (and fallbacks)
    const filteredVariants = bestVariant 
      ? [bestVariant, ...this.getFallbackVariants(block.variants, bestVariant)]
      : block.variants;

    return {
      ...block,
      variants: filteredVariants
    };
  }

  /**
   * Apply representation filtering to content
   */
  private applyRepresentation(content: ContentItem, representation: string): ContentItem {
    const repr = content.representations?.[representation];
    if (!repr) {
      return content;
    }

    const allowedBlockIds = new Set(repr.blocks);
    const filteredBlocks = content.blocks.filter(block => allowedBlockIds.has(block.id));

    return {
      ...content,
      blocks: filteredBlocks
    };
  }

  /**
   * Get fallback variants for graceful degradation
   */
  private getFallbackVariants(allVariants: any[], selectedVariant: any): any[] {
    // Return a few fallback variants in case the selected one fails
    return allVariants
      .filter(v => v !== selectedVariant)
      .slice(0, 2); // Keep 2 fallbacks
  }
}
```

### 5. Create Base Renderer Classes

Create `packages/sdk/src/rendering/base-renderers.ts`:

```typescript
import type { Block, Variant } from '../types';
import type { BlockRenderer, RenderContext, RenderResult } from './interfaces';
import { VariantSelector } from './variant-selector';

/**
 * Abstract base class for block renderers
 */
export abstract class BaseBlockRenderer<TProps = any, TResult = any> 
  implements BlockRenderer<TProps, TResult> {
  
  protected variantSelector = new VariantSelector();

  abstract readonly kind: string;
  abstract readonly priority: number;

  /**
   * Default implementation checks if block kind matches
   */
  canRender(block: Block, context: RenderContext): boolean {
    return block.kind === this.kind && this.hasRenderableVariant(block, context);
  }

  /**
   * Abstract render method to be implemented by subclasses
   */
  abstract render(
    block: Block, 
    props: TProps, 
    context: RenderContext
  ): Promise<RenderResult<TResult>>;

  /**
   * Get default props (override in subclasses)
   */
  getDefaultProps(): Partial<TProps> {
    return {};
  }

  /**
   * Validate props (override in subclasses)
   */
  validateProps(props: TProps): string[] {
    return [];
  }

  /**
   * Select best variant for rendering
   */
  protected selectVariant(block: Block, context: RenderContext): Variant | null {
    return this.variantSelector.selectBestVariant(block.variants, context.capabilities);
  }

  /**
   * Check if block has at least one renderable variant
   */
  protected hasRenderableVariant(block: Block, context: RenderContext): boolean {
    return this.selectVariant(block, context) !== null;
  }

  /**
   * Handle rendering errors consistently
   */
  protected handleError(error: Error, context: RenderContext): void {
    if (context.onError) {
      context.onError(error);
    } else {
      console.error(`Rendering error in ${this.kind} renderer:`, error);
    }
  }

  /**
   * Update loading state
   */
  protected setLoading(loading: boolean, context: RenderContext): void {
    if (context.onLoading) {
      context.onLoading(loading);
    }
  }
}

/**
 * Base renderer for text-based content
 */
export abstract class BaseTextRenderer<TProps = any, TResult = any> 
  extends BaseBlockRenderer<TProps, TResult> {
  
  /**
   * Extract text content from variant
   */
  protected async getTextContent(variant: Variant): Promise<string> {
    if (!variant.uri) {
      throw new Error('Variant has no URI for text content');
    }

    try {
      const response = await fetch(variant.uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch text content: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      throw new Error(`Failed to load text content: ${error}`);
    }
  }
}

/**
 * Base renderer for image-based content
 */
export abstract class BaseImageRenderer<TProps = any, TResult = any> 
  extends BaseBlockRenderer<TProps, TResult> {
  
  /**
   * Check if variant is an image
   */
  protected isImageVariant(variant: Variant): boolean {
    return variant.mediaType.startsWith('image/');
  }

  /**
   * Get image dimensions from variant
   */
  protected getImageDimensions(variant: Variant): { width?: number; height?: number } {
    return {
      width: variant.width,
      height: variant.height
    };
  }
}
```

### 6. Create Capability Detection Utilities

Create `packages/sdk/src/rendering/capability-detector.ts`:

```typescript
import type { Capabilities, CapabilityHints, NetworkType } from '../types';

/**
 * Detects client capabilities for optimal content delivery
 */
export class CapabilityDetector {
  /**
   * Detect capabilities for current environment
   */
  detectCapabilities(): Capabilities {
    return {
      accept: this.detectSupportedMediaTypes(),
      hints: this.detectCapabilityHints()
    };
  }

  /**
   * Detect supported media types
   */
  private detectSupportedMediaTypes(): string[] {
    const supported = [
      'text/markdown',
      'text/html',
      'text/plain'
    ];

    // Check image format support
    if (this.supportsImageFormat('avif')) {
      supported.push('image/avif');
    }
    if (this.supportsImageFormat('webp')) {
      supported.push('image/webp');
    }
    supported.push('image/png', 'image/jpeg', 'image/gif');

    // Check SVG support
    if (this.supportsSVG()) {
      supported.push('image/svg+xml');
    }

    return supported;
  }

  /**
   * Detect capability hints
   */
  private detectCapabilityHints(): CapabilityHints {
    return {
      width: this.detectScreenWidth(),
      height: this.detectScreenHeight(),
      density: this.detectPixelDensity(),
      network: this.detectNetworkType(),
      interactive: this.detectInteractiveCapability()
    };
  }

  /**
   * Check if image format is supported
   */
  private supportsImageFormat(format: string): boolean {
    if (typeof document === 'undefined') {
      return false; // Server-side, assume no support
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    try {
      return canvas.toDataURL(`image/${format}`).startsWith(`data:image/${format}`);
    } catch {
      return false;
    }
  }

  /**
   * Check SVG support
   */
  private supportsSVG(): boolean {
    if (typeof document === 'undefined') {
      return false;
    }
    
    return document.implementation.hasFeature('http://www.w3.org/TR/SVG11/feature#Image', '1.1');
  }

  /**
   * Detect screen width
   */
  private detectScreenWidth(): number {
    if (typeof window !== 'undefined') {
      return window.screen.width;
    }
    return 375; // Default mobile width
  }

  /**
   * Detect screen height
   */
  private detectScreenHeight(): number {
    if (typeof window !== 'undefined') {
      return window.screen.height;
    }
    return 667; // Default mobile height
  }

  /**
   * Detect pixel density
   */
  private detectPixelDensity(): number {
    if (typeof window !== 'undefined') {
      return window.devicePixelRatio || 1;
    }
    return 1;
  }

  /**
   * Detect network type
   */
  private detectNetworkType(): NetworkType {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        switch (effectiveType) {
          case '4g':
            return 'FAST';
          case '3g':
            return 'SLOW';
          case '2g':
          case 'slow-2g':
            return 'CELLULAR';
          default:
            return 'FAST';
        }
      }
    }
    return 'FAST'; // Default assumption
  }

  /**
   * Detect interactive capability
   */
  private detectInteractiveCapability(): boolean {
    // Check if we're in an interactive environment
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }
}
```

## Validation Steps

1. **Variant Selection**: Test algorithm with various capability combinations
2. **Renderer Registry**: Test registration, unregistration, and selection
3. **Content Processing**: Test with different content types and representations
4. **Base Renderers**: Test abstract base classes with mock implementations
5. **Capability Detection**: Test detection in different environments

## Testing

Create comprehensive tests for the rendering system:

```typescript
// packages/sdk/src/rendering/__tests__/variant-selector.test.ts
import { VariantSelector } from '../variant-selector';
import type { Variant, Capabilities } from '../../types';

describe('VariantSelector', () => {
  let selector: VariantSelector;

  beforeEach(() => {
    selector = new VariantSelector();
  });

  test('should select WebP over JPEG when supported', () => {
    const variants: Variant[] = [
      { mediaType: 'image/jpeg', bytes: 100000 },
      { mediaType: 'image/webp', bytes: 80000 }
    ];

    const capabilities: Capabilities = {
      accept: ['image/webp', 'image/jpeg']
    };

    const selected = selector.selectBestVariant(variants, capabilities);
    expect(selected?.mediaType).toBe('image/webp');
  });

  test('should prefer smaller files on slow networks', () => {
    const variants: Variant[] = [
      { mediaType: 'image/png', bytes: 200000 },
      { mediaType: 'image/png', bytes: 100000 }
    ];

    const capabilities: Capabilities = {
      accept: ['image/png'],
      hints: { network: 'SLOW' }
    };

    const selected = selector.selectBestVariant(variants, capabilities);
    expect(selected?.bytes).toBe(100000);
  });
});
```

## Next Steps

After completing this task:
1. Test variant selection with real-world scenarios
2. Verify renderer registry works with mock renderers
3. Begin Task 5: React Native Components
