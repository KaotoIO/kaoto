import { Catalog, ITile } from '@kaoto-next/ui';
import { Meta, StoryFn } from '@storybook/react';
import catalog from '../cypress/fixtures/catalog.json';

export default {
  title: 'Catalog/Catalog',
  component: Catalog,
} as Meta<typeof Catalog>;

const Template: StoryFn<typeof Catalog> = (args) => {
  console.log(args);
  return <Catalog {...args} />;
};

export const CatalogWithSearch = Template.bind({});
CatalogWithSearch.args = {
  tiles: catalog as Record<string, ITile[]>,
  onTileClick: () => null,
};
