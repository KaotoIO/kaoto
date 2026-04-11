import { act, fireEvent, render, waitFor } from '@testing-library/react';

import { TestProvidersWrapper, TestRuntimeProviderWrapper } from '../../../../stubs';
import { RuntimeSelector } from './RuntimeSelector';

describe('RuntimeSelector', () => {
  it('component renders', () => {
    const { Provider: RuntimeProvider } = TestRuntimeProviderWrapper();
    const { Provider: EntitiesProvider } = TestProvidersWrapper();
    const wrapper = render(
      <RuntimeProvider>
        <EntitiesProvider>
          <RuntimeSelector />
        </EntitiesProvider>
      </RuntimeProvider>,
    );

    const toggle = wrapper.queryByTestId('runtime-selector-list-dropdown');
    expect(toggle).toBeInTheDocument();
  });

  it('should call `setSelectedCatalog` when selecting an item', async () => {
    const { Provider: RuntimeProvider, setSelectedCatalog } = TestRuntimeProviderWrapper();
    const { Provider: EntitiesProvider } = TestProvidersWrapper();
    const wrapper = render(
      <RuntimeProvider>
        <EntitiesProvider>
          <RuntimeSelector />
        </EntitiesProvider>
      </RuntimeProvider>,
    );

    /** Click on toggle */
    const toggle = await wrapper.findByTestId('runtime-selector-list-dropdown');
    await act(async () => {
      fireEvent.click(toggle);
    });

    /** Click on the first submenu */
    const submenu = await wrapper.findByTestId('runtime-selector-Main');
    await act(async () => {
      fireEvent.mouseEnter(submenu);
      fireEvent.click(submenu);
    });

    /** Click on first element */
    const [element] = await wrapper.findAllByRole('menuitem');
    await act(async () => {
      fireEvent.mouseEnter(element);
      fireEvent.click(element);
    });

    await waitFor(async () => {
      expect(setSelectedCatalog).toHaveBeenCalled();
    });
  });

  it('should toggle list of Runtimes', async () => {
    const { Provider: RuntimeProvider } = TestRuntimeProviderWrapper();
    const { Provider: EntitiesProvider } = TestProvidersWrapper();
    const wrapper = render(
      <RuntimeProvider>
        <EntitiesProvider>
          <RuntimeSelector />
        </EntitiesProvider>
      </RuntimeProvider>,
    );

    const toggle = await wrapper.findByTestId('runtime-selector-list-dropdown');

    /** Click on toggle */
    act(() => {
      fireEvent.click(toggle);
    });

    const element = await wrapper.findByText('Main');
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
    const { Provider: RuntimeProvider } = TestRuntimeProviderWrapper();
    const { Provider: EntitiesProvider } = TestProvidersWrapper();
    const wrapper = render(
      <RuntimeProvider>
        <EntitiesProvider>
          <RuntimeSelector />
        </EntitiesProvider>
      </RuntimeProvider>,
    );

    const toggle = await wrapper.findByTestId('runtime-selector-list-dropdown');

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

  describe('runtime filtering based on compatible runtimes', () => {
    it('should display only compatible runtimes for Camel Route resources', async () => {
      const { Provider: RuntimeProvider } = TestRuntimeProviderWrapper();
      const { Provider: EntitiesProvider } = TestProvidersWrapper();
      const wrapper = render(
        <RuntimeProvider>
          <EntitiesProvider>
            <RuntimeSelector />
          </EntitiesProvider>
        </RuntimeProvider>,
      );

      const toggle = await wrapper.findByTestId('runtime-selector-list-dropdown');

      /** Open Select */
      act(() => {
        fireEvent.click(toggle);
      });

      /** Should show Main, Quarkus, and Spring Boot for Camel resources */
      const mainRuntime = await wrapper.findByTestId('runtime-selector-Main');
      expect(mainRuntime).toBeInTheDocument();

      const quarkusRuntime = await wrapper.findByTestId('runtime-selector-Quarkus');
      expect(quarkusRuntime).toBeInTheDocument();

      const springBootRuntime = await wrapper.findByTestId('runtime-selector-Spring Boot');
      expect(springBootRuntime).toBeInTheDocument();

      /** Should not show Citrus runtime for Camel resources */
      const citrusRuntime = wrapper.queryByTestId('runtime-selector-Citrus');
      expect(citrusRuntime).not.toBeInTheDocument();
    });

    it('should group runtimes correctly based on compatible runtimes', async () => {
      const { Provider: RuntimeProvider } = TestRuntimeProviderWrapper();
      const { Provider: EntitiesProvider } = TestProvidersWrapper();
      const wrapper = render(
        <RuntimeProvider>
          <EntitiesProvider>
            <RuntimeSelector />
          </EntitiesProvider>
        </RuntimeProvider>,
      );

      const toggle = await wrapper.findByTestId('runtime-selector-list-dropdown');

      /** Open Select */
      act(() => {
        fireEvent.click(toggle);
      });

      /** Verify that runtime groups are present */
      const menuList = await wrapper.findByTestId('runtime-selector-list');
      expect(menuList).toBeInTheDocument();

      /** Check that Main group exists */
      const mainGroup = await wrapper.findByTestId('runtime-selector-Main');
      expect(mainGroup).toBeInTheDocument();
    });

    it('should filter out incompatible runtime groups', async () => {
      const { Provider: RuntimeProvider } = TestRuntimeProviderWrapper();
      const { Provider: EntitiesProvider } = TestProvidersWrapper();
      const wrapper = render(
        <RuntimeProvider>
          <EntitiesProvider>
            <RuntimeSelector />
          </EntitiesProvider>
        </RuntimeProvider>,
      );

      const toggle = await wrapper.findByTestId('runtime-selector-list-dropdown');

      /** Open Select */
      act(() => {
        fireEvent.click(toggle);
      });

      /** Verify that only compatible runtime groups are shown */
      const menuList = await wrapper.findByTestId('runtime-selector-list');
      expect(menuList).toBeInTheDocument();

      /** For Camel resources, should have Main, Quarkus, Spring Boot groups */
      const mainRuntime = wrapper.queryByTestId('runtime-selector-Main');
      const quarkusRuntime = wrapper.queryByTestId('runtime-selector-Quarkus');
      const springBootRuntime = wrapper.queryByTestId('runtime-selector-Spring Boot');

      expect(mainRuntime).toBeInTheDocument();
      expect(quarkusRuntime).toBeInTheDocument();
      expect(springBootRuntime).toBeInTheDocument();

      /** Citrus should not be in the list for Camel resources */
      const citrusRuntime = wrapper.queryByTestId('runtime-selector-Citrus');
      expect(citrusRuntime).not.toBeInTheDocument();
    });
  });
});
