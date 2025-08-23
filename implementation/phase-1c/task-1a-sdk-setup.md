# Task 1A: SDK Project Setup & Foundation

## Overview
Set up the core TypeScript SDK repository with build tools, testing infrastructure, and development workflow for the framework-agnostic Portable Content SDK.

## Estimated Time
1-2 hours

## Dependencies
- Phase 1B (GraphQL API) must be completed
- Node.js 18+ and npm/yarn installed

## Acceptance Criteria

### Repository Structure
- [ ] Clean TypeScript project structure
- [ ] Build system configured (Rollup/Vite for bundling)
- [ ] Testing infrastructure with Jest configured
- [ ] Linting and formatting with ESLint and Prettier
- [ ] Package.json with proper dependencies and scripts
- [ ] CI/CD workflow configured (GitHub Actions)

### Development Workflow
- [ ] TypeScript compilation works correctly
- [ ] Build scripts generate proper distribution files
- [ ] Test scripts run unit tests
- [ ] Linting enforces code quality standards
- [ ] Documentation generation configured

## Implementation Steps

### 1. Initialize Repository Structure

Create the `portable-content-sdk` repository:

```
portable-content-sdk/
├── src/
│   ├── index.ts                  # Main export file
│   ├── types/                    # Type definitions
│   │   ├── index.ts
│   │   ├── core.ts
│   │   ├── blocks.ts
│   │   └── capabilities.ts
│   ├── client/                   # GraphQL client
│   │   ├── index.ts
│   │   ├── apollo-client.ts
│   │   └── portable-content-client.ts
│   ├── rendering/                # Framework-agnostic rendering
│   │   ├── index.ts
│   │   ├── variant-selector.ts
│   │   ├── interfaces.ts
│   │   └── base-renderers.ts
│   ├── validation/               # Runtime validation
│   │   ├── index.ts
│   │   ├── schemas.ts
│   │   └── validators.ts
│   └── utils/                    # Utility functions
│       ├── index.ts
│       └── capability-detector.ts
├── tests/                        # Test files
│   ├── unit/
│   ├── integration/
│   └── __mocks__/
├── docs/                         # Documentation
├── .github/
│   └── workflows/
│       └── ci.yml
├── package.json
├── tsconfig.json
├── rollup.config.js
├── jest.config.js
├── .eslintrc.js
├── .prettierrc
├── .gitignore
└── README.md
```

### 2. Configure Package.json

```json
{
  "name": "@portable-content/sdk",
  "version": "0.1.0",
  "description": "Core TypeScript SDK for Portable Content System",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "rollup -c",
    "build:watch": "rollup -c -w",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts",
    "type-check": "tsc --noEmit",
    "docs": "typedoc src/index.ts",
    "clean": "rm -rf dist",
    "prepublishOnly": "npm run clean && npm run build",
    "codegen": "graphql-codegen --config codegen.yml"
  },
  "keywords": [
    "portable-content",
    "cms",
    "content-management",
    "typescript",
    "graphql"
  ],
  "author": "Your Name",
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/portable-content-sdk.git"
  },
  "dependencies": {
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@graphql-codegen/cli": "^5.0.0",
    "@graphql-codegen/typescript": "^4.0.0",
    "@graphql-codegen/typescript-operations": "^4.0.0",
    "@rollup/plugin-typescript": "^11.1.0",
    "@types/jest": "^29.5.0",
    "@typescript-eslint/eslint-plugin": "^6.7.0",
    "@typescript-eslint/parser": "^6.7.0",
    "eslint": "^8.50.0",
    "eslint-config-prettier": "^9.0.0",
    "jest": "^29.7.0",
    "prettier": "^3.0.0",
    "rollup": "^3.29.0",
    "ts-jest": "^29.1.0",
    "typedoc": "^0.25.0",
    "typescript": "^5.2.0"
  },
  "peerDependencies": {
    "graphql": "^16.0.0"
  },
  "peerDependenciesMeta": {
    "graphql": {
      "optional": true
    }
  }
}
```

