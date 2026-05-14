import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { CAMEL_RUNTIMES, TEST_RUNTIMES } from '../../../../models/catalog-runtime-types';
import { RuntimeContext } from '../../../../providers/runtime.provider';
import { TestRuntimeProviderWrapper } from '../../../../stubs';
import { RuntimeSelector } from './RuntimeSelector';

describe('RuntimeSelector', () => {
  it('displays the selected catalog name', () => {
    const { Provider: RuntimeProvider } = TestRuntimeProviderWrapper();
    const wrapper = render(
      <MemoryRouter>
        <RuntimeProvider>
          <RuntimeSelector />
        </RuntimeProvider>
      </MemoryRouter>,
    );

    const display = wrapper.queryByTestId('runtime-selector-display');
    expect(display).toBeInTheDocument();

    // Default catalog from TestRuntimeProviderWrapper is first in library
    const defaultCatalog = catalogLibrary.definitions[0];
    expect(wrapper.getByText(defaultCatalog.name)).toBeInTheDocument();
  });

  it('displays a link to settings', () => {
    const { Provider: RuntimeProvider } = TestRuntimeProviderWrapper();
    render(
      <MemoryRouter>
        <RuntimeProvider>
          <RuntimeSelector />
        </RuntimeProvider>
      </MemoryRouter>,
    );

    const settingsLink = screen.getByRole('link', { name: /go to settings/i });
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute('href', '/settings');
  });

  it('returns null when no catalog is selected', () => {
    const wrapper = render(
      <MemoryRouter>
        <RuntimeContext.Provider
          value={{
            basePath: '',
            catalogLibrary: catalogLibrary,
            selectedCatalog: undefined,
            setSelectedCatalog: jest.fn(),
            compatibleRuntimes: [],
            camelCatalog: { version: '4.18.0', runtime: CAMEL_RUNTIMES[0] },
            testingCatalog: { version: '4.10.1', runtime: TEST_RUNTIMES[0] },
          }}
        >
          <RuntimeSelector />
        </RuntimeContext.Provider>
      </MemoryRouter>,
    );

    const display = wrapper.queryByTestId('runtime-selector-display');
    expect(display).not.toBeInTheDocument();
  });

  it('displays a read-only runtime selector with accessible label', () => {
    const { Provider: RuntimeProvider } = TestRuntimeProviderWrapper();
    const wrapper = render(
      <MemoryRouter>
        <RuntimeProvider>
          <RuntimeSelector />
        </RuntimeProvider>
      </MemoryRouter>,
    );

    const display = wrapper.getByTestId('runtime-selector-display');
    expect(display).toBeInTheDocument();
    expect(display).toHaveAttribute('aria-label', 'Runtime Selector');
  });
});
