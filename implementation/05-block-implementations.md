# Block Implementations

## Overview

This document details the specific implementation requirements for each of the 3 core block types: Markdown, Mermaid, and Image. Each block type has unique processing requirements and variant generation strategies.

## Markdown Block

### Payload Schema
```json
{
  "source": "# Title\n\nMarkdown content with **bold** and *italic* text."
}
```

### Supported Variants
1. **text/markdown** - Original source (canonical)
2. **text/html;profile=markdown** - Rendered HTML
3. **text/plain;role=extract** - Plain text extract for search

### Transform Pipeline

#### HTML Generation
```javascript
// unified-markdown transform
const unified = require('unified');
const remarkParse = require('remark-parse');
const remarkGfm = require('remark-gfm');
const remarkHtml = require('remark-html');
const remarkRehype = require('remark-rehype');
const rehypeSanitize = require('rehype-sanitize');
const rehypeStringify = require('rehype-stringify');

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize, {
    // Custom sanitization schema
    tagNames: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'a', 'img'],
    attributes: {
      'a': ['href', 'title'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      'code': ['className'],
      'pre': ['className']
    },
    protocols: {
      'href': ['http', 'https', 'mailto'],
      'src': ['http', 'https']
    }
  })
  .use(rehypeStringify);

const html = await processor.process(markdown);
```

#### Text Extraction
```javascript
// Extract plain text for search indexing
const remarkParse = require('remark-parse');
const remarkStringify = require('remark-stringify');
const unified = require('unified');

function extractText(markdown) {
  const ast = unified().use(remarkParse).parse(markdown);
  
  function visitNode(node) {
    if (node.type === 'text') {
      return node.value;
    }
    if (node.children) {
      return node.children.map(visitNode).join(' ');
    }
    return '';
  }
  
  return visitNode(ast).replace(/\s+/g, ' ').trim();
}
```

### Client Rendering

#### React Native Component
```typescript
import React from 'react';
import { View, Text } from 'react-native';
import Markdown from 'react-native-markdown-display';

interface MarkdownBlockProps {
  block: MarkdownBlock;
  capabilities: Capabilities;
}

export function MarkdownBlockRenderer({ block, capabilities }: MarkdownBlockProps) {
  // Select best variant
  const variant = selectBestVariant(block.variants, capabilities);
  
  if (variant?.mediaType === 'text/html;profile=markdown') {
    // Render HTML variant (requires WebView or HTML parser)
    return <HTMLRenderer uri={variant.uri} />;
  }
  
  // Fallback to markdown rendering
  const markdownVariant = block.variants.find(v => v.mediaType === 'text/markdown');
  if (markdownVariant) {
    return (
      <View>
        <Markdown source={block.payload.source} />
      </View>
    );
  }
  
  return <Text>Unable to render markdown block</Text>;
}
```

#### PHP Server-Side
```php
class MarkdownBlockRenderer
{
    public function render(MarkdownBlock $block, Capabilities $capabilities): string
    {
        $variant = $this->selectBestVariant($block->variants, $capabilities);
        
        if ($variant && $variant->mediaType === 'text/html;profile=markdown') {
            // Serve pre-rendered HTML
            return $this->fetchVariantContent($variant->uri);
        }
        
        // Fallback to server-side rendering
        return $this->renderMarkdownToHtml($block->payload['source']);
    }
    
    private function renderMarkdownToHtml(string $markdown): string
    {
        $parser = new \League\CommonMark\CommonMarkConverter([
            'html_input' => 'strip',
            'allow_unsafe_links' => false,
        ]);
        
        return $parser->convertToHtml($markdown);
    }
}
```

## Mermaid Block

### Payload Schema
```json
{
  "source": "graph TD;\n    A[Start] --> B{Decision};\n    B -->|Yes| C[Action 1];\n    B -->|No| D[Action 2];",
  "theme": "default"
}
```

### Supported Variants
1. **text/plain** - Original mermaid source
2. **image/svg+xml;profile=mermaid** - Rendered SVG diagram
3. **image/png;profile=mermaid;dpi=96** - PNG at standard resolution
4. **image/png;profile=mermaid;dpi=192** - PNG at high resolution (2x)

### Transform Pipeline

#### SVG Generation
```javascript
// mermaid-cli transform
const mermaid = require('@mermaid-js/mermaid');
const puppeteer = require('puppeteer');

async function renderMermaidSVG(source, theme = 'default') {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    </head>
    <body>
      <div id="mermaid-container"></div>
      <script>
        mermaid.initialize({ 
          theme: '${theme}',
          securityLevel: 'strict',
          startOnLoad: false
        });
        
        mermaid.render('diagram', \`${source}\`, (svg) => {
          document.getElementById('mermaid-container').innerHTML = svg;
        });
      </script>
    </body>
    </html>
  `);
  
  await page.waitForSelector('#mermaid-container svg');
  
  const svg = await page.$eval('#mermaid-container svg', el => el.outerHTML);
  const dimensions = await page.$eval('#mermaid-container svg', el => ({
    width: el.viewBox.baseVal.width,
    height: el.viewBox.baseVal.height
  }));
  
  await browser.close();
  
  return { svg, ...dimensions };
}
```

#### PNG Generation
```javascript
async function renderMermaidPNG(source, theme = 'default', dpi = 96) {
  const scale = dpi / 96; // Scale factor for high DPI
  
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1200 * scale, height: 800 * scale, deviceScaleFactor: scale });
  
  // Similar setup as SVG but capture as PNG
  await page.setContent(/* HTML with mermaid */);
  await page.waitForSelector('#mermaid-container svg');
  
  const element = await page.$('#mermaid-container svg');
  const png = await element.screenshot({ type: 'png' });
  
  await browser.close();
  
  return png;
}
```

### Client Rendering

#### React Native Component
```typescript
import React from 'react';
import { View, Image } from 'react-native';
import { SvgUri } from 'react-native-svg';

