# Task 5: React Native Implementation

## Overview
Set up the React Native repository and implement comprehensive React Native components for rendering all block types with responsive design, accessibility support, and performance optimizations. This includes project setup, component implementation, and example app.

## Estimated Time
6-8 hours

## Dependencies
- Task 5A (Framework-Agnostic Rendering Base) must be completed and published
- React Native development environment set up
- Core SDK published to npm as `@portable-content/sdk`

## Acceptance Criteria

### Repository Setup
- [ ] React Native repository (`portable-content-react-native`) established
- [ ] TypeScript project structure configured
- [ ] Testing infrastructure with Jest configured
- [ ] Build system configured for library and example app
- [ ] ESLint and Prettier configured
- [ ] Package.json with proper dependencies
- [ ] CI/CD workflow configured

### Core Components
- [ ] ContentView component for rendering complete content items
- [ ] Individual block components (MarkdownBlock, MermaidBlock, ImageBlock)
- [ ] Loading and error state components
- [ ] Responsive layout handling

### Block Renderers
- [ ] MarkdownBlock with react-native-markdown-display
- [ ] MermaidBlock with SVG/PNG variant rendering
- [ ] ImageBlock with multiple variant support and lazy loading
- [ ] Extensible renderer system for custom blocks

### User Experience
- [ ] Accessibility support (screen readers, focus management)
- [ ] Touch interactions and gestures
- [ ] Performance optimizations (lazy loading, virtualization)
- [ ] Customizable styling system
- [ ] Error boundaries and graceful degradation

### Example Application
- [ ] Complete React Native example app
- [ ] Integration tests with real API
- [ ] Performance benchmarks
- [ ] Documentation with usage examples

## Implementation Steps

### 1. Initialize React Native Repository Structure

Create the `portable-content-react-native` repository:

```bash
mkdir portable-content-react-native
cd portable-content-react-native

# Initialize package.json
npm init -y
```

Create the React Native repository structure:
```
portable-content-react-native/
├── src/                          # Library source
│   ├── index.ts                  # Main export
│   ├── components/               # React Native components
│   │   ├── index.ts
│   │   ├── ContentView.tsx
│   │   ├── blocks/              # Block renderers
│   │   │   ├── index.ts
│   │   │   ├── MarkdownBlock.tsx
│   │   │   ├── MermaidBlock.tsx
│   │   │   └── ImageBlock.tsx
│   │   ├── ui/                  # UI components
│   │   │   ├── index.ts
│   │   │   ├── LoadingView.tsx
│   │   │   └── ErrorView.tsx
│   │   └── base/                # Base classes
│   │       ├── index.ts
│   │       └── BaseBlockRenderer.tsx
│   ├── hooks/                   # React hooks
│   │   ├── index.ts
│   │   └── useContent.ts
│   └── styles/                  # Styling utilities
│       ├── index.ts
│       └── themes.ts
├── example/                     # Example React Native app
│   ├── src/
│   │   ├── App.tsx
│   │   ├── screens/
│   │   ├── components/
│   │   └── __tests__/
│   ├── package.json
│   ├── metro.config.js
│   ├── babel.config.js
│   ├── ios/
│   └── android/
├── tests/                       # Library tests
│   ├── components/
│   └── __mocks__/
├── docs/                        # Documentation
├── .github/
│   └── workflows/
│       └── ci.yml
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
├── .prettierrc
├── .gitignore
└── README.md
```

### 2. Configure Library Package.json

```json
{
  "name": "@portable-content/react-native",
  "version": "0.1.0",
  "description": "React Native components for Portable Content System",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.{ts,tsx}",
    "lint:fix": "eslint src/**/*.{ts,tsx} --fix",
    "format": "prettier --write src/**/*.{ts,tsx}",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist",
    "prepublishOnly": "npm run clean && npm run build"
  },
  "keywords": [
    "portable-content",
    "react-native",
    "cms",
    "content-management",
    "typescript"
  ],
  "author": "Your Name",
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/portable-content/portable-content-react-native.git"
  },
  "dependencies": {
    "@portable-content/sdk": "^0.1.0",
    "react-native-markdown-display": "^7.0.0",
    "react-native-svg": "^13.14.0",
    "react-native-fast-image": "^8.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-native": "^0.72.0",
    "@typescript-eslint/eslint-plugin": "^6.7.0",
    "@typescript-eslint/parser": "^6.7.0",
    "eslint": "^8.50.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "jest": "^29.7.0",
    "prettier": "^3.0.0",
    "typescript": "^5.2.0"
  },
  "peerDependencies": {
    "react": ">=16.8.0",
    "react-native": ">=0.70.0"
  }
}
```

