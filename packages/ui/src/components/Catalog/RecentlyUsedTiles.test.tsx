import { fireEvent, render, screen } from '@testing-library/react';

import { ITile } from './Catalog.models';
import { RecentlyUsedTiles } from './RecentlyUsedTiles';

describe('RecentlyUsedTiles', () => {
  const makeTile = (name: string, type = 'component'): ITile => ({
    type,
    name,
    title: `${name}-title`,
    description: `${name}-description`,
    tags: [],
    iconUrl: `${name}-icon.svg`,
  });

  it('renders nothing when recentTiles is empty', () => {
    const { container } = render(<RecentlyUsedTiles recentTiles={[]} onTileClick={vi.fn()} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders a label for each recent tile', () => {
    const tiles = [makeTile('timer'), makeTile('log'), makeTile('activemq')];

    render(<RecentlyUsedTiles recentTiles={tiles} onTileClick={vi.fn()} />);

    expect(screen.getByTestId('recently-used-tile-timer')).toBeInTheDocument();
    expect(screen.getByTestId('recently-used-tile-log')).toBeInTheDocument();
    expect(screen.getByTestId('recently-used-tile-activemq')).toBeInTheDocument();
  });

  it('calls onTileClick with the correct tile when a label is clicked', () => {
    const onTileClick = vi.fn();
    const tile = makeTile('timer');

    render(<RecentlyUsedTiles recentTiles={[tile]} onTileClick={onTileClick} />);

    fireEvent.click(screen.getByTestId('recently-used-tile-timer'));

    expect(onTileClick).toHaveBeenCalledTimes(1);
    expect(onTileClick).toHaveBeenCalledWith(tile);
  });

  it('renders tile titles as label text', () => {
    const tiles = [makeTile('timer'), makeTile('log')];

    render(<RecentlyUsedTiles recentTiles={tiles} onTileClick={vi.fn()} />);

    expect(screen.getByText('timer-title')).toBeInTheDocument();
    expect(screen.getByText('log-title')).toBeInTheDocument();
  });
});
