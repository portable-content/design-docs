# Task 3A: Transport-Agnostic API Interface

## Overview
Define the core transport-agnostic API interface and base implementations that can work with any communication protocol (GraphQL, REST, WebSocket, gRPC, etc.) while providing type-safe operations and error handling.

## Estimated Time
2-3 hours

## Dependencies
- Task 2A (Data Models) must be completed
- Understanding of different transport protocols

## Acceptance Criteria

### Transport Agnostic Design
- [ ] Abstract API client interface defined
- [ ] Transport-agnostic operation definitions
- [ ] Generic error handling abstractions
- [ ] Request/response transformation utilities
- [ ] No dependency on any specific transport protocol

### Interface Design
- [ ] Clean separation between business logic and transport
- [ ] Support for synchronous and asynchronous operations
- [ ] Optional real-time subscription interface
- [ ] Extensible for future transport protocols
- [ ] Type-safe request/response handling

### Foundation for Implementations
- [ ] Base classes for transport adapters
- [ ] Common utilities for all transports
- [ ] Error handling patterns
- [ ] Configuration interfaces

## Implementation Steps

### 1. Define Core Transport Interfaces

Create `src/client/interfaces.ts`:

```typescript
import type { ContentItem, Capabilities, SearchOptions, SearchResult } from '../types';

/**
 * Main API client interface that any transport can implement
 */
export interface APIClient {
  /**
   * Get content by ID with capability negotiation
   */
  getContent(id: string, capabilities: Capabilities): Promise<ContentItem | null>;
  
  /**
   * Search content with filtering and capabilities
   */
  searchContent(
    query: string, 
    options: SearchOptions, 
    capabilities: Capabilities
  ): Promise<SearchResult>;
  
  /**
   * Create new content
   */
  createContent(input: CreateContentInput): Promise<ContentItem>;
  
  /**
   * Update existing content
   */
  updateContent(id: string, input: UpdateContentInput): Promise<ContentItem>;
  
  /**
   * Delete content by ID
   */
  deleteContent(id: string): Promise<boolean>;
  
  /**
   * Refresh variants for content blocks
   */
  refreshVariants(id: string, blockIds?: string[]): Promise<string[]>;
  
  /**
   * Subscribe to content changes (optional, for real-time transports)
   */
  subscribeToContent?(id: string, callback: (content: ContentItem) => void): () => void;
  
  /**
   * Subscribe to search result changes (optional, for real-time transports)
   */
  subscribeToSearch?(
    query: string, 
    options: SearchOptions,
    callback: (results: SearchResult) => void
  ): () => void;
}

/**
 * Input types for API operations
 */
export interface CreateContentInput {
  type: string;
  title?: string;
  summary?: string;
  blocks: Array<{
    kind: string;
    payload: any;
  }>;
  representations?: Record<string, any>;
}

export interface UpdateContentInput {
  title?: string;
  summary?: string;
  blocks?: Array<{
    id?: string;
    kind: string;
    payload: any;
  }>;
  representations?: Record<string, any>;
}

/**
 * Generic API response structure
 */
export interface APIResponse<TData = any> {
  data?: TData;
  errors?: APIError[];
  meta?: {
    total?: number;
    hasMore?: boolean;
    requestId?: string;
    timestamp?: string;
    [key: string]: any;
  };
}

/**
 * Generic API error structure
 */
export interface APIError {
  message: string;
  code?: string;
  path?: string[];
  extensions?: Record<string, any>;
}

/**
 * Request configuration
 */
export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
  metadata?: Record<string, any>;
}

/**
 * Client configuration
 */
export interface ClientConfig {
  endpoint: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  protocol?: 'graphql' | 'rest' | 'websocket' | 'grpc';
  options?: Record<string, any>;
}
```

### 2. Define Transport Layer Interface

Create `src/client/transport.ts`:

```typescript
/**
 * Low-level transport interface for protocol-specific implementations
 */
export interface Transport {
  /**
   * Execute a request using the transport protocol
   */
  request<TData = any, TVariables = any>(
    operation: TransportOperation,
    variables?: TVariables,
    config?: RequestConfig
  ): Promise<TData>;
  
  /**
   * Subscribe to real-time updates (optional)
   */
  subscribe?<TData = any>(
    operation: TransportOperation,
    variables?: any,
    callback?: (data: TData) => void
  ): () => void;
  
  /**
   * Check if transport is connected/ready
   */
  isReady(): boolean;
  
  /**
   * Close/cleanup transport resources
   */
  close?(): void;
}

/**
 * Transport operation definition
 */
export interface TransportOperation {
  type: 'query' | 'mutation' | 'subscription' | 'get' | 'post' | 'put' | 'delete' | 'patch';
  name: string;
  endpoint?: string;
  document?: string; // GraphQL document
  method?: string; // HTTP method
  path?: string; // REST path
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
}

/**
 * Transport factory interface
 */
export interface TransportFactory {
  create(config: ClientConfig): Transport;
  supports(protocol: string): boolean;
}
```

