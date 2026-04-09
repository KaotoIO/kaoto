import { Catalog, ITile } from '@kaoto/kaoto';
import {
  type CatalogKind,
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  CatalogTilesProvider,
  getIconRequest,
  RuntimeProvider,
  SchemasLoaderProvider,
} from '@kaoto/kaoto/testing';
import { Meta, StoryFn, StoryObj } from '@storybook/react';

import catalogFixture from '../../cypress/fixtures/catalog-slim.json';

/** Shape of entries in `catalog-slim.json` (fixture may include extra fields). */
interface FixtureTile {
  type: string;
  name: string;
  title: string;
  description?: string;
  headerTags?: string[];
  tags: string[];
  version?: string;
  provider?: string;
}

function fixtureCatalogKind(tileType: string): CatalogKind {
  switch (tileType) {
    case 'Component':
      return 'component' as CatalogKind;
    case 'Kamelet':
      return 'kamelet' as CatalogKind;
    case 'Processor':
      return 'processor' as CatalogKind;
    default:
      return 'component' as CatalogKind;
  }
}

async function tilesWithIcons(rawTiles: FixtureTile[]): Promise<ITile[]> {
  return Promise.all(
    rawTiles.map(async (tile) => {
      const { icon } = await getIconRequest(fixtureCatalogKind(tile.type), tile.name);
      return { ...tile, iconUrl: icon } as ITile;
    }),
  );
}

const ContextDecorator = (Story: StoryFn) => (
  <RuntimeProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
    <SchemasLoaderProvider>
      <CatalogLoaderProvider>
        <CatalogTilesProvider>
          <Story />
        </CatalogTilesProvider>
      </CatalogLoaderProvider>
    </SchemasLoaderProvider>
  </RuntimeProvider>
);

export default {
  title: 'Catalog/Catalog',
  component: Catalog,
  decorators: [ContextDecorator],
  render: (args, { loaded }) => <Catalog {...args} tiles={(loaded?.tiles as ITile[] | undefined) ?? args.tiles} />,
} as Meta<typeof Catalog>;

export const CatalogWithSearch: StoryObj<typeof Catalog> = {
  loaders: [
    async () => ({
      tiles: await tilesWithIcons(catalogFixture as FixtureTile[]),
    }),
  ],
  args: {
    onTileClick: () => null,
  },
};
