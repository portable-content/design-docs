# Phase 1C Implementation Tasks - Client-Side TypeScript SDK & React Native Components

## Overview
Implement a comprehensive client-side TypeScript SDK and React Native component library for the Portable Content System using **separate repositories** for clean separation of concerns. This phase creates reusable, framework-agnostic core functionality with a complete React Native implementation.

## Repository Structure

This implementation uses **separate repositories**:

- **`portable-content-sdk`** - Core TypeScript SDK (framework-agnostic)
- **`portable-content-react-native`** - React Native components + example app
- **Future repositories** - `portable-content-vue`, `portable-content-react-web`, etc.

## Task Dependencies

### Phase 1C-A: Core SDK Repository (`portable-content-sdk`)
```
1A. SDK Project Setup & Foundation
   ↓
2A. TypeScript Data Models & Interfaces
   ↓
3A. Transport-Agnostic API Interface
   ↓
4A. GraphQL Transport Implementation
   ↓
5A. Framework-Agnostic Rendering Base
```

### Phase 1C-B: React Native Repository (`portable-content-react-native`)
```
5. React Native Implementation
   (Setup + Components + Example App)
```

---

## Task 1A: SDK Project Setup & Foundation
**Estimated Time:** 1-2 hours
**Dependencies:** Phase 1B (GraphQL API)

### Acceptance Criteria:
- [ ] Core SDK repository (`portable-content-sdk`) established
- [ ] TypeScript project structure configured
- [ ] Testing infrastructure with Jest configured
- [ ] Build system with TypeScript and bundling
- [ ] ESLint and Prettier configured
- [ ] Package.json with proper dependencies (client-agnostic)
- [ ] Basic CI/CD workflow configured

### Implementation Steps:
1. Create SDK repository structure:
   ```
   portable-content-sdk/
   ├── src/
   │   ├── types/              # Data models and interfaces
   │   ├── client/             # Client-agnostic GraphQL integration
   │   ├── rendering/          # Framework-agnostic rendering base
   │   ├── validation/         # Runtime validation
   │   └── utils/              # Utility functions
   ├── tests/                  # Test files
   ├── docs/                   # Documentation
   ├── package.json
   ├── tsconfig.json
   └── README.md
   ```

2. Configure build tools:
   - TypeScript with strict mode
   - Rollup/Vite for SDK bundling
   - Metro for React Native
   - Jest for testing

3. Set up package dependencies (client-agnostic):
   ```json
   {
     "dependencies": {
       "zod": "^3.22.0"
     },
     "devDependencies": {
       "typescript": "^5.2.0",
       "@types/node": "^20.0.0"
     },
     "peerDependencies": {
       "graphql": "^16.0.0"
     }
   }
   ```

### Validation:
- `npm install` runs without errors across all packages
- `npm run build` successfully builds SDK
- `npm test` runs test suite
- TypeScript compilation works without errors
- Linting passes on all code

---

## Task 2A: TypeScript Data Models & Interfaces
**Estimated Time:** 2-3 hours
**Dependencies:** Task 1A (SDK Project Setup)

### Acceptance Criteria:
- [ ] Core interfaces match GraphQL schema exactly
- [ ] Zod schemas for runtime validation
- [ ] Type-safe payload interfaces for each block kind
- [ ] Utility types for capability negotiation
- [ ] Comprehensive JSDoc documentation
- [ ] Unit tests for all data models

### Implementation Steps:
1. Create core interfaces in `src/types/`:
   ```typescript
   // core.ts
   export interface ContentItem {
     id: string;
     type: string;
     title?: string;
     summary?: string;
     blocks: Block[];
     representations?: Record<string, Representation>;
     createdAt?: string;
     updatedAt?: string;
     createdBy?: string;
   }

   export interface Block {
     id: string;
     kind: string;
     payload: unknown;
     variants: Variant[];
   }

   export interface Variant {
     mediaType: string;
     uri?: string;
     width?: number;
     height?: number;
     bytes?: number;
     contentHash?: string;
     generatedBy?: string;
     toolVersion?: string;
     createdAt?: string;
   }
   ```