### 3. Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
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
    "removeComments": false,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests", "**/*.test.ts"]
}
```

### 4. Configure Build System

Create `rollup.config.js`:

```javascript
import typescript from '@rollup/plugin-typescript';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    {
      file: pkg.module,
      format: 'esm',
      sourcemap: true
    }
  ],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      exclude: ['tests/**/*', '**/*.test.ts']
    })
  ],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    'react/jsx-runtime'
  ]
};
```

### 5. Configure Testing

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
```

### 6. Configure Linting

Create `.eslintrc.js`:

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn'
  },
  env: {
    node: true,
    jest: true
  }
};
```

Create `.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### 7. Configure CI/CD

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
      
      - name: Build package
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
      
      - name: Build package
        run: npm run build
      
      - name: Publish to npm
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 8. Create Initial Files

Create `src/index.ts`:

```typescript
// Core types
export * from './types';

// Client
export * from './client';

// Rendering
export * from './rendering';

// Validation
export * from './validation';

// Utils
export * from './utils';

// Version
export const VERSION = '0.1.0';
```

Create `tests/setup.ts`:

```typescript
// Global test setup
import 'jest';

// Mock console methods in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods in tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
```

### 9. Create Documentation

Create comprehensive `README.md`:

```markdown
# Portable Content SDK

Core TypeScript SDK for the Portable Content System - a framework-agnostic content management and rendering system.

## Installation

```bash
npm install @portable-content/sdk
```

## Quick Start

```typescript
import { PortableContentClient, GraphQLRequestAdapter } from '@portable-content/sdk';
import { GraphQLClient } from 'graphql-request';

// Create GraphQL client (using graphql-request as example)
const graphqlClient = new GraphQLClient('https://your-api.com/graphql');
const adapter = new GraphQLRequestAdapter(graphqlClient);

// Create Portable Content client
const client = new PortableContentClient(adapter);

// Fetch content
const content = await client.getContent('content-id');
console.log(content);
```

### With Apollo Client

```typescript
import { PortableContentClient, ApolloClientAdapter } from '@portable-content/sdk';
import { ApolloClient, InMemoryCache } from '@apollo/client';

const apolloClient = new ApolloClient({
  uri: 'https://your-api.com/graphql',
  cache: new InMemoryCache()
});

const adapter = new ApolloClientAdapter(apolloClient);
const client = new PortableContentClient(adapter);
```

## Features

- **Type-Safe**: Full TypeScript support with generated types
- **Framework-Agnostic**: Core functionality works with any UI framework
- **Client-Agnostic**: Works with any GraphQL client (Apollo, urql, graphql-request, etc.)
- **Capability Negotiation**: Automatic variant selection based on client capabilities
- **Validation**: Runtime validation with Zod schemas
- **Extensible**: Plugin architecture for custom block types

## Documentation

- [API Reference](./docs/api.md)
- [Type Definitions](./docs/types.md)
- [Client Configuration](./docs/client.md)
- [Rendering System](./docs/rendering.md)

## Platform Packages

- [`@portable-content/react-native`](https://github.com/your-org/portable-content-react-native) - React Native components
- [`@portable-content/vue`](https://github.com/your-org/portable-content-vue) - Vue.js components
- [`@portable-content/react-web`](https://github.com/your-org/portable-content-react-web) - React web components

## License

Apache-2.0
```

## Validation Steps

1. **Repository Creation**: Create GitHub repository with proper structure
2. **Dependencies**: Run `npm install` and verify no errors
3. **TypeScript**: Run `npm run type-check` to verify TypeScript compilation
4. **Build**: Run `npm run build` and verify dist files are generated
5. **Testing**: Run `npm test` and verify test infrastructure works
6. **Linting**: Run `npm run lint` and verify no errors
7. **CI/CD**: Push to GitHub and verify workflow runs successfully

## Next Steps

After completing this task:
1. Verify all build and test scripts work correctly
2. Create initial placeholder files for core modules
3. Begin Task 2A: TypeScript Data Models & Interfaces

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Rollup.js Documentation](https://rollupjs.org/guide/en/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Apollo Client Documentation](https://www.apollographql.com/docs/react/)
