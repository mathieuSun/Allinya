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
    } else if (entry.isFile() && entry.name.endsWith('.ts') && entry.name !== 'tsconfig.json') {
      files.push(relativePath);
    }
  }
  
  return files;
}

async function buildAPI() {
  console.log('🚀 Building API for Vercel deployment...\n');
  
  const apiDir = path.join(__dirname, 'api');
  const distDir = path.join(__dirname, 'api-dist');
  
  try {
    // Clean up existing dist directory
    console.log('📦 Cleaning build directory...');
    await fs.rm(distDir, { recursive: true, force: true });
    
    // Get all TypeScript files
    const tsFiles = await getAllTypeScriptFiles(apiDir);
    console.log(`📋 Found ${tsFiles.length} TypeScript files to compile\n`);
    
    // Compile each file individually
    let successCount = 0;
    let failureCount = 0;
    
    for (const file of tsFiles) {
      const srcPath = path.join(apiDir, file);
      const destPath = path.join(distDir, file.replace('.ts', '.js'));
      const destDir = path.dirname(destPath);
      
      // Create destination directory
      await fs.mkdir(destDir, { recursive: true });
      
      try {
        // Use esbuild to compile the file
        await execAsync(
          `npx esbuild "${srcPath}" --outfile="${destPath}" --platform=node --format=esm --target=node18 --sourcemap --alias:@shared="${path.join(__dirname, 'shared')}"`,
          { cwd: __dirname }
        );
        console.log(`  ✅ ${file}`);
        successCount++;
      } catch (error) {
        console.log(`  ❌ ${file}: ${error.message.split('\n')[0]}`);
        failureCount++;
      }
    }
    
    // Fix imports in compiled files
    console.log('\n🔧 Fixing import paths...');
    await fixImports(distDir);
    
    console.log(`\n✨ Build completed!`);
    console.log(`   ✅ Success: ${successCount} files`);
    console.log(`   ❌ Failed: ${failureCount} files`);
    console.log(`   📁 Output: ${distDir}\n`);
    
    // Create a build info file
    const buildInfo = {
      timestamp: new Date().toISOString(),
      files: successCount,
      failed: failureCount,
      node: process.version,
    };
    await fs.writeFile(
      path.join(distDir, 'build-info.json'),
      JSON.stringify(buildInfo, null, 2)
    );
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

async function fixImports(dir) {
  const files = await getAllJavaScriptFiles(dir);
  
  for (const file of files) {
    let content = await fs.readFile(file, 'utf-8');
    let modified = false;
    
    // Fix relative imports to add .js extension
    const relativeImportRegex = /from\s+["'](\.[^"']+)["']/g;
    content = content.replace(relativeImportRegex, (match, importPath) => {
      if (!importPath.endsWith('.js') && !importPath.endsWith('.json')) {
        modified = true;
        return `from "${importPath}.js"`;
      }
      return match;
    });
    
    // Fix @shared imports to use relative paths
    const sharedImportRegex = /from\s+["']@shared\/([^"']+)["']/g;
    content = content.replace(sharedImportRegex, (match, sharedPath) => {
      modified = true;
      const depth = file.split(path.sep).length - distDir.split(path.sep).length - 1;
      const prefix = '../'.repeat(depth);
      const ext = sharedPath.endsWith('.js') ? '' : '.js';
      return `from "${prefix}shared/${sharedPath}${ext}"`;
    });
    
    if (modified) {
      await fs.writeFile(file, content, 'utf-8');
    }
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

// Run the build
buildAPI().catch(console.error);