2. Create block-specific payload interfaces:
   ```typescript
   // blocks.ts
   export interface MarkdownBlockPayload {
     source: string;
   }

   export interface MermaidBlockPayload {
     source: string;
     theme?: string;
   }

   export interface ImageBlockPayload {
     uri: string;
     alt?: string;
     width?: number;
     height?: number;
   }
   ```

3. Create capability negotiation types:
   ```typescript
   // capabilities.ts
   export interface Capabilities {
     accept: string[];
     hints?: CapabilityHints;
   }

   export interface CapabilityHints {
     width?: number;
     height?: number;
     density?: number;
     network?: 'FAST' | 'SLOW' | 'CELLULAR';
   }
   ```

4. Add Zod schemas for runtime validation
5. Create comprehensive unit tests

### Validation:
- All interfaces compile without TypeScript errors
- Zod schemas validate correctly against test data
- Unit tests achieve >90% coverage
- JSDoc generates proper documentation
- Types are exported correctly from package

---

## Task 3A: Transport-Agnostic API Interface
**Estimated Time:** 2-3 hours
**Dependencies:** Task 2A (Data Models)

### Acceptance Criteria:
- [ ] Client-agnostic GraphQL operation definitions
- [ ] Generated TypeScript types from schema
- [ ] Abstract GraphQL client interface
- [ ] Request/response transformation utilities
- [ ] Error handling abstractions
- [ ] Capability-based variant selection logic
- [ ] Support for any GraphQL client (Apollo, urql, graphql-request, etc.)

### Implementation Steps:
1. Set up GraphQL code generation (client-agnostic):
   ```bash
   npm install -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations
   ```

2. Create GraphQL operations in `src/graphql/`:
   ```graphql
   # queries.graphql
   query GetContent($id: ID!, $capabilities: CapabilitiesInput!) {
     content(id: $id, capabilities: $capabilities) {
       id
       title
       summary
       blocks {
         id
         kind
         variants {
           mediaType
           uri
           width
           height
         }
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
   ```

3. Create client-agnostic GraphQL interface:
   ```typescript
   // client/interfaces.ts
   export interface GraphQLClient {
     request<T = any, V = any>(
       document: string,
       variables?: V,
       requestHeaders?: Record<string, string>
     ): Promise<T>;
   }

   export interface GraphQLResponse<T = any> {
     data?: T;
     errors?: Array<{ message: string; path?: string[] }>;
   }

   // client/portable-content-client.ts
   export class PortableContentClient {
     constructor(
       private graphqlClient: GraphQLClient,
       private defaultCapabilities: Capabilities
     ) {}

     async getContent(id: string, capabilities?: Capabilities): Promise<ContentItem | null> {
       // Implementation using generic GraphQL client
     }

     async searchContent(query: string, options?: SearchOptions): Promise<SearchResult> {
       // Implementation using generic GraphQL client
     }
   }
   ```

4. Create client adapters for popular GraphQL clients:
   ```typescript
   // adapters/apollo-adapter.ts
   export class ApolloClientAdapter implements GraphQLClient {
     constructor(private apolloClient: ApolloClient<any>) {}

     async request<T, V>(document: string, variables?: V): Promise<T> {
       const result = await this.apolloClient.query({ query: gql(document), variables });
       return result.data;
     }
   }

   // adapters/urql-adapter.ts
   export class UrqlClientAdapter implements GraphQLClient {
     constructor(private urqlClient: Client) {}

     async request<T, V>(document: string, variables?: V): Promise<T> {
       const result = await this.urqlClient.query(document, variables).toPromise();
       return result.data;
     }
   }
   ```

### Validation:
- GraphQL operations execute successfully with different clients
- Generated types match expected interfaces
- Client adapters work with Apollo Client, urql, and graphql-request
- Error handling works for network failures
- Request/response transformations work correctly
- Capability-based variant selection functions properly

---

## Task 4A: GraphQL Transport Implementation
**Estimated Time:** 3-4 hours
**Dependencies:** Task 3A (Transport Interface)

