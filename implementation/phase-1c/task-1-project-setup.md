# Task 1: SDK Project Setup & Foundation

## Overview
Set up the core TypeScript SDK repository with build tools, testing infrastructure, and development workflow for the framework-agnostic Portable Content SDK.

## Estimated Time
1-2 hours

## Dependencies
- Phase 1B (GraphQL API) must be completed
- Node.js 18+ and npm/yarn installed

## Acceptance Criteria

### Repository Structure
- [ ] Clean TypeScript project structure for SDK only
- [ ] TypeScript configuration with strict mode enabled
- [ ] Build system configured (Rollup for bundling)
- [ ] Testing infrastructure with Jest configured
- [ ] Linting and formatting with ESLint and Prettier
- [ ] Package.json with proper dependencies and scripts

### Development Workflow
- [ ] TypeScript compilation works correctly
- [ ] Build scripts generate proper distribution files
- [ ] Test scripts run unit tests
- [ ] Linting enforces code quality standards
- [ ] CI/CD workflow configured (GitHub Actions)

## Implementation Steps

### 1. Initialize SDK Repository Structure

Create the `portable-content-sdk` repository:

```bash
mkdir portable-content-sdk
cd portable-content-sdk

# Initialize package.json
npm init -y
```

Create the SDK repository structure:
```
portable-content-sdk/
├── src/
│   ├── index.ts                  # Main export file
│   ├── types/                    # Type definitions
│   │   ├── index.ts
│   │   ├── core.ts
│   │   ├── blocks.ts
│   │   └── capabilities.ts
│   ├── client/                   # API client interfaces
│   │   ├── index.ts
│   │   ├── interfaces.ts
│   │   ├── transport.ts
│   │   ├── base-api-client.ts
│   │   ├── portable-content-client.ts
│   │   ├── errors.ts
│   │   ├── transports/          # Transport implementations
│   │   │   └── graphql-transport.ts
│   │   └── adapters/            # Client adapters
│   │       ├── apollo-graphql-adapter.ts
│   │       └── urql-graphql-adapter.ts
│   ├── rendering/                # Framework-agnostic rendering
│   │   ├── index.ts
│   │   ├── variant-selector.ts
│   │   ├── interfaces.ts
│   │   ├── renderer-registry.ts
│   │   ├── content-processor.ts
│   │   ├── base-renderers.ts
│   │   └── capability-detector.ts
│   ├── validation/               # Runtime validation
│   │   ├── index.ts
│   │   ├── schemas.ts
│   │   └── validators.ts
│   ├── utils/                    # Utility functions
│   │   ├── index.ts
│   │   └── helpers.ts
│   └── graphql/                  # GraphQL operations
│       ├── operations.ts
│       ├── queries.graphql
│       ├── mutations.graphql
│       └── subscriptions.graphql
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
├── codegen.yml
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
    "transport-agnostic"
  ],
  "author": "Your Name",
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/portable-content/portable-content-sdk.git"
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

### 7. Set up CI/CD

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

## Validation Steps

1. **Repository Creation**: Create GitHub repository with proper structure
2. **Dependencies**: Run `npm install` and verify no errors
3. **TypeScript**: Run `npm run type-check` to verify TypeScript compilation
4. **Build**: Run `npm run build` and verify dist files are generated
5. **Testing**: Run `npm test` and verify test infrastructure works
6. **Linting**: Run `npm run lint` and verify no errors
7. **CI/CD**: Push to GitHub and verify workflow runs successfully

## Common Issues and Solutions

### Issue: TypeScript compilation errors
**Solution**: Ensure all type definitions are properly configured and dependencies are installed

### Issue: Jest not finding modules
**Solution**: Configure Jest with proper module resolution and setup files

### Issue: Rollup build failures
**Solution**: Check external dependencies are properly configured and TypeScript paths are correct

### Issue: ESLint configuration conflicts
**Solution**: Ensure ESLint extends are in correct order and rules don't conflict

## Next Steps

After completing this task:
1. Verify all build and test scripts work correctly
2. Create initial placeholder files for core modules
3. Begin Task 2A: TypeScript Data Models & Interfaces

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Rollup.js Documentation](https://rollupjs.org/guide/en/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [GraphQL Code Generator](https://the-guild.dev/graphql/codegen)
