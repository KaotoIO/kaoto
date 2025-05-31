import { CommonParser } from './common-parser';
import { CamelResourceFactory } from '../../models/camel/camel-resource-factory';
import { camelRouteYaml } from '../../stubs';
import { CamelRouteVisualEntity } from '../../models';
import { datamapperRouteDefinitionStub } from '../../stubs/datamapper/data-mapper';

describe('CommonParser', () => {
  const camelRouteEntity = CamelResourceFactory.createCamelResource(
    camelRouteYaml,
  ).getVisualEntities()[0] as CamelRouteVisualEntity;

  describe('parseFrom()', () => {
    it('should parse from', () => {
      const parsedFrom = CommonParser.parseFrom(camelRouteEntity.entityDef.route.from);
      expect(parsedFrom.length).toEqual(10);
      expect(parsedFrom[0].uri).toEqual('timer');
    });

    it('should parse from with datamapper step', () => {
      const parsedFrom = CommonParser.parseFrom(datamapperRouteDefinitionStub.from);

      expect(parsedFrom.length).toEqual(2);
      expect(parsedFrom[1].id).toEqual('kaoto-datamapper-1234');
      expect(parsedFrom[1].name).toEqual('Kaoto DataMapper');
      expect(parsedFrom[1].uri).toEqual('');
      expect(Object.keys(parsedFrom[1].parameters).length).toEqual(1);
      expect(parsedFrom[1].parameters['XSLT file name']).toEqual('transform.xsl');
    });
  });

  describe('parseSteps()', () => {
    it('should parse steps', () => {
      const parsedSteps = CommonParser.parseSteps(camelRouteEntity.entityDef.route.from.steps);
      expect(parsedSteps.length).toEqual(9);
      expect(parsedSteps[0].uri).toEqual('');
      expect(parsedSteps[0].name).toEqual('set-header');
    });
  });

  describe('parseComponentStep()', () => {
    it('should parse component step', () => {
      const parsedStep = CommonParser.parseComponentStep('from', camelRouteEntity.entityDef.route.from);
      expect(parsedStep.name).toEqual('from');
      expect(parsedStep.uri).toEqual('timer');
      expect(Object.keys(parsedStep.parameters).length).toEqual(1);
      const [paramKey, paramValue] = Object.entries(parsedStep.parameters)[0];
      expect(paramKey).toEqual('timerName');
      expect(paramValue).toEqual('tutorial');
    });
  });

  describe('parseComponentStep()', () => {
    it('should parse component step', () => {
      const step = camelRouteEntity.entityDef.route.from.steps[0];
      const [stepType, stepModel] = Object.entries(step)[0];
      const parsedStep = CommonParser.parseProcessorStep(stepType, stepModel);
      expect(parsedStep.name).toEqual('set-header');
      expect(parsedStep.uri).toEqual('');
    });
  });

  describe('parseParameters()', () => {
    it('should parse', () => {
      const step = camelRouteEntity.entityDef.route.from.steps[0];
      const params = CommonParser.parseParameters(Object.values(step)[0]);
      expect(Object.keys(params).length).toEqual(2);
      expect(params['simple']).toEqual('${random(2)}');
      expect(params['name']).toEqual('myChoice');
    });
  });
});
