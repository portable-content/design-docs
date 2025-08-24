# Task 1B: React Native Project Setup

## Overview
Set up the React Native component library repository with build tools, testing infrastructure, and example app structure.

## Estimated Time
1-2 hours

## Dependencies
- Task 4A (SDK Rendering Base) must be completed
- Core SDK published to npm as `@portable-content/sdk`
- React Native development environment set up

## Acceptance Criteria

### Repository Structure
- [ ] React Native library project structure
- [ ] Example app configured and working
- [ ] Testing infrastructure with React Native Testing Library
- [ ] Build system for library compilation
- [ ] Proper dependency management with SDK

### Development Workflow
- [ ] Library builds correctly
- [ ] Example app runs on iOS and Android
- [ ] Tests run successfully
- [ ] Hot reloading works for development

## Implementation Steps

### 1. Initialize Repository Structure

Create the `portable-content-react-native` repository:

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
    "prepublishOnly": "npm run clean && npm run build",
    "example:install": "cd example && npm install",
    "example:ios": "cd example && npm run ios",
    "example:android": "cd example && npm run android",
    "example:start": "cd example && npm start"
  },
  "keywords": [
    "portable-content",
    "react-native",
    "cms",
    "content-management",
    "components"
  ],
  "author": "Your Name",
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/portable-content/portable-content-react-native.git"
  },
  "dependencies": {
    "@portable-content/sdk": "^0.1.0",
    "react-native-fast-image": "^8.6.0",
    "react-native-markdown-display": "^7.0.0",
    "react-native-svg": "^13.14.0"
  },
  "devDependencies": {
    "@react-native/eslint-config": "^0.72.0",
    "@react-native/metro-config": "^0.72.0",
    "@testing-library/react-native": "^12.3.0",
    "@types/jest": "^29.5.0",
    "@types/react": "^18.2.0",
    "@types/react-native": "^0.72.0",
    "@typescript-eslint/eslint-plugin": "^6.7.0",
    "@typescript-eslint/parser": "^6.7.0",
    "eslint": "^8.50.0",
    "eslint-config-prettier": "^9.0.0",
    "jest": "^29.7.0",
    "prettier": "^3.0.0",
    "react-test-renderer": "^18.2.0",
    "typescript": "^5.2.0"
  },
  "peerDependencies": {
    "react": ">=16.8.0",
    "react-native": ">=0.70.0"
  }
}
```

### 3. Configure Example App

Create `example/package.json`:

```json
{
  "name": "portable-content-example",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "lint": "eslint .",
    "start": "react-native start",
    "test": "jest"
  },
  "dependencies": {
    "@apollo/client": "^3.8.0",
    "@portable-content/react-native": "file:..",
    "@portable-content/sdk": "^0.1.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.9.0",
    "graphql": "^16.8.0",
    "react": "18.2.0",
    "react-native": "0.72.0",
    "react-native-safe-area-context": "^4.7.0",
    "react-native-screens": "^3.25.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@babel/preset-env": "^7.20.0",
    "@babel/runtime": "^7.20.0",
    "@react-native/eslint-config": "^0.72.2",
    "@react-native/metro-config": "^0.72.11",
    "@tsconfig/react-native": "^3.0.0",
    "@types/react": "^18.0.24",
    "@types/react-test-renderer": "^18.0.0",
    "babel-jest": "^29.2.1",
    "eslint": "^8.19.0",
    "jest": "^29.2.1",
    "metro-react-native-babel-preset": "0.76.8",
    "prettier": "^2.4.1",
    "react-test-renderer": "18.2.0",
    "typescript": "4.8.4"
  }
}
```

### 4. Configure TypeScript

Create `tsconfig.json`:

```json
{
  "extends": "@tsconfig/react-native/tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "noEmit": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "example", "tests", "**/*.test.ts", "**/*.test.tsx"]
}
```

### 5. Configure Testing

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
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@portable-content)/)'
  ]
};
```

### 6. Configure Metro (Example App)

Create `example/metro.config.js`:

```javascript
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  watchFolders: [
    path.resolve(__dirname, '..'), // Watch parent directory for library changes
  ],
  resolver: {
    alias: {
      '@portable-content/react-native': path.resolve(__dirname, '..', 'src'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
```

### 7. Create Initial Components

Create `src/index.ts`:

```typescript
// Components
export * from './components';

// Hooks
export * from './hooks';

// Styles
export * from './styles';

// Version
export const VERSION = '0.1.0';
```

Create `src/components/index.ts`:

```typescript
// Main components
export { ContentView } from './ContentView';

// Block components
export * from './blocks';

// UI components
export * from './ui';

// Base components
export * from './base';
```

### 8. Create Example App Structure

Create `example/src/App.tsx`:

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PortableContentProvider } from '@portable-content/sdk';
import { createApolloClient } from '@portable-content/sdk';

// Screens (to be implemented)
import { ContentListScreen } from './screens/ContentListScreen';
import { ContentDetailScreen } from './screens/ContentDetailScreen';

const Stack = createNativeStackNavigator();

const apolloClient = createApolloClient({
  uri: 'http://localhost:4000/graphql', // Update with your API endpoint
});

export default function App() {
  return (
    <PortableContentProvider client={apolloClient}>
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
        </Stack.Navigator>
      </NavigationContainer>
    </PortableContentProvider>
  );
}
```

### 9. Configure CI/CD

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
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
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
      
      - name: Install example dependencies
        run: npm run example:install
      
      - name: Build example (Android)
        run: cd example && npx react-native build-android --mode=debug

  publish:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
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

1. **Repository Creation**: Create GitHub repository with proper structure
2. **Library Setup**: Run `npm install` in root and verify no errors
3. **Example App**: Run `npm run example:install` and verify example app setup
4. **TypeScript**: Run `npm run type-check` to verify compilation
5. **Build**: Run `npm run build` and verify dist files are generated
6. **Testing**: Run `npm test` and verify test infrastructure works
7. **Example App**: Run `npm run example:start` and verify Metro starts

## Next Steps

After completing this task:
1. Verify library builds and example app runs
2. Test hot reloading in development
3. Begin Task 2B: React Native Components

## Resources

- [React Native Library Setup](https://reactnative.dev/docs/native-modules-setup)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Metro Configuration](https://metrobundler.dev/docs/configuration)
- [React Navigation](https://reactnavigation.org/docs/getting-started/)
