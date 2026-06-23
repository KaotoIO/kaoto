import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render, waitFor } from '@testing-library/react';

import { CamelCatalogService, CatalogKind } from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel';
import { configureSourceSchemaTypes, TestProvidersWrapper } from '../../../../stubs';
import { camelRouteJson } from '../../../../stubs/camel-route';
import { getFirstCatalogMap } from '../../../../stubs/test-load-catalog';
import { NewEntity } from './NewEntity';

describe('NewEntity', () => {
  beforeAll(() => {
    configureSourceSchemaTypes();
  });

  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
  });

  it('component renders', () => {
    const { Provider } = TestProvidersWrapper();
    const wrapper = render(
      <Provider>
        <NewEntity />
      </Provider>,
    );

    const toggle = wrapper.queryByTestId('new-entity-list-dropdown');
    expect(toggle).toBeInTheDocument();
  });

  it('should call `updateEntitiesFromCamelResource` when selecting an item', async () => {
    const { Provider, updateEntitiesFromCamelResourceSpy } = TestProvidersWrapper();
    const wrapper = render(
      <Provider>
        <NewEntity />
      </Provider>,
    );

    /** Click on toggle */
    const toggle = await wrapper.findByTestId('new-entity-list-dropdown');
    act(() => {
      fireEvent.click(toggle);
    });

    /** Click on first element */
    const element = await wrapper.findAllByRole('menuitem');
    act(() => {
      fireEvent.click(element[0]);
    });

    await waitFor(async () => {
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
    });
  });

  it('should toggle list of DSLs', async () => {
    const { Provider } = TestProvidersWrapper();
    const wrapper = render(
      <Provider>
        <NewEntity />
      </Provider>,
    );

    const toggle = await wrapper.findByTestId('new-entity-list-dropdown');

    /** Click on toggle */
    act(() => {
      fireEvent.click(toggle);
    });

    const element = await wrapper.findByText('Route');
    expect(element).toBeInTheDocument();

    /** Close Select */
    act(() => {
      fireEvent.click(toggle);
    });

    await waitFor(async () => {
      expect(element).not.toBeInTheDocument();
    });
  });

  it('should close Select when pressing ESC', async () => {
    const { Provider } = TestProvidersWrapper();
    const wrapper = render(
      <Provider>
        <NewEntity />
      </Provider>,
    );

    const toggle = await wrapper.findByTestId('new-entity-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    const menu = await wrapper.findByRole('menu');

    expect(menu).toBeInTheDocument();

    /** Press Escape key to close the menu */
    act(() => {
      fireEvent.focus(menu);
      fireEvent.keyDown(menu, { key: 'Escape', code: 'Escape', charCode: 27 });
    });

    await waitFor(async () => {
      /** The close panel is an async process */
      expect(menu).not.toBeInTheDocument();
    });
  });

  describe('YAML entity filtering', () => {
    it('should show all entities including YAML-only ones', async () => {
      const { Provider, camelResource } = TestProvidersWrapper();

      const wrapper = render(
        <Provider>
          <NewEntity />
        </Provider>,
      );

      const toggle = await wrapper.findByTestId('new-entity-list-dropdown');

      /** Click on toggle */
      act(() => {
        fireEvent.click(toggle);
      });

      // Should see Configuration submenu with YAML-only entities
      const configurationMenu = await wrapper.findByText('Configuration');
      expect(configurationMenu).toBeInTheDocument();

      // Should see Error Handling submenu with YAML-only entities
      const errorHandlingMenu = await wrapper.findByText('Error Handling');
      expect(errorHandlingMenu).toBeInTheDocument();

      // YAML resource should have access to YAML-only entities
      const entityList = camelResource.getCanvasEntityList();
      expect(entityList.groups['Configuration']).toBeDefined();
      expect(entityList.groups['Error Handling']).toBeDefined();
      expect(entityList.groups['Configuration']).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'intercept' }),
          expect.objectContaining({ name: 'interceptFrom' }),
          expect.objectContaining({ name: 'onCompletion' }),
        ]),
      );
    });
  });

  describe('entity grouping', () => {
    it('should display entities in proper groups', async () => {
      const { Provider } = TestProvidersWrapper();

      const wrapper = render(
        <Provider>
          <NewEntity />
        </Provider>,
      );

      const toggle = await wrapper.findByTestId('new-entity-list-dropdown');

      /** Click on toggle */
      act(() => {
        fireEvent.click(toggle);
      });

      // Should see Route as a common (non-grouped) entity
      const routeMenuItem = await wrapper.findByText('Route');
      expect(routeMenuItem).toBeInTheDocument();

      // Should see grouped entities
      expect(wrapper.queryByText('Configuration')).toBeInTheDocument();
    });

    it('should allow selecting entities from submenus', async () => {
      const { Provider, updateEntitiesFromCamelResourceSpy } = TestProvidersWrapper();

      const wrapper = render(
        <Provider>
          <NewEntity />
        </Provider>,
      );

      const toggle = await wrapper.findByTestId('new-entity-list-dropdown');

      /** Click on toggle */
      act(() => {
        fireEvent.click(toggle);
      });

      const configurationMenu = await wrapper.findByText('Configuration');
      const menuItem = configurationMenu.closest('[role="menuitem"]');

      // Hover over Configuration to open submenu
      if (menuItem) {
        act(() => {
          fireEvent.mouseEnter(menuItem);
        });

        // Click on RouteConfiguration in submenu
        const routeConfigItem = await wrapper.findByText('RouteConfiguration');
        act(() => {
          fireEvent.click(routeConfigItem);
        });

        await waitFor(async () => {
          expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
        });
      }
    });

    it('should handle empty groups gracefully', async () => {
      const mockResource = new CamelRouteResource([camelRouteJson]);
      mockResource.initialize();

      // Mock empty groups scenario
      const originalGetCanvasEntityList = mockResource.getCanvasEntityList;
      mockResource.getCanvasEntityList = jest.fn().mockReturnValue({
        common: [{ name: 'route', title: 'Route', description: 'Route description' }],
        groups: {},
      });

      const { Provider } = TestProvidersWrapper({ camelResource: mockResource });

      const wrapper = render(
        <Provider>
          <NewEntity />
        </Provider>,
      );

      const toggle = await wrapper.findByTestId('new-entity-list-dropdown');

      /** Click on toggle */
      act(() => {
        fireEvent.click(toggle);
      });

      // Should still render the common entities
      const routeMenuItem = await wrapper.findByText('Route');
      expect(routeMenuItem).toBeInTheDocument();

      // Should not crash with empty groups
      expect(wrapper.container).toBeInTheDocument();

      // Restore original method
      mockResource.getCanvasEntityList = originalGetCanvasEntityList;
    });
  });
});
