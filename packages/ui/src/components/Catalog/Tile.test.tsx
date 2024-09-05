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
  };

  it('renders correctly', () => {
    const { container } = render(<Tile tile={tile} onClick={jest.fn()} onTagClick={jest.fn()} />);

    expect(container.firstChild).toMatchSnapshot();
  });

  it('calls onClick and onTagClick prop when clicked', () => {
    const onClick = jest.fn();
    const onTagClick = jest.fn();

    const { getByTestId } = render(<Tile tile={tile} onClick={onClick} onTagClick={onTagClick} />);

    fireEvent.click(getByTestId('tile-header-tile-name'));
    fireEvent.click(getByTestId('tag-tag1'));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onTagClick).toHaveBeenCalledTimes(1);
  });
});
