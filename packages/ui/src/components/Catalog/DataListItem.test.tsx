import { fireEvent, render } from '@testing-library/react';

import { ITile } from './Catalog.models';
import { CatalogDataListItem } from './DataListItem';

describe('DataListItem', () => {
  const tile: ITile = {
    type: 'component',
    name: 'tile-name',
    title: 'tile-title',
    description: 'tile-description',
    tags: ['tag1', 'tag2'],
    headerTags: ['header-tag1', 'header-tag2'],
    version: '1.0',
    iconUrl: 'tile-icon-url',
  };

  it('renders correctly', async () => {
    const { container } = render(
      <CatalogDataListItem key={tile.name} tile={tile} onClick={vi.fn()} onTagClick={vi.fn()} />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it('labels the item with its title', () => {
    const { container } = render(<CatalogDataListItem tile={tile} onClick={vi.fn()} onTagClick={vi.fn()} />);

    const item = container.querySelector('li')!;
    const labelId = item.getAttribute('aria-labelledby')!;

    expect(item.id).toBe('tile-name-component');
    expect(container.querySelector(`[id="${labelId}"]`)).toHaveTextContent('tile-title');
  });

  it('exposes the same tile test id as the Gallery Tile', () => {
    const { getByTestId } = render(<CatalogDataListItem tile={tile} onClick={vi.fn()} onTagClick={vi.fn()} />);

    expect(getByTestId('tile-tile-name').tagName).toBe('LI');
  });

  it('calls onClick with the tile when clicked', () => {
    const onClick = vi.fn();
    const { container } = render(<CatalogDataListItem tile={tile} onClick={onClick} onTagClick={vi.fn()} />);

    fireEvent.click(container.querySelector('li')!);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(tile);
  });

  it.each(['Enter', ' '])('calls onClick with the tile when pressing "%s"', (key) => {
    const onClick = vi.fn();
    const { container } = render(<CatalogDataListItem tile={tile} onClick={onClick} onTagClick={vi.fn()} />);

    fireEvent.keyDown(container.querySelector('li')!, { key });

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(tile);
  });

  it('ignores keyboard events coming from nested controls', () => {
    const onClick = vi.fn();
    const { getByTestId } = render(<CatalogDataListItem tile={tile} onClick={onClick} onTagClick={vi.fn()} />);

    fireEvent.keyDown(getByTestId('tag-tag1'), { key: 'Enter' });

    expect(onClick).not.toHaveBeenCalled();
  });

  it('calls onTagClick prop when clicked without selecting the item', async () => {
    const onClick = vi.fn();
    const onTagClick = vi.fn();

    const { getByTestId } = render(<CatalogDataListItem tile={tile} onClick={onClick} onTagClick={onTagClick} />);

    fireEvent.click(getByTestId('tag-tag1'));

    expect(onTagClick).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });
});
