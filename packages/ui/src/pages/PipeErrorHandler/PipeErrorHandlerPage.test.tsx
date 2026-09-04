import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { PipeResource } from '../../models/camel';
import { EntitiesContext } from '../../providers/entities.provider';
import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../stubs/test-load-catalog';
import { PipeErrorHandlerPage } from './PipeErrorHandlerPage';

const camelResource = new PipeResource();
const mockEntitiesContext = {
  camelResource,
  entities: camelResource.getEntities(),
  visualEntities: camelResource.getVisualEntities(),
  currentSchemaType: camelResource.getType(),
  updateSourceCodeFromEntities: vi.fn(),
  updateEntitiesFromCamelResource: vi.fn(),
};

describe('PipeErrorHandlerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    setupDynamicCatalogRegistry(catalogsMap);
  });

  it('renders "Not applicable" when the resource type is not supported', () => {
    const { container } = render(<PipeErrorHandlerPage />);

    expect(container).toMatchSnapshot();
    expect(screen.getByText('Not applicable')).toBeInTheDocument();
  });

  it('renders the KaotoForm when the resource type is supported', async () => {
    let container: HTMLElement;
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      ({ container } = render(
        <EntitiesContext.Provider value={mockEntitiesContext}>
          <PipeErrorHandlerPage />
        </EntitiesContext.Provider>,
      ));
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(container!).toMatchSnapshot();
    expect(screen.getByRole('button', { name: 'No Pipe ErrorHandler' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log Pipe ErrorHandler' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sink Pipe ErrorHandler' })).toBeInTheDocument();
  });

  it('calls updateSourceCodeFromEntities when the model changes', async () => {
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      render(
        <EntitiesContext.Provider value={mockEntitiesContext}>
          <PipeErrorHandlerPage />
        </EntitiesContext.Provider>,
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: 'Add a new property' });
    fireEvent.click(addButton);

    expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
  });
});
