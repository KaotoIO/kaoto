import { sortTags } from './sort-tags';
import { ITile } from './Catalog.models';

describe('sortTags()', () => {
  it('should return empty', () => {
    const tiles: ITile[] = [];
    const filterTags: string[] = [];
    const { sortedTags, overflowIndex } = sortTags(tiles, filterTags);
    expect(sortedTags.length).toBe(0);
    expect(overflowIndex).toBe(0);
  });

  it('should return empty if filter tag is not really used', () => {
    const tiles: ITile[] = [];
    const filterTags = ['eip'];
    const { sortedTags, overflowIndex } = sortTags(tiles, filterTags);
    expect(sortedTags.length).toBe(0);
    expect(overflowIndex).toBe(0);
  });

  it('should sort tags', () => {
    const tiles: ITile[] = [
      {
        type: 'component',
        name: '1',
        title: '1',
        tags: ['transformation', 'aaa-comp'],
      },
      {
        type: 'processor',
        name: '2',
        title: '2',
        tags: ['transformation', 'eip', 'aaa-proc'],
      },
    ];
    let filterTags: string[] = [];
    const { sortedTags, overflowIndex } = sortTags(tiles, filterTags);
    expect(sortedTags.length).toBe(4);
    expect(sortedTags[0]).toEqual('aaa-proc');
    expect(overflowIndex).toBe(2);
    filterTags = ['eip'];
    const { sortedTags: t1, overflowIndex: i1 } = sortTags(tiles, filterTags);
    expect(t1[0]).toEqual('eip');
    expect(i1).toBe(3);
  });
});
