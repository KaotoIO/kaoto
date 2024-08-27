import { act, fireEvent, render, screen } from '@testing-library/react';
import { CatalogLayout } from './Catalog.models';
import { BaseCatalog } from './BaseCatalog';
import { longTileList } from '../../stubs';

describe('BaseCatalog', () => {
  it('renders correctly with Gallery Layout', () => {
    const { container } = render(
      <BaseCatalog
        className="catalog__base"
        tiles={longTileList}
        catalogLayout={CatalogLayout.Gallery}
        onTagClick={jest.fn()}
      />,
    );

    expect(container).toMatchSnapshot();
  });

  it('renders correctly with List Layout', () => {
    const { container } = render(
      <BaseCatalog
        className="catalog__base"
        tiles={longTileList}
        catalogLayout={CatalogLayout.List}
        onTagClick={jest.fn()}
      />,
    );

    expect(container).toMatchSnapshot();
  });

  it('Render BaseCatalog with 60 tiles, 2 pages with 50 tiles on the 1st page and 10 tiles on the 2nd page', async () => {
    render(
      <BaseCatalog
        className="catalog__base"
        tiles={longTileList}
        catalogLayout={CatalogLayout.List}
        onTagClick={jest.fn()}
      />,
    );

    expect(screen.getByRole('spinbutton', { name: 'Current page' })).toHaveValue(1);

    expect(
      screen.getAllByRole('listitem').filter((li) => li.classList.contains('catalog-data-list-item')),
    ).toHaveLength(50);

    const nextPageButton = screen.getByRole('button', { name: 'Go to next page' });
    act(() => {
      fireEvent.click(nextPageButton);
    });
    expect(screen.getByRole('spinbutton', { name: 'Current page' })).toHaveValue(2);

    expect(
      screen.getAllByRole('listitem').filter((li) => li.classList.contains('catalog-data-list-item')),
    ).toHaveLength(10);

    expect(screen.getByRole('button', { name: 'Go to next page' })).toBeDisabled();
  });

  it('Render BaseCatalog with 60 tiles, change per page setting to 20', async () => {
    render(
      <BaseCatalog
        className="catalog__base"
        tiles={longTileList}
        catalogLayout={CatalogLayout.List}
        onTagClick={jest.fn()}
      />,
    );

    expect(screen.getByRole('spinbutton', { name: 'Current page' })).toHaveValue(1);

    const pageSetting = screen.getAllByRole('button').filter((btn) => btn.id === 'catalog-pagination-top-toggle');
    act(() => {
      fireEvent.click(pageSetting[0]);
    });

    act(() => {
      fireEvent.click(screen.getByText('20 per page'));
    });

    expect(
      screen.getAllByRole('listitem').filter((li) => li.classList.contains('catalog-data-list-item')),
    ).toHaveLength(20);

    const nextPageButton = screen.getByRole('button', { name: 'Go to next page' });
    act(() => {
      fireEvent.click(nextPageButton);
    });
    expect(screen.getByRole('spinbutton', { name: 'Current page' })).toHaveValue(2);

    expect(
      screen.getAllByRole('listitem').filter((li) => li.classList.contains('catalog-data-list-item')),
    ).toHaveLength(20);

    act(() => {
      fireEvent.click(nextPageButton);
    });
    expect(screen.getByRole('spinbutton', { name: 'Current page' })).toHaveValue(3);

    expect(
      screen.getAllByRole('listitem').filter((li) => li.classList.contains('catalog-data-list-item')),
    ).toHaveLength(20);

    expect(screen.getByRole('button', { name: 'Go to next page' })).toBeDisabled();
  });
});
