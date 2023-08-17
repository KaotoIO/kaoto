import { render } from '@testing-library/react';
import { CatalogKind } from '../../models';
import { ITile } from '../Catalog';
import { IconResolver } from './IconResolver';

describe('IconResolver', () => {
  const mockTile: ITile = {
    type: CatalogKind.Component,
    title: 'title',
    description: 'description',
    name: 'name',
    tags: [],
    rawObject: {},
  };

  it('should render default icon', () => {
    const { container } = render(<IconResolver tile={mockTile} />);

    expect(container.querySelector('img')).toHaveAttribute('alt', 'Camel icon');
  });

  it('should render icon from Kamelet', () => {
    const kameletTile = {
      ...mockTile,
      type: CatalogKind.Kamelet,
      rawObject: {
        metadata: {
          annotations: {
            'camel.apache.org/kamelet.icon': 'kamelet-icon.svg',
          },
        },
      },
    };

    const { container } = render(<IconResolver tile={kameletTile} />);

    expect(container.querySelector('img')).toHaveAttribute('alt', 'Kamelet icon');
    expect(container.querySelector('img')).toHaveAttribute('src', 'kamelet-icon.svg');
  });
});
