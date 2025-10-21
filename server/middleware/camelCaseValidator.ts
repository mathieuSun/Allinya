/**
 * Runtime Validation Middleware
 * Validates all incoming requests and database operations for camelCase compliance
 * This is a critical enforcement layer that prevents any snake_case from entering the system
 */

import type { Request, Response, NextFunction } from 'express';
import { validateObjectKeys, validateApiResponse, validateDatabaseQuery } from '../../shared/schemaUtils';

/**
 * Validates that all keys in a payload follow camelCase convention
 * @throws Error if snake_case or invalid keys are detected
 */
export function validateCamelCasePayload(obj: any, path = ''): void {
  if (!obj || typeof obj !== 'object') return;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      validateCamelCasePayload(item, `${path}[${index}]`);
    });
    return;
  }
  
  // Check each key
  for (const key in obj) {
    // Skip prototype properties
    if (!obj.hasOwnProperty(key)) continue;
    
    // Check for snake_case
    if (key.includes('_')) {
      throw new Error(
        `SYSTEM RULE VIOLATION: Snake_case key "${key}" detected at ${path}. ` +
        `Only camelCase is allowed. This is a critical system rule that cannot be violated.`
      );
    }
    
    // Check for valid camelCase (allow PascalCase for types)
    if (!/^[a-z][a-zA-Z0-9]*$/.test(key) && !/^[A-Z][a-zA-Z0-9]*$/.test(key)) {
      // Allow some special keys like $, __, but log warning
      if (!key.startsWith('$') && !key.startsWith('__')) {
        console.warn(`Warning: Non-standard key "${key}" at ${path}`);
      }
    }
    
    // Recursively validate nested objects
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      validateCamelCasePayload(obj[key], `${path}.${key}`);
    }
  }
}

/**
 * Express middleware for validating request bodies
 */
export function camelCaseBodyValidator(req: Request, res: Response, next: NextFunction): void {
  try {
    if (req.body && typeof req.body === 'object') {
      validateObjectKeys(req.body, 'request.body');
    }
    next();
  } catch (error: any) {
    console.error('CamelCase validation failed for request body:', error.message);
    res.status(400).json({
      error: 'Validation Error',
      message: error.message,
      code: 'CAMEL_CASE_VIOLATION'
    });
  }
}

/**
 * Express middleware for validating query parameters
 */
export function camelCaseQueryValidator(req: Request, res: Response, next: NextFunction): void {
  try {
    if (req.query && typeof req.query === 'object') {
      validateObjectKeys(req.query, 'request.query');
    }
    next();
  } catch (error: any) {
    console.error('CamelCase validation failed for query params:', error.message);
    res.status(400).json({
      error: 'Validation Error',
      message: error.message,
      code: 'CAMEL_CASE_VIOLATION'
    });
  }
}

/**
 * Express middleware for validating URL parameters
 */
export function camelCaseParamsValidator(req: Request, res: Response, next: NextFunction): void {
  try {
    if (req.params && typeof req.params === 'object') {
      validateObjectKeys(req.params, 'request.params');
    }
    next();
  } catch (error: any) {
    console.error('CamelCase validation failed for URL params:', error.message);
    res.status(400).json({
      error: 'Validation Error',
      message: error.message,
      code: 'CAMEL_CASE_VIOLATION'
    });
  }
}

/**
 * Wrapper for response.json() that validates outgoing data
 */
export function validateResponseWrapper(res: Response): void {
  const originalJson = res.json.bind(res);
  
  res.json = function(data: any): Response {
    try {
      // Validate the response data
      if (data && typeof data === 'object') {
        validateApiResponse(data);
      }
      return originalJson(data);
    } catch (error: any) {
      console.error('CamelCase validation failed for response:', error.message);
      // Send error response instead of invalid data
      return originalJson({
        error: 'Response Validation Error',
        message: error.message,
        code: 'CAMEL_CASE_VIOLATION'
      });
    }
  };
}

/**
 * Combined middleware that validates all aspects of a request
 */
export function strictCamelCaseValidator(req: Request, res: Response, next: NextFunction): void {
  try {
    // Validate request body
    if (req.body && typeof req.body === 'object') {
      validateObjectKeys(req.body, 'request.body');
    }
    
    // Validate query parameters
    if (req.query && typeof req.query === 'object') {
      validateObjectKeys(req.query, 'request.query');
    }
    
    // Validate URL parameters
    if (req.params && typeof req.params === 'object') {
      validateObjectKeys(req.params, 'request.params');
    }
    
    // Wrap response to validate outgoing data
    validateResponseWrapper(res);
    
    next();
  } catch (error: any) {
    console.error('Strict camelCase validation failed:', error.message);
    res.status(400).json({
      error: 'System Rule Violation',
      message: error.message,
      code: 'CAMEL_CASE_VIOLATION',
      rule: 'All keys must be in camelCase format'
    });
  }
}

/**
 * Database query interceptor to validate all database operations
 */
export function createDatabaseValidator() {
  return {
    /**
     * Validates a database query before execution
     */
    validateQuery(query: any): void {
      validateDatabaseQuery(query);
    },
    
    /**
     * Validates database results before returning them
     */
    validateResult(result: any): any {
      if (result && typeof result === 'object') {
        validateObjectKeys(result, 'database.result');
      }
      return result;
    },
    
    /**
     * Wraps a database operation with validation
     */
    wrapOperation<T>(operation: () => Promise<T>): Promise<T> {
      return operation().then(result => {
        if (result && typeof result === 'object') {
          validateObjectKeys(result, 'database.operation');
        }
        return result;
      });
    }
  };
}

/**
 * Log violations for monitoring (without blocking in development)
 */
export function logCamelCaseViolation(context: string, key: string, suggestion: string): void {
  console.error(`
╔════════════════════════════════════════════════════════════╗
║                  SYSTEM RULE VIOLATION                     ║
╠════════════════════════════════════════════════════════════╣
║ Context:    ${context.padEnd(47)}║
║ Invalid:    ${key.padEnd(47)}║
║ Suggestion: ${suggestion.padEnd(47)}║
║                                                            ║
║ This violates the absolute system rule:                   ║
║ ALL KEYS MUST BE IN CAMELCASE                            ║
╚════════════════════════════════════════════════════════════╝
  `);
}