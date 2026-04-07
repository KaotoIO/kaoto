import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, Rest } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { CamelCatalogService } from '../../models';
import { CamelResourceFactory } from '../../models/camel/camel-resource-factory';
import { CatalogKind } from '../../models/catalog-kind';
import { EntityType } from '../../models/entities';
import { KaotoResource } from '../../models/kaoto-resource';
import { CamelRestConfigurationVisualEntity } from '../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../../models/visualization/flows/camel-rest-visual-entity';
import { TestProvidersWrapper } from '../../stubs';
import { getFirstCatalogMap } from '../../stubs/test-load-catalog';
import { RestDslEditorPage } from './RestDslEditorPage';
import { clickToolbarActionUtil } from './test-utils';

/** Helper to get REST-related entities (non-visual after refactor) */
const getRestEntities = (camelResource: KaotoResource) =>
  camelResource
    .getEntities()
    .filter((e) => e instanceof CamelRestVisualEntity || e instanceof CamelRestConfigurationVisualEntity);

/**
 * Helper function to add a REST method via modal
 */
const addRestMethod = async (path: string) => {
  await waitFor(() => {
    expect(screen.getByText('Add REST Method')).toBeTruthy();
  });

  const modal = screen.getByRole('dialog');
  const pathInput = within(modal).getByRole('textbox', { name: /Path/i });

  act(() => {
    fireEvent.change(pathInput, { target: { value: path } });
  });

  const addButton = within(modal).getByRole('button', { name: /^Add$/i });
  act(() => {
    fireEvent.click(addButton);
  });
};

