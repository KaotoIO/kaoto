jest.mock('./utils/color-scheme', () => ({
  setColorScheme: jest.fn(),
}));

import { act, render } from '@testing-library/react';

import App from './App';
import { ColorScheme } from './models';
import { EntitiesContext, ReloadProvider } from './providers';
import { setColorScheme } from './utils/color-scheme';

describe('App', () => {
  it('should set color theme', async () => {
    await act(async () => {
      render(
        <EntitiesContext.Provider
          value={{
            entities: [],
            visualEntities: [],
            currentSchemaType: undefined,
            camelResource: undefined,
            isLoading: false,
            updateSourceCodeFromEntities: jest.fn(),
            updateEntitiesFromCamelResource: jest.fn(),
          }}
        >
          <ReloadProvider>
            <App />
          </ReloadProvider>
        </EntitiesContext.Provider>,
      );
    });

    expect(setColorScheme).toHaveBeenCalledWith(ColorScheme.Auto);
  });
});
