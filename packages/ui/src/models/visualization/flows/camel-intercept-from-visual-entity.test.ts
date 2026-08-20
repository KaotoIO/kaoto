import { mockRandomValues } from '../../../stubs';
import { CatalogKind } from '../../catalog-kind';
import { IVisualizationNodeData } from '../base-visual-entity';
import { CamelInterceptFromVisualEntity } from './camel-intercept-from-visual-entity';
import { ModelValidationService } from './support/validators/model-validation.service';

describe('CamelInterceptFromVisualEntity', () => {
  beforeAll(() => {
    mockRandomValues();
  });

  describe('function Object() { [native code] }', () => {
    it('should allow to create an instance out of the string definition', () => {
      const interceptFromVisualEntity = new CamelInterceptFromVisualEntity({ interceptFrom: 'a-reference' });

      expect(interceptFromVisualEntity.getId()).toBeDefined();
    });

    it('should allow to create an instance out of the object definition', () => {
      const interceptFromVisualEntity = new CamelInterceptFromVisualEntity({
        interceptFrom: { id: 'a-reference', uri: 'direct:a-reference' },
      });

      expect(interceptFromVisualEntity.getId()).toBe('a-reference');
    });

    it('should allow to create an instance out of the object definition without id', () => {
      const interceptFromRaw = {
        interceptFrom: { id: undefined, uri: 'direct:a-reference' },
      };
      const interceptFromVisualEntity = new CamelInterceptFromVisualEntity(interceptFromRaw);

      expect(interceptFromVisualEntity.getId()).toBeDefined();
      expect(interceptFromRaw.interceptFrom.id).toEqual(interceptFromVisualEntity.getId());
    });
  });

  describe('isApplicable', () => {
    it.each([
      [{ from: { id: 'from-1234', steps: [] } }, false],
      [{ onCompletion: { id: 'onCompletionId' } }, false],
      [{ onException: { id: 'onExceptionId' } }, false],
      [{ intercept: { id: 'interceptId' } }, false],
      [{ interceptFrom: { id: 'interceptFromId' } }, true],
      [{ interceptSendToEndpoint: { id: 'interceptSendToEndpointId' } }, false],
    ])('should return %s for %s', (definition, result) => {
      expect(CamelInterceptFromVisualEntity.isApplicable(definition)).toEqual(result);
    });
  });

  it('should return the id', () => {
    const interceptFromVisualEntity = new CamelInterceptFromVisualEntity({
      interceptFrom: { id: 'id', uri: 'direct:a-reference' },
    });
    expect(interceptFromVisualEntity.getId()).toBe('id');
  });

  it('should set the id', () => {
    const interceptFromVisualEntity = new CamelInterceptFromVisualEntity({ interceptFrom: 'a-reference' });
    interceptFromVisualEntity.setId('new-id');
    expect(interceptFromVisualEntity.getId()).toBe('new-id');
    expect(interceptFromVisualEntity.interceptFromDef.interceptFrom.id).toBe('new-id');
  });

  describe('getNodeInteraction', () => {
    it.each([
      { primaryNodeId: { name: 'route', catalogKind: CatalogKind.Entity }, path: 'route' },
      { primaryNodeId: { name: 'from', catalogKind: CatalogKind.Entity }, path: 'from' },
      { primaryNodeId: { name: 'to', catalogKind: CatalogKind.Pattern }, path: 'to' },
      { primaryNodeId: { name: 'log', catalogKind: CatalogKind.Pattern }, path: 'log' },
      { primaryNodeId: { name: 'onException', catalogKind: CatalogKind.Entity }, path: 'onException' },
      { primaryNodeId: { name: 'onCompletion', catalogKind: CatalogKind.Entity }, path: 'onCompletion' },
      { primaryNodeId: { name: 'intercept', catalogKind: CatalogKind.Entity }, path: 'intercept' },
      { primaryNodeId: { name: 'interceptFrom', catalogKind: CatalogKind.Entity }, path: 'interceptFrom' },
      {
        primaryNodeId: { name: 'interceptSendToEndpoint', catalogKind: CatalogKind.Entity },
        path: 'interceptSendToEndpoint',
      },
    ])(`should return the correct interaction for the '%s' processor`, (data) => {
      const interceptFromVisualEntity = new CamelInterceptFromVisualEntity({
        interceptFrom: { id: 'id', uri: 'direct:a-reference' },
      });

      const result = interceptFromVisualEntity.getNodeInteraction({
        ...data,
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      } as IVisualizationNodeData);
      expect(result).toMatchSnapshot();
    });
  });

  it('should delegate the validation text to the ModelValidationService', async () => {
    const validateNodeStatusSpy = vi.spyOn(ModelValidationService, 'validateNodeStatus').mockResolvedValue('');

    const interceptFromVisualEntity = new CamelInterceptFromVisualEntity({
      interceptFrom: { id: 'id', uri: 'direct:a-reference' },
    });
    await interceptFromVisualEntity.getNodeValidationText('interceptFrom', { type: 'object', properties: {} });

    expect(validateNodeStatusSpy).toHaveBeenCalled();
  });

  it('toVizNode should return visualization node', async () => {
    const interceptFromVisualEntity = new CamelInterceptFromVisualEntity({
      interceptFrom: { id: 'id', uri: 'direct:a-reference' },
    });
    const vizNode = await interceptFromVisualEntity.toVizNode();
    await vizNode.fetchSchema();

    expect(vizNode.data.primaryNodeId?.name).toBe(CamelInterceptFromVisualEntity.ROOT_PATH);
    expect(vizNode.data.entity).toBe(interceptFromVisualEntity);
    expect(vizNode.data.isGroup).toBeTruthy();
    expect(vizNode.data.primaryNodeId).toEqual({
      name: interceptFromVisualEntity.type,
      catalogKind: CatalogKind.Entity,
    });
  });

  it('should serialize the entity', () => {
    const interceptFromVisualEntity = new CamelInterceptFromVisualEntity({
      interceptFrom: { id: undefined, uri: 'direct:a-reference' },
    });
    const result = interceptFromVisualEntity.toJSON();

    expect(result).toMatchSnapshot();
  });
});
