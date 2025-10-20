#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

async function buildVercelAPI() {
  console.log('🚀 Building API for Vercel deployment...\n');

  const apiDir = path.join(__dirname, 'api');
  const apiDistDir = path.join(__dirname, 'api-dist');

  try {
    // Step 1: Clean up existing dist directory
    console.log('📦 Cleaning existing build directory...');
    await fs.rm(apiDistDir, { recursive: true, force: true });
    await fs.mkdir(apiDistDir, { recursive: true });

    // Step 2: Use TypeScript compiler to compile all files
    console.log('🔨 Compiling TypeScript files to JavaScript...');
    const { stdout, stderr } = await execAsync(
      `npx tsc --project api/tsconfig.json --outDir api-dist --module ESNext --target ES2020 --moduleResolution node --preserveConstEnums true --resolveJsonModule true --esModuleInterop true --skipLibCheck true`,
      { cwd: __dirname }
    );
    
    if (stderr && !stderr.includes('warning')) {
      console.error('Compilation errors:', stderr);
    }

    // Step 3: Copy the api directory structure to api-dist and compile inline
    console.log('📂 Processing API files...');
    await processDirectory(apiDir, apiDistDir);

    // Step 4: Fix import paths in the compiled files
    console.log('🔧 Fixing import paths...');
    await fixImportPaths(apiDistDir);

    console.log('\n✅ API build completed successfully!');
    console.log(`📁 Output directory: ${apiDistDir}\n`);

    // List the compiled files for verification
    const files = await getAllFiles(apiDistDir);
    console.log(`📋 Compiled ${files.length} files:`);
    files.slice(0, 10).forEach(file => {
      const relative = path.relative(apiDistDir, file);
      console.log(`  ✓ ${relative}`);
    });
    if (files.length > 10) {
      console.log(`  ... and ${files.length - 10} more files`);
    }

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

async function processDirectory(srcDir, destDir) {
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      await fs.mkdir(destPath, { recursive: true });
      await processDirectory(srcPath, destPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && entry.name !== 'tsconfig.json') {
      // Compile individual TypeScript file
      const jsFileName = entry.name.replace('.ts', '.js');
      const jsDestPath = path.join(destDir, jsFileName);
      
      try {
        await execAsync(
          `npx esbuild "${srcPath}" --outfile="${jsDestPath}" --platform=node --format=esm --target=node18 --bundle=false --alias:@shared=../shared`,
          { cwd: __dirname }
        );
        console.log(`  ✓ Compiled ${path.relative(apiDir, srcPath)}`);
      } catch (error) {
        console.error(`  ✗ Failed to compile ${path.relative(apiDir, srcPath)}: ${error.message}`);
      }
    }
  }
}

async function fixImportPaths(dir) {
  const files = await getAllFiles(dir);
  const jsFiles = files.filter(f => f.endsWith('.js'));
  
  for (const file of jsFiles) {
    let content = await fs.readFile(file, 'utf-8');
    
    // Fix @shared imports to relative paths
    content = content.replace(/@shared\//g, '../shared/');
    
    // Fix relative imports without extensions
    content = content.replace(/from ['"](\.[^'"]+)(?<!\.js)['"]/g, 'from "$1.js"');
    content = content.replace(/import ['"](\.[^'"]+)(?<!\.js)['"]/g, 'import "$1.js"');
    
    await fs.writeFile(file, content, 'utf-8');
  }
}

async function getAllFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return getAllFiles(fullPath);
      } else {
        return fullPath;
      }
    })
  );
  return files.flat();
}

// Run the build
buildVercelAPI().catch(console.error);