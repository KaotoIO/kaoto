import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, Rest } from '@kaoto/camel-catalog/types';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { act, FunctionComponent, PropsWithChildren, useMemo, useState } from 'react';
import type { Mock } from 'vitest';

import { CamelResourceFactory } from '../../models/camel/camel-resource-factory';
import { EntityType } from '../../models/entities';
import { KaotoResource } from '../../models/kaoto-resource';
import { CamelRestConfigurationVisualEntity } from '../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../../models/visualization/flows/camel-rest-visual-entity';
import { EntitiesContext } from '../../providers/entities.provider';
import { TestProvidersWrapper } from '../../stubs';
import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../stubs/test-load-catalog';
import { RestDslEditorPage } from './RestDslEditorPage';
import { clickToolbarActionUtil } from './test-utils';

vi.setConfig({ testTimeout: 30_000 });

/** Helper to get REST-related entities (non-visual after refactor) */
const getRestEntities = (camelResource: KaotoResource) =>
  camelResource
    .getEntities()
    .filter((e) => e instanceof CamelRestVisualEntity || e instanceof CamelRestConfigurationVisualEntity);

const RestPageEntitiesProvider: FunctionComponent<
  PropsWithChildren<{
    camelResource: KaotoResource;
    updateEntitiesFromCamelResourceSpy: Mock;
    updateSourceCodeFromEntitiesSpy: Mock;
  }>
> = ({ camelResource, updateEntitiesFromCamelResourceSpy, updateSourceCodeFromEntitiesSpy, children }) => {
  const [entities, setEntities] = useState(() => camelResource.getEntities());
  const [visualEntities, setVisualEntities] = useState(() => camelResource.getVisualEntities());

  const contextValue = useMemo(
    () => ({
      camelResource,
      entities,
      visualEntities,
      currentSchemaType: camelResource.getType(),
      updateEntitiesFromCamelResource: () => {
        updateEntitiesFromCamelResourceSpy();
        setEntities(camelResource.getEntities());
        setVisualEntities(camelResource.getVisualEntities());
        updateSourceCodeFromEntitiesSpy();
      },
      updateSourceCodeFromEntities: updateSourceCodeFromEntitiesSpy,
    }),
    [camelResource, entities, visualEntities, updateEntitiesFromCamelResourceSpy, updateSourceCodeFromEntitiesSpy],
  );

  return <EntitiesContext.Provider value={contextValue}>{children}</EntitiesContext.Provider>;
};

/**
 * Helper function to add a REST method via modal
 */
const addRestMethod = async (path: string) => {
  expect(screen.queryByText('Add REST Method')).toBeInTheDocument();

  const modal = screen.queryByRole('dialog');
  expect(modal).toBeInTheDocument();
  const pathInput = within(modal!).queryByRole('textbox', { name: /Path/i });
  expect(pathInput).toBeInTheDocument();

  fireEvent.change(pathInput!, { target: { value: path } });

  const addButton = within(modal!).queryByRole('button', { name: /^Add$/i });
  expect(addButton).toBeInTheDocument();
  fireEvent.click(addButton!);
};

