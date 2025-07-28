import { OnCompletion } from '@kaoto/camel-catalog/types';
import { IVisualizationNodeData } from '../base-visual-entity';
import { CamelOnCompletionVisualEntity } from './camel-on-completion-visual-entity';
import { ModelValidationService } from './support/validators/model-validation.service';

describe('CamelOnCompletionVisualEntity', () => {
  describe('function Object() { [native code] }', () => {
    it('should allow to create an instance out of the object definition', () => {
      const onCompletionVisualEntity = new CamelOnCompletionVisualEntity({
        onCompletion: { id: 'a-reference', mode: 'AfterConsumer' },
      });

      expect(onCompletionVisualEntity.getId()).toEqual('a-reference');
    });

    it('should allow to create an instance out of the object definition without id', () => {
      const onCompletionRaw: { onCompletion: OnCompletion } = {
        onCompletion: { id: undefined, mode: 'AfterConsumer' },
      };
      const onCompletionVisualEntity = new CamelOnCompletionVisualEntity(onCompletionRaw);

      expect(onCompletionVisualEntity.getId()).toBeDefined();
      expect(onCompletionRaw.onCompletion.id).toEqual(onCompletionVisualEntity.getId());
    });
  });

  describe('isApplicable', () => {
    it.each([
      [{ from: { id: 'from-1234', steps: [] } }, false],
      [{ onCompletion: { id: 'onCompletionId' } }, true],
      [{ onException: { id: 'onExceptionId' } }, false],
      [{ intercept: { id: 'interceptId' } }, false],
      [{ interceptFrom: { id: 'interceptFromId' } }, false],
      [{ interceptSendToEndpoint: { id: 'interceptSendToEndpointId' } }, false],
    ])('should return %s for %s', (definition, result) => {
      expect(CamelOnCompletionVisualEntity.isApplicable(definition)).toEqual(result);
    });
  });

  it('should return the id', () => {
    const onCompletionVisualEntity = new CamelOnCompletionVisualEntity({
      onCompletion: { id: 'id', mode: 'AfterConsumer' },
    });
    expect(onCompletionVisualEntity.getId()).toEqual('id');
  });

  it('should set the id', () => {
    const onCompletionVisualEntity = new CamelOnCompletionVisualEntity({
      onCompletion: { id: 'id', mode: 'AfterConsumer' },
    });
    onCompletionVisualEntity.setId('new-id');
    expect(onCompletionVisualEntity.getId()).toEqual('new-id');
    expect(onCompletionVisualEntity.onCompletionDef.onCompletion.id).toEqual('new-id');
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
      { processorName: 'onCompletion', path: 'onCompletion' },
      { processorName: 'interceptSendToEndpoint', path: 'interceptSendToEndpoint' },
    ] as const)(`should return the correct interaction for the '%s' processor`, (data) => {
      const onCompletionVisualEntity = new CamelOnCompletionVisualEntity({
        onCompletion: { id: 'id', mode: 'AfterConsumer' },
      });

      const result = onCompletionVisualEntity.getNodeInteraction(data as IVisualizationNodeData);
      expect(result).toMatchSnapshot();
    });
  });

  it('should delegate the validation text to the ModelValidationService', () => {
    const validateNodeStatusSpy = jest.spyOn(ModelValidationService, 'validateNodeStatus');

    const onCompletionVisualEntity = new CamelOnCompletionVisualEntity({
      onCompletion: { id: 'id', mode: 'AfterConsumer' },
    });
    onCompletionVisualEntity.getNodeValidationText('a-path');

    expect(validateNodeStatusSpy).toHaveBeenCalledWith(expect.anything());
  });

  it('should return the vizualization node', () => {
    const onCompletionVisualEntity = new CamelOnCompletionVisualEntity({
      onCompletion: { id: 'id', mode: 'AfterConsumer' },
    });
    const vizNode = onCompletionVisualEntity.toVizNode().nodes[0];

    expect(vizNode.data.processorName).toBe(CamelOnCompletionVisualEntity.ROOT_PATH);
    expect(vizNode.data.entity).toBe(onCompletionVisualEntity);
    expect(vizNode.data.isGroup).toBeTruthy();
  });

  it('should serialize the entity', () => {
    const onCompletionVisualEntity = new CamelOnCompletionVisualEntity({
      onCompletion: { id: undefined, mode: 'AfterConsumer' },
    });
    const result = onCompletionVisualEntity.toJSON();

    expect(result).toMatchSnapshot();
  });
});
