#!/usr/bin/env node

// Build timestamp updater - Updates all __BUILD_TIMESTAMP__ placeholders
// Run this before deployment to ensure cache busting works

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILD_TIMESTAMP = Date.now().toString();
const BUILD_ID = Math.random().toString(36).substr(2, 9);

console.log('🔨 Updating build timestamps...');
console.log(`   Timestamp: ${BUILD_TIMESTAMP}`);
console.log(`   Build ID: ${BUILD_ID}`);

// Files to update
const filesToUpdate = [
  'client/public/version.json',
  'client/public/sw.js',
  'client/public/cache-manager.js',
  'client/index.html'
];

filesToUpdate.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`   ⚠️  File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Replace placeholders
  content = content.replace(/__BUILD_TIMESTAMP__/g, BUILD_TIMESTAMP);
  content = content.replace(/__BUILD_ID__/g, BUILD_ID);
  
  fs.writeFileSync(fullPath, content);
  console.log(`   ✅ Updated: ${filePath}`);
});

console.log('✨ Build timestamps updated successfully!');
console.log('\nNOTE: For iOS/iPad cache issues:');
console.log('1. Users can tap the refresh button in the app to clear cache');
console.log('2. The app will auto-detect version changes every 60 seconds');
console.log('3. Service worker will aggressively bust caches on iOS devices');