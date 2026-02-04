import { REST_DSL_VERBS } from '../../../models/special-processors.constants';
import { RestVerb } from '../restDslTypes';

/**
 * Validates if a REST operation path is valid
 */
export const isValidOperationPath = (path: string): boolean => {
  if (!path || typeof path !== 'string') return false;
  const trimmed = path.trim();
  return trimmed.length > 0;
};

/**
 * Validates if a REST operation ID is valid
 */
export const isValidOperationId = (id: string): boolean => {
  if (!id || typeof id !== 'string') return false;
  const trimmed = id.trim();
  // IDs should not contain spaces or special characters that could cause issues
  return trimmed.length > 0 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
};

/**
 * Validates if a REST verb is valid
 */
export const isValidRestVerb = (verb: string): verb is RestVerb => {
  return REST_DSL_VERBS.includes(verb);
};

/**
 * Validates if a direct endpoint URI is properly formatted
 */
export const isValidDirectEndpoint = (uri: string): boolean => {
  if (!uri || typeof uri !== 'string') return false;
  const trimmed = uri.trim();
  if (!trimmed.startsWith('direct:')) return false;
  const endpointName = trimmed.substring(7); // Remove 'direct:' prefix
  return endpointName.length > 0;
};

/**
 * Sanitizes a string to be used as a REST operation ID
 */
export const sanitizeOperationId = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-') // Replace invalid chars with dash
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
};

/**
 * Validates REST configuration properties
 */
export const validateRestConfiguration = (config: Record<string, unknown>): string[] => {
  const errors: string[] = [];

  if (config.host && typeof config.host !== 'string') {
    errors.push('Host must be a string');
  }

  if (config.port && typeof config.port !== 'number') {
    errors.push('Port must be a number');
  }

  if (config.contextPath && typeof config.contextPath !== 'string') {
    errors.push('Context path must be a string');
  }

  return errors;
};

/**
 * Validates REST element properties
 */
export const validateRestElement = (rest: Record<string, unknown>): string[] => {
  const errors: string[] = [];

  if (rest.path && typeof rest.path !== 'string') {
    errors.push('Path must be a string');
  }

  if (rest.consumes && typeof rest.consumes !== 'string') {
    errors.push('Consumes must be a string');
  }

  if (rest.produces && typeof rest.produces !== 'string') {
    errors.push('Produces must be a string');
  }

  return errors;
};
