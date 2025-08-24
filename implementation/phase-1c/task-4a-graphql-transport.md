# Task 4A: GraphQL Transport Implementation

## Overview
Implement GraphQL as a specific transport adapter using the transport-agnostic interface defined in Task 3A. This includes GraphQL schema code generation, operation definitions, and adapters for popular GraphQL clients.

## Estimated Time
3-4 hours

## Dependencies
- Task 3A (Transport Interface) must be completed
- GraphQL API from Phase 1B running and accessible
- GraphQL schema available

## Acceptance Criteria

### GraphQL Implementation
- [ ] GraphQL transport adapter implementing the Transport interface
- [ ] Generated TypeScript types from GraphQL schema
- [ ] GraphQL operation definitions (queries, mutations, subscriptions)
- [ ] Support for multiple GraphQL clients (Apollo, urql, graphql-request)
- [ ] Proper error handling for GraphQL-specific errors

### API Operations
- [ ] All CRUD operations implemented via GraphQL
- [ ] Capability-based variant selection in GraphQL queries
- [ ] Batch operations and query optimization
- [ ] Proper fragment usage for reusable query parts

### Real-Time Features
- [ ] GraphQL subscriptions for real-time updates (see sync/graphql-sync-transport.md)

### Client Integration
- [ ] Adapters for popular GraphQL clients
- [ ] Connection management and error recovery
- [ ] Caching integration where applicable
- [ ] Performance optimizations

## Implementation Steps

### 1. Set up GraphQL Code Generation

Install dependencies:
```bash
npm install -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations
```

Create `codegen.yml`:
```yaml
overwrite: true
schema: "http://localhost:4000/graphql"
documents: "src/graphql/**/*.graphql"
generates:
  src/generated/graphql.ts:
    plugins:
      - "typescript"
      - "typescript-operations"
    config:
      scalars:
        DateTime: string
        JSON: any
        URI: string
      namingConvention:
        typeNames: pascal-case#pascalCase
        enumValues: upper-case#upperCase
      skipTypename: false
      withHooks: false
      withComponent: false
      withHOC: false
```

### 2. Define GraphQL Operations

Create `src/graphql/fragments.graphql`:
```graphql
fragment VariantFields on Variant {
  mediaType
  uri
  width
  height
  bytes
  contentHash
  generatedBy
  toolVersion
  createdAt
}

fragment BlockFields on Block {
  id
  kind
  variants {
    ...VariantFields
  }
}

fragment ContentFields on ContentItem {
  id
  type
  title
  summary
  createdAt
  updatedAt
  createdBy
  representations
}
```

Create `src/graphql/queries.graphql`:
```graphql
#import "./fragments.graphql"

query GetContent($id: ID!, $capabilities: CapabilitiesInput!) {
  content(id: $id, capabilities: $capabilities) {
    ...ContentFields
    blocks {
      ...BlockFields
      ... on MarkdownBlock {
        source
      }
      ... on MermaidBlock {
        source
        theme
      }
      ... on ImageBlock {
        alt
        originalWidth
        originalHeight
      }
    }
  }
}

query SearchContent(
  $query: String!
  $types: [String!]
  $kinds: [String!]
  $limit: Int
  $offset: Int
  $capabilities: CapabilitiesInput!
) {
  searchContent(
    query: $query
    types: $types
    kinds: $kinds
    limit: $limit
    offset: $offset
    capabilities: $capabilities
  ) {
    total
    hasMore
    items {
      ...ContentFields
      blocks {
        ...BlockFields
      }
    }
  }
}

query GetContentBatch($ids: [ID!]!, $capabilities: CapabilitiesInput!) {
  contentBatch(ids: $ids, capabilities: $capabilities) {
    ...ContentFields
    blocks {
      ...BlockFields
    }
  }
}
```