### 3. Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "react-native",
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests", "example", "**/*.test.ts", "**/*.test.tsx"]
}
```

### 4. Configure Testing

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'react-native',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/?(*.)+(spec|test).{ts,tsx}'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

### 5. Create Base Component Infrastructure

Create `src/components/base/BaseBlockRenderer.tsx`:

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { Block, Variant, Capabilities } from '@portable-content/sdk';
import { BaseBlockRenderer as SDKBaseRenderer } from '@portable-content/sdk';
import type { RenderContext, RenderResult } from '@portable-content/sdk';

export interface BaseBlockProps {
  block: Block;
  capabilities: Capabilities;
  style?: any;
  onPress?: (block: Block) => void;
  onError?: (error: Error) => void;
  onLoading?: (loading: boolean) => void;
}

/**
 * Base React Native block renderer component
 */
export abstract class BaseBlockRenderer<TProps extends BaseBlockProps = BaseBlockProps> 
  extends React.Component<TProps> {
  
  protected sdkRenderer: SDKBaseRenderer;

  constructor(props: TProps) {
    super(props);
    this.sdkRenderer = this.createSDKRenderer();
  }

  /**
   * Create the corresponding SDK renderer
   */
  protected abstract createSDKRenderer(): SDKBaseRenderer;

  /**
   * Render the block content
   */
  protected abstract renderContent(variant: Variant | null): React.ReactNode;

  render() {
    const { block, capabilities, style, onError, onLoading } = this.props;
    
    const context: RenderContext = {
      capabilities,
      onError,
      onLoading
    };

    if (!this.sdkRenderer.canRender(block, context)) {
      return this.renderUnsupported();
    }

    const variant = this.sdkRenderer.selectVariant(block, context);
    
    return (
      <View style={[styles.container, style]}>
        {this.renderContent(variant)}
      </View>
    );
  }

  /**
   * Render unsupported block fallback
   */
  protected renderUnsupported(): React.ReactNode {
    return (
      <View style={styles.unsupported}>
        {/* Unsupported block UI */}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8
  },
  unsupported: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8
  }
});
```

### 6. Implement MarkdownBlock Component

Create `src/components/blocks/MarkdownBlock.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import type { Block, Variant, MarkdownBlockPayload } from '@portable-content/sdk';
import { BaseTextRenderer } from '@portable-content/sdk';
import { BaseBlockRenderer, type BaseBlockProps } from '../base/BaseBlockRenderer';
import { LoadingView } from '../ui/LoadingView';
import { ErrorView } from '../ui/ErrorView';

export interface MarkdownBlockProps extends BaseBlockProps {
  markdownStyle?: any;
  onLinkPress?: (url: string) => void;
}

/**
 * SDK renderer for markdown blocks
 */
class MarkdownSDKRenderer extends BaseTextRenderer {
  readonly kind = 'markdown';
  readonly priority = 100;

  async render(block: Block, props: any, context: any) {
    const variant = this.selectVariant(block, context);
    if (!variant) {
      throw new Error('No suitable variant found for markdown block');
    }

    const content = await this.getTextContent(variant);
    return {
      content,
      variant,
      metadata: { source: (block.payload as MarkdownBlockPayload).source }
    };
  }
}

/**
 * React Native markdown block component
 */
export class MarkdownBlock extends BaseBlockRenderer<MarkdownBlockProps> {
  private [state, setState] = useState<{
    content: string | null;
    loading: boolean;
    error: Error | null;
  }>({
    content: null,
    loading: true,
    error: null
  });

  protected createSDKRenderer() {
    return new MarkdownSDKRenderer();
  }

  componentDidMount() {
    this.loadContent();
  }

  componentDidUpdate(prevProps: MarkdownBlockProps) {
    if (prevProps.block.id !== this.props.block.id) {
      this.loadContent();
    }
  }

  private async loadContent() {
    const { block, capabilities, onError, onLoading } = this.props;
    
    this.setState({ loading: true, error: null });
    onLoading?.(true);

    try {
      const context = { capabilities, onError, onLoading };
      const result = await this.sdkRenderer.render(block, {}, context);
      
      this.setState({
        content: result.content,
        loading: false,
        error: null
      });
      onLoading?.(false);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.setState({ loading: false, error: err });
      onError?.(err);
      onLoading?.(false);
    }
  }

  protected renderContent(variant: Variant | null): React.ReactNode {
    const { markdownStyle, onLinkPress } = this.props;
    const { content, loading, error } = this.state;

    if (loading) {
      return <LoadingView message="Loading content..." />;
    }

    if (error) {
      return (
        <ErrorView 
          error={error} 
          onRetry={() => this.loadContent()} 
        />
      );
    }

    if (!content) {
      return (
        <Text style={styles.emptyText}>
          No content available
        </Text>
      );
    }

    return (
      <Markdown
        style={[defaultMarkdownStyles, markdownStyle]}
        onLinkPress={onLinkPress}
      >
        {content}
      </Markdown>
    );
  }
}

const styles = StyleSheet.create({
  emptyText: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    padding: 16
  }
});

const defaultMarkdownStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333'
  },
  heading1: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 16,
    color: '#000'
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 12,
    color: '#000'
  },
  paragraph: {
    marginVertical: 8
  },
  code_inline: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace'
  },
  code_block: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    fontFamily: 'monospace'
  }
});
```

