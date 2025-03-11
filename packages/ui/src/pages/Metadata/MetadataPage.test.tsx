import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { EntitiesContext } from '../../providers/entities.provider';
import { PipeResource } from '../../models/camel';
import { CamelCatalogService } from '../../models/visualization/flows/camel-catalog.service';
import { CatalogKind } from '../../models/catalog-kind';
import { getFirstCatalogMap } from '../../stubs/test-load-catalog';
import { MetadataPage } from './MetadataPage';

const camelResource = new PipeResource();
const mockEntitiesContext = {
  camelResource,
  entities: camelResource.getEntities(),
  visualEntities: camelResource.getVisualEntities(),
  currentSchemaType: camelResource.getType(),
  updateSourceCodeFromEntities: jest.fn(),
  updateEntitiesFromCamelResource: jest.fn(),
};

describe('MetadataPage', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
  });

  it('renders "Not applicable" when the resource type is not supported', () => {
    const { container } = render(<MetadataPage />);

    expect(container).toMatchSnapshot();
    expect(screen.getByText('Not applicable')).toBeInTheDocument();
  });

  it('renders the KaotoForm when the resource type is supported', () => {
    const { container } = render(
      <EntitiesContext.Provider value={mockEntitiesContext}>
        <MetadataPage />
      </EntitiesContext.Provider>,
    );

    expect(container).toMatchSnapshot();
  });

  it('calls updateSourceCodeFromEntities when the model changes', () => {
    render(
      <EntitiesContext.Provider value={mockEntitiesContext}>
        <MetadataPage />
      </EntitiesContext.Provider>,
    );

    const addButton = screen.getAllByRole('button', { name: 'Add a new property' });
    act(() => {
      fireEvent.click(addButton[0]);
    });

    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });
});
