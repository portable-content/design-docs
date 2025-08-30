#!/bin/bash

# Install dev dependencies first
npm install --save-dev \
  typescript@5.0.0 \
  @types/node@18.0.0 \
  @types/jest@29.0.0 \
  jest@29.0.0 \
  ts-jest@29.0.0 \
  @typescript-eslint/eslint-plugin@6.0.0 \
  @typescript-eslint/parser@6.0.0 \
  eslint@8.0.0

# Create necessary directories
mkdir -p src/core src/__tests__

# Initialize TypeScript
npx tsc --init

echo "Core package dependencies installed successfully!"
echo "Run 'npm install' to ensure all dependencies are properly linked."