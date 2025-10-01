jest.mock('./utils/color-scheme', () => ({
  setColorScheme: jest.fn(),
}));

import { act, render } from '@testing-library/react';
import App from './App';
import { ColorScheme } from './models';
import { ReloadProvider } from './providers';
import { setColorScheme } from './utils/color-scheme';

describe('App', () => {
  it('should set color theme', async () => {
    await act(async () => {
      render(
        <ReloadProvider>
          <App />
        </ReloadProvider>,
      );
    });

    expect(setColorScheme).toHaveBeenCalledWith(ColorScheme.Auto);
  });
});
