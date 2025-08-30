# @portable-content/core

Framework-agnostic content resolution and handling for the Portable Content System.

## Overview

This package provides the core functionality for handling portable content blocks, independent of any UI framework. It can be used with React, Vue, Angular, or any other framework.

## Key Features

- Framework-agnostic content resolution
- Extensible loading strategies
- Type-safe interfaces
- Error handling
- Future support for caching and network strategies

## Installation

```bash
npm install @portable-content/core
```

## Usage

### Basic Content Resolution

```typescript
import { contentResolver, Block } from '@portable-content/core';

const block: Block = {
  id: 'block1',
  kind: 'markdown',
  content: {
    primary: {
      type: 'inline',
      mediaType: 'text/markdown',
      source: '# Hello World'
    }
  }
};

// Resolve content
const content = await contentResolver.resolveContent(block.content);
// Use the normalized content in your framework of choice
```

### Custom Loading Strategy

```typescript
import { LoadingStrategy, DefaultContentResolver } from '@portable-content/core';

class CustomLoadingStrategy implements LoadingStrategy {
  async resolve(content) {
    // Your custom loading logic
  }
}

const resolver = new DefaultContentResolver(new CustomLoadingStrategy());
```

### Error Handling

```typescript
import { ContentResolutionError, ContentResolutionErrorType } from '@portable-content/core';

try {
  const content = await contentResolver.resolveContent(block.content);
} catch (error) {
  if (error instanceof ContentResolutionError) {
    switch (error.type) {
      case ContentResolutionErrorType.NETWORK_ERROR:
        // Handle network errors
        break;
      case ContentResolutionErrorType.INVALID_CONTENT:
        // Handle invalid content
        break;
    }
  }
}
```

## Architecture

The core package is designed to be framework-agnostic:

- No UI framework dependencies
- Pure TypeScript/JavaScript implementation
- Extensible interfaces for custom implementations
- Clear separation of concerns

### Key Components

1. **ContentResolver**
   - Central coordinator for content resolution
   - Strategy pattern for different loading behaviors
   - Framework-agnostic implementation

2. **LoadingStrategy**
   - Interface for custom loading behaviors
   - Supports both eager and lazy loading
   - Extensible for different use cases

3. **Error Handling**
   - Typed error system
   - Detailed error information
   - Framework-agnostic error types

## Future Enhancements

1. **Caching Layer**
   - Pluggable cache strategies
   - Memory and persistent caching
   - Cache invalidation policies

2. **Network Layer**
   - Custom network strategies
   - Request cancellation
   - Retry policies

3. **Content Validation**
   - Schema validation
   - Content type verification
   - Custom validation rules

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT