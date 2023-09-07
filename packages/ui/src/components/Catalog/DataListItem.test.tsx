import { render } from '@testing-library/react';
import { ITile } from './Catalog.models';
import { CatalogDataListItem } from './DataListItem';

describe('DataListItem', () => {
  const tile: ITile = {
    type: 'tile-type',
    name: 'tile-name',
    title: 'tile-title',
    description: 'tile-description',
    tags: ['tag1', 'tag2'],
    headerTags: ['header-tag1', 'header-tag2'],
    version: '1.0',
    rawObject: {},
  };

  it('renders correctly', () => {
    const { container } = render(<CatalogDataListItem key={tile.name} tile={tile} />);

    expect(container.firstChild).toMatchSnapshot();
  });
});