Create `src/graphql/mutations.graphql`:
```graphql
#import "./fragments.graphql"

mutation CreateContent($input: CreateContentInput!) {
  createContent(input: $input) {
    content {
      ...ContentFields
      blocks {
        ...BlockFields
      }
    }
    errors
  }
}

mutation UpdateContent($id: ID!, $input: UpdateContentInput!) {
  updateContent(id: $id, input: $input) {
    content {
      ...ContentFields
      blocks {
        ...BlockFields
      }
    }
    errors
  }
}

mutation DeleteContent($id: ID!) {
  deleteContent(id: $id) {
    success
    errors
  }
}

mutation RefreshVariants($id: ID!, $blockIds: [ID!]) {
  refreshVariants(id: $id, blockIds: $blockIds) {
    jobIds
    errors
  }
}
```

Create `src/graphql/subscriptions.graphql`:
```graphql
#import "./fragments.graphql"

subscription ContentUpdated($id: ID!) {
  contentUpdated(id: $id) {
    ...ContentFields
    blocks {
      ...BlockFields
    }
  }
}

subscription SearchUpdated(
  $query: String!
  $types: [String!]
  $kinds: [String!]
  $capabilities: CapabilitiesInput!
) {
  searchUpdated(
    query: $query
    types: $types
    kinds: $kinds
    capabilities: $capabilities
  ) {
    total
    hasMore
    items {
      ...ContentFields
      blocks {
        ...BlockFields
      }
    }
  }
}
```

### 3. Create GraphQL Transport Implementation

Create `src/client/transports/graphql-transport.ts`:

```typescript
import type { Transport, TransportOperation } from '../transport';
import type { RequestConfig } from '../interfaces';
import { TransportError } from '../errors';

/**
 * GraphQL-specific transport client interface
 */
export interface GraphQLTransportClient {
  query<TData = any, TVariables = any>(
    query: string,
    variables?: TVariables,
    config?: RequestConfig
  ): Promise<{ data: TData; errors?: any[] }>;

  mutate<TData = any, TVariables = any>(
    mutation: string,
    variables?: TVariables,
    config?: RequestConfig
  ): Promise<{ data: TData; errors?: any[] }>;

  subscribe?<TData = any, TVariables = any>(
    subscription: string,
    variables?: TVariables,
    callback?: (data: TData) => void
  ): () => void;

  isConnected(): boolean;
  close?(): void;
}

/**
 * GraphQL transport implementation
 */
export class GraphQLTransport implements Transport {
  constructor(private client: GraphQLTransportClient) {}

  async request<TData, TVariables>(
    operation: TransportOperation,
    variables?: TVariables,
    config?: RequestConfig
  ): Promise<TData> {
    if (!operation.document) {
      throw new TransportError('GraphQL document is required', 'graphql');
    }

    try {
      let result: { data: TData; errors?: any[] };

      switch (operation.type) {
        case 'query':
          result = await this.client.query<TData, TVariables>(
            operation.document,
            variables,
            config
          );
          break;

        case 'mutation':
          result = await this.client.mutate<TData, TVariables>(
            operation.document,
            variables,
            config
          );
          break;

        default:
          throw new TransportError(
            `Unsupported operation type: ${operation.type}`,
            'graphql'
          );
      }

      if (result.errors && result.errors.length > 0) {
        throw new TransportError(
          `GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`,
          'graphql',
          'GRAPHQL_ERROR'
        );
      }

      return result.data;
    } catch (error) {
      if (error instanceof TransportError) {
        throw error;
      }
      throw new TransportError(
        `GraphQL request failed: ${error.message}`,
        'graphql'
      );
    }
  }

  subscribe<TData>(
    operation: TransportOperation,
    variables?: any,
    callback?: (data: TData) => void
  ): () => void {
    if (!this.client.subscribe) {
      throw new TransportError('GraphQL subscriptions not supported', 'graphql');
    }

    if (!operation.document) {
      throw new TransportError('GraphQL subscription document is required', 'graphql');
    }

    return this.client.subscribe<TData>(operation.document, variables, callback);
  }

  isReady(): boolean {
    return this.client.isConnected();
  }

  close(): void {
    if (this.client.close) {
      this.client.close();
    }
  }
}
```

