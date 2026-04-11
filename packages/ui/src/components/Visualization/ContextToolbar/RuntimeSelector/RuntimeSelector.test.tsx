import { act, fireEvent, render, waitFor } from '@testing-library/react';

import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
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
});
