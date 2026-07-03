import { describe, expect, it } from 'vitest';

import {
  formatBytes,
  formatDate,
  formatDuration,
  formatHealthStatus,
  formatNumber,
  formatPercentage,
  formatRelativeTime,
  formatRouteStatus,
  formatUptime,
  truncateString,
} from './formatters';

describe('formatters', () => {
  describe('formatDate', () => {
    it('should format a valid date string', () => {
      const date = '2026-03-26T12:00:00Z';
      const result = formatDate(date);
      expect(result).toContain('2026');
      expect(result).toContain('Mar');
    });

    it('should format a timestamp', () => {
      const timestamp = new Date('2026-03-26T12:00:00Z').getTime();
      const result = formatDate(timestamp);
      expect(result).toContain('2026');
    });

    it('should format a Date object', () => {
      const date = new Date('2026-03-26T12:00:00Z');
      const result = formatDate(date);
      expect(result).toContain('2026');
    });

    it('should return "N/A" for null', () => {
      expect(formatDate(null)).toBe('N/A');
    });

    it('should return "N/A" for undefined', () => {
      expect(formatDate(undefined)).toBe('N/A');
    });

    it('should return "Invalid Date" for invalid date string', () => {
      expect(formatDate('invalid-date')).toBe('Invalid Date');
    });

    it('should format timestamp 0 as Unix epoch instead of N/A', () => {
      const result = formatDate(0);
      expect(result).toContain('1970');
      expect(result).not.toBe('N/A');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "Just now" for recent dates', () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe('Just now');
    });

    it('should return minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const result = formatRelativeTime(date);
      expect(result).toContain('minute');
      expect(result).toContain('ago');
    });

    it('should return hours ago', () => {
      const date = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const result = formatRelativeTime(date);
      expect(result).toContain('hour');
      expect(result).toContain('ago');
    });

    it('should return days ago', () => {
      const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      const result = formatRelativeTime(date);
      expect(result).toContain('day');
      expect(result).toContain('ago');
    });

    it('should return formatted date for old dates', () => {
      const date = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const result = formatRelativeTime(date);
      expect(result).toContain(String(date.getFullYear()));
    });

    it('should return "N/A" for null', () => {
      expect(formatRelativeTime(null)).toBe('N/A');
    });

    it('should return "Invalid Date" for invalid input', () => {
      expect(formatRelativeTime('invalid')).toBe('Invalid Date');
    });

    it('should format timestamp 0 as a date instead of N/A', () => {
      const result = formatRelativeTime(0);
      expect(result).toContain('1970');
      expect(result).not.toBe('N/A');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(5000)).toBe('5s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(125000)).toBe('2m 5s');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(7200000)).toBe('2h 0m');
    });

    it('should format days and hours', () => {
      expect(formatDuration(90000000)).toBe('1d 1h');
    });

    it('should return "N/A" for null', () => {
      expect(formatDuration(null)).toBe('N/A');
    });

    it('should return "N/A" for undefined', () => {
      expect(formatDuration(undefined)).toBe('N/A');
    });

    it('should return "Invalid duration" for negative values', () => {
      expect(formatDuration(-1000)).toBe('Invalid duration');
    });
  });

  describe('formatUptime', () => {
    it('should format uptime using formatDuration', () => {
      expect(formatUptime(5000)).toBe('5s');
      expect(formatUptime(125000)).toBe('2m 5s');
    });

    it('should return "N/A" for null', () => {
      expect(formatUptime(null)).toBe('N/A');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with thousand separators', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
    });

    it('should format small numbers', () => {
      expect(formatNumber(42)).toBe('42');
    });

    it('should return "N/A" for null', () => {
      expect(formatNumber(null)).toBe('N/A');
    });

    it('should return "N/A" for undefined', () => {
      expect(formatNumber(undefined)).toBe('N/A');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with default decimals', () => {
      expect(formatPercentage(42.567)).toBe('42.6%');
    });

    it('should format percentage with custom decimals', () => {
      expect(formatPercentage(42.567, 2)).toBe('42.57%');
    });

    it('should format zero percentage', () => {
      expect(formatPercentage(0)).toBe('0.0%');
    });

    it('should return "N/A" for null', () => {
      expect(formatPercentage(null)).toBe('N/A');
    });

    it('should return "N/A" for undefined', () => {
      expect(formatPercentage(undefined)).toBe('N/A');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(500)).toBe('500 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(2048)).toBe('2 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should return "N/A" for null', () => {
      expect(formatBytes(null)).toBe('N/A');
    });

    it('should return "N/A" for undefined', () => {
      expect(formatBytes(undefined)).toBe('N/A');
    });
  });

  describe('truncateString', () => {
    it('should truncate long strings', () => {
      expect(truncateString('This is a very long string', 10)).toBe('This is a ...');
    });

    it('should not truncate short strings', () => {
      expect(truncateString('Short', 10)).toBe('Short');
    });

    it('should return empty string for null', () => {
      expect(truncateString(null, 10)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(truncateString(undefined, 10)).toBe('');
    });
  });

  describe('formatHealthStatus', () => {
    it('should format health status', () => {
      expect(formatHealthStatus('HEALTHY')).toBe('Healthy');
      expect(formatHealthStatus('UNHEALTHY')).toBe('Unhealthy');
      expect(formatHealthStatus('DOWN')).toBe('Down');
    });

    it('should return "Unknown" for null', () => {
      expect(formatHealthStatus(null)).toBe('Unknown');
    });

    it('should return "Unknown" for undefined', () => {
      expect(formatHealthStatus(undefined)).toBe('Unknown');
    });
  });

  describe('formatRouteStatus', () => {
    it('should format route status', () => {
      expect(formatRouteStatus('STARTED')).toBe('Started');
      expect(formatRouteStatus('STOPPED')).toBe('Stopped');
      expect(formatRouteStatus('SUSPENDED')).toBe('Suspended');
    });

    it('should return "Unknown" for null', () => {
      expect(formatRouteStatus(null)).toBe('Unknown');
    });

    it('should return "Unknown" for undefined', () => {
      expect(formatRouteStatus(undefined)).toBe('Unknown');
    });
  });
});

// Made with Bob