interface MermaidBlockProps {
  block: MermaidBlock;
  capabilities: Capabilities;
}

export function MermaidBlockRenderer({ block, capabilities }: MermaidBlockProps) {
  const variant = selectBestVariant(block.variants, capabilities);
  
  if (variant?.mediaType.startsWith('image/svg+xml')) {
    // Prefer SVG for scalability
    return (
      <View>
        <SvgUri uri={variant.uri} width={variant.width} height={variant.height} />
      </View>
    );
  }
  
  if (variant?.mediaType.startsWith('image/png')) {
    // Fallback to PNG
    return (
      <View>
        <Image 
          source={{ uri: variant.uri }}
          style={{ width: variant.width, height: variant.height }}
          resizeMode="contain"
        />
      </View>
    );
  }
  
  return <Text>Unable to render mermaid diagram</Text>;
}
```

#### Web Component
```typescript
import React from 'react';

interface MermaidBlockProps {
  block: MermaidBlock;
  capabilities: Capabilities;
}

export function MermaidBlockRenderer({ block, capabilities }: MermaidBlockProps) {
  const variant = selectBestVariant(block.variants, capabilities);
  
  if (variant?.mediaType.startsWith('image/svg+xml')) {
    return (
      <div className="mermaid-block">
        <img 
          src={variant.uri} 
          alt="Mermaid diagram"
          width={variant.width}
          height={variant.height}
        />
      </div>
    );
  }
  
  // Fallback to client-side rendering
  return <MermaidClientRenderer source={block.payload.source} theme={block.payload.theme} />;
}
```

## Image Block

### Payload Schema
```json
{
  "uri": "s3://bucket/path/original.jpg",
  "alt": "Description of the image",
  "width": 2048,
  "height": 1536
}
```

### Supported Variants
1. **image/jpeg** - Original JPEG (canonical)
2. **image/png** - Original PNG (canonical)
3. **image/webp;width=800** - WebP at 800px width
4. **image/webp;width=1200** - WebP at 1200px width
5. **image/avif;width=800** - AVIF at 800px width (modern browsers)
6. **image/avif;width=1200** - AVIF at 1200px width

### Transform Pipeline

#### Image Resizing and Format Conversion
```python
# libvips-based image transform
import pyvips
import os
import json
from pathlib import Path

def transform_image(input_path: Path, output_specs: list) -> list:
    """Transform image to multiple formats and sizes"""
    
    # Load image
    image = pyvips.Image.new_from_file(str(input_path))
    
    # Strip EXIF data for privacy
    if image.get_typeof('exif-data') != 0:
        image = image.copy()
        image.remove('exif-data')
    
    variants = []
    
    for spec in output_specs:
        media_type = spec['media_type']
        options = spec.get('options', {})
        
        # Parse target width from media type
        target_width = None
        if 'width=' in media_type:
            target_width = int(media_type.split('width=')[1].split(';')[0])
        
        # Resize if needed
        if target_width and target_width < image.width:
            scale = target_width / image.width
            resized = image.resize(scale)
        else:
            resized = image
        
        # Determine output format and options
        if 'webp' in media_type:
            output_path = f"image.webp"
            save_options = {
                'Q': options.get('quality', 80),
                'effort': 6  # Better compression
            }
            resized.webpsave(output_path, **save_options)
            
        elif 'avif' in media_type:
            output_path = f"image.avif"
            save_options = {
                'Q': options.get('quality', 80),
                'effort': 7
            }
            resized.heifsave(output_path, **save_options)
            
        elif 'jpeg' in media_type:
            output_path = f"image.jpg"
            save_options = {
                'Q': options.get('quality', 85),
                'optimize_coding': True
            }
            resized.jpegsave(output_path, **save_options)
            
        else:  # PNG
            output_path = f"image.png"
            resized.pngsave(output_path, compression=9)
        
        # Get file info
        file_size = os.path.getsize(output_path)
        
        variants.append({
            'media_type': media_type,
            'filename': output_path,
            'width': resized.width,
            'height': resized.height,
            'bytes': file_size,
            'content_hash': f'sha256:{calculate_hash(output_path)}'
        })
    
    return variants
```

### Client Rendering

#### React Native Component
```typescript
import React from 'react';
import { View, Image } from 'react-native';
import FastImage from 'react-native-fast-image';

