import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { render } from '@testing-library/react';

import { RuntimeContext } from '../../../../providers/runtime.provider';
import { TestRuntimeProviderWrapper } from '../../../../stubs';
import { RuntimeSelector } from './RuntimeSelector';

describe('RuntimeSelector', () => {
  it('displays the selected catalog name', () => {
    const { Provider: RuntimeProvider } = TestRuntimeProviderWrapper();
    const wrapper = render(
      <RuntimeProvider>
        <RuntimeSelector />
      </RuntimeProvider>,
    );

    const display = wrapper.queryByTestId('runtime-selector-display');
    expect(display).toBeInTheDocument();

    // Default catalog from TestRuntimeProviderWrapper is first in library
    const defaultCatalog = catalogLibrary.definitions[0];
    expect(wrapper.getByText(defaultCatalog.name)).toBeInTheDocument();
  });

  it('displays the correct icon for Camel catalogs', () => {
    const { Provider: RuntimeProvider } = TestRuntimeProviderWrapper((lib) =>
      lib.definitions.find((c) => c.runtime === 'Main'),
    );
    const wrapper = render(
      <RuntimeProvider>
        <RuntimeSelector />
      </RuntimeProvider>,
    );

    const display = wrapper.queryByTestId('runtime-selector-display');
    expect(display).toBeInTheDocument();

    const icon = wrapper.container.querySelector('img[alt*="Camel logo"]');
    expect(icon).toBeInTheDocument();
  });

  it('displays the correct icon for Citrus catalogs', () => {
    const { Provider: RuntimeProvider } = TestRuntimeProviderWrapper(
      (lib) => lib.definitions.find((c) => c.runtime === 'Citrus'),
      ['Citrus'],
    );
    const wrapper = render(
      <RuntimeProvider>
        <RuntimeSelector />
      </RuntimeProvider>,
    );

    const display = wrapper.queryByTestId('runtime-selector-display');
    expect(display).toBeInTheDocument();

    const icon = wrapper.container.querySelector('img[alt*="Citrus logo"]');
    expect(icon).toBeInTheDocument();
  });

  it('displays the correct icon for Quarkus catalogs', () => {
    const { Provider: RuntimeProvider } = TestRuntimeProviderWrapper((lib) =>
      lib.definitions.find((c) => c.runtime === 'Quarkus'),
    );
    const wrapper = render(
      <RuntimeProvider>
        <RuntimeSelector />
      </RuntimeProvider>,
    );

    const icon = wrapper.container.querySelector('img[alt*="Quarkus logo"]');
    expect(icon).toBeInTheDocument();
  });

  it('returns null when no catalog is selected', () => {
    const wrapper = render(
      <RuntimeContext.Provider
        value={{
          basePath: '',
          catalogLibrary: catalogLibrary,
          selectedCatalog: undefined,
          setSelectedCatalog: jest.fn(),
          compatibleRuntimes: [],
        }}
      >
        <RuntimeSelector />
      </RuntimeContext.Provider>,
    );

    const display = wrapper.queryByTestId('runtime-selector-display');
    expect(display).not.toBeInTheDocument();
  });

  it('displays a read-only runtime selector with tooltip wrapper content', () => {
    const { Provider: RuntimeProvider } = TestRuntimeProviderWrapper();
    const wrapper = render(
      <RuntimeProvider>
        <RuntimeSelector />
      </RuntimeProvider>,
    );

    const display = wrapper.getByTestId('runtime-selector-display');
    expect(display).toBeInTheDocument();
    expect(display.tagName).toBe('DIV');
    expect(display).toHaveAttribute('aria-label', 'Runtime Selector');
  });
});
