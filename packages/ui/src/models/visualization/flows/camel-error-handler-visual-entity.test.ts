import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { ErrorHandlerDeserializer, NoErrorHandler } from '@kaoto/camel-catalog/types';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { SourceSchemaType } from '../../camel/source-schema-type';
import { CamelErrorHandlerVisualEntity } from './camel-error-handler-visual-entity';
import { setupDynamicCatalogRegistryMock } from './dynamic-catalog-registry-mock';

jest.mock('../../../dynamic-catalog/dynamic-catalog-registry');

describe('CamelErrorHandlerVisualEntity', () => {
  const ERROR_HANDLER_ID_REGEXP = /^errorHandler-[a-zA-Z0-9]{4}$/;
  let errorHandlerDef: { errorHandler: ErrorHandlerDeserializer };

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary);
    setupDynamicCatalogRegistryMock(catalogsMap);
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

  it('should return entity current definition', () => {
    const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);

    expect(entity.getNodeDefinition()).toEqual(errorHandlerDef.errorHandler);
  });

  it('should return schema from store', async () => {
    const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);

    expect(await entity.getNodeSchema()).toMatchSnapshot();
  });

  it('should handle errors when loading schema gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockRegistry = {
      getEntity: jest.fn().mockRejectedValue(new Error('Catalog load failed')),
    };
    (DynamicCatalogRegistry.get as jest.Mock).mockReturnValue(mockRegistry);

    const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);
    const schema = await entity.getNodeSchema();

    expect(schema).toEqual({});
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load schema for errorHandler:', expect.any(Error));

    // Restore the original mock setup
    const catalogsMap = await getFirstCatalogMap(catalogLibrary);
    setupDynamicCatalogRegistryMock(catalogsMap);
    consoleErrorSpy.mockRestore();
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

  it('should return no interactions except remove flow', () => {
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

  it('should return clipboard copy object', () => {
    const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);

    expect(entity.getCopiedContent()).toEqual({
      type: SourceSchemaType.Route,
      name: 'errorHandler',
      definition: errorHandlerDef.errorHandler,
    });
  });

  it('should return undefined validation text', async () => {
    const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);

    expect(await entity.getNodeValidationText()).toBeUndefined();
  });

  describe('toVizNode', () => {
    it('should return visualization node', async () => {
      const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);

      const vizNode = await entity.toVizNode();

      expect(vizNode.data).toEqual({
        entity,
        name: 'errorHandler',
        isGroup: true,
        path: 'errorHandler',
        processorName: 'errorHandler',
        iconAlt: 'Entity icon',
        iconUrl: 'file-mock-data',
        isPlaceholder: false,
        title: 'Error Handler',
        description: 'errorHandler: Camel error handling.',
        processorIconTooltip: '',
      });
    });
  });

  it('should serialize the errorHandler definition', () => {
    const entity = new CamelErrorHandlerVisualEntity(errorHandlerDef);

    expect(entity.toJSON()).toEqual(errorHandlerDef);
  });
});
