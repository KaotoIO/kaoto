import { SourceSchemaType } from './source-schema-type';
import { CamelRouteResource } from './camel-route-resource';
import { camelRouteJson } from '../../stubs/camel-route';

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
