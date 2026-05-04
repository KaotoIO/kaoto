import { Point } from '@patternfly/react-topology';

import { buildRoundedPath } from './rounded-path';

const p = (x: number, y: number) => new Point(x, y);

describe('buildRoundedPath', () => {
  it('returns an empty string for fewer than two points', () => {
    expect(buildRoundedPath([], 10)).toBe('');
    expect(buildRoundedPath([p(0, 0)], 10)).toBe('');
  });

  it('returns a straight line segment for exactly two points', () => {
    expect(buildRoundedPath([p(0, 0), p(50, 0)], 10)).toBe('M0 0 L50 0');
  });

  it('rounds a single right-angle corner with a quadratic bezier', () => {
    // Horizontal-then-vertical L shape: (0,0) → (100,0) → (100,80)
    const d = buildRoundedPath([p(0, 0), p(100, 0), p(100, 80)], 10);
    expect(d).toContain('M0 0');
    expect(d).toContain('L90 0');
    expect(d).toContain('Q100 0');
    expect(d).toContain('100 10');
    expect(d).toContain('L100 80');
  });

  it('rounds multiple corners along a stepped path', () => {
    // Two bend points, like the orthogonal edge
    const d = buildRoundedPath([p(0, 0), p(50, 0), p(50, 100), p(120, 100)], 8);
    // Approach + control + exit for each bend
    expect(d.split('Q').length - 1).toBe(2);
  });

  it('clamps the corner radius to half of the shorter adjacent segment', () => {
    // Segments of length 4 and 100 with requested radius 50 — should clamp to 2.
    const d = buildRoundedPath([p(0, 0), p(4, 0), p(4, 100)], 50);
    // The approach point sits at distance min(50, 4/2) = 2 from the bend, so x=2.
    expect(d).toContain('L2 0');
    // The exit point sits at distance min(50, 100/2) = 50 from the bend, so y=50.
    expect(d).toContain('4 50');
  });

  it('does not divide by zero when consecutive points coincide', () => {
    expect(() => buildRoundedPath([p(0, 0), p(0, 0), p(10, 10)], 5)).not.toThrow();
  });
});
