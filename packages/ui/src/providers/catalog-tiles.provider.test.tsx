//import componentsCatalog from '@kaoto/camel-catalog/camel-catalog-aggregate-components.json';
//import patternsCatalog from '@kaoto/camel-catalog/camel-catalog-aggregate-patterns.json';
//import kameletsBoundariesCatalog from '@kaoto/camel-catalog/kamelet-boundaries.json';
//import kameletsCatalog from '@kaoto/camel-catalog/kamelets-aggregate.json';
import * as catalogIndex from '@kaoto/camel-catalog/index.json';
import { act, render, screen } from '@testing-library/react';
import { camelComponentToTile, camelProcessorToTile, kameletToTile } from '../camel-utils';
import { CatalogKind, ICamelComponentDefinition, ICamelProcessorDefinition, IKameletDefinition } from '../models';
import { CamelCatalogService } from '../models/visualization/flows/camel-catalog.service';
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
    const componentsCatalog = await import('@kaoto/camel-catalog/' + catalogIndex.catalogs.components.file);
    const patternsCatalog = await import('@kaoto/camel-catalog/' + catalogIndex.catalogs.patterns.file);
    const kameletsCatalog = await import('@kaoto/camel-catalog/' + catalogIndex.catalogs.kamelets.file);
    const kameletsBoundariesCatalog = await import(
      '@kaoto/camel-catalog/' + catalogIndex.catalogs.kameletBoundaries.file
    );

    getCatalogByKeySpy = jest.spyOn(CamelCatalogService, 'getCatalogByKey');
    CamelCatalogService.setCatalogKey(
      CatalogKind.Component,
      componentsCatalog as unknown as Record<string, ICamelComponentDefinition>,
    );
    CamelCatalogService.setCatalogKey(
      CatalogKind.Pattern,
      patternsCatalog as unknown as Record<string, ICamelProcessorDefinition>,
    );
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, {
      ...(kameletsCatalog as unknown as Record<string, IKameletDefinition>),
      ...(kameletsBoundariesCatalog as unknown as Record<string, IKameletDefinition>),
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

    expect(getCatalogByKeySpy).toHaveBeenCalledTimes(3);
    expect(getCatalogByKeySpy).toHaveBeenCalledWith(CatalogKind.Component);
    expect(getCatalogByKeySpy).toHaveBeenCalledWith(CatalogKind.Pattern);
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