describe('RestDslEditorPage', () => {
  let unmount: () => void;

  /**
   * Helper function to render RestDslEditorPage with a camel resource
   */
  const renderPage = (yamlContent: string) => {
    const camelResource = CamelResourceFactory.createCamelResource(yamlContent);
    const { Provider, updateEntitiesFromCamelResourceSpy, updateSourceCodeFromEntitiesSpy } = TestProvidersWrapper({
      camelResource,
    });

    const result = render(
      <Provider>
        <RestDslEditorPage />
      </Provider>,
    );

    unmount = result.unmount;

    return { camelResource, updateEntitiesFromCamelResourceSpy, updateSourceCodeFromEntitiesSpy };
  };

  /**
   * Helper function to select a tree node
   */
  const selectTreeNode = async (nodeName: string) => {
    const node = await screen.findByText(nodeName);
    act(() => {
      fireEvent.click(node);
    });
  };

  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, catalogsMap.patternCatalogMap);
  });

  afterEach(() => {
    unmount?.();
    jest.clearAllMocks();
  });

  describe('Entity Updates', () => {
    it('should update entity on property change', async () => {
      const { camelResource, updateSourceCodeFromEntitiesSpy } = renderPage(`
- rest:
    id: rest-1
    path: /api
    get:
      - id: get-1
        path: /users
        to:
          uri: direct:getUsers
      `);

      await selectTreeNode('rest-1');

      await waitFor(() => {
        expect(screen.getByText(/Edit/)).toBeTruthy();
      });

      const pathInput = screen.getByDisplayValue('/api');
      act(() => {
        fireEvent.change(pathInput, { target: { value: '/api/v2' } });
        fireEvent.blur(pathInput);
      });

      await waitFor(() => {
        expect(updateSourceCodeFromEntitiesSpy).toHaveBeenCalled();
      });

      const restEntity = getRestEntities(camelResource).find((e) => e.id === 'rest-1');
      expect(restEntity?.getNodeDefinition('rest')).toMatchObject({ path: '/api/v2' });
    });

    it('should add REST configuration', async () => {
      const { camelResource, updateEntitiesFromCamelResourceSpy } = renderPage(`
- rest:
    id: rest-1
      `);

      const initialCount = getRestEntities(camelResource).length;

      await clickToolbarActionUtil('Add Configuration');

      await waitFor(() => {
        expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
      });

      const entities = getRestEntities(camelResource);
      expect(entities.length).toBe(initialCount + 1);
      expect(entities.find((e) => e.type === EntityType.RestConfiguration)).toBeDefined();
    });

    it('should add REST service', async () => {
      const { camelResource, updateEntitiesFromCamelResourceSpy } = renderPage(`
- rest:
    id: rest-1
      `);

      const initialCount = getRestEntities(camelResource).length;

      await clickToolbarActionUtil('Add Service');

      await waitFor(() => {
        expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
      });

      const entities = getRestEntities(camelResource);
      expect(entities.length).toBe(initialCount + 1);
      expect(entities.filter((e) => e.type === EntityType.Rest).length).toBe(2);
    });

    it('should add REST method', async () => {
      const { camelResource, updateEntitiesFromCamelResourceSpy } = renderPage(`
- rest:
    id: rest-1
    path: /api
      `);

      await selectTreeNode('rest-1');
      await clickToolbarActionUtil('Add Operation');
      await addRestMethod('/users');

      await waitFor(() => {
        expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
      });

      const restEntity = getRestEntities(camelResource).find((e) => e.id === 'rest-1');
      const restDef = restEntity?.toJSON() as { rest: Rest };
      expect(restDef).toHaveProperty('rest.get');
      expect(Array.isArray(restDef?.rest?.get)).toBe(true);
      expect(restDef?.rest?.get?.length).toBeGreaterThan(0);
    });

    it('should delete entity', async () => {
      const { camelResource, updateEntitiesFromCamelResourceSpy } = renderPage(`
- rest:
    id: rest-1
    get:
      - id: get-1
        path: /users
        to:
          uri: direct:getUsers
- rest:
    id: rest-2
      `);

      const initialCount = getRestEntities(camelResource).length;

      await selectTreeNode('rest-1');
      await clickToolbarActionUtil('Delete');

      await waitFor(() => {
        expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
      });

      const entities = getRestEntities(camelResource);
      expect(entities.length).toBe(initialCount - 1);
      expect(entities.find((e) => e.id === 'rest-1')).toBeUndefined();
    });
  });

  describe('UI Updates', () => {
    it('should update tree and form on add REST configuration', async () => {
      const { camelResource } = renderPage(`
- rest:
    id: rest-1
      `);

      const initialCount = getRestEntities(camelResource).length;

      expect(screen.getByRole('tree', { name: 'Rest DSL Configuration' })).toBeTruthy();
      expect(screen.getByText('rest-1')).toBeTruthy();

      await clickToolbarActionUtil('Add Configuration');

      await waitFor(() => {
        expect(getRestEntities(camelResource).length).toBe(initialCount + 1);
      });

      await waitFor(() => {
        expect(screen.getByText(/restConfiguration-/)).toBeTruthy();
      });

      await waitFor(() => {
        expect(screen.getByText(/Edit/)).toBeTruthy();
      });
    });

    it('should update tree and form on add REST service', async () => {
      const { camelResource } = renderPage(`
- rest:
    id: rest-1
      `);

      expect(screen.getByText('rest-1')).toBeTruthy();

      await clickToolbarActionUtil('Add Service');

      await waitFor(() => {
        expect(getRestEntities(camelResource).length).toBe(2);
      });

      await waitFor(() => {
        const tree = screen.getByRole('tree');
        expect(within(tree).getByText(/rest-/)).toBeTruthy();
      });

      await waitFor(() => {
        expect(screen.getByText(/Edit/)).toBeTruthy();
      });
    });

    it('should update tree and form on add REST method', async () => {
      renderPage(`
- rest:
    id: rest-1
    path: /api
      `);

      await selectTreeNode('rest-1');
      await clickToolbarActionUtil('Add Operation');
      await addRestMethod('/orders');

      await waitFor(
        () => {
          const tree = screen.getByRole('tree');
          expect(within(tree).getByText('/orders')).toBeTruthy();
        },
        { timeout: 3000 },
      );

      await waitFor(() => {
        expect(screen.getByText(/Edit/)).toBeTruthy();
        expect(screen.getAllByText(/GET/).length).toBeGreaterThan(0);
      });
    });

    it('should update tree and form on delete', async () => {
      renderPage(`
- rest:
    id: rest-1
    get:
      - id: get-1
        path: /users
        to:
          uri: direct:getUsers
      - id: get-2
        path: /orders
        to:
          uri: direct:getOrders
      `);

      expect(screen.getByText('/users')).toBeTruthy();
      expect(screen.getByText('/orders')).toBeTruthy();

      await selectTreeNode('/users');

      await waitFor(() => {
        expect(screen.getByText(/Edit/)).toBeTruthy();
      });

      await clickToolbarActionUtil('Delete');

      await waitFor(() => {
        expect(screen.queryByText('/users')).toBeNull();
      });

      expect(screen.getByText('/orders')).toBeTruthy();

      await waitFor(() => {
        expect(screen.getByText('Select an entity from the list to edit its configuration')).toBeTruthy();
      });
    });
  });
});