interface ImageBlockProps {
  block: ImageBlock;
  capabilities: Capabilities;
  maxWidth?: number;
}

export function ImageBlockRenderer({ block, capabilities, maxWidth = 800 }: ImageBlockProps) {
  const variant = selectBestImageVariant(block.variants, capabilities, maxWidth);
  
  if (!variant) {
    return <Text>Unable to load image</Text>;
  }
  
  const aspectRatio = variant.width / variant.height;
  const displayWidth = Math.min(maxWidth, variant.width);
  const displayHeight = displayWidth / aspectRatio;
  
  return (
    <View>
      <FastImage
        source={{ uri: variant.uri }}
        style={{ 
          width: displayWidth, 
          height: displayHeight 
        }}
        resizeMode={FastImage.resizeMode.contain}
        alt={block.payload.alt}
      />
    </View>
  );
}

function selectBestImageVariant(
  variants: Variant[], 
  capabilities: Capabilities, 
  targetWidth: number
): Variant | null {
  // Prefer modern formats if supported
  const formatPreference = ['image/avif', 'image/webp', 'image/jpeg', 'image/png'];
  
  let bestVariant = null;
  let bestScore = -1;
  
  for (const variant of variants) {
    if (!capabilities.accept.some(accept => mediaTypeMatches(variant.mediaType, accept))) {
      continue;
    }
    
    let score = 0;
    
    // Format preference
    const formatIndex = formatPreference.findIndex(format => 
      variant.mediaType.startsWith(format)
    );
    if (formatIndex >= 0) {
      score += (formatPreference.length - formatIndex) * 100;
    }
    
    // Size preference (prefer closest to target)
    if (variant.width) {
      const sizeDiff = Math.abs(variant.width - targetWidth);
      score -= sizeDiff / 10;
    }
    
    // File size preference (smaller is better)
    if (variant.bytes) {
      score -= variant.bytes / 10000;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestVariant = variant;
    }
  }
  
  return bestVariant;
}
```

#### Web Component with Responsive Images
```typescript
import React from 'react';

interface ImageBlockProps {
  block: ImageBlock;
  capabilities: Capabilities;
}

export function ImageBlockRenderer({ block, capabilities }: ImageBlockProps) {
  const variants = block.variants.filter(v => 
    capabilities.accept.some(accept => mediaTypeMatches(v.mediaType, accept))
  );
  
  if (variants.length === 0) {
    return <div>Unable to load image</div>;
  }
  
  // Generate srcset for responsive images
  const srcSet = variants
    .filter(v => v.width)
    .sort((a, b) => a.width - b.width)
    .map(v => `${v.uri} ${v.width}w`)
    .join(', ');
  
  const defaultSrc = variants.find(v => v.width >= 800)?.uri || variants[0].uri;
  
  return (
    <img
      src={defaultSrc}
      srcSet={srcSet}
      sizes="(max-width: 800px) 100vw, 800px"
      alt={block.payload.alt}
      loading="lazy"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}
```

## Block Registry Configuration

### Registry Entries
```json
{
  "kinds": [
    {
      "id": "markdown",
      "schema": "./kinds/markdown.schema.json",
      "sanitization": "./policies/sanitization/markdown-safe.json",
      "variants": "./variants/markdown.json",
      "transforms": ["markdown:html", "markdown:extract"]
    },
    {
      "id": "mermaid",
      "schema": "./kinds/mermaid.schema.json", 
      "variants": "./variants/mermaid.json",
      "transforms": ["mermaid:render"]
    },
    {
      "id": "image",
      "schema": "./kinds/image.schema.json",
      "variants": "./variants/image.json", 
      "transforms": ["image:resize", "image:convert"]
    }
  ],
  "transforms": [
    {
      "id": "markdown:html",
      "tool_image": "ghcr.io/portable-content/unified-markdown:1.0.0",
      "inputs": ["text/markdown"],
      "outputs": ["text/html;profile=markdown", "text/plain;role=extract"]
    },
    {
      "id": "mermaid:render", 
      "tool_image": "ghcr.io/portable-content/mermaid-cli:1.0.0",
      "inputs": ["text/plain"],
      "outputs": [
        "image/svg+xml;profile=mermaid",
        "image/png;profile=mermaid;dpi=96",
        "image/png;profile=mermaid;dpi=192"
      ]
    },
    {
      "id": "image:resize",
      "tool_image": "ghcr.io/portable-content/libvips:1.0.0", 
      "inputs": ["image/jpeg", "image/png"],
      "outputs": [
        "image/webp;width=800",
        "image/webp;width=1200", 
        "image/avif;width=800",
        "image/avif;width=1200"
      ]
    }
  ]
}
```

## Testing Strategy

### Unit Tests
- Payload validation for each block type
- Variant selection algorithms
- Transform tool contracts

### Integration Tests  
- End-to-end content creation and retrieval
- Transform pipeline execution
- Client rendering with different capabilities

### Visual Regression Tests
- Mermaid diagram rendering consistency
- Image format conversion quality
- Markdown HTML output formatting
