import { CamelRouteVisualEntity } from '../../models';
import { CamelResourceFactory } from '../../models/camel/camel-resource-factory';
import { camelRouteYaml } from '../../stubs';
import { datamapperRouteDefinitionStub } from '../../stubs/datamapper/data-mapper';
import { CommonParser } from './common-parser';

describe('CommonParser', () => {
  let camelRouteEntity: CamelRouteVisualEntity;

  beforeAll(async () => {
    const resource = CamelResourceFactory.createCamelResource(camelRouteYaml);
    await resource.initialize();
    camelRouteEntity = resource.getVisualEntities()[0] as CamelRouteVisualEntity;
  });

  describe('parseFrom()', () => {
    it('should parse from', () => {
      const parsedFrom = CommonParser.parseFrom(camelRouteEntity.entityDef.route.from);
      expect(parsedFrom).toHaveLength(10);
      expect(parsedFrom[0].uri).toBe('timer');
    });

    it('should parse from with datamapper step', () => {
      const parsedFrom = CommonParser.parseFrom(datamapperRouteDefinitionStub.from);

      expect(parsedFrom).toHaveLength(2);
      expect(parsedFrom[1].id).toBe('kaoto-datamapper-1234');
      expect(parsedFrom[1].name).toBe('Kaoto DataMapper');
      expect(parsedFrom[1].uri).toBe('');
      expect(Object.keys(parsedFrom[1].parameters)).toHaveLength(1);
      expect(parsedFrom[1].parameters['XSLT file name']).toBe('transform.xsl');
    });
  });

  describe('parseSteps()', () => {
    it('should parse steps', () => {
      const parsedSteps = CommonParser.parseSteps(camelRouteEntity.entityDef.route.from.steps);
      expect(parsedSteps).toHaveLength(9);
      expect(parsedSteps[0].uri).toBe('');
      expect(parsedSteps[0].name).toBe('set-header');
    });
  });

  describe('parseComponentStep()', () => {
    it('should parse component step', () => {
      const parsedStep = CommonParser.parseComponentStep('from', camelRouteEntity.entityDef.route.from);
      expect(parsedStep.name).toBe('from');
      expect(parsedStep.uri).toBe('timer');
      expect(Object.keys(parsedStep.parameters)).toHaveLength(1);
      const [paramKey, paramValue] = Object.entries(parsedStep.parameters)[0];
      expect(paramKey).toBe('timerName');
      expect(paramValue).toBe('tutorial');
    });
  });

  describe('parseComponentStep()', () => {
    it('should parse component step', () => {
      const step = camelRouteEntity.entityDef.route.from.steps[0];
      const [stepType, stepModel] = Object.entries(step)[0];
      const parsedStep = CommonParser.parseProcessorStep(stepType, stepModel);
      expect(parsedStep.name).toBe('set-header');
      expect(parsedStep.uri).toBe('');
    });
  });

  describe('parseParameters()', () => {
    it('should parse', () => {
      const step = camelRouteEntity.entityDef.route.from.steps[0];
      const params = CommonParser.parseParameters(Object.values(step)[0]);
      expect(Object.keys(params)).toHaveLength(2);
      expect(params['simple']).toBe('${random(2)}');
      expect(params['name']).toBe('myChoice');
    });
  });
});
