import { RouteDefinition, Step } from '@kaoto/camel-catalog/types';
import { parse } from 'yaml';
import { RootNodeMapper } from '../root-node-mapper';
import { DataMapperNodeMapper } from './datamapper-node-mapper';
import { noopNodeMapper } from './testing/noop-node-mapper';

describe('DataMapperNodeMapper', () => {
  let mapper: DataMapperNodeMapper;
  let routeDefinition: RouteDefinition;
  let rootNodeMapper: RootNodeMapper;
  const path = 'from.steps.0.step';

  beforeEach(() => {
    rootNodeMapper = new RootNodeMapper();
    rootNodeMapper.registerDefaultMapper(mapper);
    rootNodeMapper.registerMapper('log', noopNodeMapper);

    mapper = new DataMapperNodeMapper(rootNodeMapper);

    routeDefinition = parse(`
      from:
        id: from-8888
        uri: direct:start
        parameters: {}
        steps:
          - step:
              id: ${DataMapperNodeMapper.DATAMAPPER_ID_PREFIX}-1234
              steps:
                - to:
                    uri: ${DataMapperNodeMapper.XSLT_COMPONENT_NAME}:transform.xsl`);
  });

  it('should not return any children', () => {
    const vizNode = mapper.getVizNodeFromProcessor(path, { processorName: 'step' }, routeDefinition);

    expect(vizNode.getChildren()).toBeUndefined();
  });

  describe('isDataMapperNode', () => {
    it('should return true if it has the right id and a xslt component', () => {
      const stepDefinition = routeDefinition.from.steps[0].step as Step;
      const isDataMapperNode = DataMapperNodeMapper.isDataMapperNode(stepDefinition);

      expect(isDataMapperNode).toBe(true);
    });

    it('should return false if it has the right id but no xslt component', () => {
      const stepDefinition = routeDefinition.from.steps[0].step as Step;
      stepDefinition.steps![0].to = { uri: 'direct:log' };

      const isDataMapperNode = DataMapperNodeMapper.isDataMapperNode(stepDefinition);

      expect(isDataMapperNode).toBe(false);
    });

    it('should return false if it has no id but a xslt component', () => {
      const stepDefinition = routeDefinition.from.steps[0].step as Step;
      stepDefinition.id = 'step-1234';

      const isDataMapperNode = DataMapperNodeMapper.isDataMapperNode(stepDefinition);

      expect(isDataMapperNode).toBe(false);
    });
  });
});
