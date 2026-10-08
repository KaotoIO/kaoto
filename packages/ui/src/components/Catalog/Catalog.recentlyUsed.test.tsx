import { fireEvent, render, screen } from '@testing-library/react';

import { Catalog, MAX_RECENT_TILES } from './Catalog';
import { ITile } from './Catalog.models';

describe('Catalog — recently used tracking', () => {
  const STORAGE_KEY = 'catalogRecentlyUsed';

  const makeTile = (name: string, type = 'component'): ITile => ({
    type,
    name,
    title: `${name}-title`,
    description: `${name}-description`,
    tags: [],
    iconUrl: `${name}-icon.svg`,
  });

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('catalogLayout');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('catalogLayout');
  });

  it('stores a clicked tile in localStorage', () => {
    const tile = makeTile('timer');
    const onTileClick = vi.fn();

    render(<Catalog tiles={[tile]} onTileClick={onTileClick} />);

    fireEvent.click(screen.getByTestId('tile-header-timer'));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ITile[];
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('timer');
  });

  it('deduplicates: clicking the same tile twice stores it only once', () => {
    const tile = makeTile('timer');
    const onTileClick = vi.fn();

    render(<Catalog tiles={[tile]} onTileClick={onTileClick} />);

    fireEvent.click(screen.getByTestId('tile-header-timer'));
    fireEvent.click(screen.getByTestId('tile-header-timer'));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ITile[];
    expect(stored).toHaveLength(1);
  });

  it('moves a re-selected tile to the front', () => {
    const tileA = makeTile('timer');
    const tileB = makeTile('log');

    render(<Catalog tiles={[tileA, tileB]} onTileClick={vi.fn()} />);

    fireEvent.click(screen.getByTestId('tile-header-timer'));
    fireEvent.click(screen.getByTestId('tile-header-log'));
    fireEvent.click(screen.getByTestId('tile-header-timer'));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ITile[];
    expect(stored[0].name).toBe('timer');
    expect(stored[1].name).toBe('log');
  });

  it(`caps the list at MAX_RECENT_TILES (${MAX_RECENT_TILES})`, () => {
    const tiles = Array.from({ length: MAX_RECENT_TILES + 2 }, (_, i) => makeTile(`tile-${i}`));

    render(<Catalog tiles={tiles} onTileClick={vi.fn()} />);

    tiles.forEach((tile) => {
      fireEvent.click(screen.getByTestId(`tile-header-${tile.name}`));
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ITile[];
    expect(stored).toHaveLength(MAX_RECENT_TILES);
  });

  it('shows the recently used strip after a tile is clicked', () => {
    const tile = makeTile('timer');

    render(<Catalog tiles={[tile]} onTileClick={vi.fn()} />);

    // Strip not visible initially
    expect(screen.queryByTestId('recently-used-tile-timer')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tile-header-timer'));

    expect(screen.getByTestId('recently-used-tile-timer')).toBeInTheDocument();
  });

  it('pre-populates the strip from localStorage on mount', () => {
    const tile = makeTile('timer');
    localStorage.setItem(STORAGE_KEY, JSON.stringify([tile]));

    render(<Catalog tiles={[tile]} onTileClick={vi.fn()} />);

    expect(screen.getByTestId('recently-used-tile-timer')).toBeInTheDocument();
  });

  it('hides recent entries excluded by the current catalog context without erasing history', () => {
    const tile = makeTile('timer');
    localStorage.setItem(STORAGE_KEY, JSON.stringify([tile]));

    const { rerender } = render(<Catalog tiles={[]} onTileClick={vi.fn()} />);

    expect(screen.queryByTestId('recently-used-tile-timer')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([tile]);

    rerender(<Catalog tiles={[tile]} onTileClick={vi.fn()} />);
    expect(screen.getByTestId('recently-used-tile-timer')).toBeInTheDocument();
  });

  it('uses the current catalog entry when selecting a recent tile', () => {
    const oldTile = makeTile('timer');
    const currentTile = { ...oldTile, title: 'Updated timer', iconUrl: 'new-icon.svg' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([oldTile]));
    const onTileClick = vi.fn();

    render(<Catalog tiles={[currentTile]} onTileClick={onTileClick} />);
    fireEvent.click(screen.getByTestId('recently-used-tile-timer'));

    expect(onTileClick).toHaveBeenCalledWith(currentTile);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([currentTile]);
  });

  it('keeps entries with the same name but different catalog types distinct', () => {
    const component = makeTile('log');
    const processor = makeTile('log', 'processor');
    localStorage.setItem(STORAGE_KEY, JSON.stringify([processor]));

    render(<Catalog tiles={[component]} onTileClick={vi.fn()} />);
    fireEvent.click(screen.getByTestId('tile-header-log'));

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([component, processor]);
  });

  it('persists selection before the callback unmounts the catalog', () => {
    const tile = makeTile('timer');
    const onTileClick = () => {
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([tile]);
      unmount();
    };
    const { unmount } = render(<Catalog tiles={[tile]} onTileClick={onTileClick} />);

    fireEvent.click(screen.getByTestId('tile-header-timer'));
    render(<Catalog tiles={[tile]} />);

    expect(screen.getByTestId('recently-used-tile-timer')).toBeInTheDocument();
  });

  it.each(['invalid JSON', '{}', 'null', '42', '[null, {}, 42]'])('ignores invalid stored history: %s', (stored) => {
    const tile = makeTile('timer');
    localStorage.setItem(STORAGE_KEY, stored);
    const onTileClick = vi.fn();

    render(<Catalog tiles={[tile]} onTileClick={onTileClick} />);
    expect(screen.queryByTestId('recently-used-tile-timer')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('tile-header-timer'));

    expect(onTileClick).toHaveBeenCalledWith(tile);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([tile]);
  });

  it('ignores invalid entries while preserving valid recent tile identities', () => {
    const tile = makeTile('timer');
    localStorage.setItem(STORAGE_KEY, JSON.stringify([null, {}, { name: 42, type: 'component' }, tile]));

    render(<Catalog tiles={[tile]} />);

    expect(screen.getByTestId('recently-used-tile-timer')).toBeInTheDocument();
  });

  it('still selects a tile when storage is corrupted after opening the catalog', () => {
    const tile = makeTile('timer');
    const onTileClick = vi.fn();
    render(<Catalog tiles={[tile]} onTileClick={onTileClick} />);
    localStorage.setItem(STORAGE_KEY, 'invalid JSON');

    fireEvent.click(screen.getByTestId('tile-header-timer'));

    expect(onTileClick).toHaveBeenCalledWith(tile);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([tile]);
  });

  it.each(['getItem', 'setItem'] as const)('keeps selection and in-memory history working when %s throws', (method) => {
    const tileA = makeTile('timer');
    const tileB = makeTile('log');
    const onTileClick = vi.fn();
    vi.spyOn(Storage.prototype, method).mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });

    render(<Catalog tiles={[tileA, tileB]} onTileClick={onTileClick} />);
    fireEvent.click(screen.getByTestId('tile-header-timer'));
    fireEvent.click(screen.getByTestId('tile-header-log'));
    fireEvent.click(screen.getByTestId('recently-used-tile-timer'));

    expect(onTileClick.mock.calls).toEqual([[tileA], [tileB], [tileA]]);
    expect(screen.getByTestId('recently-used-tile-log')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^recently-used-tile-/).map((element) => element.textContent)).toEqual([
      'timer-title',
      'log-title',
    ]);
  });
});