### 4. Create GraphQL Client Adapters

Create `src/client/adapters/apollo-graphql-adapter.ts`:

```typescript
import { ApolloClient, gql, type DocumentNode } from '@apollo/client';
import type { GraphQLTransportClient } from '../transports/graphql-transport';
import type { RequestConfig } from '../interfaces';

/**
 * Apollo Client adapter for GraphQL transport
 */
export class ApolloGraphQLAdapter implements GraphQLTransportClient {
  constructor(private apolloClient: ApolloClient<any>) {}

  async query<TData, TVariables>(
    query: string,
    variables?: TVariables,
    config?: RequestConfig
  ): Promise<{ data: TData; errors?: any[] }> {
    const result = await this.apolloClient.query({
      query: gql(query),
      variables,
      context: {
        headers: config?.headers
      },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });

    return {
      data: result.data,
      errors: result.errors
    };
  }

  async mutate<TData, TVariables>(
    mutation: string,
    variables?: TVariables,
    config?: RequestConfig
  ): Promise<{ data: TData; errors?: any[] }> {
    const result = await this.apolloClient.mutate({
      mutation: gql(mutation),
      variables,
      context: {
        headers: config?.headers
      },
      errorPolicy: 'all'
    });

    return {
      data: result.data,
      errors: result.errors
    };
  }

  subscribe<TData, TVariables>(
    subscription: string,
    variables?: TVariables,
    callback?: (data: TData) => void
  ): () => void {
    const observable = this.apolloClient.subscribe({
      query: gql(subscription),
      variables
    });

    const subscription_obj = observable.subscribe({
      next: (result) => {
        if (callback && result.data) {
          callback(result.data);
        }
      },
      error: (error) => {
        console.error('GraphQL subscription error:', error);
      }
    });

    return () => subscription_obj.unsubscribe();
  }

  isConnected(): boolean {
    // Apollo Client doesn't have a direct connection status
    // We assume it's connected if the client exists
    return !!this.apolloClient;
  }

  close(): void {
    this.apolloClient.stop();
  }
}
```

Create `src/client/adapters/urql-graphql-adapter.ts`:

```typescript
import { Client, type OperationResult } from 'urql';
import type { GraphQLTransportClient } from '../transports/graphql-transport';
import type { RequestConfig } from '../interfaces';

/**
 * urql Client adapter for GraphQL transport
 */
export class UrqlGraphQLAdapter implements GraphQLTransportClient {
  constructor(private urqlClient: Client) {}

  async query<TData, TVariables>(
    query: string,
    variables?: TVariables,
    config?: RequestConfig
  ): Promise<{ data: TData; errors?: any[] }> {
    const result = await this.urqlClient.query(query, variables, {
      fetchOptions: {
        headers: config?.headers
      }
    }).toPromise();

    return {
      data: result.data,
      errors: result.error ? [result.error] : undefined
    };
  }

  async mutate<TData, TVariables>(
    mutation: string,
    variables?: TVariables,
    config?: RequestConfig
  ): Promise<{ data: TData; errors?: any[] }> {
    const result = await this.urqlClient.mutation(mutation, variables, {
      fetchOptions: {
        headers: config?.headers
      }
    }).toPromise();

    return {
      data: result.data,
      errors: result.error ? [result.error] : undefined
    };
  }

  subscribe<TData, TVariables>(
    subscription: string,
    variables?: TVariables,
    callback?: (data: TData) => void
  ): () => void {
    const { unsubscribe } = this.urqlClient.subscription(subscription, variables).subscribe({
      next: (result: OperationResult<TData>) => {
        if (callback && result.data) {
          callback(result.data);
        }
      },
      error: (error) => {
        console.error('GraphQL subscription error:', error);
      }
    });

    return unsubscribe;
  }

  isConnected(): boolean {
    // urql doesn't have a direct connection status
    return !!this.urqlClient;
  }
}
```

