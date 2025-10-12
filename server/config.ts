import * as dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define the environment configuration schema
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().positive()).default('5000'),
  
  // Database Configuration
  DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required'),
  
  // Session Configuration
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  
  // Supabase Configuration
  SUPABASE_URL: z.string().url().min(1, 'SUPABASE_URL is required'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  
  // Agora Configuration
  AGORA_APP_ID: z.string().min(1, 'AGORA_APP_ID is required'),
  AGORA_APP_CERTIFICATE: z.string().min(1, 'AGORA_APP_CERTIFICATE is required'),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => e.path.join('.')).join(', ');
      console.error('❌ Invalid environment configuration:');
      console.error(`Missing or invalid: ${missingVars}`);
      
      // More detailed error messages
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      
      throw new Error(`Environment validation failed. Please check your environment variables.`);
    }
    throw error;
  }
};

// Create and export the config object
export const config = parseEnv();

// Export specific configuration groups for convenience
export const databaseConfig = {
  url: config.DATABASE_URL,
} as const;

export const sessionConfig = {
  secret: config.SESSION_SECRET,
  secure: config.NODE_ENV === 'production',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
} as const;

export const supabaseConfig = {
  url: config.SUPABASE_URL,
  anonKey: config.SUPABASE_ANON_KEY,
  serviceRoleKey: config.SUPABASE_SERVICE_ROLE_KEY,
} as const;

export const agoraConfig = {
  appId: config.AGORA_APP_ID,
  appCertificate: config.AGORA_APP_CERTIFICATE,
} as const;

export const serverConfig = {
  port: config.PORT,
  isDevelopment: config.NODE_ENV === 'development',
  isProduction: config.NODE_ENV === 'production',
  isTest: config.NODE_ENV === 'test',
} as const;

// Log configuration status (without exposing sensitive values)
if (config.NODE_ENV !== 'test') {
  console.log('✅ Environment configuration loaded successfully');
  console.log(`   Mode: ${config.NODE_ENV}`);
  console.log(`   Port: ${config.PORT}`);
  console.log(`   Database: ${config.DATABASE_URL.split('@')[1]?.split('/')[0] || 'configured'}`);
  console.log(`   Supabase: ${new URL(config.SUPABASE_URL).hostname}`);
  console.log(`   Agora: Configured`);
}