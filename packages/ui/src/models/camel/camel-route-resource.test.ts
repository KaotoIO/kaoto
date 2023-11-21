import { SourceSchemaType } from './source-schema-type';
import { CamelRouteResource } from './camel-route-resource';
import { camelRouteJson } from '../../stubs/camel-route';
import { createCamelResource } from './camel-resource';
import { AddStepMode } from '../visualization/base-visual-entity';

describe('CamelRouteResource', () => {
  it('should create CamelRouteResource', () => {
    const resource = new CamelRouteResource(camelRouteJson);
    expect(resource.getType()).toEqual(SourceSchemaType.Route);
    expect(resource.getVisualEntities().length).toEqual(1);
    expect(resource.getEntities().length).toEqual(0);
  });

  it('should initialize Camel Route if no args is specified', () => {
    const resource = new CamelRouteResource(undefined);
    expect(resource.getType()).toEqual(SourceSchemaType.Route);
    expect(resource.getEntities()).toEqual([]);
    expect(resource.getVisualEntities()).toEqual([]);
  });
});

describe('getCompatibleComponents', () => {
  it('should not provide isProducerOnly components', () => {
    const resource = createCamelResource(camelRouteJson);
    expect(resource.getCompatibleComponents(AddStepMode.ReplaceStep, { path: 'from', label: 'timer' })).toBeDefined;
  });

  it('should  provide consumerOnly components', () => {
    const resource = new CamelRouteResource(camelRouteJson);
    expect(
      resource.getCompatibleComponents(AddStepMode.ReplaceStep, {
        path: 'from.steps.2.to',
        processorName: 'to',
        label: 'timer',
      }),
    ).toBeDefined;
  });

  it('scenario for InsertSpecialChild', () => {
    const resource = createCamelResource(camelRouteJson);
    expect(resource.getCompatibleComponents(AddStepMode.InsertSpecialChildStep, { path: 'from', label: 'timer' }))
      .toBeDefined;
  });

  it('scenario for a new step before an existing step', () => {
    const resource = new CamelRouteResource(camelRouteJson);
    expect(
      resource.getCompatibleComponents(AddStepMode.PrependStep, {
        path: 'from.steps.0.to',
        processorName: 'to',
        label: 'timer',
      }),
    ).toBeDefined;
  });

  it('scenario for a new step after an existing step', () => {
    const resource = new CamelRouteResource(camelRouteJson);
    expect(
      resource.getCompatibleComponents(AddStepMode.AppendStep, {
        path: 'from.steps.1.to',
        processorName: 'to',
        label: 'timer',
      }),
    ).toBeDefined;
  });
});
