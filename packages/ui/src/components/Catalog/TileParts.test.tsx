import { render } from '@testing-library/react';

import { ITile } from './Catalog.models';
import { TileHeaderTags, TileIcon, TileProvider } from './TileParts';

describe('TileParts', () => {
  const tile: ITile = {
    type: 'component',
    name: 'tile-name',
    title: 'tile-title',
    tags: [],
    headerTags: ['header-tag1', 'header-tag2'],
    version: '1.0',
    iconUrl: 'tile-icon-url',
  };

  describe('TileIcon', () => {
    it('renders the icon with the tile type as alt text', () => {
      const { getByAltText } = render(<TileIcon tile={tile} className="my-icon" />);

      const icon = getByAltText('component icon');
      expect(icon).toHaveAttribute('src', 'tile-icon-url');
      expect(icon).toHaveClass('my-icon');
    });

    it('renders nothing without an icon url', () => {
      const { container } = render(<TileIcon tile={{ ...tile, iconUrl: '' }} />);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('TileHeaderTags', () => {
    it('renders the header tags without the version by default', () => {
      const { queryByText } = render(<TileHeaderTags tile={tile} aria-label="tags" />);

      expect(queryByText('header-tag1')).toBeInTheDocument();
      expect(queryByText('header-tag2')).toBeInTheDocument();
      expect(queryByText('1.0')).not.toBeInTheDocument();
    });

    it('renders the version when requested', () => {
      const { queryByText } = render(<TileHeaderTags tile={tile} aria-label="tags" showVersion />);

      expect(queryByText('1.0')).toBeInTheDocument();
    });

    it('applies the tag class name to every tag', () => {
      const { getByText } = render(<TileHeaderTags tile={tile} aria-label="tags" tagClassName="my-tag" showVersion />);

      expect(getByText('header-tag1').closest('.pf-v6-c-label')).toHaveClass('my-tag');
      expect(getByText('1.0').closest('.pf-v6-c-label')).toHaveClass('my-tag');
    });
  });

  describe('TileProvider', () => {
    it('renders the provider with the prefix and the data attribute', () => {
      const { getByText } = render(<TileProvider provider="Acme" prefix="Provided by " className="extra" />);

      const provider = getByText('Provided by Acme');
      expect(provider).toHaveAttribute('data-provider', 'Acme');
      expect(provider).toHaveClass('catalog-tile-provider', 'extra');
    });
  });
});
