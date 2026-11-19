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

  describe('parseSteps() nesting', () => {
    const steps = [
      { filter: { id: 'filter-1', steps: [{ log: { id: 'log-1', message: 'in filter' } }] } },
      {
        choice: {
          id: 'choice-1',
          when: [
            {
              id: 'when-1',
              expression: { simple: { expression: '${header.a}' } },
              steps: [{ to: { id: 'to-1', uri: 'log:a' } }],
            },
          ],
          otherwise: { id: 'otherwise-1', steps: [{ to: { id: 'to-2', uri: 'log:b' } }] },
        },
      },
      {
        doTry: {
          id: 'try-1',
          doCatch: [{ id: 'catch-1', exception: ['java.io.IOException'], steps: [] }],
          doFinally: { id: 'finally-1' },
        },
      },
    ] as unknown as Parameters<typeof CommonParser.parseSteps>[0];

    it('lists nested steps and branches after their parent, in order', () => {
      const parsed = CommonParser.parseSteps(steps);

      expect(parsed.map((step) => [step.id, step.name])).toEqual([
        ['filter-1', 'filter'],
        ['log-1', 'log'],
        ['choice-1', 'choice'],
        ['when-1', 'when'],
        ['to-1', 'to'],
        ['otherwise-1', 'otherwise'],
        ['to-2', 'to'],
        ['try-1', 'doTry'],
        ['catch-1', 'doCatch'],
        ['finally-1', 'doFinally'],
      ]);
    });

    it('lists the expression and the exceptions of a branch', () => {
      const parsed = CommonParser.parseSteps(steps);

      expect(parsed.find((step) => step.id === 'when-1')?.parameters).toEqual({ 'expression (simple)': '${header.a}' });
      expect(parsed.find((step) => step.id === 'catch-1')?.parameters).toEqual({ exception: 'java.io.IOException' });
    });

    it('reads the XSLT file of a DataMapper step whose XSLT step is a URI', () => {
      const parsed = CommonParser.parseSteps([
        { step: { id: 'kaoto-datamapper-1', steps: [{ to: 'xslt-saxon:mapping.xsl' }] } },
      ] as unknown as Parameters<typeof CommonParser.parseSteps>[0]);

      expect(parsed[0].parameters).toEqual({ 'XSLT file name': 'mapping.xsl' });
    });
  });

  describe('parseParameters() values', () => {
    it('returns no parameters without a model', () => {
      expect(CommonParser.parseParameters(undefined)).toEqual({});
    });

    it('prefixes nested objects and lists with their path and joins lists of text', () => {
      expect(
        CommonParser.parseParameters({
          options: { retries: 3, backoff: { delay: 100 } },
          endpoints: [{ name: 'a' }, { name: 'b' }],
          tags: ['x', 'y'],
          empty: [],
        }),
      ).toEqual({
        'options.retries': '3',
        'options.backoff.delay': '100',
        'endpoints.0.name': 'a',
        'endpoints.1.name': 'b',
        tags: 'x, y',
      });
    });
  });
});