### 3. Create Base API Client Implementation

Create `src/client/base-api-client.ts`:

```typescript
import type { APIClient, APIResponse, APIError, RequestConfig } from './interfaces';
import type { Transport, TransportOperation } from './transport';
import type { ContentItem, Capabilities } from '../types';
import { DEFAULT_CAPABILITIES } from '../types';

/**
 * Base implementation of APIClient that handles common functionality
 */
export abstract class BaseAPIClient implements APIClient {
  protected defaultCapabilities: Capabilities;

  constructor(
    protected transport: Transport,
    defaultCapabilities?: Capabilities
  ) {
    this.defaultCapabilities = defaultCapabilities || DEFAULT_CAPABILITIES.mobile;
  }

  abstract getContent(id: string, capabilities: Capabilities): Promise<ContentItem | null>;
  abstract searchContent(query: string, options: any, capabilities: Capabilities): Promise<any>;
  abstract createContent(input: any): Promise<ContentItem>;
  abstract updateContent(id: string, input: any): Promise<ContentItem>;
  abstract deleteContent(id: string): Promise<boolean>;
  abstract refreshVariants(id: string, blockIds?: string[]): Promise<string[]>;

  /**
   * Execute a transport operation with error handling
   */
  protected async executeOperation<TData>(
    operation: TransportOperation,
    variables?: any,
    config?: RequestConfig
  ): Promise<TData> {
    try {
      if (!this.transport.isReady()) {
        throw new Error('Transport is not ready');
      }

      const result = await this.transport.request<TData>(operation, variables, config);
      return result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle and normalize errors from different transports
   */
  protected handleError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    if (error.message) {
      return new Error(error.message);
    }

    return new Error('Unknown transport error');
  }

  /**
   * Map capabilities to transport-specific format
   */
  protected mapCapabilities(capabilities: Capabilities): any {
    return {
      accept: capabilities.accept,
      hints: capabilities.hints
    };
  }

  /**
   * Check if real-time subscriptions are supported
   */
  get supportsRealTime(): boolean {
    return typeof this.transport.subscribe === 'function';
  }

  /**
   * Subscribe to content changes (if supported)
   */
  subscribeToContent?(id: string, callback: (content: ContentItem) => void): () => void {
    if (!this.transport.subscribe) {
      throw new Error('Real-time subscriptions not supported by this transport');
    }

    const operation: TransportOperation = {
      type: 'subscription',
      name: 'contentUpdated',
      metadata: { contentId: id }
    };

    return this.transport.subscribe(operation, { id }, callback);
  }

  /**
   * Close transport connection
   */
  close(): void {
    if (this.transport.close) {
      this.transport.close();
    }
  }
}
```

### 4. Create Error Handling Utilities

Create `src/client/errors.ts`:

```typescript
/**
 * Base API error class
 */
export class APIClientError extends Error {
  constructor(
    message: string,
    public code?: string,
    public path?: string[],
    public extensions?: Record<string, any>
  ) {
    super(message);
    this.name = 'APIClientError';
  }
}

/**
 * Transport-specific error
 */
export class TransportError extends APIClientError {
  constructor(
    message: string,
    public transport: string,
    code?: string
  ) {
    super(message, code);
    this.name = 'TransportError';
  }
}

/**
 * Network-related error
 */
export class NetworkError extends TransportError {
  constructor(message: string, transport: string) {
    super(message, transport, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends TransportError {
  constructor(transport: string, timeout: number) {
    super(`Request timed out after ${timeout}ms`, transport, 'TIMEOUT');
    this.name = 'TimeoutError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends APIClientError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends APIClientError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHZ_ERROR');
    this.name = 'AuthorizationError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends APIClientError {
  constructor(
    message: string,
    public validationErrors: Array<{ field: string; message: string }>
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

/**
 * Error factory for creating appropriate error types
 */
export class ErrorFactory {
  static fromTransportError(error: any, transport: string): Error {
    if (error.code === 'NETWORK_ERROR' || error.name === 'NetworkError') {
      return new NetworkError(error.message, transport);
    }

    if (error.code === 'TIMEOUT' || error.name === 'TimeoutError') {
      return new TimeoutError(transport, error.timeout || 30000);
    }

    if (error.code === 'AUTH_ERROR' || error.status === 401) {
      return new AuthenticationError(error.message);
    }

    if (error.code === 'AUTHZ_ERROR' || error.status === 403) {
      return new AuthorizationError(error.message);
    }

    if (error.code === 'VALIDATION_ERROR' || error.status === 400) {
      return new ValidationError(error.message, error.validationErrors || []);
    }

    return new TransportError(error.message || 'Unknown transport error', transport, error.code);
  }
}
```

### 5. Create Main Client Class

Create `src/client/portable-content-client.ts`:

