import { ErrorHandlerDeserializer, NoErrorHandler } from '@kaoto/camel-catalog/types';
import { useSchemasStore } from '../../../store';
import { errorHandlerSchema } from '../../../stubs/error-handler';
import { EntityType } from '../../camel/entities';
import { CamelErrorHandlerVisualEntity } from './camel-error-handler-visual-entity';

describe('CamelErrorHandlerVisualEntity', () => {
  const ERROR_HANDLER_ID_REGEXP = /^errorHandler-[a-zA-Z0-9]{4}$/;
  let errorHandlerDef: { errorHandler: ErrorHandlerDeserializer };

  beforeAll(() => {
    useSchemasStore.getState().setSchema('errorHandler', {
      name: 'errorHandler',
      version: '1.0.0',
      tags: ['camel'],
      uri: 'errorHandler',
      schema: errorHandlerSchema,
    });
  });

  beforeEach(() => {
    errorHandlerDef = {
      errorHandler: {
        noErrorHandler: { id: 'noErrorHandlerId' },
      },
    };
  });

  describe('isApplicable', () => {
    it.each([
      [true, { errorHandler: { id: 'errorHandlerId' } }],
      [false, { from: { id: 'from-1234', steps: [] } }],
      [false, { errorHandler: { id: 'errorHandlerId' }, anotherProperty: true }],
    ])('should return %s for %s', (result, definition) => {
      expect(CamelErrorHandlerVisualEntity.isApplicable(definition)).toEqual(result);
    });
  });

  describe('constructor', () => {
    it('should set id to generated id', () => {
      const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);

      expect(entity.id).toMatch(ERROR_HANDLER_ID_REGEXP);
      expect((errorHandlerDef.errorHandler.noErrorHandler as NoErrorHandler).id).toEqual('noErrorHandlerId');
    });
  });

  it('should return id', () => {
    const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);

    expect(entity.getId()).toMatch(ERROR_HANDLER_ID_REGEXP);
  });

  it('should set id', () => {
    const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);
    const newId = 'newId';
    entity.setId(newId);

    expect(entity.getId()).toEqual(newId);
  });

  describe('getNodeLabel', () => {
    it.each([
      ['deadLetterChannel', { id: 'deadLetterChannelId' }, 'deadLetterChannelId'],
      ['defaultErrorHandler', { id: 'defaultErrorHandlerId' }, 'defaultErrorHandlerId'],
      ['jtaTransactionErrorHandler', { id: 'jtaTransactionErrorHandlerId' }, 'jtaTransactionErrorHandlerId'],
      ['noErrorHandler', { id: 'noErrorHandlerId' }, 'noErrorHandlerId'],
      ['refErrorHandler', { id: 'refErrorHandlerId' }, 'refErrorHandlerId'],
      ['springTransactionErrorHandler', { id: 'springTransactionErrorHandlerId' }, 'springTransactionErrorHandlerId'],
      ['springTransactionErrorHandler', {}, 'errorHandler'],
    ])('should return %s label', (errorHandler, definition, label) => {
      errorHandlerDef.errorHandler = {
        [errorHandler]: definition,
      };

      const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);

      expect(entity.getNodeLabel()).toEqual(label);
    });
  });

  it('should return tooltip content', () => {
    const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);

    expect(entity.getTooltipContent()).toEqual('errorHandler');
  });

  describe('getComponentSchema', () => {
    it('should return entity current definition', () => {
      const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);

      expect(entity.getComponentSchema().definition).toEqual(errorHandlerDef.errorHandler);
    });

    it('should return schema from store', () => {
      const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);

      expect(entity.getComponentSchema().schema).toEqual(errorHandlerSchema);
    });

    it('should return hardcoded schema title', () => {
      const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);

      expect(entity.getComponentSchema().title).toEqual('Error Handler');
    });
  });

  describe('updateModel', () => {
    it('should update model', () => {
      const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);
      const path = 'errorHandler.noErrorHandler.id';
      const value = 'newId';

      entity.updateModel(path, value);

      expect((errorHandlerDef.errorHandler.noErrorHandler as NoErrorHandler).id).toEqual(value);
    });

    it('should not update model if path is not defined', () => {
      const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);
      const value = 'newId';

      entity.updateModel(undefined, value);

      expect((errorHandlerDef.errorHandler.noErrorHandler as NoErrorHandler).id).toEqual('noErrorHandlerId');
    });

    it('should reset the errorHandler object if it is not defined', () => {
      const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);

      entity.updateModel('errorHandler', {});

      expect(errorHandlerDef.errorHandler).toEqual({});
    });
  });

  it('return no interactions', () => {
    const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);

    expect(entity.getNodeInteraction()).toEqual({
      canHavePreviousStep: false,
      canHaveNextStep: false,
      canHaveChildren: false,
      canHaveSpecialChildren: false,
      canRemoveStep: false,
      canReplaceStep: false,
      canRemoveFlow: true,
      canBeDisabled: false,
    });
  });

  it('should return undefined validation text', () => {
    const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);

    expect(entity.getNodeValidationText()).toBeUndefined();
  });

  describe('toVizNode', () => {
    it('should return visualization node', () => {
      const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);

      const vizNode = entity.toVizNode();

      expect(vizNode.data).toEqual({
        componentName: undefined,
        entity: {
          id: entity.getId(),
          errorHandlerDef,
          type: EntityType.ErrorHandler,
        },
        icon: '',
        isGroup: true,
        path: 'errorHandler',
        processorName: 'errorHandler',
      });
    });
  });

  it('should serialize the errorHandler definition', () => {
    const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);

    expect(entity.toJSON()).toEqual(errorHandlerDef);
  });
});
