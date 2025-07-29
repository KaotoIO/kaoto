import { Step } from '@kaoto/camel-catalog/types';
import {
  datamapperRouteDefinitionStub,
  twoDataMapperRouteDefinitionStub,
} from '../../../../../stubs/datamapper/data-mapper';
import { RootNodeMapper } from '../root-node-mapper';
import { DataMapperNodeMapper } from './datamapper-node-mapper';
import { noopNodeMapper } from './testing/noop-node-mapper';

describe('DataMapperNodeMapper', () => {
  let mapper: DataMapperNodeMapper;
  let rootNodeMapper: RootNodeMapper;
  const routeDefinition = datamapperRouteDefinitionStub;
  const path = 'from.steps.0.step';
  const twoDataMapperRouteDefinition = twoDataMapperRouteDefinitionStub;
  const firstDataMapperPath = 'from.steps.0.step';
  const secondDataMapperPath = 'from.steps.1.step';

  beforeEach(() => {
    rootNodeMapper = new RootNodeMapper();
    rootNodeMapper.registerDefaultMapper(mapper);
    rootNodeMapper.registerMapper('log', noopNodeMapper);

    mapper = new DataMapperNodeMapper(rootNodeMapper);
  });

  describe('getVizNodeFromProcessor', () => {
    it('should not return any children', () => {
      const vizNode = mapper.getVizNodeFromProcessor(path, { processorName: 'step' }, routeDefinition).nodes[0];

      expect(vizNode.getChildren()).toBeUndefined();
    });

    it('should assign an unique ID for each DataMapper steps', () => {
      const firstVizNode = mapper.getVizNodeFromProcessor(
        firstDataMapperPath,
        { processorName: 'step' },
        twoDataMapperRouteDefinition,
      ).nodes[0];
      const secondVizNode = mapper.getVizNodeFromProcessor(
        secondDataMapperPath,
        { processorName: 'step' },
        twoDataMapperRouteDefinition,
      ).nodes[0];

      expect(firstVizNode.id).toContain('kaoto-datamapper');
      expect(secondVizNode.id).toContain('kaoto-datamapper');
      expect(firstVizNode.id).not.toEqual(secondVizNode.id);
    });
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
