import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { PipeResource } from '../../models/camel';
import { CatalogKind } from '../../models/catalog-kind';
import { CamelCatalogService } from '../../models/visualization/flows/camel-catalog.service';
import { EntitiesContext } from '../../providers/entities.provider';
import { getFirstCatalogMap } from '../../stubs/test-load-catalog';
import { PipeErrorHandlerPage } from './PipeErrorHandlerPage';

const camelResource = new PipeResource();
const mockEntitiesContext = {
  camelResource,
  entities: camelResource.getEntities(),
  visualEntities: camelResource.getVisualEntities(),
  currentSchemaType: camelResource.getType(),
  updateSourceCodeFromEntities: jest.fn(),
  updateEntitiesFromCamelResource: jest.fn(),
};

describe('PipeErrorHandlerPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
  });

  it('renders "Not applicable" when the resource type is not supported', () => {
    const { container } = render(<PipeErrorHandlerPage />);

    expect(container).toMatchSnapshot();
    expect(screen.getByText('Not applicable')).toBeInTheDocument();
  });

  it('renders the KaotoForm when the resource type is supported', () => {
    const { container } = render(
      <EntitiesContext.Provider value={mockEntitiesContext}>
        <PipeErrorHandlerPage />
      </EntitiesContext.Provider>,
    );

    expect(container).toMatchSnapshot();
    expect(screen.getByRole('button', { name: 'No Pipe ErrorHandler' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log Pipe ErrorHandler' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sink Pipe ErrorHandler' })).toBeInTheDocument();
  });

  it('calls updateSourceCodeFromEntities when the model changes', () => {
    render(
      <EntitiesContext.Provider value={mockEntitiesContext}>
        <PipeErrorHandlerPage />
      </EntitiesContext.Provider>,
    );

    const addButton = screen.getByRole('button', { name: 'Add a new property' });
    act(() => {
      fireEvent.click(addButton);
    });

    expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
  });
});
