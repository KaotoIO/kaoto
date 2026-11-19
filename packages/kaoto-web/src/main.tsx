// Third-party imports
import { FeatureFlags } from '@carbon/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { AppProvider } from './context/AppContext';
import { Router } from './routes';
// App level imports
import { initializeTheme } from './utils/theme';

const basename = import.meta.env.BASE_URL;

try {
  initializeTheme();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {/* The v12 styles (styles/_carbon-feature-flags.scss) expect the v12 icons in radio tiles. `enableV12Release`
          would also switch behaviour (e.g. the overflow menu of the forms), which has to wait for the move to v12. */}
      <FeatureFlags enableV12TileRadioIcons>
        <ErrorBoundary>
          <AppProvider>
            <BrowserRouter basename={basename}>
              <Router />
            </BrowserRouter>
          </AppProvider>
        </ErrorBoundary>
      </FeatureFlags>
    </StrictMode>,
  );
} finally {
  document.body.classList.add('ready');
}
