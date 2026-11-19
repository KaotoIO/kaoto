import { getTagColor } from './tag-color-resolver';

describe('getTagColor', () => {
  it.each([
    ['stable', 'green'],
    ['preview', 'orange'],
    ['deprecated', 'red'],
    ['component', 'blue'],
    ['processor', 'blue'],
    ['kamelet', 'blue'],
    ['messaging', 'grey'],
  ])('returns the color for the "%s" tag', (tag, color) => {
    expect(getTagColor(tag)).toBe(color);
  });

  it.each(['Stable', 'STABLE'])('ignores the case of the "%s" tag', (tag) => {
    expect(getTagColor(tag)).toBe('green');
  });
});
