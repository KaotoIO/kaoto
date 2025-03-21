import { versionCompare } from './version-compare';

describe('versionCompare', () => {
  it('should return 0 when versions are equal', () => {
    expect(versionCompare('1.0.0', '1.0.0')).toBe(0);
    expect(versionCompare('2.1.3', '2.1.3')).toBe(0);
    expect(versionCompare('10.0.0', '10.0.0')).toBe(0);
  });

  it('should return -1 when the first version is greater', () => {
    expect(versionCompare('1.0.1', '1.0.0')).toBe(-1);
    expect(versionCompare('2.1.4', '2.1.3')).toBe(-1);
    expect(versionCompare('10.0.1', '10.0.0')).toBe(-1);
    expect(versionCompare('1.10.0', '1.9.9')).toBe(-1);
  });

  it('should return 1 when the second version is greater', () => {
    expect(versionCompare('1.0.0', '1.0.1')).toBe(1);
    expect(versionCompare('2.1.3', '2.1.4')).toBe(1);
    expect(versionCompare('10.0.0', '10.0.1')).toBe(1);
    expect(versionCompare('1.9.9', '1.10.0')).toBe(1);
  });

  it('should handle versions with different lengths', () => {
    expect(versionCompare('1.0', '1.0.0')).toBe(0);
    expect(versionCompare('1.0.0', '1.0')).toBe(0);
    expect(versionCompare('1.0.1', '1.0')).toBe(-1);
    expect(versionCompare('1.0', '1.0.1')).toBe(1);
  });

  it('should handle versions with multiple digits', () => {
    expect(versionCompare('1.10.0', '1.2.0')).toBe(-1);
    expect(versionCompare('1.2.0', '1.10.0')).toBe(1);
    expect(versionCompare('1.10.10', '1.10.2')).toBe(-1);
    expect(versionCompare('1.10.2', '1.10.10')).toBe(1);
  });
});
