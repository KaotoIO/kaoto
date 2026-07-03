/**
 * Format a date string or timestamp to a human-readable format
 */
export const formatDate = (date: string | number | Date | null | undefined): string => {
  if (date === null || date === undefined) return 'N/A';

  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format a date to relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: string | number | Date | null | undefined): string => {
  if (date === null || date === undefined) return 'N/A';

  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;

    return formatDate(dateObj);
  } catch {
    return 'Invalid date';
  }
};

/**
 * Format a duration in milliseconds to human-readable format
 */
export const formatDuration = (milliseconds: number | null | undefined): string => {
  if (milliseconds === null || milliseconds === undefined) return 'N/A';
  if (milliseconds < 0) return 'Invalid duration';

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  if (seconds > 0) return `${seconds}s`;
  return `${milliseconds}ms`;
};

/**
 * Format uptime in milliseconds to human-readable format
 */
export const formatUptime = (milliseconds: number | null | undefined): string => {
  if (milliseconds === null || milliseconds === undefined) return 'N/A';
  return formatDuration(milliseconds);
};

/**
 * Format a number with thousand separators
 */
export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  return value.toLocaleString('en-US');
};

/**
 * Format a percentage value
 */
export const formatPercentage = (value: number | null | undefined, decimals = 1): string => {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format bytes to human-readable size
 */
export const formatBytes = (bytes: number | null | undefined): string => {
  if (bytes === null || bytes === undefined) return 'N/A';
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Truncate a string to a maximum length with ellipsis
 */
export const truncateString = (str: string | null | undefined, maxLength: number): string => {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
};

/**
 * Format health status to display text
 */
export const formatHealthStatus = (health: string | null | undefined): string => {
  if (!health) return 'Unknown';
  return health.charAt(0).toUpperCase() + health.slice(1).toLowerCase();
};

/**
 * Format route status to display text
 */
export const formatRouteStatus = (status: string | null | undefined): string => {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

// Made with Bob