### 7. Implement ImageBlock Component

Create `src/components/blocks/ImageBlock.tsx`:

```typescript
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';
import type { Block, Variant, ImageBlockPayload } from '@portable-content/sdk';
import { BaseImageRenderer } from '@portable-content/sdk';
import { BaseBlockRenderer, type BaseBlockProps } from '../base/BaseBlockRenderer';
import { LoadingView } from '../ui/LoadingView';
import { ErrorView } from '../ui/ErrorView';

export interface ImageBlockProps extends BaseBlockProps {
  onImagePress?: (block: Block, variant: Variant) => void;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * SDK renderer for image blocks
 */
class ImageSDKRenderer extends BaseImageRenderer {
  readonly kind = 'image';
  readonly priority = 100;

  async render(block: Block, props: any, context: any) {
    const variant = this.selectVariant(block, context);
    if (!variant || !this.isImageVariant(variant)) {
      throw new Error('No suitable image variant found');
    }

    return {
      content: variant.uri,
      variant,
      metadata: this.getImageDimensions(variant)
    };
  }
}

/**
 * React Native image block component
 */
export class ImageBlock extends BaseBlockRenderer<ImageBlockProps> {
  private [state, setState] = useState<{
    loading: boolean;
    error: Error | null;
    dimensions: { width: number; height: number } | null;
  }>({
    loading: false,
    error: null,
    dimensions: null
  });

  protected createSDKRenderer() {
    return new ImageSDKRenderer();
  }

  protected renderContent(variant: Variant | null): React.ReactNode {
    const { 
      block, 
      onImagePress, 
      resizeMode = 'contain',
      maxWidth,
      maxHeight 
    } = this.props;
    const { loading, error } = this.state;

    if (!variant || !variant.uri) {
      return (
        <ErrorView 
          error={new Error('No image variant available')} 
        />
      );
    }

    const payload = block.payload as ImageBlockPayload;
    const screenWidth = Dimensions.get('window').width;
    const containerWidth = maxWidth || screenWidth - 32; // Default padding

    // Calculate display dimensions
    const displayDimensions = this.calculateDisplayDimensions(
      variant,
      containerWidth,
      maxHeight
    );

    const imageSource = {
      uri: variant.uri,
      priority: FastImage.priority.normal,
      cache: FastImage.cacheControl.immutable
    };

    const content = (
      <View style={styles.imageContainer}>
        {loading && (
          <View style={[styles.loadingOverlay, displayDimensions]}>
            <LoadingView message="Loading image..." />
          </View>
        )}
        
        <FastImage
          source={imageSource}
          style={[styles.image, displayDimensions]}
          resizeMode={FastImage.resizeMode[resizeMode]}
          onLoadStart={() => this.setState({ loading: true })}
          onLoad={() => this.setState({ loading: false, error: null })}
          onError={(error) => {
            const err = new Error('Failed to load image');
            this.setState({ loading: false, error: err });
            this.props.onError?.(err);
          }}
          accessible={true}
          accessibilityLabel={payload.alt || 'Image'}
          accessibilityRole="image"
        />

        {error && (
          <View style={[styles.errorOverlay, displayDimensions]}>
            <ErrorView 
              error={error}
              onRetry={() => {
                this.setState({ error: null });
                // Force image reload by updating key
                this.forceUpdate();
              }}
            />
          </View>
        )}
      </View>
    );

    if (onImagePress) {
      return (
        <TouchableOpacity
          onPress={() => onImagePress(block, variant)}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`View ${payload.alt || 'image'} in full size`}
        >
          {content}
        </TouchableOpacity>
      );
    }

    return content;
  }

  private calculateDisplayDimensions(
    variant: Variant,
    maxWidth: number,
    maxHeight?: number
  ): { width: number; height: number } {
    const originalWidth = variant.width || 300;
    const originalHeight = variant.height || 200;
    const aspectRatio = originalWidth / originalHeight;

    let displayWidth = Math.min(originalWidth, maxWidth);
    let displayHeight = displayWidth / aspectRatio;

    if (maxHeight && displayHeight > maxHeight) {
      displayHeight = maxHeight;
      displayWidth = displayHeight * aspectRatio;
    }

    return {
      width: Math.round(displayWidth),
      height: Math.round(displayHeight)
    };
  }
}

const styles = StyleSheet.create({
  imageContainer: {
    position: 'relative',
    alignItems: 'center'
  },
  image: {
    borderRadius: 8
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderRadius: 8
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderRadius: 8
  }
});
```

