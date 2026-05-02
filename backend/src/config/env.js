import 'dotenv/config';

const required = ['PORT', 'FRONTEND_URL', 'NODE_ENV'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

// Support comma-separated list of allowed origins
const frontendUrls = process.env.FRONTEND_URL
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const env = {
  port: parseInt(process.env.PORT, 10),
  frontendUrl: frontendUrls[0],          // primary, used in logs
  frontendUrls,                            // full list for CORS
  nodeEnv: process.env.NODE_ENV,
  isDev: process.env.NODE_ENV === 'development',
  databaseUrl: process.env.DATABASE_URL,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};