import { mockRandomValues } from '../../../stubs';
import { CatalogKind } from '../../catalog-kind';
import { IVisualizationNodeData } from '../base-visual-entity';
import { CamelInterceptSendToEndpointVisualEntity } from './camel-intercept-send-to-endpoint-visual-entity';
import { ModelValidationService } from './support/validators/model-validation.service';

describe('CamelInterceptSendToEndpointVisualEntity', () => {
  beforeAll(() => {
    mockRandomValues();
  });

  describe('function Object() { [native code] }', () => {
    it('should allow to create an instance out of the object definition', () => {
      const interceptSendToEndpointVisualEntity = new CamelInterceptSendToEndpointVisualEntity({
        interceptSendToEndpoint: { id: 'a-reference', uri: 'direct:a-reference' },
      });

      expect(interceptSendToEndpointVisualEntity.getId()).toBe('a-reference');
    });

    it('should allow to create an instance out of the object definition without id', () => {
      const interceptSendToEndpointRaw = {
        interceptSendToEndpoint: { id: undefined, uri: 'direct:a-reference' },
      };
      const interceptSendToEndpointVisualEntity = new CamelInterceptSendToEndpointVisualEntity(
        interceptSendToEndpointRaw,
      );

      expect(interceptSendToEndpointVisualEntity.getId()).toBeDefined();
      expect(interceptSendToEndpointRaw.interceptSendToEndpoint.id).toEqual(
        interceptSendToEndpointVisualEntity.getId(),
      );
    });
  });

  describe('isApplicable', () => {
    it.each([
      [{ from: { id: 'from-1234', steps: [] } }, false],
      [{ onCompletion: { id: 'onCompletionId' } }, false],
      [{ onException: { id: 'onExceptionId' } }, false],
      [{ intercept: { id: 'interceptId' } }, false],
      [{ interceptFrom: { id: 'interceptFromId' } }, false],
      [{ interceptSendToEndpoint: { id: 'interceptSendToEndpointId' } }, true],
    ])('should return %s for %s', (definition, result) => {
      expect(CamelInterceptSendToEndpointVisualEntity.isApplicable(definition)).toEqual(result);
    });
  });

  it('should return the id', () => {
    const interceptSendToEndpointVisualEntity = new CamelInterceptSendToEndpointVisualEntity({
      interceptSendToEndpoint: { id: 'id', uri: 'direct:a-reference' },
    });
    expect(interceptSendToEndpointVisualEntity.getId()).toBe('id');
  });

  it('should set the id', () => {
    const interceptSendToEndpointVisualEntity = new CamelInterceptSendToEndpointVisualEntity({
      interceptSendToEndpoint: 'a-reference',
    });
    interceptSendToEndpointVisualEntity.setId('new-id');
    expect(interceptSendToEndpointVisualEntity.getId()).toBe('new-id');
    expect(interceptSendToEndpointVisualEntity.interceptSendToEndpointDef.interceptSendToEndpoint.id).toBe('new-id');
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
      {
        primaryNodeId: { name: 'interceptSendToEndpoint', catalogKind: CatalogKind.Entity },
        path: 'interceptSendToEndpoint',
      },
    ])(`should return the correct interaction for the '%s' processor`, (data) => {
      const interceptSendToEndpointVisualEntity = new CamelInterceptSendToEndpointVisualEntity({
        interceptSendToEndpoint: { id: 'id', uri: 'direct:a-reference' },
      });

      const result = interceptSendToEndpointVisualEntity.getNodeInteraction({
        ...data,
        isPlaceholder: false,
        isGroup: false,
        title: '',
        description: '',
        iconUrl: '',
      } as IVisualizationNodeData);
      expect(result).toMatchSnapshot();
    });
  });

  it('should delegate the validation text to the ModelValidationService', () => {
    const validateNodeStatusSpy = vi.spyOn(ModelValidationService, 'validateNodeStatus');

    const interceptSendToEndpointVisualEntity = new CamelInterceptSendToEndpointVisualEntity({
      interceptSendToEndpoint: { id: 'id', uri: 'direct:a-reference' },
    });
    interceptSendToEndpointVisualEntity.getNodeValidationText('interceptSendToEndpoint');

    expect(validateNodeStatusSpy).toHaveBeenCalled();
  });

  it('toVizNode should return visualization node', async () => {
    const interceptSendToEndpointVisualEntity = new CamelInterceptSendToEndpointVisualEntity({
      interceptSendToEndpoint: { id: 'id', uri: 'direct:a-reference' },
    });
    const vizNode = await interceptSendToEndpointVisualEntity.toVizNode();
    await vizNode.fetchSchema();

    expect(vizNode.data.processorName).toBe(CamelInterceptSendToEndpointVisualEntity.ROOT_PATH);
    expect(vizNode.data.entity).toBe(interceptSendToEndpointVisualEntity);
    expect(vizNode.data.isGroup).toBeTruthy();
    expect(vizNode.data.primaryNodeId).toEqual({
      name: interceptSendToEndpointVisualEntity.type,
      catalogKind: CatalogKind.Entity,
    });
  });

  it('should serialize the entity', () => {
    const interceptSendToEndpointVisualEntity = new CamelInterceptSendToEndpointVisualEntity({
      interceptSendToEndpoint: { id: undefined, uri: 'direct:a-reference' },
    });
    const result = interceptSendToEndpointVisualEntity.toJSON();

    expect(result).toMatchSnapshot();
  });
});