### 8. Implement MermaidBlock Component

Create `src/components/blocks/MermaidBlock.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';
import FastImage from 'react-native-fast-image';
import type { Block, Variant, MermaidBlockPayload } from '@portable-content/sdk';
import { BaseImageRenderer } from '@portable-content/sdk';
import { BaseBlockRenderer, type BaseBlockProps } from '../base/BaseBlockRenderer';
import { LoadingView } from '../ui/LoadingView';
import { ErrorView } from '../ui/ErrorView';

export interface MermaidBlockProps extends BaseBlockProps {
  preferSVG?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  onDiagramPress?: (block: Block, variant: Variant) => void;
}

/**
 * SDK renderer for mermaid blocks
 */
class MermaidSDKRenderer extends BaseImageRenderer {
  readonly kind = 'mermaid';
  readonly priority = 100;

  async render(block: Block, props: any, context: any) {
    const variant = this.selectVariant(block, context);
    if (!variant) {
      throw new Error('No suitable variant found for mermaid block');
    }

    // Prefer SVG for better quality, fallback to PNG
    const svgVariant = block.variants.find(v => v.mediaType.includes('svg'));
    const pngVariant = block.variants.find(v => v.mediaType.includes('png'));
    
    const selectedVariant = (props.preferSVG && svgVariant) ? svgVariant : (pngVariant || variant);

    if (selectedVariant.mediaType.includes('svg')) {
      const svgContent = await this.getTextContent(selectedVariant);
      return {
        content: svgContent,
        variant: selectedVariant,
        metadata: { type: 'svg', ...this.getImageDimensions(selectedVariant) }
      };
    } else {
      return {
        content: selectedVariant.uri,
        variant: selectedVariant,
        metadata: { type: 'image', ...this.getImageDimensions(selectedVariant) }
      };
    }
  }

  private async getTextContent(variant: Variant): Promise<string> {
    if (!variant.uri) {
      throw new Error('Variant has no URI for SVG content');
    }

    const response = await fetch(variant.uri);
    if (!response.ok) {
      throw new Error(`Failed to fetch SVG content: ${response.statusText}`);
    }
    return await response.text();
  }
}

/**
 * React Native mermaid block component
 */
export class MermaidBlock extends BaseBlockRenderer<MermaidBlockProps> {
  private [state, setState] = useState<{
    content: string | null;
    variant: Variant | null;
    loading: boolean;
    error: Error | null;
    renderType: 'svg' | 'image' | null;
  }>({
    content: null,
    variant: null,
    loading: true,
    error: null,
    renderType: null
  });

  protected createSDKRenderer() {
    return new MermaidSDKRenderer();
  }

  componentDidMount() {
    this.loadContent();
  }

  componentDidUpdate(prevProps: MermaidBlockProps) {
    if (prevProps.block.id !== this.props.block.id || 
        prevProps.preferSVG !== this.props.preferSVG) {
      this.loadContent();
    }
  }

  private async loadContent() {
    const { block, capabilities, preferSVG, onError, onLoading } = this.props;
    
    this.setState({ loading: true, error: null });
    onLoading?.(true);

    try {
      const context = { capabilities, onError, onLoading };
      const result = await this.sdkRenderer.render(block, { preferSVG }, context);
      
      this.setState({
        content: result.content,
        variant: result.variant,
        renderType: result.metadata?.type as 'svg' | 'image',
        loading: false,
        error: null
      });
      onLoading?.(false);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.setState({ loading: false, error: err });
      onError?.(err);
      onLoading?.(false);
    }
  }

  protected renderContent(variant: Variant | null): React.ReactNode {
    const { maxWidth, maxHeight, onDiagramPress } = this.props;
    const { content, variant: loadedVariant, loading, error, renderType } = this.state;

    if (loading) {
      return <LoadingView message="Loading diagram..." />;
    }

    if (error) {
      return (
        <ErrorView 
          error={error} 
          onRetry={() => this.loadContent()} 
        />
      );
    }

    if (!content || !loadedVariant) {
      return (
        <ErrorView 
          error={new Error('No diagram content available')} 
        />
      );
    }

    const screenWidth = Dimensions.get('window').width;
    const containerWidth = maxWidth || screenWidth - 32;
    
    const displayDimensions = this.calculateDisplayDimensions(
      loadedVariant,
      containerWidth,
      maxHeight
    );

    const diagramContent = renderType === 'svg' 
      ? this.renderSVG(content, displayDimensions)
      : this.renderImage(content, displayDimensions);

    if (onDiagramPress) {
      return (
        <TouchableOpacity
          onPress={() => onDiagramPress(this.props.block, loadedVariant)}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="View diagram in full size"
        >
          {diagramContent}
        </TouchableOpacity>
      );
    }

    return diagramContent;
  }

  private renderSVG(svgContent: string, dimensions: { width: number; height: number }) {
    return (
      <View style={[styles.diagramContainer, dimensions]}>
        <SvgXml
          xml={svgContent}
          width={dimensions.width}
          height={dimensions.height}
          accessible={true}
          accessibilityLabel="Mermaid diagram"
          accessibilityRole="image"
        />
      </View>
    );
  }

  private renderImage(imageUri: string, dimensions: { width: number; height: number }) {
    return (
      <View style={[styles.diagramContainer, dimensions]}>
        <FastImage
          source={{ 
            uri: imageUri,
            priority: FastImage.priority.normal,
            cache: FastImage.cacheControl.immutable
          }}
          style={[styles.diagramImage, dimensions]}
          resizeMode={FastImage.resizeMode.contain}
          accessible={true}
          accessibilityLabel="Mermaid diagram"
          accessibilityRole="image"
        />
      </View>
    );
  }

  private calculateDisplayDimensions(
    variant: Variant,
    maxWidth: number,
    maxHeight?: number
  ): { width: number; height: number } {
    const originalWidth = variant.width || 400;
    const originalHeight = variant.height || 300;
    const aspectRatio = originalWidth / originalHeight;

    let displayWidth = Math.min(originalWidth, maxWidth);
    let displayHeight = displayWidth / aspectRatio;

    if (maxHeight && displayHeight > maxHeight) {
      displayHeight = maxHeight;
      displayWidth = displayHeight * aspectRatio;
    }

    return {
      width: Math.round(displayWidth),
      height: Math.round(displayHeight)
    };
  }
}

const styles = StyleSheet.create({
  diagramContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8
  },
  diagramImage: {
    borderRadius: 8
  }
});
```