```typescript
import type { APIClient } from './interfaces';
import type { ContentItem, Capabilities, SearchOptions, SearchResult } from '../types';
import { DEFAULT_CAPABILITIES } from '../types';

/**
 * Main client class for Portable Content API - completely transport agnostic
 */
export class PortableContentClient {
  constructor(
    private apiClient: APIClient,
    private defaultCapabilities: Capabilities = DEFAULT_CAPABILITIES.mobile
  ) {}

  /**
   * Get content by ID with capability negotiation
   */
  async getContent(
    id: string,
    capabilities?: Capabilities
  ): Promise<ContentItem | null> {
    const caps = capabilities || this.defaultCapabilities;
    return await this.apiClient.getContent(id, caps);
  }

  /**
   * Search content with filtering and capabilities
   */
  async searchContent(
    query: string,
    options: SearchOptions = {},
    capabilities?: Capabilities
  ): Promise<SearchResult> {
    const caps = capabilities || this.defaultCapabilities;
    return await this.apiClient.searchContent(query, options, caps);
  }

  /**
   * Create new content
   */
  async createContent(input: CreateContentInput): Promise<ContentItem> {
    return await this.apiClient.createContent(input);
  }

  /**
   * Update existing content
   */
  async updateContent(id: string, input: UpdateContentInput): Promise<ContentItem> {
    return await this.apiClient.updateContent(id, input);
  }

  /**
   * Delete content by ID
   */
  async deleteContent(id: string): Promise<boolean> {
    return await this.apiClient.deleteContent(id);
  }

  /**
   * Refresh variants for content blocks
   */
  async refreshVariants(id: string, blockIds?: string[]): Promise<string[]> {
    return await this.apiClient.refreshVariants(id, blockIds);
  }

  /**
   * Subscribe to content changes (if supported by transport)
   */
  subscribeToContent(id: string, callback: (content: ContentItem) => void): () => void {
    if (!this.apiClient.subscribeToContent) {
      throw new Error('Real-time subscriptions not supported by this transport');
    }
    
    return this.apiClient.subscribeToContent(id, callback);
  }

  /**
   * Subscribe to search result changes (if supported by transport)
   */
  subscribeToSearch(
    query: string,
    options: SearchOptions,
    callback: (results: SearchResult) => void
  ): () => void {
    if (!this.apiClient.subscribeToSearch) {
      throw new Error('Real-time search subscriptions not supported by this transport');
    }
    
    return this.apiClient.subscribeToSearch(query, options, callback);
  }

  /**
   * Check if real-time subscriptions are supported
   */
  get supportsRealTime(): boolean {
    return typeof this.apiClient.subscribeToContent === 'function';
  }

  /**
   * Check if real-time search is supported
   */
  get supportsRealTimeSearch(): boolean {
    return typeof this.apiClient.subscribeToSearch === 'function';
  }
}
```

## Validation Steps

1. **Interface Design**: Verify interfaces are clean and transport-agnostic
2. **Type Safety**: Ensure all operations are properly typed
3. **Error Handling**: Test error handling patterns work across transports
4. **Extensibility**: Verify new transports can be easily added
5. **Base Implementation**: Test base classes provide useful functionality
6. **Documentation**: Ensure interfaces are well-documented

## Testing

Create comprehensive tests for the transport interface:

```typescript
// src/client/__tests__/interfaces.test.ts
import { BaseAPIClient } from '../base-api-client';
import type { Transport, TransportOperation } from '../transport';

class MockTransport implements Transport {
  constructor(private responses: Record<string, any>) {}

  async request<TData>(operation: TransportOperation): Promise<TData> {
    return this.responses[operation.name] || {};
  }

  isReady(): boolean {
    return true;
  }
}

class TestAPIClient extends BaseAPIClient {
  async getContent(id: string): Promise<any> {
    return await this.executeOperation({
      type: 'query',
      name: 'getContent'
    }, { id });
  }

  // Implement other abstract methods...
}

describe('Transport Interface', () => {
  test('should execute operations through transport', async () => {
    const mockTransport = new MockTransport({
      getContent: { id: 'test', title: 'Test Content' }
    });
    
    const client = new TestAPIClient(mockTransport);
    const result = await client.getContent('test');
    
    expect(result.title).toBe('Test Content');
  });

  test('should handle transport errors', async () => {
    const mockTransport = new MockTransport({});
    mockTransport.request = jest.fn().mockRejectedValue(new Error('Transport error'));
    
    const client = new TestAPIClient(mockTransport);
    
    await expect(client.getContent('test')).rejects.toThrow('Transport error');
  });
});
```

## Next Steps

After completing this task:
1. Verify all interfaces compile and are well-typed
2. Test base implementations work correctly
3. Begin Task 4A: GraphQL Transport Implementation

## Resources

- [TypeScript Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html)
- [Abstract Classes](https://www.typescriptlang.org/docs/handbook/classes.html#abstract-classes)
- [Error Handling Patterns](https://blog.logrocket.com/error-handling-typescript/)
- [API Design Best Practices](https://docs.microsoft.com/en-us/azure/architecture/best-practices/api-design)
