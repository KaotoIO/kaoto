import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, render, screen } from '@testing-library/react';
import { camelComponentToTile, camelProcessorToTile, kameletToTile } from '../camel-utils';
import { CatalogKind } from '../models';
import { CamelCatalogService } from '../models/visualization/flows/camel-catalog.service';
import { getFirstCatalogMap } from '../stubs/test-load-catalog';
import { CatalogTilesProvider } from './catalog-tiles.provider';

jest.mock('../camel-utils', () => {
  const actual = jest.requireActual('../camel-utils');

  return {
    ...actual,
    camelComponentToTile: jest.fn(),
    camelProcessorToTile: jest.fn(),
    kameletToTile: jest.fn(),
  };
});

describe('CatalogTilesProvider', () => {
  let getCatalogByKeySpy: jest.SpyInstance;

  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);

    getCatalogByKeySpy = jest.spyOn(CamelCatalogService, 'getCatalogByKey');
    CamelCatalogService.setCatalogKey(CatalogKind.Component, catalogsMap.componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, catalogsMap.patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, {
      ...catalogsMap.kameletsCatalogMap,
      ...catalogsMap.kameletsBoundariesCatalog,
    });
  });

  it('should render children', async () => {
    await act(async () => {
      render(
        <CatalogTilesProvider>
          <span data-testid="tiles-loaded">Loaded</span>
        </CatalogTilesProvider>,
      );
    });

    expect(screen.getByTestId('tiles-loaded')).toBeInTheDocument();
  });

  it('should query the catalog to build the tiles', async () => {
    await act(async () => {
      render(
        <CatalogTilesProvider>
          <span data-testid="tiles-loaded">Loaded</span>
        </CatalogTilesProvider>,
      );
    });

    expect(getCatalogByKeySpy).toHaveBeenCalledTimes(4);
    expect(getCatalogByKeySpy).toHaveBeenCalledWith(CatalogKind.Component);
    expect(getCatalogByKeySpy).toHaveBeenCalledWith(CatalogKind.Pattern);
    expect(getCatalogByKeySpy).toHaveBeenCalledWith(CatalogKind.Entity);
    expect(getCatalogByKeySpy).toHaveBeenCalledWith(CatalogKind.Kamelet);
  });

  it('should build the tiles', async () => {
    await act(async () => {
      render(
        <CatalogTilesProvider>
          <span data-testid="tiles-loaded">Loaded</span>
        </CatalogTilesProvider>,
      );
    });

    expect(camelComponentToTile).toHaveBeenCalled();
    expect(camelProcessorToTile).toHaveBeenCalled();
    expect(kameletToTile).toHaveBeenCalled();
  });

  it('should avoid building the tiles if the catalog is empty', async () => {
    CamelCatalogService.clearCatalogs();

    await act(async () => {
      render(
        <CatalogTilesProvider>
          <span data-testid="tiles-loaded">Loaded</span>
        </CatalogTilesProvider>,
      );
    });

    expect(camelComponentToTile).not.toHaveBeenCalled();
    expect(camelProcessorToTile).not.toHaveBeenCalled();
    expect(kameletToTile).not.toHaveBeenCalled();
  });
});
