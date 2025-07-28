import { IVisualizationNodeData } from '../base-visual-entity';
import { CamelInterceptFromVisualEntity } from './camel-intercept-from-visual-entity';
import { ModelValidationService } from './support/validators/model-validation.service';

describe('CamelInterceptFromVisualEntity', () => {
  describe('function Object() { [native code] }', () => {
    it('should allow to create an instance out of the string definition', () => {
      const interceptFromVisualEntity = new CamelInterceptFromVisualEntity({ interceptFrom: 'a-reference' });

      expect(interceptFromVisualEntity.getId()).toBeDefined();
    });

    it('should allow to create an instance out of the object definition', () => {
      const interceptFromVisualEntity = new CamelInterceptFromVisualEntity({
        interceptFrom: { id: 'a-reference', uri: 'direct:a-reference' },
      });

      expect(interceptFromVisualEntity.getId()).toEqual('a-reference');
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
    expect(interceptFromVisualEntity.getId()).toEqual('id');
  });

  it('should set the id', () => {
    const interceptFromVisualEntity = new CamelInterceptFromVisualEntity({ interceptFrom: 'a-reference' });
    interceptFromVisualEntity.setId('new-id');
    expect(interceptFromVisualEntity.getId()).toEqual('new-id');
    expect(interceptFromVisualEntity.interceptFromDef.interceptFrom.id).toEqual('new-id');
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
      const interceptFromVisualEntity = new CamelInterceptFromVisualEntity({
        interceptFrom: { id: 'id', uri: 'direct:a-reference' },
      });

      const result = interceptFromVisualEntity.getNodeInteraction(data as IVisualizationNodeData);
      expect(result).toMatchSnapshot();
    });
  });

  it('should delegate the validation text to the ModelValidationService', () => {
    const validateNodeStatusSpy = jest.spyOn(ModelValidationService, 'validateNodeStatus');

    const interceptFromVisualEntity = new CamelInterceptFromVisualEntity({
      interceptFrom: { id: 'id', uri: 'direct:a-reference' },
    });
    interceptFromVisualEntity.getNodeValidationText('a-path');

    expect(validateNodeStatusSpy).toHaveBeenCalledWith(expect.anything());
  });

  it('should return the vizualization node', () => {
    const interceptFromVisualEntity = new CamelInterceptFromVisualEntity({
      interceptFrom: { id: 'id', uri: 'direct:a-reference' },
    });
    const vizNode = interceptFromVisualEntity.toVizNode().nodes[0];

    expect(vizNode.data.processorName).toBe(CamelInterceptFromVisualEntity.ROOT_PATH);
    expect(vizNode.data.entity).toBe(interceptFromVisualEntity);
    expect(vizNode.data.isGroup).toBeTruthy();
  });

  it('should serialize the entity', () => {
    const interceptFromVisualEntity = new CamelInterceptFromVisualEntity({
      interceptFrom: { id: undefined, uri: 'direct:a-reference' },
    });
    const result = interceptFromVisualEntity.toJSON();

    expect(result).toMatchSnapshot();
  });
});
