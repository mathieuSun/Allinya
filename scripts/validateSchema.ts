#!/usr/bin/env node
/**
 * Build-Time Schema Validation Script
 * Validates entire schema for camelCase compliance and duplicate detection
 * This script MUST pass for builds to succeed
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { validateCamelCase, validateTableSchema, getValidationReport } from '../shared/schemaUtils';

// ES module replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for terminal output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

// Track all violations
const violations: string[] = [];
const warnings: string[] = [];

/**
 * Recursively scan directory for TypeScript files
 */
function scanDirectory(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
      files.push(...scanDirectory(fullPath));
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Extract column definitions from schema files
 */
function extractColumnDefinitions(content: string, filePath: string): Map<string, Set<string>> {
  const tables = new Map<string, Set<string>>();
  
  // Match pgTable definitions
  const tableRegex = /pgTable\s*\(\s*["'](\w+)["']\s*,\s*\{([^}]+)\}/g;
  let match;
  
  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const columnsContent = match[2];
    
    // Extract column names
    const columnRegex = /(\w+)\s*:/g;
    const columns = new Set<string>();
    let colMatch;
    
    while ((colMatch = columnRegex.exec(columnsContent)) !== null) {
      const columnName = colMatch[1];
      columns.add(columnName);
      
      // Validate camelCase
      try {
        validateCamelCase(columnName, tableName);
      } catch (error: any) {
        violations.push(`${filePath}: ${error.message}`);
      }
    }
    
    tables.set(tableName, columns);
  }
  
  return tables;
}

/**
 * Check for snake_case patterns in code
 */
function checkForSnakeCase(content: string, filePath: string): void {
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Skip comments and strings
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }
    
    // Look for potential snake_case identifiers
    const snakeCaseRegex = /\b[a-z]+_[a-z]+\b/g;
    const matches = line.match(snakeCaseRegex);
    
    if (matches) {
      matches.forEach(match => {
        // Skip if it's inside a string
        if (!line.includes(`"${match}"`) && !line.includes(`'${match}'`)) {
          violations.push(
            `${filePath}:${index + 1} - Snake_case identifier found: "${match}"`
          );
        }
      });
    }
  });
}

/**
 * Check for duplicate columns across tables
 */
function checkForDuplicates(allTables: Map<string, Map<string, Set<string>>>): void {
  const globalColumns = new Map<string, string[]>();
  
  // Collect all columns globally
  allTables.forEach((tables, filePath) => {
    tables.forEach((columns, tableName) => {
      columns.forEach(column => {
        if (!globalColumns.has(column)) {
          globalColumns.set(column, []);
        }
        globalColumns.get(column)!.push(`${tableName} (${filePath})`);
      });
    });
  });
  
  // Check for duplicates (excluding common columns like id, createdAt, updatedAt)
  const allowedDuplicates = new Set(['id', 'createdAt', 'updatedAt']);
  
  globalColumns.forEach((locations, column) => {
    if (locations.length > 1 && !allowedDuplicates.has(column)) {
      warnings.push(
        `Column "${column}" appears in multiple tables: ${locations.join(', ')}`
      );
    }
  });
}

/**
 * Validate TypeScript interfaces and types
 */
function validateTypeDefinitions(content: string, filePath: string): void {
  // Match type and interface definitions
  const typeRegex = /(?:type|interface)\s+(\w+)\s*(?:=\s*)?\{([^}]+)\}/g;
  let match;
  
  while ((match = typeRegex.exec(content)) !== null) {
    const typeName = match[1];
    const propertiesContent = match[2];
    
    // Extract property names
    const propRegex = /(\w+)\s*[?:]*/g;
    let propMatch;
    
    while ((propMatch = propRegex.exec(propertiesContent)) !== null) {
      const propName = propMatch[1];
      
      // Check for snake_case
      if (propName.includes('_')) {
        violations.push(
          `${filePath}: Type "${typeName}" has snake_case property: "${propName}"`
        );
      }
      
      // Check for proper camelCase (excluding PascalCase for types)
      if (!/^[a-z][a-zA-Z0-9]*$/.test(propName) && !/^[A-Z]/.test(propName)) {
        if (propName !== 'null' && propName !== 'undefined' && propName !== 'string' && propName !== 'number') {
          warnings.push(
            `${filePath}: Type "${typeName}" has non-camelCase property: "${propName}"`
          );
        }
      }
    }
  }
}