describe('RestDslEditorPage', () => {
  let unmount: () => void;

  /**
   * Helper function to render RestDslEditorPage with a camel resource
   */
  const renderPage = async (yamlContent: string) => {
    const camelResource = CamelResourceFactory.createCamelResource(yamlContent);
    const { Provider, updateEntitiesFromCamelResourceSpy, updateSourceCodeFromEntitiesSpy } =
      await TestProvidersWrapper({
        camelResource,
      });

    const result = render(
      <Provider>
        <RestPageEntitiesProvider
          camelResource={camelResource}
          updateEntitiesFromCamelResourceSpy={updateEntitiesFromCamelResourceSpy}
          updateSourceCodeFromEntitiesSpy={updateSourceCodeFromEntitiesSpy}
        >
          <RestDslEditorPage />
        </RestPageEntitiesProvider>
      </Provider>,
    );

    unmount = result.unmount;

    return { camelResource, updateEntitiesFromCamelResourceSpy, updateSourceCodeFromEntitiesSpy };
  };

  /**
   * Helper function to select a tree node
   */
  const selectTreeNode = async (nodeName: string) => {
    const node = screen.queryByText(nodeName);
    expect(node).toBeInTheDocument();
    fireEvent.click(node!);
  };

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    setupDynamicCatalogRegistry(catalogsMap);
  });

  afterEach(() => {
    unmount?.();
    vi.clearAllMocks();
  });

  describe('Entity Updates', () => {
    it('should update entity on property change', async () => {
      const { camelResource, updateSourceCodeFromEntitiesSpy } = await renderPage(`
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

      await screen.findByText(/Edit/);

      const pathInput = await screen.findByDisplayValue('/api');
      fireEvent.change(pathInput, { target: { value: '/api/v2' } });
      fireEvent.blur(pathInput);

      expect(updateSourceCodeFromEntitiesSpy).toHaveBeenCalled();

      const restEntity = getRestEntities(camelResource).find((e) => e.id === 'rest-1') as CamelRestVisualEntity;
      expect(restEntity?.getRawRestDef()).toMatchObject({ path: '/api/v2' });
    });

    it('should add REST configuration', async () => {
      const { camelResource, updateEntitiesFromCamelResourceSpy } = await renderPage(`
- rest:
    id: rest-1
      `);

      const initialCount = getRestEntities(camelResource).length;

      await clickToolbarActionUtil('Add Configuration');
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();

      const entities = getRestEntities(camelResource);
      expect(entities).toHaveLength(initialCount + 1);
      expect(entities.find((e) => e.type === EntityType.RestConfiguration)).toBeDefined();
    });

    it('should add REST service', async () => {
      const { camelResource, updateEntitiesFromCamelResourceSpy } = await renderPage(`
- rest:
    id: rest-1
      `);

      const initialCount = getRestEntities(camelResource).length;

      await clickToolbarActionUtil('Add Service');
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();

      const entities = getRestEntities(camelResource);
      expect(entities).toHaveLength(initialCount + 1);
      expect(entities.filter((e) => e.type === EntityType.Rest)).toHaveLength(2);
    });

    it('should add REST method', async () => {
      const { camelResource, updateEntitiesFromCamelResourceSpy } = await renderPage(`
- rest:
    id: rest-1
    path: /api
      `);

      await selectTreeNode('rest-1');
      await clickToolbarActionUtil('Add Operation');
      await addRestMethod('/users');
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();

      const restEntity = getRestEntities(camelResource).find((e) => e.id === 'rest-1');
      const restDef = restEntity?.toJSON() as { rest: Rest };
      expect(restDef).toHaveProperty('rest.get');
      expect(Array.isArray(restDef?.rest?.get)).toBe(true);
      expect(restDef?.rest?.get?.length).toBeGreaterThan(0);
    });

    it('should delete entity', async () => {
      const { camelResource, updateEntitiesFromCamelResourceSpy } = await renderPage(`
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
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();

      const entities = getRestEntities(camelResource);
      expect(entities).toHaveLength(initialCount - 1);
      expect(entities.find((e) => e.id === 'rest-1')).toBeUndefined();
    });
  });

  describe('UI Updates', () => {
    it('should update tree and form on add REST configuration', async () => {
      const { camelResource } = await renderPage(`
- rest:
    id: rest-1
      `);

      const initialCount = getRestEntities(camelResource).length;

      expect(await screen.findByRole('tree', { name: 'Rest DSL Configuration' })).toBeTruthy();
      expect(await screen.findByText('rest-1')).toBeTruthy();

      await clickToolbarActionUtil('Add Configuration');
      expect(getRestEntities(camelResource)).toHaveLength(initialCount + 1);

      const newConfig = getRestEntities(camelResource).find((entity) => entity.type === EntityType.RestConfiguration)!;
      const tree = screen.queryByRole('tree', { name: 'Rest DSL Configuration' });
      const rightPanel = screen.queryByRole('region', { name: 'Right panel' });
      expect(within(tree!).queryByText(newConfig.id)).toBeInTheDocument();
      expect(within(rightPanel!).queryByText(newConfig.id)).toBeInTheDocument();
    });

    it('should update tree and form on add REST service', async () => {
      const { camelResource } = await renderPage(`
- rest:
    id: rest-1
      `);

      expect(await screen.findByText('rest-1')).toBeTruthy();

      await clickToolbarActionUtil('Add Service');
      expect(getRestEntities(camelResource)).toHaveLength(2);

      const newRest = getRestEntities(camelResource).find((entity) => entity.id !== 'rest-1')!;
      const tree = screen.queryByRole('tree', { name: 'Rest DSL Configuration' });
      const rightPanel = screen.queryByRole('region', { name: 'Right panel' });
      expect(within(tree!).queryByText(newRest.id)).toBeInTheDocument();
      expect(within(rightPanel!).queryByText(newRest.id)).toBeInTheDocument();
    });

    it('should update tree and form on add REST method', async () => {
      await renderPage(`
- rest:
    id: rest-1
    path: /api
      `);

      await selectTreeNode('rest-1');
      await clickToolbarActionUtil('Add Operation');
      await addRestMethod('/orders');

      const tree = screen.queryByRole('tree');
      expect(within(tree!).queryByText('/orders')).toBeInTheDocument();

      expect(screen.queryByText(/Edit/)).toBeInTheDocument();
      expect(screen.queryAllByText(/GET/)).not.toHaveLength(0);
    });

    it('should update tree and form on delete', async () => {
      await renderPage(`
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

      expect(screen.queryByText('/users')).toBeInTheDocument();
      expect(screen.queryByText('/orders')).toBeInTheDocument();

      await selectTreeNode('/users');

      expect(screen.queryByText(/Edit/)).toBeInTheDocument();

      await clickToolbarActionUtil('Delete');
      expect(screen.queryByText('/users')).toBeNull();

      expect(screen.queryByText('/orders')).toBeInTheDocument();

      expect(screen.queryByText('Select an entity from the list to edit its configuration')).toBeInTheDocument();
    });

    it('should update tree and form when deleting a right-clicked method', async () => {
      const { updateEntitiesFromCamelResourceSpy } = await renderPage(`
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

      fireEvent.contextMenu(await screen.findByText('/users'), { clientX: 120, clientY: 80 });

      const deleteAction = await screen.findByRole('menuitem', { name: /Delete/ });
      fireEvent.click(deleteAction);
      expect(screen.queryByText('/users')).toBeNull();

      expect(await screen.findByText('/orders')).toBeTruthy();
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
      expect(await screen.findByText('Select an entity from the list to edit its configuration')).toBeTruthy();
    });
  });

  describe('Add Operation modal focus management', () => {
    /** Opens the Add Operation modal for a selected REST service */
    const openAddMethodModal = async () => {
      await renderPage(`
- rest:
    id: rest-1
    path: /api
      `);

      await selectTreeNode('rest-1');
      await clickToolbarActionUtil('Add Operation');

      expect(screen.queryByText('Add REST Method')).toBeInTheDocument();
    };

    it('returns focus to the Actions trigger when the modal is cancelled', async () => {
      await openAddMethodModal();

      const cancelButton = screen.queryByRole('button', { name: 'Cancel' });
      expect(cancelButton).toBeInTheDocument();
      await act(async () => {
        cancelButton!.click();
      });

      expect(screen.queryByRole('button', { name: 'Actions' })).toHaveFocus();
    });

    it('returns focus to the Actions trigger when the modal is dismissed with Escape', async () => {
      await openAddMethodModal();

      const modal = screen.queryByRole('dialog');
      expect(modal).toBeInTheDocument();
      fireEvent.keyDown(modal!, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Actions' })).toHaveFocus();
      });
    });

    it('returns focus to the Actions trigger after adding an operation rebuilds the tree', async () => {
      await openAddMethodModal();

      // Authoring a real operation bumps treeVersion and remounts the toolbar;
      // focus must still return to the (new) Actions trigger.
      await addRestMethod('/orders');

      const tree = screen.queryByRole('tree');
      expect(within(tree!).queryByText('/orders')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Actions' })).toHaveFocus();
      });
    });
  });
});
