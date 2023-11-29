import componentsCatalog from '@kaoto-next/camel-catalog/camel-catalog-aggregate-components.json';
import patternsCatalog from '@kaoto-next/camel-catalog/camel-catalog-aggregate-patterns.json';
import kameletsCatalog from '@kaoto-next/camel-catalog/kamelets-aggregate.json';
import kameletsBoundariesCatalog from '@kaoto-next/camel-catalog/kamelets-boundaries.json';
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

  beforeEach(() => {
    getCatalogByKeySpy = jest.spyOn(CamelCatalogService, 'getCatalogByKey');
    CamelCatalogService.setCatalogKey(
      CatalogKind.Component,
      componentsCatalog as unknown as Record<string, ICamelComponentDefinition>,
    );
    CamelCatalogService.setCatalogKey(
      CatalogKind.Pattern,
      patternsCatalog as unknown as Record<string, ICamelProcessorDefinition>,
    );
    CamelCatalogService.setCatalogKey(
      CatalogKind.Kamelet,
      kameletsCatalog as unknown as Record<string, IKameletDefinition>,
    );
    CamelCatalogService.setCatalogKey(
      CatalogKind.KameletBoundary,
      kameletsBoundariesCatalog as unknown as Record<string, IKameletDefinition>,
    );
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
    expect(getCatalogByKeySpy).toHaveBeenCalledWith(CatalogKind.Kamelet);
    expect(getCatalogByKeySpy).toHaveBeenCalledWith(CatalogKind.KameletBoundary);
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
