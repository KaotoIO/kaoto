import { IVisualizationNodeData } from '../base-visual-entity';
import { CamelInterceptSendToEndpointVisualEntity } from './camel-intercept-send-to-endpoint-visual-entity';
import { ModelValidationService } from './support/validators/model-validation.service';

describe('CamelInterceptSendToEndpointVisualEntity', () => {
  describe('function Object() { [native code] }', () => {
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

  it('should return the id', () => {
    const interceptSendToEndpointVisualEntity = new CamelInterceptSendToEndpointVisualEntity({
      interceptSendToEndpoint: { id: 'id', uri: 'direct:a-reference' },
    });
    expect(interceptSendToEndpointVisualEntity.getId()).toEqual('id');
  });

  it('should set the id', () => {
    const interceptSendToEndpointVisualEntity = new CamelInterceptSendToEndpointVisualEntity({
      interceptSendToEndpoint: 'a-reference',
    });
    interceptSendToEndpointVisualEntity.setId('new-id');
    expect(interceptSendToEndpointVisualEntity.getId()).toEqual('new-id');
    expect(interceptSendToEndpointVisualEntity.interceptSendToEndpointDef.interceptSendToEndpoint.id).toEqual('new-id');
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
      { processorName: 'interceptFrom', path: 'interceptFrom' },
      { processorName: 'interceptSendToEndpoint', path: 'interceptSendToEndpoint' },
    ] as const)(`should return the correct interaction for the '%s' processor`, (data) => {
      const interceptSendToEndpointVisualEntity = new CamelInterceptSendToEndpointVisualEntity({
        interceptSendToEndpoint: { id: 'id', uri: 'direct:a-reference' },
      });

      const result = interceptSendToEndpointVisualEntity.getNodeInteraction(data as IVisualizationNodeData);
      expect(result).toMatchSnapshot();
    });
  });

  it('should delegate the validation text to the ModelValidationService', () => {
    const validateNodeStatusSpy = jest.spyOn(ModelValidationService, 'validateNodeStatus');

    const interceptSendToEndpointVisualEntity = new CamelInterceptSendToEndpointVisualEntity({
      interceptSendToEndpoint: { id: 'id', uri: 'direct:a-reference' },
    });
    interceptSendToEndpointVisualEntity.getNodeValidationText('a-path');

    expect(validateNodeStatusSpy).toHaveBeenCalledWith(expect.anything());
  });

  it('should return the vizualization node', () => {
    const interceptSendToEndpointVisualEntity = new CamelInterceptSendToEndpointVisualEntity({
      interceptSendToEndpoint: { id: 'id', uri: 'direct:a-reference' },
    });
    const vizNode = interceptSendToEndpointVisualEntity.toVizNode().nodes[0];

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
