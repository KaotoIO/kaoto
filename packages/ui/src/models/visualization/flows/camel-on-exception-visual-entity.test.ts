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
      [false, undefined],
      [false, null],
      [false, [{ onException: {} }]],
      [false, 'onException'],
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

  it('should return the id', () => {
    const entity = new CamelOnExceptionVisualEntity({ onException: { id: 'onExceptionId' } });

    expect(entity.getId()).toBe('onExceptionId');
  });

  it('should set the id in the entity and its definition', () => {
    const entity = new CamelOnExceptionVisualEntity({ onException: { id: 'onExceptionId' } });

    entity.setId('new-id');

    expect(entity.getId()).toBe('new-id');
    expect(entity.toJSON()).toEqual({ onException: { id: 'new-id' } });
  });

  it('should use the id as the node label of the onException group', () => {
    const entity = new CamelOnExceptionVisualEntity({ onException: { id: 'onException-1' } });

    expect(entity.getNodeLabel('onException')).toBe('onException-1');
  });

  it('should serialize the entity', () => {
    const onExceptionDef: { onException: OnException } = {
      onException: { id: 'onExceptionId', exception: ['java.lang.Exception'], steps: [] },
    };
    const entity = new CamelOnExceptionVisualEntity(onExceptionDef);

    expect(entity.toJSON()).toEqual({
      onException: { id: 'onExceptionId', exception: ['java.lang.Exception'], steps: [] },
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

    it('should determine whether a node can be disabled from its schema', () => {
      const entity = new CamelOnExceptionVisualEntity();
      const result = entity.getNodeInteraction({
        name: 'from',
        primaryNodeId: { name: 'from', catalogKind: CatalogKind.Entity },
        schema: { type: 'object', properties: { disabled: { type: 'boolean' } } },
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
        processorIconTooltip: '',
      });

      expect(result.canBeDisabled).toBe(true);
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
