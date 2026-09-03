import { useParams } from 'react-router';

import { isValidIntegrationId } from '../utils/validators';

/**
 * Reads the named route params, validates each value against the URL-safe
 * allowlist ([a-zA-Z0-9_-]), and returns either a safe record or null.
 *
 * Callers MUST check for null and render <Navigate to="/" replace /> when
 * null is returned. This keeps the redirect rendering in the component tree
 * where React Router's context is available.
 *
 * @param keys - The param names to read and validate
 * @returns A record of validated param values, or null if any param is invalid
 */
export function useSafeParams<K extends string>(keys: K[]): Record<K, string> | null {
  const params = useParams();
  const invalid = keys.some((key) => !isValidIntegrationId(params[key]));
  if (invalid) return null;
  return Object.fromEntries(keys.map((key) => [key, params[key] as string])) as Record<K, string>;
}
