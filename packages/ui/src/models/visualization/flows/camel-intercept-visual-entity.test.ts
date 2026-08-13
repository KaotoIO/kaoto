import { mockRandomValues } from '../../../stubs';
import { CatalogKind } from '../../catalog-kind';
import { IVisualizationNodeData } from '../base-visual-entity';
import { CamelInterceptVisualEntity } from './camel-intercept-visual-entity';
import { ModelValidationService } from './support/validators/model-validation.service';

describe('CamelInterceptVisualEntity', () => {
  beforeAll(() => {
    mockRandomValues();
  });

  describe('function Object() { [native code] }', () => {
    it('should allow to create an instance out of the object definition', () => {
      const interceptVisualEntity = new CamelInterceptVisualEntity({
        intercept: { id: 'a-reference', disabled: false },
      });

      expect(interceptVisualEntity.getId()).toBe('a-reference');
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
    expect(interceptVisualEntity.getId()).toBe('id');
  });

  it('should set the id', () => {
    const interceptVisualEntity = new CamelInterceptVisualEntity({ intercept: { id: 'a-reference', disabled: false } });
    interceptVisualEntity.setId('new-id');
    expect(interceptVisualEntity.getId()).toBe('new-id');
    expect(interceptVisualEntity.interceptDef.intercept.id).toBe('new-id');
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
      const interceptVisualEntity = new CamelInterceptVisualEntity({
        intercept: { id: 'id', disabled: false },
      });

      const result = interceptVisualEntity.getNodeInteraction({
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

    const interceptVisualEntity = new CamelInterceptVisualEntity({
      intercept: { id: 'id', disabled: false },
    });
    interceptVisualEntity.getNodeValidationText('intercept', { type: 'object', properties: {} });

    expect(validateNodeStatusSpy).toHaveBeenCalled();
  });

  it('toVizNode should return visualization node', async () => {
    const interceptVisualEntity = new CamelInterceptVisualEntity({
      intercept: { id: 'id', disabled: false },
    });
    const vizNode = await interceptVisualEntity.toVizNode();
    await vizNode.fetchSchema();

    expect(vizNode.data.primaryNodeId?.name).toBe(CamelInterceptVisualEntity.ROOT_PATH);
    expect(vizNode.data.entity).toBe(interceptVisualEntity);
    expect(vizNode.data.isGroup).toBeTruthy();
    expect(vizNode.data.primaryNodeId).toEqual({ name: interceptVisualEntity.type, catalogKind: CatalogKind.Entity });
  });

  it('should serialize the entity', () => {
    const interceptVisualEntity = new CamelInterceptVisualEntity({
      intercept: { id: undefined, disabled: false },
    });
    const result = interceptVisualEntity.toJSON();

    expect(result).toMatchSnapshot();
  });
});