### 9. Create UI Utility Components

Create `src/components/ui/LoadingView.tsx`:

```typescript
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export interface LoadingViewProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  style?: any;
}

export const LoadingView: React.FC<LoadingViewProps> = ({
  message = 'Loading...',
  size = 'small',
  color = '#007AFF',
  style
}) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text style={[styles.message, { color }]}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center'
  }
});
```

Create `src/components/ui/ErrorView.tsx`:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export interface ErrorViewProps {
  error: Error;
  onRetry?: () => void;
  style?: any;
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  error,
  onRetry,
  style
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorMessage}>
        {error.message || 'Something went wrong'}
      </Text>
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Retry loading content"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7d7'
  },
  errorIcon: {
    fontSize: 24,
    marginBottom: 8
  },
  errorMessage: {
    fontSize: 14,
    color: '#e53e3e',
    textAlign: 'center',
    marginBottom: 12
  },
  retryButton: {
    backgroundColor: '#e53e3e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  }
});
```

### 10. Create Main ContentView Component

Create `src/components/ContentView.tsx`:

```typescript
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import type { ContentItem, Block, Capabilities } from '@portable-content/sdk';
import { DEFAULT_CAPABILITIES } from '@portable-content/sdk';
import { MarkdownBlock } from './blocks/MarkdownBlock';
import { MermaidBlock } from './blocks/MermaidBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { ErrorView } from './ui/ErrorView';

