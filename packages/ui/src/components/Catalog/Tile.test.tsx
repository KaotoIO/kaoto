import { fireEvent, render } from '@testing-library/react';
import { Tile } from './Tile';
import { ITile } from './Catalog.models';

describe('Tile', () => {
  const tile: ITile = {
    type: 'tile-type',
    name: 'tile-name',
    title: 'tile-title',
    description: 'tile-description',
    tags: ['tag1', 'tag2'],
    headerTags: ['header-tag1', 'header-tag2'],
    rawObject: {},
  };

  it('renders correctly', () => {
    const { container } = render(<Tile tile={tile} onClick={jest.fn()} />);

    expect(container.firstChild).toMatchSnapshot();
  });

  it('calls onClick prop when clicked', () => {
    const onClick = jest.fn();
    const { getByRole } = render(<Tile tile={tile} onClick={onClick} />);

    fireEvent.click(getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
