import { ITile, PropertiesModal } from '@kaoto/kaoto';
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
import { useState } from 'react';

const ContextDecorator = (Story: StoryFn) => (
  <RuntimeProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
    <SchemasLoaderProvider>
      <CatalogLoaderProvider>
        <CatalogTilesProvider>
          {/* @ts-expect-error Storybook Decorator AnnotatedStoryFn */}
          <Story />
        </CatalogTilesProvider>
      </CatalogLoaderProvider>
    </SchemasLoaderProvider>
  </RuntimeProvider>
);

const aggregateTileBase = {
  type: 'processor',
  name: 'aggregate',
  title: 'Aggregate',
  description: 'Aggregates many messages into a single message',
  headerTags: ['Processor'],
  tags: ['eip', 'routing'],
};

const cronSourceTileBase = {
  type: 'kamelet',
  name: 'cron-source',
  title: 'Cron Source',
  description: 'Send events at specific time.',
  headerTags: ['Kamelet', 'Stable'],
  tags: ['source'],
  version: '4.9.0',
};

const amqpTileBase = {
  type: 'component',
  name: 'amqp',
  title: 'AMQP',
  description: 'Messaging with AMQP protocol using Apache QPid Client.',
  headerTags: ['Component', 'Stable'],
  tags: ['messaging'],
  version: '4.8.3.redhat-00004',
};

const fhirTileBase = {
  type: 'component',
  name: 'fhir',
  title: 'FHIR',
  description:
    'Exchange information in the healthcare domain using the FHIR (Fast Healthcare Interoperability Resources) standard.',
  headerTags: ['Component', 'Stable'],
  tags: ['api'],
  version: '4.8.3.redhat-00004',
};

async function tileWithIconUrl(base: Omit<ITile, 'iconUrl'>, catalogKind: CatalogKind, name: string): Promise<ITile> {
  const { icon } = await getIconRequest(catalogKind, name);
  return { ...base, iconUrl: icon };
}

const Template: StoryFn<typeof PropertiesModal> = (args, context) => {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const handleClose = () => setIsModalOpen(!isModalOpen);
  const loaded = context.loaded as { tile?: ITile } | undefined;
  const tile = loaded?.tile ?? args.tile;
  return <PropertiesModal {...args} tile={tile} onClose={handleClose} isModalOpen={isModalOpen} />;
};

export default {
  title: 'Components/PropertiesModal',
  component: PropertiesModal,
  decorators: [ContextDecorator],
  render: Template,
} as Meta<typeof PropertiesModal>;

export const ProcessorPropertiesModal: StoryObj<typeof PropertiesModal> = {
  loaders: [
    async () => ({
      tile: await tileWithIconUrl(aggregateTileBase, 'processor' as CatalogKind, 'aggregate'),
    }),
  ],
};

export const SmallKameletPropertiesModal: StoryObj<typeof PropertiesModal> = {
  loaders: [
    async () => ({
      tile: await tileWithIconUrl(cronSourceTileBase, 'kamelet' as CatalogKind, 'cron-source'),
    }),
  ],
};

export const LargeComponentPropertiesModal: StoryObj<typeof PropertiesModal> = {
  loaders: [
    async () => ({
      tile: await tileWithIconUrl(amqpTileBase, 'component' as CatalogKind, 'amqp'),
    }),
  ],
};

export const LargeComponentPropertiesModalWithApi: StoryObj<typeof PropertiesModal> = {
  loaders: [
    async () => ({
      tile: await tileWithIconUrl(fhirTileBase, 'component' as CatalogKind, 'fhir'),
    }),
  ],
};
