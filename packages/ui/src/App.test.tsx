jest.mock('./utils/color-scheme', () => ({
  setColorScheme: jest.fn(),
}));

import { act, render } from '@testing-library/react';
import App from './App';
import { ColorScheme } from './models';
import { setColorScheme } from './utils/color-scheme';

describe('App', () => {
  it('should set color theme', () => {
    act(() => {
      render(<App />);
    });

    expect(setColorScheme).toHaveBeenCalledWith(ColorScheme.Auto);
  });
});
