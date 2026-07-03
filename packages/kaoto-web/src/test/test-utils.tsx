import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { PropsWithChildren, ReactElement, StrictMode } from 'react';
import { BrowserRouter } from 'react-router';

interface RenderWithAllProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

/**
 * Renders a component with all providers (Router, etc.)
 * Use this for page components or components that need routing
 */
export function renderWithAllProviders(
  ui: ReactElement,
  { route = '/', ...renderOptions }: RenderWithAllProvidersOptions = {},
) {
  window.history.pushState({}, 'Test page', route);

  const Wrapper = ({ children }: PropsWithChildren) => {
    return (
      <StrictMode>
        <BrowserRouter>{children}</BrowserRouter>
      </StrictMode>
    );
  };

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Renders a component without any providers
 * Use this for pure components that don't depend on any context
 */
export function renderWithoutProviders(ui: ReactElement, renderOptions: RenderOptions = {}) {
  const Wrapper = ({ children }: PropsWithChildren) => {
    return <StrictMode>{children}</StrictMode>;
  };

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}