### 5. Create GraphQL API Client Implementation

Create `src/client/graphql-api-client.ts`:

```typescript
import { BaseAPIClient } from './base-api-client';
import type { TransportOperation } from './transport';
import type { ContentItem, Capabilities, SearchOptions, SearchResult } from '../types';
import type { CreateContentInput, UpdateContentInput } from './interfaces';
import {
  GET_CONTENT,
  SEARCH_CONTENT,
  CREATE_CONTENT,
  UPDATE_CONTENT,
  DELETE_CONTENT,
  REFRESH_VARIANTS,
  CONTENT_UPDATED,
  SEARCH_UPDATED
} from '../graphql/operations';

/**
 * GraphQL-specific API client implementation
 */
export class GraphQLAPIClient extends BaseAPIClient {
  async getContent(id: string, capabilities: Capabilities): Promise<ContentItem | null> {
    const operation: TransportOperation = {
      type: 'query',
      name: 'GetContent',
      document: GET_CONTENT
    };

    const variables = {
      id,
      capabilities: this.mapCapabilities(capabilities)
    };

    const result = await this.executeOperation(operation, variables);
    return result.content || null;
  }

  async searchContent(
    query: string,
    options: SearchOptions,
    capabilities: Capabilities
  ): Promise<SearchResult> {
    const operation: TransportOperation = {
      type: 'query',
      name: 'SearchContent',
      document: SEARCH_CONTENT
    };

    const variables = {
      query,
      types: options.types,
      kinds: options.kinds,
      limit: options.limit || 20,
      offset: options.offset || 0,
      capabilities: this.mapCapabilities(capabilities)
    };

    const result = await this.executeOperation(operation, variables);
    return {
      items: result.searchContent.items,
      total: result.searchContent.total,
      hasMore: result.searchContent.hasMore
    };
  }

  async createContent(input: CreateContentInput): Promise<ContentItem> {
    const operation: TransportOperation = {
      type: 'mutation',
      name: 'CreateContent',
      document: CREATE_CONTENT
    };

    const result = await this.executeOperation(operation, { input });

    if (result.createContent.errors?.length) {
      throw new Error(`Failed to create content: ${result.createContent.errors.join(', ')}`);
    }

    return result.createContent.content;
  }

  async updateContent(id: string, input: UpdateContentInput): Promise<ContentItem> {
    const operation: TransportOperation = {
      type: 'mutation',
      name: 'UpdateContent',
      document: UPDATE_CONTENT
    };

    const result = await this.executeOperation(operation, { id, input });

    if (result.updateContent.errors?.length) {
      throw new Error(`Failed to update content: ${result.updateContent.errors.join(', ')}`);
    }

    return result.updateContent.content;
  }

  async deleteContent(id: string): Promise<boolean> {
    const operation: TransportOperation = {
      type: 'mutation',
      name: 'DeleteContent',
      document: DELETE_CONTENT
    };

    const result = await this.executeOperation(operation, { id });

    if (result.deleteContent.errors?.length) {
      throw new Error(`Failed to delete content: ${result.deleteContent.errors.join(', ')}`);
    }

    return result.deleteContent.success;
  }

  async refreshVariants(id: string, blockIds?: string[]): Promise<string[]> {
    const operation: TransportOperation = {
      type: 'mutation',
      name: 'RefreshVariants',
      document: REFRESH_VARIANTS
    };

    const result = await this.executeOperation(operation, { id, blockIds });

    if (result.refreshVariants.errors?.length) {
      throw new Error(`Failed to refresh variants: ${result.refreshVariants.errors.join(', ')}`);
    }

    return result.refreshVariants.jobIds;
  }

  subscribeToContent(id: string, callback: (content: ContentItem) => void): () => void {
    if (!this.transport.subscribe) {
      throw new Error('GraphQL subscriptions not supported');
    }

    const operation: TransportOperation = {
      type: 'subscription',
      name: 'ContentUpdated',
      document: CONTENT_UPDATED
    };

    return this.transport.subscribe(operation, { id }, (data: any) => {
      callback(data.contentUpdated);
    });
  }

  subscribeToSearch(
    query: string,
    options: SearchOptions,
    callback: (results: SearchResult) => void
  ): () => void {
    if (!this.transport.subscribe) {
      throw new Error('GraphQL subscriptions not supported');
    }

    const operation: TransportOperation = {
      type: 'subscription',
      name: 'SearchUpdated',
      document: SEARCH_UPDATED
    };

    const variables = {
      query,
      types: options.types,
      kinds: options.kinds,
      capabilities: this.mapCapabilities(this.defaultCapabilities)
    };

    return this.transport.subscribe(operation, variables, (data: any) => {
      callback({
        items: data.searchUpdated.items,
        total: data.searchUpdated.total,
        hasMore: data.searchUpdated.hasMore
      });
    });
  }
}
```

