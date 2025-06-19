import { CanvasFormTabsContext, CanvasFormTabsContextResult, KaotoForm, KaotoFormProps } from '@kaoto/forms';
import { PipeErrorHandlerPage } from '@kaoto/kaoto';
import { EntitiesContext, KaotoSchemaDefinition, PipeResource } from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';
import { fn } from '@storybook/test';
import errorHandler from '../../cypress/fixtures/metadata/errorHandlerSchema.json';

export default {
  title: 'KaotoForm/PipeErrorHandler',
  component: PipeErrorHandlerPage,
} as Meta<typeof PipeErrorHandlerPage>;
const formTabsValue: CanvasFormTabsContextResult = {} as CanvasFormTabsContextResult;
const getErrorHandlerModel = () => {};
const onChangeModel = () => {};

const camelResource = new PipeResource();
const mockEntitiesContext = {
  camelResource,
  entities: camelResource.getEntities(),
  visualEntities: camelResource.getVisualEntities(),
  currentSchemaType: camelResource.getType(),
  updateSourceCodeFromEntities: fn(),
  updateEntitiesFromCamelResource: fn(),
};

const Template: StoryFn<typeof KaotoForm> = () => {
  return (
    <EntitiesContext.Provider value={mockEntitiesContext}>
      <CanvasFormTabsContext.Provider value={formTabsValue}>
        <KaotoForm
          data-testid="pipe-error-handler-form"
          schema={errorHandler as unknown as KaotoSchemaDefinition['schema']}
          model={getErrorHandlerModel()}
          onChange={onChangeModel as KaotoFormProps['onChange']}
        />
      </CanvasFormTabsContext.Provider>
    </EntitiesContext.Provider>
  );
};

export const PipeErrorHandler = Template.bind({});
