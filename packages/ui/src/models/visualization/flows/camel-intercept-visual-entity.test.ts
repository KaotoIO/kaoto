import { IVisualizationNodeData } from '../base-visual-entity';
import { CamelInterceptVisualEntity } from './camel-intercept-visual-entity';
import { ModelValidationService } from './support/validators/model-validation.service';

describe('CamelInterceptVisualEntity', () => {
  describe('function Object() { [native code] }', () => {
    it('should allow to create an instance out of the object definition', () => {
      const interceptVisualEntity = new CamelInterceptVisualEntity({
        intercept: { id: 'a-reference', disabled: false },
      });

      expect(interceptVisualEntity.getId()).toEqual('a-reference');
    });

    it('should allow to create an instance out of the object definition without id', () => {
      const interceptRaw = {
        intercept: { id: undefined, uri: 'direct:a-reference' },
      };
      const interceptVisualEntity = new CamelInterceptVisualEntity(interceptRaw);

      expect(interceptVisualEntity.getId()).toBeDefined();
      expect(interceptRaw.intercept.id).toEqual(interceptVisualEntity.getId());
    });
  });

  describe('isApplicable', () => {
    it.each([
      [{ from: { id: 'from-1234', steps: [] } }, false],
      [{ onCompletion: { id: 'onCompletionId' } }, false],
      [{ onException: { id: 'onExceptionId' } }, false],
      [{ intercept: { id: 'interceptId' } }, true],
      [{ interceptFrom: { id: 'interceptFromId' } }, false],
      [{ interceptSendToEndpoint: { id: 'interceptSendToEndpointId' } }, false],
    ])('should return %s for %s', (definition, result) => {
      expect(CamelInterceptVisualEntity.isApplicable(definition)).toEqual(result);
    });
  });

  it('should return the id', () => {
    const interceptVisualEntity = new CamelInterceptVisualEntity({
      intercept: { id: 'id', disabled: false },
    });
    expect(interceptVisualEntity.getId()).toEqual('id');
  });

  it('should set the id', () => {
    const interceptVisualEntity = new CamelInterceptVisualEntity({ intercept: { id: 'a-reference', disabled: false } });
    interceptVisualEntity.setId('new-id');
    expect(interceptVisualEntity.getId()).toEqual('new-id');
    expect(interceptVisualEntity.interceptDef.intercept.id).toEqual('new-id');
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
      const interceptVisualEntity = new CamelInterceptVisualEntity({
        intercept: { id: 'id', disabled: false },
      });

      const result = interceptVisualEntity.getNodeInteraction(data as IVisualizationNodeData);
      expect(result).toMatchSnapshot();
    });
  });

  it('should delegate the validation text to the ModelValidationService', () => {
    const validateNodeStatusSpy = jest.spyOn(ModelValidationService, 'validateNodeStatus');

    const interceptVisualEntity = new CamelInterceptVisualEntity({
      intercept: { id: 'id', disabled: false },
    });
    interceptVisualEntity.getNodeValidationText('a-path');

    expect(validateNodeStatusSpy).toHaveBeenCalledWith(expect.anything());
  });

  it('should return the vizualization node', () => {
    const interceptVisualEntity = new CamelInterceptVisualEntity({
      intercept: { id: 'id', disabled: false },
    });
    const vizNode = interceptVisualEntity.toVizNode().nodes[0];

    expect(vizNode.data.processorName).toBe(CamelInterceptVisualEntity.ROOT_PATH);
    expect(vizNode.data.entity).toBe(interceptVisualEntity);
    expect(vizNode.data.isGroup).toBeTruthy();
  });

  it('should serialize the entity', () => {
    const interceptVisualEntity = new CamelInterceptVisualEntity({
      intercept: { id: undefined, disabled: false },
    });
    const result = interceptVisualEntity.toJSON();

    expect(result).toMatchSnapshot();
  });
});
