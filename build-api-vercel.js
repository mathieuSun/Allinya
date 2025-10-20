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
    
    // Compile each file individually without bundling
    let successCount = 0;
    let failureCount = 0;
    const failedFiles = [];
    
    for (const file of tsFiles) {
      const srcPath = path.join(apiDir, file);
      const destPath = path.join(distDir, file.replace('.ts', '.js'));
      const destDir = path.dirname(destPath);
      
      // Create destination directory
      await fs.mkdir(destDir, { recursive: true });
      
      try {
        // Use esbuild to compile the file without bundling
        // We don't use aliases here, we'll fix imports after compilation
        await execAsync(
          `npx esbuild "${srcPath}" --outfile="${destPath}" --platform=node --format=esm --target=node18 --sourcemap --loader:.ts=ts`,
          { cwd: __dirname }
        );
        console.log(`  ✅ ${file}`);
        successCount++;
      } catch (error) {
        const errorMsg = error.message.split('\n').find(line => line.includes('ERROR')) || error.message.split('\n')[0];
        console.log(`  ❌ ${file}: ${errorMsg}`);
        failedFiles.push({ file, error: errorMsg });
        failureCount++;
      }
    }
    
    // Fix imports in compiled files
    if (successCount > 0) {
      console.log('\n🔧 Fixing import paths...');
      await fixImports(distDir);
    }
    
    // Also compile shared directory if needed
    const sharedDir = path.join(__dirname, 'shared');
    const sharedDistDir = path.join(distDir, '../shared');
    if (await fs.access(sharedDir).then(() => true).catch(() => false)) {
      console.log('\n📂 Compiling shared directory...');
      await compileSharedDirectory(sharedDir, sharedDistDir);
    }
    
    console.log(`\n✨ Build summary:`);
    console.log(`   ✅ Success: ${successCount} files`);
    console.log(`   ❌ Failed: ${failureCount} files`);
    console.log(`   📁 Output: ${distDir}\n`);
    
    if (failureCount > 0) {
      console.log('Failed files details:');
      failedFiles.forEach(({ file, error }) => {
        console.log(`  • ${file}: ${error}`);
      });
    }
    
    // Create a build info file
    const buildInfo = {
      timestamp: new Date().toISOString(),
      success: successCount,
      failed: failureCount,
      node: process.version,
      failedFiles: failedFiles.map(f => f.file),
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

async function compileSharedDirectory(srcDir, destDir) {
  try {
    // Ensure destination exists
    await fs.mkdir(destDir, { recursive: true });
    
    // Find all TypeScript files in shared
    const sharedFiles = await getAllTypeScriptFiles(srcDir);
    
    for (const file of sharedFiles) {
      const srcPath = path.join(srcDir, file);
      const destPath = path.join(destDir, file.replace('.ts', '.js'));
      const destFileDir = path.dirname(destPath);
      
      await fs.mkdir(destFileDir, { recursive: true });
      
      try {
        await execAsync(
          `npx esbuild "${srcPath}" --outfile="${destPath}" --platform=node --format=esm --target=node18 --loader:.ts=ts`,
          { cwd: __dirname }
        );
        console.log(`  ✅ shared/${file}`);
      } catch (error) {
        console.log(`  ⚠️ shared/${file}: ${error.message.split('\n')[0]}`);
      }
    }
  } catch (error) {
    console.log(`  ⚠️ Could not compile shared directory: ${error.message}`);
  }
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
    // Calculate the relative path from the current file to the shared directory
    const depth = path.relative(dir, path.dirname(file)).split(path.sep).filter(Boolean).length;
    const sharedPrefix = depth === 0 ? '../shared/' : '../'.repeat(depth + 1) + 'shared/';
    
    const sharedImportRegex = /from\s+["']@shared\/([^"']+)["']/g;
    content = content.replace(sharedImportRegex, (match, sharedPath) => {
      modified = true;
      // Add .js extension if not present
      const ext = sharedPath.endsWith('.js') || sharedPath.endsWith('.json') ? '' : '.js';
      return `from "${sharedPrefix}${sharedPath}${ext}"`;
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