/**
 * Main validation function
 */
async function validateSchema(): Promise<boolean> {
  console.log(`\n${BOLD}${BLUE}═══════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${BLUE}     SCHEMA VALIDATION - SYSTEM RULES      ${RESET}`);
  console.log(`${BOLD}${BLUE}═══════════════════════════════════════════${RESET}\n`);
  
  const projectRoot = resolve(__dirname, '..');
  const dirsToScan = ['shared', 'server', 'client/src'];
  
  const allTables = new Map<string, Map<string, Set<string>>>();
  
  // Scan each directory
  for (const dir of dirsToScan) {
    const fullPath = join(projectRoot, dir);
    
    try {
      const files = scanDirectory(fullPath);
      console.log(`${GREEN}✓${RESET} Scanning ${dir}: ${files.length} files found`);
      
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        
        // Skip node_modules and build directories
        if (file.includes('node_modules') || file.includes('dist') || file.includes('build')) {
          continue;
        }
        
        // Extract and validate schema definitions
        if (file.includes('schema')) {
          const tables = extractColumnDefinitions(content, file);
          if (tables.size > 0) {
            allTables.set(file, tables);
          }
        }
        
        // Check for snake_case in all TypeScript files
        checkForSnakeCase(content, file);
        
        // Validate type definitions
        validateTypeDefinitions(content, file);
      }
    } catch (error) {
      console.log(`${YELLOW}⚠${RESET} Could not scan ${dir}: ${error}`);
    }
  }
  
  // Check for duplicate columns
  checkForDuplicates(allTables);
  
  // Display results
  console.log(`\n${BOLD}VALIDATION RESULTS:${RESET}`);
  console.log('─'.repeat(45));
  
  if (violations.length === 0) {
    console.log(`${GREEN}✓ No violations found!${RESET}`);
  } else {
    console.log(`${RED}✗ ${violations.length} violation(s) found:${RESET}\n`);
    violations.forEach(v => console.log(`  ${RED}•${RESET} ${v}`));
  }
  
  if (warnings.length > 0) {
    console.log(`\n${YELLOW}⚠ ${warnings.length} warning(s):${RESET}\n`);
    warnings.forEach(w => console.log(`  ${YELLOW}•${RESET} ${w}`));
  }
  
  // Get validation report
  const report = getValidationReport();
  console.log(`\n${BOLD}SCHEMA STATISTICS:${RESET}`);
  console.log('─'.repeat(45));
  console.log(`Tables validated: ${report.validatedTables.length}`);
  console.log(`Total columns: ${report.totalColumns}`);
  
  if (report.validatedTables.length > 0) {
    console.log(`\nColumn counts by table:`);
    Object.entries(report.columnCounts).forEach(([table, count]) => {
      console.log(`  • ${table}: ${count} columns`);
    });
  }
  
  console.log(`\n${BOLD}${BLUE}═══════════════════════════════════════════${RESET}\n`);
  
  // Return success/failure
  if (violations.length > 0) {
    console.log(`${RED}${BOLD}BUILD FAILED: Schema validation errors must be fixed${RESET}\n`);
    return false;
  }
  
  console.log(`${GREEN}${BOLD}BUILD PASSED: Schema validation successful${RESET}\n`);
  return true;
}

// Run validation
validateSchema().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error(`${RED}Validation script error:${RESET}`, error);
  process.exit(1);
});