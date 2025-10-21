#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

async function getAllTypeScriptFiles(dir, base = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  
  for (const entry of entries) {
    const relativePath = path.join(base, entry.name);
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const subFiles = await getAllTypeScriptFiles(fullPath, relativePath);
      files.push(...subFiles);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(relativePath);
    }
  }
  
  return files;
}

async function buildForVercel() {
  console.log('🚀 Building API for Vercel deployment...\n');
  
  const apiDir = path.join(__dirname, 'api');
  const tempDir = path.join(__dirname, '.vercel-build-temp');
  
  try {
    // Clean up temp directory
    console.log('📦 Preparing build...');
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });
    
    // Get all TypeScript files
    const tsFiles = await getAllTypeScriptFiles(apiDir);
    console.log(`📋 Found ${tsFiles.length} TypeScript files to compile\n`);
    
    // Compile each file
    let successCount = 0;
    
    for (const file of tsFiles) {
      const srcPath = path.join(apiDir, file);
      const destPath = path.join(tempDir, file.replace('.ts', '.js'));
      const destDir = path.dirname(destPath);
      
      await fs.mkdir(destDir, { recursive: true });
      
      try {
        await execAsync(
          `npx esbuild "${srcPath}" --outfile="${destPath}" --platform=node --format=esm --target=node18 --loader:.ts=ts`,
          { cwd: __dirname }
        );
        console.log(`  ✅ ${file}`);
        successCount++;
      } catch (error) {
        console.log(`  ❌ ${file}: ${error.message.split('\n')[0]}`);
      }
    }
    
    // Fix imports in compiled files
    console.log('\n🔧 Fixing import paths...');
    await fixImports(tempDir);
    
    // Copy compiled files to api directory (alongside .ts files)
    console.log('\n📂 Copying compiled files to api directory...');
    await copyCompiledFiles(tempDir, apiDir);
    
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
    
    console.log(`\n✨ Build complete! Compiled ${successCount} files to /api\n`);
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

async function copyCompiledFiles(srcDir, destDir) {
  const files = await getAllJavaScriptFiles(srcDir);
  
  for (const file of files) {
    const relativePath = path.relative(srcDir, file);
    const destPath = path.join(destDir, relativePath);
    const destFileDir = path.dirname(destPath);
    
    await fs.mkdir(destFileDir, { recursive: true });
    await fs.copyFile(file, destPath);
    console.log(`  📄 ${relativePath}`);
  }
}

async function getAllJavaScriptFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await getAllJavaScriptFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function fixImports(dir) {
  const files = await getAllJavaScriptFiles(dir);
  
  for (const file of files) {
    let content = await fs.readFile(file, 'utf-8');
    let modified = false;
    
    // Fix relative imports to add .js extension
    const relativeImportRegex = /from\s+["'](\.[^"']+)(?<!\.js)(?<!\.json)["']/g;
    content = content.replace(relativeImportRegex, (match, importPath) => {
      modified = true;
      return `from "${importPath}.js"`;
    });
    
    // Fix @shared imports to use relative paths
    const depth = path.relative(dir, path.dirname(file)).split(path.sep).filter(Boolean).length;
    const sharedPrefix = depth === 0 ? '../shared/' : '../'.repeat(depth + 1) + 'shared/';
    
    const sharedImportRegex = /from\s+["']@shared\/([^"']+)["']/g;
    content = content.replace(sharedImportRegex, (match, sharedPath) => {
      modified = true;
      const ext = sharedPath.endsWith('.js') || sharedPath.endsWith('.json') ? '' : '.js';
      return `from "${sharedPrefix}${sharedPath}${ext}"`;
    });
    
    if (modified) {
      await fs.writeFile(file, content, 'utf-8');
    }
  }
}

buildForVercel().catch(console.error);
