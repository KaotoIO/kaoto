import { ITile, PropertiesModal } from '@kaoto/kaoto';
import {
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  CatalogTilesProvider,
  RuntimeProvider,
  SchemasLoaderProvider,
} from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';

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

const aggregateTile = {
  type: 'processor',
  name: 'aggregate',
  title: 'Aggregate',
  description: 'Aggregates many messages into a single message',
  headerTags: ['Processor'],
  tags: ['eip', 'routing'],
};

const cronSourceTile = {
  type: 'kamelet',
  name: 'cron-source',
  title: 'Cron Source',
  description: 'Send events at specific time.',
  headerTags: ['Kamelet', 'Stable'],
  tags: ['source'],
  version: '4.9.0',
};

const amqpTile = {
  type: 'component',
  name: 'amqp',
  title: 'AMQP',
  description: 'Messaging with AMQP protocol using Apache QPid Client.',
  headerTags: ['Component', 'Stable'],
  tags: ['messaging'],
  version: '4.8.0.redhat-00017',
};

const fhirTile = {
  type: 'component',
  name: 'fhir',
  title: 'FHIR',
  description:
    'Exchange information in the healthcare domain using the FHIR (Fast Healthcare Interoperability Resources) standard.',
  headerTags: ['Component', 'Stable'],
  tags: ['api'],
  version: '4.8.0.redhat-00017',
};

export default {
  title: 'Components/PropertiesModal',
  component: PropertiesModal,
  decorators: [ContextDecorator],
} as Meta<typeof PropertiesModal>;

const Template: StoryFn<typeof PropertiesModal> = (args) => {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const handleClose = () => setIsModalOpen(!isModalOpen);
  return <PropertiesModal {...args} onClose={handleClose} isModalOpen={isModalOpen} />;
};

export const ProcessorPropertiesModal = Template.bind({});
ProcessorPropertiesModal.args = {
  tile: aggregateTile as ITile,
};

export const SmallKameletPropertiesModal = Template.bind({});
SmallKameletPropertiesModal.args = {
  tile: cronSourceTile as ITile,
};

export const LargeComponentPropertiesModal = Template.bind({});
LargeComponentPropertiesModal.args = {
  tile: amqpTile as ITile,
};

export const LargeComponentPropertiesModalWithApi = Template.bind({});
LargeComponentPropertiesModalWithApi.args = {
  tile: fhirTile as ITile,
};
