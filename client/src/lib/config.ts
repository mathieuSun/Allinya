/**
 * Unified Configuration System
 * Single source of truth for all environment variables
 * Follows naming conventions: Frontend vars use VITE_ prefix, server vars have no prefix
 */

interface Config {
  // Supabase Configuration
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string; // Server only
  };
  
  // Agora Configuration
  agora: {
    appId: string;
    appCertificate?: string; // Server only
  };
  
  // Database Configuration
  database: {
    url?: string; // Server only
  };
  
  // Session Configuration
  session: {
    secret?: string; // Server only
  };
  
  // App Configuration
  app: {
    env: 'development' | 'test' | 'production';
    isDev: boolean;
    isProd: boolean;
    isTest: boolean;
    baseUrl: string;
    port: number;
  };
}

// Helper to safely get environment variable
const getEnvVar = (key: string, fallback?: string): string => {
  const value = typeof window !== 'undefined' 
    ? (import.meta.env?.[key] || fallback)
    : (process.env[key] || fallback);
  
  if (!value && !fallback) {
    console.warn(`Missing environment variable: ${key}`);
  }
  
  return value || '';
};

// Check if running in browser or server
const isBrowser = typeof window !== 'undefined';

// Build configuration object
export const config: Config = {
  supabase: {
    url: getEnvVar(isBrowser ? 'VITE_SUPABASE_URL' : 'SUPABASE_URL', ''),
    anonKey: getEnvVar(isBrowser ? 'VITE_SUPABASE_ANON_KEY' : 'SUPABASE_ANON_KEY', ''),
    serviceRoleKey: !isBrowser ? getEnvVar('SUPABASE_SERVICE_ROLE_KEY') : undefined,
  },
  
  agora: {
    appId: getEnvVar(isBrowser ? 'VITE_AGORA_APP_ID' : 'AGORA_APP_ID', ''),
    appCertificate: !isBrowser ? getEnvVar('AGORA_APP_CERTIFICATE') : undefined,
  },
  
  database: {
    url: !isBrowser ? getEnvVar('DATABASE_URL') : undefined,
  },
  
  session: {
    secret: !isBrowser ? getEnvVar('SESSION_SECRET') : undefined,
  },
  
  app: {
    env: (getEnvVar('NODE_ENV', 'development') as Config['app']['env']),
    isDev: getEnvVar('NODE_ENV', 'development') === 'development',
    isProd: getEnvVar('NODE_ENV', 'development') === 'production',
    isTest: getEnvVar('NODE_ENV', 'development') === 'test',
    baseUrl: isBrowser ? window.location.origin : `http://localhost:${getEnvVar('PORT', '5000')}`,
    port: parseInt(getEnvVar('PORT', '5000'), 10),
  },
};

// Validation function to ensure required vars are present
export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check required Supabase config
  if (!config.supabase.url) errors.push('Missing SUPABASE_URL');
  if (!config.supabase.anonKey) errors.push('Missing SUPABASE_ANON_KEY');
  
  // Check required Agora config
  if (!config.agora.appId) errors.push('Missing AGORA_APP_ID');
  
  // Server-only checks
  if (!isBrowser) {
    if (!config.supabase.serviceRoleKey) errors.push('Missing SUPABASE_SERVICE_ROLE_KEY');
    if (!config.agora.appCertificate) errors.push('Missing AGORA_APP_CERTIFICATE');
    if (!config.database.url) errors.push('Missing DATABASE_URL');
    if (!config.session.secret) errors.push('Missing SESSION_SECRET');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

// Export individual config sections for convenience
export const supabaseConfig = config.supabase;
export const agoraConfig = config.agora;
export const appConfig = config.app;

export default config;