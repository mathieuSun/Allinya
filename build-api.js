#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { promisify } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(spawn);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

async function getAllTypeScriptFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        return getAllTypeScriptFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        return fullPath;
      }
      return [];
    })
  );
  return files.flat();
}

async function compileTsFiles() {
  console.log(`${colors.cyan}🚀 Starting API TypeScript compilation...${colors.reset}\n`);
  
  const apiDir = path.join(__dirname, 'api');
  const distDir = path.join(__dirname, 'api-dist');
  
  // Clean up existing dist directory
  try {
    await fs.rm(distDir, { recursive: true, force: true });
    console.log(`${colors.yellow}📦 Cleaned existing build directory${colors.reset}`);
  } catch (err) {
    // Directory might not exist, that's fine
  }
  
  // Create dist directory
  await fs.mkdir(distDir, { recursive: true });
  
  // Get all TypeScript files
  const tsFiles = await getAllTypeScriptFiles(apiDir);
  const validTsFiles = tsFiles.filter(file => !file.includes('tsconfig.json'));
  
  console.log(`${colors.cyan}📋 Found ${validTsFiles.length} TypeScript files to compile${colors.reset}\n`);
  
  // Process each file individually to maintain directory structure
  const compilationPromises = validTsFiles.map(async (tsFile) => {
    const relativePath = path.relative(apiDir, tsFile);
    const outDir = path.join(distDir, path.dirname(relativePath));
    const fileName = path.basename(tsFile, '.ts');
    
    // Create output directory
    await fs.mkdir(outDir, { recursive: true });
    
    // Use tsup to compile individual file
    return new Promise((resolve, reject) => {
      const tsupProcess = spawn('npx', [
        'tsup',
        tsFile,
        '--format', 'esm',
        '--target', 'node18',
        '--no-splitting',
        '--silent',
        '--out-dir', outDir,
        '--entry.'+fileName, tsFile,
        '--no-dts',
        '--external', '@neondatabase/serverless',
        '--external', '@supabase/supabase-js',
        '--external', 'express',
        '--external', 'express-session',
        '--external', 'passport',
        '--external', 'passport-local',
        '--external', 'connect-pg-simple',
        '--external', 'postgres',
        '--external', 'drizzle-orm',
        '--external', 'zod',
        '--external', '@vercel/node',
        '--external', 'agora-token',
        '--external', 'memorystore',
        '--external', 'ws',
        '--external', 'dotenv',
      ], {
        stdio: 'pipe',
        shell: true
      });
      
      let stderr = '';
      tsupProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      tsupProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`  ${colors.green}✓${colors.reset} ${relativePath}`);
          resolve();
        } else {
          console.log(`  ${colors.red}✗${colors.reset} ${relativePath}`);
          if (stderr) {
            console.log(`    ${colors.red}Error: ${stderr}${colors.reset}`);
          }
          reject(new Error(`Failed to compile ${relativePath}`));
        }
      });
    });
  });
  
  // Compile all files
  try {
    await Promise.all(compilationPromises);
    console.log(`\n${colors.green}✅ Successfully compiled all TypeScript files!${colors.reset}`);
    console.log(`${colors.cyan}📁 Output directory: ${distDir}${colors.reset}`);
    
    // Copy tsconfig.json to dist for reference
    const tsConfigSrc = path.join(apiDir, 'tsconfig.json');
    const tsConfigDest = path.join(distDir, 'tsconfig.json');
    try {
      await fs.copyFile(tsConfigSrc, tsConfigDest);
      console.log(`${colors.green}✓ Copied tsconfig.json${colors.reset}`);
    } catch (err) {
      // tsconfig might not need to be copied
    }
    
  } catch (error) {
    console.error(`\n${colors.red}❌ Compilation failed:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run the compilation
compileTsFiles().catch(console.error);