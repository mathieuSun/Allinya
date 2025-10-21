/**
 * Utility functions for API endpoints
 */

/**
 * Recursively converts object keys from snake_case to camelCase
 * Handles nested objects and arrays
 */
export function snakeToCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamel(item));
  }
  
  const converted: any = {};
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    converted[camelKey] = snakeToCamel(obj[key]);
  }
  return converted;
}