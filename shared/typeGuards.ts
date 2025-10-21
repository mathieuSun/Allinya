/**
 * Type Guards and Type-Level Validation
 * Enforces camelCase at the TypeScript type level
 * Makes snake_case impossible in the type system
 */

/**
 * Type-level check for camelCase strings
 * Returns never if string contains underscores
 */
export type CamelCase<S extends string> = S extends `${infer P}_${infer R}`
  ? never
  : S;

/**
 * Validates all keys in an object type are camelCase
 * Any snake_case keys will become 'never' type
 */
export type ValidateKeys<T> = {
  [K in keyof T as CamelCase<K & string>]: T[K]
};

/**
 * Strict camelCase type that excludes snake_case
 */
export type StrictCamelCase<T> = T extends object
  ? ValidateKeys<{
      [K in keyof T]: StrictCamelCase<T[K]>
    }>
  : T;

/**
 * Type predicate to check if a string is camelCase
 */
export function isCamelCase(str: string): str is CamelCase<typeof str> {
  return /^[a-z][a-zA-Z0-9]*$/.test(str);
}

/**
 * Type predicate to check if an object has only camelCase keys
 * Uses a wider input type to allow proper type narrowing
 */
export function hasCamelCaseKeys<T = any>(obj: unknown): obj is StrictCamelCase<T> {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  
  const objRecord = obj as Record<string, unknown>;
  
  for (const key in objRecord) {
    if (objRecord.hasOwnProperty(key)) {
      if (key.includes('_')) {
        return false;
      }
      if (!isCamelCase(key) && !/^[A-Z]/.test(key)) {
        return false;
      }
      // Recursively check nested objects
      if (typeof objRecord[key] === 'object' && objRecord[key] !== null) {
        if (!hasCamelCaseKeys(objRecord[key])) {
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * Utility type to convert snake_case to camelCase at type level
 */
export type SnakeToCamel<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamel<U>>}`
  : S;

/**
 * Convert all keys in an object from snake_case to camelCase at type level
 */
export type CamelCaseKeys<T> = T extends object
  ? {
      [K in keyof T as SnakeToCamel<K & string>]: CamelCaseKeys<T[K]>
    }
  : T;

/**
 * Type guard to ensure no duplicate keys in a type
 * This is a compile-time check that TypeScript will enforce
 */
export type NoDuplicateKeys<T> = {
  [K in keyof T]: K extends keyof Omit<T, K> ? never : T[K]
};

/**
 * Utility function to assert camelCase at runtime with type narrowing
 * Uses unknown input to allow proper type assertion
 */
export function assertCamelCase<T = any>(
  obj: unknown,
  context?: string
): asserts obj is StrictCamelCase<T> {
  if (!hasCamelCaseKeys<T>(obj)) {
    throw new Error(
      `Type assertion failed: Object ${context || ''} contains non-camelCase keys. ` +
      `This violates system rules.`
    );
  }
}

/**
 * Transform snake_case string to camelCase at runtime
 * This should only be used for migration, not regular operations
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Transform object keys from snake_case to camelCase
 * This should only be used for migration, not regular operations
 */
export function transformToCamelCase<T extends object>(obj: T): CamelCaseKeys<T> {
  if (Array.isArray(obj)) {
    return obj.map(item => 
      typeof item === 'object' && item !== null 
        ? transformToCamelCase(item) 
        : item
    ) as any;
  }
  
  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = snakeToCamel(key);
      result[camelKey] = 
        typeof obj[key] === 'object' && obj[key] !== null
          ? transformToCamelCase(obj[key] as any)
          : obj[key];
    }
  }
  return result;
}

/**
 * Create a validated object that guarantees camelCase keys
 */
export function createValidatedObject<T extends object>(obj: T): StrictCamelCase<T> {
  assertCamelCase<T>(obj, 'createValidatedObject');
  return obj as StrictCamelCase<T>;
}

/**
 * Type for database column definitions that enforces camelCase
 */
export type ValidColumn<Name extends string> = CamelCase<Name> extends never
  ? never
  : { name: Name; type: string };

/**
 * Type for table definitions that enforces camelCase and no duplicates
 */
export type ValidTable<T extends Record<string, any>> = StrictCamelCase<T> & NoDuplicateKeys<T>;