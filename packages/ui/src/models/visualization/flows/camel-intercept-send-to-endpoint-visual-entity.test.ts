import { mockRandomValues } from '../../../stubs';
import { CamelInterceptSendToEndpointVisualEntity } from './camel-intercept-send-to-endpoint-visual-entity';
import { ModelValidationService } from './support/validators/model-validation.service';

describe('CamelInterceptSendToEndpointVisualEntity', () => {
  beforeAll(() => {
    mockRandomValues();
  });

  describe('constructor', () => {
    it('should allow to create an instance out of the object definition', () => {
      const interceptSendToEndpointVisualEntity = new CamelInterceptSendToEndpointVisualEntity({
        interceptSendToEndpoint: { id: 'a-reference', uri: 'direct:a-reference' },
      });

      expect(interceptSendToEndpointVisualEntity.getId()).toEqual('a-reference');
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

  describe('getNodeInteraction', () => {
    it.each([
      { processorName: 'route', path: 'route' },
      { processorName: 'from', path: 'from' },
      { processorName: 'to', path: 'to' },
      { processorName: 'log', path: 'log' },
      { processorName: 'onException', path: 'onException' },
      { processorName: 'onCompletion', path: 'onCompletion' },
      { processorName: 'intercept', path: 'intercept' },
      { processorName: 'interceptSendToEndpoint', path: 'interceptSendToEndpoint' },
    ] as const)(`should return the correct interaction for the '%s' processor`, (data) => {
      const interceptSendToEndpointVisualEntity = new CamelInterceptSendToEndpointVisualEntity({
        interceptSendToEndpoint: { id: 'id', uri: 'direct:a-reference' },
      });

      const result = interceptSendToEndpointVisualEntity.getNodeInteraction({
        ...data,
        name: data.processorName,
        isPlaceholder: false,
        isGroup: false,
        title: '',
        description: '',
        iconUrl: '',
      });
      expect(result).toMatchSnapshot();
    });
  });

  it('should delegate the validation text to the ModelValidationService', async () => {
    const validateNodeStatusSpy = jest.spyOn(ModelValidationService, 'validateNodeStatus');

    const interceptSendToEndpointVisualEntity = new CamelInterceptSendToEndpointVisualEntity({
      interceptSendToEndpoint: { id: 'id', uri: 'direct:a-reference' },
    });
    await interceptSendToEndpointVisualEntity.getNodeValidationText('interceptSendToEndpoint');

    expect(validateNodeStatusSpy).toHaveBeenCalled();
  });

  it('should return the visualization node', async () => {
    const interceptSendToEndpointVisualEntity = new CamelInterceptSendToEndpointVisualEntity({
      interceptSendToEndpoint: { id: 'id', uri: 'direct:a-reference' },
    });
    const vizNode = await interceptSendToEndpointVisualEntity.toVizNode();

    expect(vizNode.data.processorName).toBe(CamelInterceptSendToEndpointVisualEntity.ROOT_PATH);
    expect(vizNode.data.entity).toBe(interceptSendToEndpointVisualEntity);
    expect(vizNode.data.isGroup).toBeTruthy();
  });

  it('should serialize the entity', () => {
    const interceptSendToEndpointVisualEntity = new CamelInterceptSendToEndpointVisualEntity({
      interceptSendToEndpoint: { id: undefined, uri: 'direct:a-reference' },
    });
    const result = interceptSendToEndpointVisualEntity.toJSON();

    expect(result).toMatchSnapshot();
  });
});