## Validation Steps

1. **Code Generation**: Run `npm run codegen` and verify types are generated correctly
2. **GraphQL Operations**: Test all queries and mutations
3. **Client Adapters**: Test with Apollo Client and urql
4. **Error Handling**: Test GraphQL-specific error scenarios
5. **Performance**: Verify query optimization and caching
6. **Real-Time Features**: Test subscriptions (see sync/graphql-sync-transport.md)

## Testing

Create comprehensive tests for GraphQL implementation:

```typescript
// src/client/__tests__/graphql-api-client.test.ts
import { GraphQLAPIClient } from '../graphql-api-client';
import { GraphQLTransport } from '../transports/graphql-transport';

const mockGraphQLClient = {
  query: jest.fn(),
  mutate: jest.fn(),
  subscribe: jest.fn(),
  isConnected: () => true
};

describe('GraphQLAPIClient', () => {
  let client: GraphQLAPIClient;
  let transport: GraphQLTransport;

  beforeEach(() => {
    transport = new GraphQLTransport(mockGraphQLClient);
    client = new GraphQLAPIClient(transport);
  });

  test('should fetch content via GraphQL', async () => {
    mockGraphQLClient.query.mockResolvedValue({
      data: {
        content: {
          id: 'test-id',
          title: 'Test Content',
          blocks: []
        }
      }
    });

    const content = await client.getContent('test-id', {});
    expect(content?.id).toBe('test-id');
    expect(mockGraphQLClient.query).toHaveBeenCalledWith(
      expect.stringContaining('query GetContent'),
      expect.objectContaining({ id: 'test-id' }),
      undefined
    );
  });

  test('should handle GraphQL errors', async () => {
    mockGraphQLClient.query.mockResolvedValue({
      data: null,
      errors: [{ message: 'Content not found' }]
    });

    await expect(client.getContent('invalid-id', {})).rejects.toThrow();
  });

  test('should support subscriptions', () => {
    const callback = jest.fn();
    const unsubscribe = jest.fn();
    mockGraphQLClient.subscribe.mockReturnValue(unsubscribe);

    const result = client.subscribeToContent('test-id', callback);
    
    expect(mockGraphQLClient.subscribe).toHaveBeenCalled();
    expect(result).toBe(unsubscribe);
  });
});
```

## Next Steps

After completing this task:
1. Verify GraphQL operations work with real API
2. Test with different GraphQL clients
3. Performance test query optimization
4. Begin Task 5A: Framework-Agnostic Rendering Base

## Resources

- [GraphQL Code Generator](https://the-guild.dev/graphql/codegen)
- [Apollo Client](https://www.apollographql.com/docs/react/)
- [urql](https://formidable.com/open-source/urql/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)

## Related Sync Documentation

For GraphQL-based real-time synchronization:
- [Sync Architecture Overview](./sync/README.md)
- [GraphQL Sync Transport](./sync/graphql-sync-transport.md)
- [Transport Sync Interfaces](./sync/transport-sync-interfaces.md)