## Task 5A: Framework-Agnostic Rendering Base
**Estimated Time:** 2-3 hours
**Dependencies:** Task 4A (GraphQL Transport)

### Acceptance Criteria:
- [ ] Abstract renderer interfaces defined
- [ ] Variant selection algorithm implemented
- [ ] Content processing utilities
- [ ] Block renderer registry system
- [ ] Capability detection utilities
- [ ] Framework-agnostic base classes

### Implementation Steps:
1. Create renderer interfaces in `src/rendering/`:
   ```typescript
   // interfaces.ts
   export interface BlockRenderer<TProps = any> {
     kind: string;
     canRender(block: Block, capabilities: Capabilities): boolean;
     render(block: Block, props: TProps): any;
   }

   export interface RendererRegistry {
     register<T>(renderer: BlockRenderer<T>): void;
     getRenderer(kind: string): BlockRenderer | null;
     renderBlock(block: Block, capabilities: Capabilities): any;
   }
   ```

2. Implement variant selection:
   ```typescript
   // variant-selector.ts
   export class VariantSelector {
     selectBestVariant(variants: Variant[], capabilities: Capabilities): Variant | null {
       // Implement selection algorithm from API design doc
     }

     private calculateQualityScore(variant: Variant, accept: string): number {
       // Implementation
     }

     private applyCapabilityHints(score: number, variant: Variant, hints: CapabilityHints): number {
       // Implementation
     }
   }
   ```

3. Create content processing utilities:
   ```typescript
   // processors.ts
   export class ContentProcessor {
     processContent(content: ContentItem, capabilities: Capabilities): ProcessedContent {
       // Apply variant selection and prepare for rendering
     }

     processBlock(block: Block, capabilities: Capabilities): ProcessedBlock {
       // Process individual block
     }
   }
   ```

4. Implement capability detection:
   ```typescript
   // capabilities.ts
   export class CapabilityDetector {
     detectCapabilities(): Capabilities {
       // Detect device/browser capabilities
     }

     supportsMediaType(mediaType: string): boolean {
       // Check if media type is supported
     }
   }
   ```

### Validation:
- Variant selection matches expected behavior from API design
- Renderer registry correctly manages block renderers
- Content processing handles all block types
- Capability detection works on target platforms
- All utilities have comprehensive unit tests

---

## Task 5: React Native Implementation
**Estimated Time:** 6-8 hours
**Dependencies:** Task 5A (Rendering Base) completed and published

### Acceptance Criteria:
- [ ] ContentView component for rendering complete content
- [ ] Individual block components (Markdown, Mermaid, Image)
- [ ] Loading and error state components
- [ ] Responsive image handling with multiple variants
- [ ] Accessibility support (screen readers, etc.)
- [ ] Customizable styling system
- [ ] Performance optimizations (lazy loading, etc.)

### Implementation Steps:
1. Create base components in `src/components/`:
   ```typescript
   // ContentView.tsx
   export interface ContentViewProps {
     content: ContentItem;
     capabilities?: Capabilities;
     onBlockPress?: (block: Block) => void;
     style?: StyleProp<ViewStyle>;
   }

   export const ContentView: React.FC<ContentViewProps> = ({
     content,
     capabilities,
     onBlockPress,
     style
   }) => {
     // Implementation
   };
   ```

2. Implement block-specific components:
   ```typescript
   // MarkdownBlock.tsx
   export const MarkdownBlock: React.FC<MarkdownBlockProps> = ({
     block,
     variant,
     style
   }) => {
     // Use react-native-markdown-display or similar
   };

   // MermaidBlock.tsx
   export const MermaidBlock: React.FC<MermaidBlockProps> = ({
     block,
     variant,
     style
   }) => {
     // Render SVG or PNG variant
   };

   // ImageBlock.tsx
   export const ImageBlock: React.FC<ImageBlockProps> = ({
     block,
     variant,
     style
   }) => {
     // Handle responsive images with multiple variants
   };
   ```

3. Create utility components:
   ```typescript
   // LoadingView.tsx
   export const LoadingView: React.FC<LoadingViewProps> = ({ message }) => {
     // Loading spinner with message
   };

   // ErrorView.tsx
   export const ErrorView: React.FC<ErrorViewProps> = ({ error, onRetry }) => {
     // Error display with retry button
   };
   ```

