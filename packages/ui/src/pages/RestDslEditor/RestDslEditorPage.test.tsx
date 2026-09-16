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
import { EntitiesProvider } from '../../providers/entities.provider';
import { KaotoResourceContext } from '../../providers/kaoto-resource.provider';
import { TestProvidersWrapper } from '../../stubs';
import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../stubs/test-load-catalog';
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

  fireEvent.change(pathInput, { target: { value: path } });

  const addButton = within(modal).getByRole('button', { name: /^Add$/i });
  fireEvent.click(addButton);
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
    const node = await within(screen.getByRole('tree', { name: 'Rest DSL Configuration' })).findByText(nodeName);
    fireEvent.click(node);
  };

  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, catalogsMap.patternCatalogMap);
    setupDynamicCatalogRegistry(catalogsMap);
  });

  afterEach(() => {
    unmount?.();
    vi.clearAllMocks();
  });

  it.each([
    { type: 'Configuration', path: 'restConfiguration', before: 'localhost', after: 'example.org' },
    { type: 'Service', path: 'rest', before: '/api', after: '/api/v2' },
    { type: 'Service ID', path: 'rest', before: 'rest-1', after: 'renamed-rest' },
    { type: 'Operation', path: 'rest.get.0', before: '/users', after: '/people' },
  ])('refreshes $type properties in place after source changes', async ({ path, before, after }) => {
    const source = `
- restConfiguration:
    host: localhost
- rest:
    id: rest-1
    path: /api
    get:
      - id: get-1
        path: /users
        to:
          uri: direct:before
`;
    const original = CamelResourceFactory.createCamelResource(source);
    const updated = CamelResourceFactory.createCamelResource(source.replace(before, after));
    const originalSerialize = vi.spyOn(original, 'toSourceCode');
    const updatedSerialize = vi.spyOn(updated, 'toSourceCode');
    let finishInitialization!: () => void;
    const pending = new Promise<void>((resolve) => {
      finishInitialization = resolve;
    });
    const initialize = updated.initialize.bind(updated);
    vi.spyOn(updated, 'initialize').mockImplementation(async () => {
      await pending;
      await initialize();
    });
    const { Provider } = await TestProvidersWrapper();
    const page = (resource: KaotoResource) => (
      <KaotoResourceContext.Provider value={{ kaotoResource: resource }}>
        <EntitiesProvider>
          <RestDslEditorPage />
        </EntitiesProvider>
      </KaotoResourceContext.Provider>
    );
    // eslint-disable-next-line testing-library/no-unnecessary-act
    const { rerender } = await act(async () => render(page(original), { wrapper: Provider }));
    const entity = getRestEntities(original).find((item) => path.startsWith(item.getRootPath()))!;
    await selectTreeNode(path === 'rest.get.0' ? '/users' : entity.id);
    const input = await screen.findByDisplayValue(before);
    await selectTreeNode(path === 'rest.get.0' ? '/users' : entity.id);
    expect(screen.getByDisplayValue(before)).toBe(input);
    input.focus();
    const loadingShown = vi.fn();
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (
            node instanceof Element &&
            (node.matches('[aria-label="Loading"]') || node.querySelector('[aria-label="Loading"]'))
          ) {
            loadingShown();
          }
        });
      });
    });
    observer.observe(screen.getByLabelText('Right panel'), { childList: true, subtree: true });
    try {
      rerender(page(updated));
      expect(input).toBeVisible();
      expect(input).toHaveValue(before);
      const wasInertWhileInitializing = input.closest('[inert]') !== null;
      await act(async () => {
        finishInitialization();
      });
      await waitFor(() => {
        expect(input).toHaveValue(after);
      });
      expect(screen.getByDisplayValue(after)).toBe(input);
      expect(input).toBeVisible();
      expect(input).toHaveFocus();
      expect(input.closest('[inert]')).toBeNull();
      expect(loadingShown).not.toHaveBeenCalled();
      expect(wasInertWhileInitializing).toBe(true);
      expect(updatedSerialize).not.toHaveBeenCalled();
      if (before === 'rest-1') {
        const tree = within(screen.getByRole('tree', { name: 'Rest DSL Configuration' }));
        expect(tree.getByText(after)).toBeVisible();
        expect(tree.queryByText(before)).not.toBeInTheDocument();
      }
      fireEvent.change(input, { target: { value: 'edited' } });
      await waitFor(() => {
        expect(updatedSerialize).toHaveBeenCalledTimes(1);
      });
      expect(await updated.toSourceCode()).toContain('edited');
      expect(originalSerialize).not.toHaveBeenCalled();
    } finally {
      observer.disconnect();
    }
  });

  describe('Entity Updates', () => {
    it('updates the service tree label after editing its ID without replacing the form', async () => {
      const { camelResource, updateSourceCodeFromEntitiesSpy } = await renderPage(`
- rest:
    id: rest-1
    path: /api
`);
      await selectTreeNode('rest-1');
      const input = await screen.findByDisplayValue('rest-1');

      for (const id of ['renamed-rest', 'renamed-again']) {
        fireEvent.change(input, { target: { value: id } });

        const tree = within(screen.getByRole('tree', { name: 'Rest DSL Configuration' }));
        expect(tree.getByText(id)).toBeVisible();
        expect(tree.queryByText('rest-1')).not.toBeInTheDocument();
        expect(screen.getByText('Edit').parentElement).toHaveTextContent(`Edit ${id}`);
        expect(screen.getByDisplayValue(id)).toBe(input);
        expect(input).toBeVisible();
        expect(await camelResource.toSourceCode()).toContain(`id: ${id}`);
      }
      expect(updateSourceCodeFromEntitiesSpy).toHaveBeenCalledTimes(2);
    });

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

      await waitFor(() => {
        expect(screen.getByText(/Edit/)).toBeTruthy();
      });

      const pathInput = screen.getByDisplayValue('/api');
      fireEvent.change(pathInput, { target: { value: '/api/v2' } });
      fireEvent.blur(pathInput);

      await waitFor(() => {
        expect(updateSourceCodeFromEntitiesSpy).toHaveBeenCalled();
      });

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

      await waitFor(() => {
        expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
      });

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

      await waitFor(() => {
        expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
      });

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

      await waitFor(() => {
        expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
      });

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

      expect(screen.getByRole('tree', { name: 'Rest DSL Configuration' })).toBeTruthy();
      expect(screen.getByText('rest-1')).toBeTruthy();

      await clickToolbarActionUtil('Add Configuration');

      await waitFor(() => {
        expect(getRestEntities(camelResource)).toHaveLength(initialCount + 1);
      });

      await waitFor(() => {
        expect(screen.getByText(/restConfiguration-/)).toBeTruthy();
      });

      await waitFor(() => {
        expect(screen.getByText(/Edit/)).toBeTruthy();
      });
    });

    it('should update tree and form on add REST service', async () => {
      const { camelResource } = await renderPage(`
- rest:
    id: rest-1
      `);

      expect(screen.getByText('rest-1')).toBeTruthy();

      await clickToolbarActionUtil('Add Service');

      await waitFor(() => {
        expect(getRestEntities(camelResource)).toHaveLength(2);
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
      await renderPage(`
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

      fireEvent.contextMenu(screen.getByText('/users'), { clientX: 120, clientY: 80 });

      const deleteAction = await screen.findByRole('menuitem', { name: /Delete/ });
      fireEvent.click(deleteAction);

      await waitFor(() => {
        expect(screen.queryByText('/users')).toBeNull();
      });

      expect(screen.getByText('/orders')).toBeTruthy();
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
      expect(screen.getByText('Select an entity from the list to edit its configuration')).toBeTruthy();
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

      await waitFor(() => {
        expect(screen.getByText('Add REST Method')).toBeTruthy();
      });
    };

    it('returns focus to the Actions trigger when the modal is cancelled', async () => {
      await openAddMethodModal();

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Actions' })).toHaveFocus();
      });
    });

    it('returns focus to the Actions trigger when the modal is dismissed with Escape', async () => {
      await openAddMethodModal();

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Actions' })).toHaveFocus();
      });
    });

    it('returns focus to the Actions trigger after adding an operation rebuilds the tree', async () => {
      await openAddMethodModal();

      // Authoring a real operation bumps treeVersion and remounts the toolbar;
      // focus must still return to the (new) Actions trigger.
      await addRestMethod('/orders');

      await waitFor(() => {
        const tree = screen.getByRole('tree');
        expect(within(tree).getByText('/orders')).toBeTruthy();
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Actions' })).toHaveFocus();
      });
    });
  });
});
