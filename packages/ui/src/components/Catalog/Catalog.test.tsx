import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { VirtuosoGridMockContext } from 'react-virtuoso';

import { Catalog } from './Catalog';
import { ITile } from './Catalog.models';

const VIRTUOSO_GRID_MOCK = { viewportHeight: 2000, viewportWidth: 1000, itemHeight: 10, itemWidth: 250 };

// jsdom has no layout, so VirtuosoGrid needs fixed measurements to render the tiles
const VirtuosoGridWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
  <VirtuosoGridMockContext.Provider value={VIRTUOSO_GRID_MOCK}>{children}</VirtuosoGridMockContext.Provider>
);

describe('Catalog', () => {
  const timer: ITile = {
    type: 'component',
    name: 'timer',
    title: 'Timer',
    tags: ['scheduling'],
    provider: 'Apache Camel',
    iconUrl: '',
  };
  const kafka: ITile = {
    type: 'component',
    name: 'kafka',
    title: 'Kafka',
    tags: ['messaging'],
    provider: 'Red Hat',
    iconUrl: '',
  };
  const tiles = [timer, kafka];

  beforeEach(() => {
    localStorage.removeItem('catalogLayout');
  });

  const renderCatalog = () => render(<Catalog tiles={tiles} />, { wrapper: VirtuosoGridWrapper });

  it('shows only the tiles with a tag once the tag is clicked on a tile', () => {
    renderCatalog();

    fireEvent.click(screen.getByTestId('tag-scheduling'));

    expect(screen.getByTestId('tile-timer')).toBeInTheDocument();
    expect(screen.queryByTestId('tile-kafka')).not.toBeInTheDocument();
  });

  it('hides the tiles of a provider once the provider is deselected', () => {
    renderCatalog();

    fireEvent.click(screen.getByTestId('provider-filter-toggle'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Red Hat' }));

    expect(screen.getByTestId('tile-timer')).toBeInTheDocument();
    expect(screen.queryByTestId('tile-kafka')).not.toBeInTheDocument();
  });

  it('shows the tiles of a provider again once the provider is selected again', () => {
    renderCatalog();
    fireEvent.click(screen.getByTestId('provider-filter-toggle'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Red Hat' }));

    fireEvent.click(screen.getByRole('checkbox', { name: 'Red Hat' }));

    expect(screen.getByTestId('tile-kafka')).toBeInTheDocument();
  });

  it('shows all tiles again once the search is cleared', async () => {
    renderCatalog();
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter by name, description or tag' }), {
      target: { value: 'kafka' },
    });
    await waitFor(() => {
      expect(screen.queryByTestId('tile-timer')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    await waitFor(() => {
      expect(screen.getByTestId('tile-timer')).toBeInTheDocument();
    });
    expect(screen.getByTestId('tile-kafka')).toBeInTheDocument();
  });
});
