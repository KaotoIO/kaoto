import { OnException } from '@kaoto/camel-catalog/types';

import { mockRandomValues } from '../../../stubs';
import { EntityType } from '../../camel/entities/base-entity';
import { CatalogKind } from '../../catalog-kind';
import { CamelOnExceptionVisualEntity } from './camel-on-exception-visual-entity';

describe('CamelOnExceptionVisualEntity', () => {
  const ONEXCEPTION_ID_REGEXP = /^onException-[a-zA-Z0-9]{4}$/;

  beforeAll(() => {
    mockRandomValues();
  });

  describe('isApplicable', () => {
    it.each([
      [true, { onException: { id: 'onExceptionId' } }],
      [false, { from: { id: 'from-1234', steps: [] } }],
      [false, { onException: { id: 'onExceptionId' }, anotherProperty: true }],
    ])('should return %s for %s', (result, definition) => {
      expect(CamelOnExceptionVisualEntity.isApplicable(definition)).toEqual(result);
    });
  });

  describe('function Object() { [native code] }', () => {
    it('should set id to onExceptionDef.onException.id if it is defined', () => {
      const onExceptionDef: { onException: OnException } = { onException: { id: 'onExceptionId' } };
      const entity = new CamelOnExceptionVisualEntity(onExceptionDef);

      expect(entity.id).toEqual('onExceptionId');
      expect(onExceptionDef.onException.id).toEqual('onExceptionId');
    });

    it('should set id to generated id if onExceptionDef.onException.id is not defined', () => {
      const onExceptionDef = { onException: {} as OnException };
      const entity = new CamelOnExceptionVisualEntity(onExceptionDef);

      expect(entity.id).toMatch(ONEXCEPTION_ID_REGEXP);
      expect(onExceptionDef.onException.id).toEqual(entity.id);
    });
  });

  describe('getNodeInteraction', () => {
    it.each([
      { processorName: 'route', catalogKind: CatalogKind.Entity },
      { processorName: 'from', catalogKind: CatalogKind.Entity },
      { processorName: 'to', catalogKind: CatalogKind.Processor },
      { processorName: 'log', catalogKind: CatalogKind.Processor },
      { processorName: 'onException', catalogKind: CatalogKind.Entity },
      { processorName: 'onCompletion', catalogKind: CatalogKind.Entity },
      { processorName: 'intercept', catalogKind: CatalogKind.Entity },
      { processorName: 'interceptFrom', catalogKind: CatalogKind.Entity },
      { processorName: 'interceptSendToEndpoint', catalogKind: CatalogKind.Entity },
    ])(`should return the correct interaction for the '%s' processor`, ({ processorName, catalogKind }) => {
      const onExceptionDef = { onException: {} as OnException };
      const entity = new CamelOnExceptionVisualEntity(onExceptionDef);

      const result = entity.getNodeInteraction({ processorName, catalogKind, name: processorName });
      expect(result).toMatchSnapshot();
    });
  });

  describe('toVizNode', () => {
    it('should return a visualization node with correct structure and properties', () => {
      const onExceptionDef = { onException: { id: 'test-id' } };
      const entity = new CamelOnExceptionVisualEntity(onExceptionDef);
      const vizNode = entity.toVizNode();

      expect(vizNode).toBeDefined();
      expect(vizNode.id).toBeDefined();
      expect(vizNode.data.processorName).toBe('onException');
      expect(vizNode.data.entity).toBe(entity);
      expect(vizNode.data.isGroup).toBe(true);
      expect(vizNode.data.catalogKind).toBe(CatalogKind.Entity);
      expect(vizNode.data.name).toBe(EntityType.OnException);
    });

    it('should work with auto-generated id', () => {
      const onExceptionDef = { onException: {} as OnException };
      const entity = new CamelOnExceptionVisualEntity(onExceptionDef);
      const vizNode = entity.toVizNode();

      expect(vizNode.data.entity).toBe(entity);
      expect(vizNode.data.isGroup).toBe(true);
      expect(vizNode.data.catalogKind).toBe(CatalogKind.Entity);
      expect(vizNode.data.name).toBe(EntityType.OnException);
    });
  });
});
