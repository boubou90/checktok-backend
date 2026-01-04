import dotenv from 'dotenv';
import { EnvConfig } from '../types/index.js';

dotenv.config();

// Valider que toutes les variables d'environnement requises sont présentes
function validateEnv(): EnvConfig {
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'TIKTOK_CLIENT_KEY',
    'TIKTOK_CLIENT_SECRET',
    'TIKTOK_REDIRECT_URI',
    'OPENAI_API_KEY',
    'ENCRYPTION_KEY',
    'FRONTEND_URL',
    'SESSION_SECRET',
  ];

  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please check your .env file against .env.example'
    );
  }

  // Valider la longueur de la clé de chiffrement (doit être 32+ caractères)
  if (process.env.ENCRYPTION_KEY!.length < 32) {
    throw new Error(
      'ENCRYPTION_KEY must be at least 32 characters long. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  return {
    PORT: parseInt(process.env.PORT || '3001', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY!,
    TIKTOK_CLIENT_KEY: process.env.TIKTOK_CLIENT_KEY!,
    TIKTOK_CLIENT_SECRET: process.env.TIKTOK_CLIENT_SECRET!,
    TIKTOK_REDIRECT_URI: process.env.TIKTOK_REDIRECT_URI!,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
    FRONTEND_URL: process.env.FRONTEND_URL!,
    SESSION_SECRET: process.env.SESSION_SECRET!,
  };
}

export const env = validateEnv();
