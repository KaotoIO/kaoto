import { render, screen } from '@testing-library/react';

import { longTileList } from '../../stubs';
import { VirtuosoWrapper } from '../../stubs/virtuoso-wrapper.mock';
import { BaseCatalog } from './BaseCatalog';
import { CatalogLayout, getTileKey } from './Catalog.models';

describe('BaseCatalog', () => {
  afterEach(() => {
    Reflect.deleteProperty(Element.prototype, 'scrollTo');
  });

  const renderCatalog = (layout: CatalogLayout, tiles = longTileList) =>
    render(<BaseCatalog tiles={tiles} catalogLayout={layout} onTagClick={vi.fn()} />, {
      wrapper: VirtuosoWrapper,
    });

  it('renders correctly with Gallery Layout', () => {
    const { container } = renderCatalog(CatalogLayout.Gallery, longTileList.slice(0, 5));

    expect(container).toMatchSnapshot();
  });

  it('renders correctly with List Layout', () => {
    const { container } = renderCatalog(CatalogLayout.List, longTileList.slice(0, 5));

    expect(container).toMatchSnapshot();
  });

  it('exposes the list items to assistive technologies', () => {
    renderCatalog(CatalogLayout.List);

    expect(
      screen.getAllByRole('listitem').filter((li) => li.classList.contains('catalog-data-list-item')),
    ).toHaveLength(longTileList.length);
  });

  it.each([CatalogLayout.Gallery, CatalogLayout.List])(
    'renders a tile element for each tile in %s layout',
    (layout) => {
      renderCatalog(layout);

      longTileList.forEach((tile) => {
        expect(document.getElementById(getTileKey(tile))).toBeInTheDocument();
      });
    },
  );

  it('keeps the gallery and data list classes used by the e2e locators', () => {
    const gallery = renderCatalog(CatalogLayout.Gallery);
    expect(gallery.container.querySelector('.pf-v6-l-gallery.pf-m-gutter')).toBeInTheDocument();
    gallery.unmount();

    const list = renderCatalog(CatalogLayout.List);
    expect(list.container.querySelector('.pf-v6-c-data-list')).toBeInTheDocument();
  });

  it('does not nest a list item inside another list item', () => {
    const { container } = renderCatalog(CatalogLayout.List);

    // 'li li' would match LabelGroup <li>s inside DataListItem <li>, which is expected PF nesting.
    // 'li > li' (direct parent-child) would only match if Virtuoso's Item wrapper is itself a <li>.
    expect(container.querySelector('li > li')).not.toBeInTheDocument();
  });

  it.each([CatalogLayout.Gallery, CatalogLayout.List])(
    'scrolls back to the top when the tiles change in %s layout',
    (layout) => {
      // jsdom does not implement Element.prototype.scrollTo, so there is nothing to spy on
      const scrollTo = vi.fn();
      Object.defineProperty(Element.prototype, 'scrollTo', { configurable: true, writable: true, value: scrollTo });
      const { rerender } = renderCatalog(layout);

      scrollTo.mockClear();

      rerender(
        <VirtuosoWrapper>
          <BaseCatalog tiles={longTileList.slice(0, 10)} catalogLayout={layout} onTagClick={vi.fn()} />
        </VirtuosoWrapper>,
      );

      expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    },
  );
});
