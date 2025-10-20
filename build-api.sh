#!/bin/bash

# Simple build script to compile API TypeScript files to JavaScript for Vercel

echo "Building API for Vercel deployment..."

# Clean previous build
rm -rf api-dist

# Create output directory
mkdir -p api-dist

# Compile each TypeScript file to JavaScript using TypeScript compiler
npx tsc api/**/*.ts \
  --outDir api-dist \
  --module ESNext \
  --target ES2020 \
  --moduleResolution node \
  --esModuleInterop \
  --skipLibCheck \
  --allowSyntheticDefaultImports \
  --resolveJsonModule \
  --paths '{"@shared/*":["../shared/*"]}' \
  --baseUrl api

echo "Build complete! API files compiled to api-dist/"

# Count compiled files
echo "Compiled $(find api-dist -name "*.js" | wc -l) files"