4. Implement styling system:
   ```typescript
   // styles.ts
   export interface ContentTheme {
     colors: {
       text: string;
       background: string;
       accent: string;
     };
     typography: {
       heading: TextStyle;
       body: TextStyle;
       caption: TextStyle;
     };
     spacing: {
       small: number;
       medium: number;
       large: number;
     };
   }
   ```

5. Add accessibility features:
   - Screen reader support
   - Focus management
   - Semantic markup

### Validation:
- All components render correctly with test content
- Responsive images load appropriate variants
- Accessibility features work with screen readers
- Performance is acceptable with large content items
- Styling system allows customization
- Components handle loading and error states gracefully

---



### Acceptance Criteria:
- [ ] Complete React Native example app
- [ ] Integration tests with real API
- [ ] Performance benchmarks
- [ ] Documentation with usage examples
- [ ] Storybook for component development
- [ ] E2E tests with Detox
- [ ] Package publishing configuration

### Implementation Steps:
1. Create example app in `example/`:
   ```typescript
   // App.tsx
   export default function App() {
     return (
       <PortableContentProvider client={client}>
         <NavigationContainer>
           <Stack.Navigator>
             <Stack.Screen name="ContentList" component={ContentListScreen} />
             <Stack.Screen name="ContentDetail" component={ContentDetailScreen} />
           </Stack.Navigator>
         </NavigationContainer>
       </PortableContentProvider>
     );
   }
   ```

2. Create integration tests:
   ```typescript
   // __tests__/integration.test.ts
   describe('Content Integration', () => {
     it('should load and render content from API', async () => {
       // Test full workflow
     });

     it('should handle offline scenarios', async () => {
       // Test offline behavior
     });

     it('should select appropriate variants based on capabilities', async () => {
       // Test variant selection
     });
   });
   ```

3. Set up Storybook for component development:
   ```typescript
   // .storybook/main.js
   module.exports = {
     stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
     addons: ['@storybook/addon-essentials']
   };
   ```

4. Create comprehensive documentation:
   - API reference
   - Usage examples
   - Migration guides
   - Best practices

5. Configure package publishing:
   ```json
   {
     "publishConfig": {
       "access": "public"
     },
     "files": ["dist", "README.md"],
     "main": "dist/index.js",
     "types": "dist/index.d.ts"
   }
   ```

### Validation:
- Example app runs on iOS and Android
- All integration tests pass
- Performance meets benchmarks (< 100ms render time)
- Documentation is complete and accurate
- Storybook shows all components correctly
- E2E tests cover critical user flows
- Packages can be published successfully

---

## Completion Criteria for Phase 1C

### Functional Requirements:
- [ ] Can fetch and render content from GraphQL API
- [ ] Supports all 3 block types (markdown, mermaid, image)
- [ ] Implements capability-based variant selection
- [ ] Handles loading and error states gracefully
- [ ] Provides responsive image handling
- [ ] Supports offline caching

### Technical Requirements:
- [ ] Type-safe TypeScript implementation
- [ ] Framework-agnostic core SDK
- [ ] Complete React Native component library
- [ ] Comprehensive test coverage (>85%)
- [ ] Performance optimized for mobile
- [ ] Accessible to screen readers

### Documentation:
- [ ] Complete API documentation
- [ ] Usage examples and tutorials
- [ ] Component documentation with Storybook
- [ ] Migration and integration guides

### Ready for Production:
- [ ] Packages published to npm
- [ ] Example app demonstrates all features
- [ ] Performance benchmarks met
- [ ] Security review completed

---

## Notes

- Each task should be completed and tested before moving to the next
- Focus on TypeScript type safety throughout
- Prioritize performance for mobile devices
- Ensure accessibility compliance
- Document architectural decisions
- Consider future framework extensions (Vue, React web)

## Future Extensions

This phase establishes the foundation for:
- Vue.js component library
- React web component library
- Flutter/Dart SDK
- Native iOS/Android SDKs
