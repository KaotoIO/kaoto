import { OnException } from '@kaoto/camel-catalog/types';

import { mockRandomValues } from '../../../stubs';
import { CatalogKind } from '../../catalog-kind';
import { EntityType } from '../../entities/base-entity';
import { IVisualizationNodeData } from '../base-visual-entity';
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

      expect(entity.id).toBe('onExceptionId');
      expect(onExceptionDef.onException.id).toBe('onExceptionId');
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
      { primaryNodeId: { name: 'route', catalogKind: CatalogKind.Entity } },
      { primaryNodeId: { name: 'from', catalogKind: CatalogKind.Entity } },
      { primaryNodeId: { name: 'to', catalogKind: CatalogKind.Pattern } },
      { primaryNodeId: { name: 'log', catalogKind: CatalogKind.Pattern } },
      { primaryNodeId: { name: 'onException', catalogKind: CatalogKind.Entity } },
      { primaryNodeId: { name: 'onCompletion', catalogKind: CatalogKind.Entity } },
      { primaryNodeId: { name: 'intercept', catalogKind: CatalogKind.Entity } },
      { primaryNodeId: { name: 'interceptFrom', catalogKind: CatalogKind.Entity } },
      { primaryNodeId: { name: 'interceptSendToEndpoint', catalogKind: CatalogKind.Entity } },
    ])(`should return the correct interaction for the '%s' processor`, ({ primaryNodeId }) => {
      const onExceptionDef = { onException: {} as OnException };
      const entity = new CamelOnExceptionVisualEntity(onExceptionDef);

      const result = entity.getNodeInteraction({
        primaryNodeId,
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
        processorIconTooltip: '',
      } as IVisualizationNodeData);
      expect(result).toMatchSnapshot();
    });
  });

  describe('toVizNode', () => {
    it('toVizNode should return visualization node', async () => {
      const onExceptionDef = { onException: { id: 'test-id' } };
      const entity = new CamelOnExceptionVisualEntity(onExceptionDef);
      const vizNode = await entity.toVizNode();
      await vizNode.fetchSchema();

      expect(vizNode).toBeDefined();
      expect(vizNode.id).toBeDefined();
      expect(vizNode.data.primaryNodeId?.name).toBe('onException');
      expect(vizNode.data.entity).toBe(entity);
      expect(vizNode.data.isGroup).toBe(true);
      expect(vizNode.data.catalogKind).toBe(CatalogKind.Entity);
      expect(vizNode.data.name).toBe(EntityType.OnException);
      expect(vizNode.data.primaryNodeId).toEqual({ name: entity.type, catalogKind: CatalogKind.Entity });
    });

    it('should work with auto-generated id', async () => {
      const onExceptionDef = { onException: {} as OnException };
      const entity = new CamelOnExceptionVisualEntity(onExceptionDef);
      const vizNode = await entity.toVizNode();

      expect(vizNode.data.entity).toBe(entity);
      expect(vizNode.data.isGroup).toBe(true);
      expect(vizNode.data.catalogKind).toBe(CatalogKind.Entity);
      expect(vizNode.data.name).toBe(EntityType.OnException);
    });
  });
});
