import { z } from 'zod';
// Define the environment configuration schema
const envSchema = z.object({
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
export const config = envSchema.parse(process.env);
export const supabaseConfig = {
    url: config.SUPABASE_URL,
    anonKey: config.SUPABASE_ANON_KEY,
    serviceRoleKey: config.SUPABASE_SERVICE_ROLE_KEY,
};
export const agoraConfig = {
    appId: config.AGORA_APP_ID,
    appCertificate: config.AGORA_APP_CERTIFICATE,
};
// Build timestamp and version
export const BUILD_TIMESTAMP = Date.now().toString();
export const BUILD_VERSION = "1.0.0";
