function removeTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function ensureLeadingSlash(value: string) {
  return value.startsWith('/') ? value : `/${value}`
}

function readEnvValue(key: string, fallback?: string): string {
  // Priority 1: Vite exposed env vars (from .env files)
  const viteValue = import.meta.env[key as keyof ImportMetaEnv]
  if (viteValue && String(viteValue).trim().length > 0) {
    return String(viteValue).trim()
  }

  // Priority 2: System environment variables (for Docker, CI/CD, etc.)
  // Note: Only VITE_* prefixed vars are exposed in browser at build time
  // For non-VITE vars, pass them as build-time variables
  
  if (fallback !== undefined) {
    return fallback
  }

  throw new Error(
    `Missing required environment variable: ${key}. ` +
    `Set it via: ` +
    `1) .env file (e.g., ${key}=http://localhost:8080) ` +
    `2) CLI (e.g., ${key}=http://localhost:8080 npm run dev) ` +
    `3) System env (e.g., export ${key}=http://localhost:8080)`,
  )
}

const apiBaseUrl = removeTrailingSlash(readEnvValue('VITE_API_BASE_URL', '/api/v1'))
const registerPath = ensureLeadingSlash(
  readEnvValue('VITE_REGISTER_ENDPOINT', '/auth/sign-up'),
)

export const env = {
  apiBaseUrl,
  registerPath,
}

export function buildApiUrl(path: string) {
  return `${apiBaseUrl}${ensureLeadingSlash(path)}`
}
