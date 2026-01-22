// Production domain - ALWAYS use this for external-facing links
const PRODUCTION_URL = 'https://homeholdem.com';

/**
 * Get the app's base URL for external-facing links.
 * Always returns the production domain, never preview/dev URLs.
 */
export function getAppUrl(): string {
  return PRODUCTION_URL;
}

/**
 * Build a full URL path using the production domain.
 * @param path - The path to append (e.g., '/dashboard', '/club/123')
 * @returns Full URL with production domain
 */
export function buildAppUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${PRODUCTION_URL}${normalizedPath}`;
}
