/**
 * Validate if a string is not empty
 */
export const isNotEmpty = (value: string | null | undefined): boolean => {
  return Boolean(value && value.trim().length > 0);
};

/**
 * Validate if a value is a valid integration ID
 */
export const isValidIntegrationId = (id: string | null | undefined): boolean => {
  if (!id) return false;
  // Integration IDs should be alphanumeric with hyphens and underscores
  return /^[a-zA-Z0-9_-]+$/.test(id);
};

/**
 * Validate if a value is a valid route ID
 */
export const isValidRouteId = isValidIntegrationId;

/**
 * Validate if a value is a valid policy name
 */
export const isValidPolicyName = (name: string | null | undefined): boolean => {
  if (!name) return false;
  // Policy names should be alphanumeric with hyphens and underscores
  return /^[a-zA-Z0-9_-]+$/.test(name);
};

/**
 * Validate if a property key is valid
 */
export const isValidPropertyKey = (key: string | null | undefined): boolean => {
  if (!key) return false;
  // Property keys should be alphanumeric with dots, hyphens, and underscores
  return /^[a-zA-Z0-9._-]+$/.test(key);
};

/**
 * Validate if an object has all required properties
 */
export const hasRequiredProperties = <T extends Record<string, unknown>>(
  obj: T,
  requiredKeys: (keyof T)[],
): boolean => {
  return requiredKeys.every((key) => {
    const value = obj[key];
    return value !== null && value !== undefined && value !== '';
  });
};

/**
 * Validate if a URL is valid
 */
export const isValidUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate if a number is within a range
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Validate if a value is a positive number
 */
export const isPositiveNumber = (value: number | null | undefined): boolean => {
  return typeof value === 'number' && value > 0;
};

/**
 * Validate if a value is a non-negative number
 */
export const isNonNegativeNumber = (value: number | null | undefined): boolean => {
  return typeof value === 'number' && value >= 0;
};

// Made with Bob