export interface ContentViewProps {
  content: ContentItem;
  capabilities?: Capabilities;
  onBlockPress?: (block: Block) => void;
  onError?: (error: Error) => void;
  onLoading?: (loading: boolean) => void;
  style?: any;
  scrollable?: boolean;
}

export const ContentView: React.FC<ContentViewProps> = ({
  content,
  capabilities = DEFAULT_CAPABILITIES.mobile,
  onBlockPress,
  onError,
  onLoading,
  style,
  scrollable = true
}) => {
  const renderBlock = (block: Block, index: number) => {
    const commonProps = {
      key: block.id,
      block,
      capabilities,
      onPress: onBlockPress,
      onError,
      onLoading,
      style: styles.block
    };

    switch (block.kind) {
      case 'markdown':
        return <MarkdownBlock {...commonProps} />;
      
      case 'mermaid':
        return <MermaidBlock {...commonProps} />;
      
      case 'image':
        return <ImageBlock {...commonProps} />;
      
      default:
        return (
          <ErrorView
            key={block.id}
            error={new Error(`Unsupported block type: ${block.kind}`)}
            style={styles.block}
          />
        );
    }
  };

  const contentBlocks = content.blocks.map(renderBlock);

  if (scrollable) {
    return (
      <ScrollView 
        style={[styles.scrollContainer, style]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {contentBlocks}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {contentBlocks}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContainer: {
    flex: 1
  },
  contentContainer: {
    padding: 16
  },
  block: {
    marginBottom: 16
  }
});
```

## Validation Steps

1. **Component Rendering**: Test all block components with sample data
2. **Variant Selection**: Verify optimal variants are selected for different capabilities
3. **Error Handling**: Test error states and retry functionality
4. **Accessibility**: Test with screen readers and accessibility tools
5. **Performance**: Test with large content items and multiple blocks
6. **Responsive Design**: Test on different screen sizes and orientations

## Testing

Create comprehensive component tests:

```typescript
// tests/components/ContentView.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { ContentView } from '../ContentView';
import type { ContentItem } from '@portable-content/sdk';

const mockContent: ContentItem = {
  id: 'test-content',
  type: 'note',
  title: 'Test Content',
  blocks: [
    {
      id: 'block-1',
      kind: 'markdown',
      payload: { source: '# Hello World' },
      variants: [
        { mediaType: 'text/markdown', uri: 'test://markdown' }
      ]
    }
  ]
};

describe('ContentView', () => {
  test('renders content blocks correctly', () => {
    const { getByText } = render(
      <ContentView content={mockContent} />
    );
    
    // Test that content is rendered
    expect(getByText('Hello World')).toBeTruthy();
  });

  test('handles unsupported block types', () => {
    const contentWithUnsupported = {
      ...mockContent,
      blocks: [
        {
          id: 'unsupported-block',
          kind: 'unsupported',
          payload: {},
          variants: []
        }
      ]
    };

    const { getByText } = render(
      <ContentView content={contentWithUnsupported} />
    );
    
    expect(getByText(/Unsupported block type/)).toBeTruthy();
  });
});
```

### 11. Create Example React Native App

Create `example/src/App.tsx`:

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PortableContentProvider } from '@portable-content/react-native';
import { PortableContentClient } from '@portable-content/sdk';
import { GraphQLTransport } from '@portable-content/sdk/transports';
import { ApolloGraphQLAdapter } from '@portable-content/sdk/adapters';
import { ApolloClient, InMemoryCache } from '@apollo/client';

import ContentListScreen from './screens/ContentListScreen';
import ContentDetailScreen from './screens/ContentDetailScreen';
import SearchScreen from './screens/SearchScreen';

const Stack = createNativeStackNavigator();

// Configure GraphQL client
const apolloClient = new ApolloClient({
  uri: 'http://localhost:4000/graphql',
  cache: new InMemoryCache()
});

const graphqlAdapter = new ApolloGraphQLAdapter(apolloClient);
const transport = new GraphQLTransport(graphqlAdapter);
const client = new PortableContentClient(transport);

export default function App() {
  return (
    <PortableContentProvider client={client}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="ContentList">
          <Stack.Screen
            name="ContentList"
            component={ContentListScreen}
            options={{ title: 'Content Library' }}
          />
          <Stack.Screen
            name="ContentDetail"
            component={ContentDetailScreen}
            options={{ title: 'Content Detail' }}
          />
          <Stack.Screen
            name="Search"
            component={SearchScreen}
            options={{ title: 'Search Content' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PortableContentProvider>
  );
}
```

Create `example/src/screens/ContentListScreen.tsx`:

```typescript
import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { usePortableContent } from '@portable-content/react-native';
import type { ContentItem } from '@portable-content/sdk';

interface ContentListScreenProps {
  navigation: any;
}

export const ContentListScreen: React.FC<ContentListScreenProps> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const { client } = usePortableContent();

  const { data, loading, error, refetch } = useSearchContent('', {
    limit: 20,
    offset: 0
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const renderContentItem = ({ item }: { item: ContentItem }) => (
    <TouchableOpacity
      style={styles.contentItem}
      onPress={() => navigation.navigate('ContentDetail', { contentId: item.id })}
    >
      <Text style={styles.title}>{item.title || 'Untitled'}</Text>
      {item.summary && <Text style={styles.summary}>{item.summary}</Text>}
      <Text style={styles.meta}>
        {item.blocks.length} blocks • {item.type}
      </Text>
    </TouchableOpacity>
  );

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text>Loading content...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.error}>Error loading content</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={data?.items || []}
        renderItem={renderContentItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  list: {
    padding: 16
  },
  contentItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4
  },
  summary: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8
  },
  meta: {
    fontSize: 12,
    color: '#adb5bd'
  },
  error: {
    fontSize: 16,
    color: '#dc3545',
    marginBottom: 16
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6
  },
  retryText: {
    color: '#fff',
    fontWeight: '600'
  }
});

export default ContentListScreen;
```

### 12. Configure CI/CD

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run type checking
        run: npm run type-check

      - name: Run linting
        run: npm run lint

      - name: Run tests
        run: npm run test:coverage

      - name: Build library
        run: npm run build

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        if: matrix.node-version == '18.x'

  publish:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js 18.x
        uses: actions/setup-node@v3
        with:
          node-version: 18.x
          cache: 'npm'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build library
        run: npm run build

      - name: Publish to npm
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Validation Steps

1. **Repository Setup**: Verify React Native repository structure is correct
2. **Dependencies**: Run `npm install` and verify no errors
3. **TypeScript**: Run `npm run type-check` to verify compilation
4. **Build**: Run `npm run build` and verify dist files are generated
5. **Testing**: Run `npm test` and verify all tests pass
6. **Components**: Test all components render correctly with sample data
7. **Example App**: Run example app on iOS and Android simulators
8. **Integration**: Test with real API data
9. **Performance**: Verify performance with large content items
10. **Accessibility**: Test with screen readers and accessibility tools

## Next Steps

After completing this task:
1. Test all components with real content from the API
2. Verify accessibility features work correctly
3. Test performance with large content items
4. Publish library to npm as `@portable-content/react-native`
5. Document usage examples and best practices
