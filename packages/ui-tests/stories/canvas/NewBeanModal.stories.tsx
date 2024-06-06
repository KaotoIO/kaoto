import { Meta, StoryFn } from '@storybook/react';
import {
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  SchemasLoaderProvider,
  NewBeanModal,
  RuntimeProvider,
} from '@kaoto/kaoto/testing';

export default {
  title: 'Canvas/NewBeanModal',
  component: NewBeanModal,
  decorators: [
    (Story: StoryFn) => (
      <RuntimeProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
        <SchemasLoaderProvider>
          <CatalogLoaderProvider>
            <Story />
          </CatalogLoaderProvider>
        </SchemasLoaderProvider>
      </RuntimeProvider>
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
