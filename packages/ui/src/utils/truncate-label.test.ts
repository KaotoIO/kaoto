import { doTruncateLabel } from './truncate-label';

describe('doTruncateLabel', () => {
  it('should return undefined when label is undefined', () => {
    expect(doTruncateLabel(undefined)).toBeUndefined();
  });

  it('should return truncated label when label is longer than 15 characters', () => {
    const label = 'This is a long label';
    expect(doTruncateLabel(label)).toBe('This is a lo...');
  });

  it('should return label when label is shorter than 15 characters', () => {
    const label = 'Short label';
    expect(doTruncateLabel(label)).toBe(label);
  });
});
