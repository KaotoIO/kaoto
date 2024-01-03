import { Meta, StoryFn } from '@storybook/react';
import {
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  SchemasLoaderProvider,
  NewBeanModal,
} from '@kaoto-next/ui/testing';

export default {
  title: 'Canvas/NewBeanModal',
  component: NewBeanModal,
  decorators: [
    (Story: StoryFn) => (
      <SchemasLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
        <CatalogLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
          <Story />
        </CatalogLoaderProvider>
      </SchemasLoaderProvider>
    ),
  ],
} as Meta<typeof NewBeanModal>;

const Template: StoryFn<typeof NewBeanModal> = (args) => {
  return <NewBeanModal {...args} />;
};

export const Default = Template.bind({});
Default.args = {
  isOpen: true,
  onCancelCreateBean: () => {},
  onCreateBean: () => {},
  propertyTitle: 'sample',
  javaType: 'org.apache.camel.spi.ExceptionHandler',
};
