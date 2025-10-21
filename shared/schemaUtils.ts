/**
 * Schema Validation Utilities
 * Enforces camelCase naming and prevents duplicate columns
 * These are ABSOLUTE RULES that cannot be violated
 */

// Validation regex for strict camelCase (must start with lowercase letter)
const CAMEL_CASE_REGEX = /^[a-z][a-zA-Z0-9]*$/;

// Schema column tracker to prevent duplicates across all tables
const columnTracker = new Map<string, Set<string>>();

// Track all validated schemas for reporting
const validatedSchemas = new Set<string>();

/**
 * Validates that a column name follows strict camelCase rules
 * @throws Error if column name is not camelCase
 */
export function validateCamelCase(columnName: string, tableName: string): void {
  if (!CAMEL_CASE_REGEX.test(columnName)) {
    throw new Error(
      `SYSTEM RULE VIOLATION: Column "${columnName}" in table "${tableName}" must be camelCase. ` +
      `Found: ${columnName}. Valid format: must start with lowercase letter, followed by letters and numbers only.`
    );
  }
}

/**
 * Tracks columns to prevent duplicates within a table
 * @throws Error if duplicate column is detected
 */
export function trackColumn(tableName: string, columnName: string): void {
  if (!columnTracker.has(tableName)) {
    columnTracker.set(tableName, new Set());
  }
  
  const tableColumns = columnTracker.get(tableName)!;
  if (tableColumns.has(columnName)) {
    throw new Error(
      `SYSTEM RULE VIOLATION: Duplicate column "${columnName}" detected in table "${tableName}". ` +
      `Each column name must be unique within a table.`
    );
  }
  
  tableColumns.add(columnName);
}

/**
 * Validates object keys for camelCase at runtime
 * Used for API payloads and database operations
 */
export function validateObjectKeys(obj: any, context = 'root'): void {
  if (!obj || typeof obj !== 'object') return;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      validateObjectKeys(item, `${context}[${index}]`);
    });
    return;
  }
  
  // Validate object keys
  for (const key in obj) {
    // Skip prototype properties
    if (!obj.hasOwnProperty(key)) continue;
    
    // Check for snake_case
    if (key.includes('_')) {
      throw new Error(
        `SYSTEM RULE VIOLATION: Snake_case key "${key}" detected at ${context}. ` +
        `Only camelCase is allowed. Convert "${key}" to camelCase.`
      );
    }
    
    // Validate strict camelCase
    if (!CAMEL_CASE_REGEX.test(key) && !/^[A-Z]/.test(key)) {
      // Allow PascalCase for type names and constructors
      throw new Error(
        `SYSTEM RULE VIOLATION: Invalid key "${key}" at ${context}. ` +
        `Keys must be in camelCase (starting with lowercase) or PascalCase for types.`
      );
    }
    
    // Recursively validate nested objects
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      validateObjectKeys(obj[key], `${context}.${key}`);
    }
  }
}

/**
 * Wrapper for creating table columns with automatic validation
 * This ensures ALL columns go through validation
 */
export function createColumn(tableName: string, columnName: string, columnDef: any): any {
  validateCamelCase(columnName, tableName);
  trackColumn(tableName, columnName);
  validatedSchemas.add(tableName);
  return columnDef;
}

/**
 * Batch validation for table schemas
 * Use this to validate entire table definitions at once
 */
export function validateTableSchema(tableName: string, columns: Record<string, any>): void {
  for (const columnName in columns) {
    validateCamelCase(columnName, tableName);
    trackColumn(tableName, columnName);
  }
  validatedSchemas.add(tableName);
}

/**
 * Get validation report for debugging
 */
export function getValidationReport(): {
  validatedTables: string[];
  columnCounts: Record<string, number>;
  totalColumns: number;
} {
  const report = {
    validatedTables: Array.from(validatedSchemas),
    columnCounts: {} as Record<string, number>,
    totalColumns: 0
  };
  
  columnTracker.forEach((columns, table) => {
    report.columnCounts[table] = columns.size;
    report.totalColumns += columns.size;
  });
  
  return report;
}

/**
 * Clear validation state (useful for testing)
 */
export function clearValidationState(): void {
  columnTracker.clear();
  validatedSchemas.clear();
}

/**
 * Strict validation for API responses
 * Ensures all outgoing data follows camelCase rules
 */
export function validateApiResponse(data: any): any {
  validateObjectKeys(data, 'response');
  return data;
}

/**
 * Strict validation for database queries
 * Ensures all query parameters follow camelCase rules
 */
export function validateDatabaseQuery(query: any): any {
  validateObjectKeys(query, 'query');
  return query;
}