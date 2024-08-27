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
import aggregate from '../../cypress/fixtures/aggregate.json';
import cronSource from '../../cypress/fixtures/cronSource.json';
import activeMq from '../../cypress/fixtures/activeMq.json';
import box from '../../cypress/fixtures/box.json';

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
  tile: aggregate as ITile,
};

export const SmallKameletPropertiesModal = Template.bind({});
SmallKameletPropertiesModal.args = {
  tile: cronSource as ITile,
};

export const LargeComponentPropertiesModal = Template.bind({});
LargeComponentPropertiesModal.args = {
  tile: activeMq as ITile,
};

export const LargeComponentPropertiesModalWithApi = Template.bind({});
LargeComponentPropertiesModalWithApi.args = {
  tile: box as ITile,
};
