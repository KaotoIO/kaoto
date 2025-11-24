import { renderHook } from '@testing-library/react';
import { ReactNode } from 'react';

import { CatalogTilesContext } from './catalog-tiles.provider';
import { useCatalogTiles } from './use-catalog-tiles.hook';

describe('useCatalogTiles', () => {
  it('should throw an error when used outside of CatalogTilesProvider', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useCatalogTiles());
    }).toThrow('useCatalogTiles must be used within a <CatalogProvider>');

    consoleErrorSpy.mockRestore();
  });

  it('should return the context value when used within CatalogTilesProvider', () => {
    const mockFetchTiles = jest.fn();
    const mockGetTiles = jest.fn();

    const mockContextValue = {
      fetchTiles: mockFetchTiles,
      getTiles: mockGetTiles,
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <CatalogTilesContext.Provider value={mockContextValue}>{children}</CatalogTilesContext.Provider>
    );

    const { result } = renderHook(() => useCatalogTiles(), { wrapper });

    expect(result.current).toBe(mockContextValue);
    expect(result.current.fetchTiles).toBe(mockFetchTiles);
    expect(result.current.getTiles).toBe(mockGetTiles);
  });

  it('should return fetchTiles function from context', () => {
    const mockFetchTiles = jest.fn();
    const mockGetTiles = jest.fn();

    const mockContextValue = {
      fetchTiles: mockFetchTiles,
      getTiles: mockGetTiles,
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <CatalogTilesContext.Provider value={mockContextValue}>{children}</CatalogTilesContext.Provider>
    );

    const { result } = renderHook(() => useCatalogTiles(), { wrapper });

    expect(typeof result.current.fetchTiles).toBe('function');
    expect(result.current.fetchTiles).toBe(mockFetchTiles);
  });

  it('should return getTiles function from context', () => {
    const mockFetchTiles = jest.fn();
    const mockGetTiles = jest.fn();

    const mockContextValue = {
      fetchTiles: mockFetchTiles,
      getTiles: mockGetTiles,
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <CatalogTilesContext.Provider value={mockContextValue}>{children}</CatalogTilesContext.Provider>
    );

    const { result } = renderHook(() => useCatalogTiles(), { wrapper });

    expect(typeof result.current.getTiles).toBe('function');
    expect(result.current.getTiles).toBe(mockGetTiles);
  });

  it('should maintain stable reference across re-renders when context does not change', () => {
    const mockFetchTiles = jest.fn();
    const mockGetTiles = jest.fn();

    const mockContextValue = {
      fetchTiles: mockFetchTiles,
      getTiles: mockGetTiles,
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <CatalogTilesContext.Provider value={mockContextValue}>{children}</CatalogTilesContext.Provider>
    );

    const { result, rerender } = renderHook(() => useCatalogTiles(), { wrapper });

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
  });
});
