import { ValidationStatus } from '../../models';
import { CamelRouteResource } from '../../models/camel';
import { camelRouteJson } from '../../stubs';
import { RouteIdValidator } from './routeIdValidator';

describe('routeIdValidator', () => {
  it.each([
    ['', false],
    ['.', false],
    ['/', false],
    ['Route', false],
    ['Route 1234', false],
    ['444', true],
    ['route', true],
    ['route-1234', true],
  ])('isNameValidCheck() should return "%s" when name="%s"', (name, result) => {
    expect(RouteIdValidator.isNameValidCheck(name)).toEqual(result);
  });

  it('should return sucess if the name is unique', () => {
    const resource = new CamelRouteResource([camelRouteJson]);
    const visualEntities = resource.getVisualEntities();
    jest.spyOn(visualEntities[0], 'getId').mockReturnValue('flow-1234');

    const result = RouteIdValidator.validateUniqueName('unique-name', visualEntities);
    expect(result.status).toEqual(ValidationStatus.Success);
    expect(result.errMessages).toHaveLength(0);
  });

  it('should return an error if the name is not unique', () => {
    const resource = new CamelRouteResource([camelRouteJson]);
    const visualEntities = resource.getVisualEntities();
    jest.spyOn(visualEntities[0], 'getId').mockReturnValue('flow-1234');

    const result = RouteIdValidator.validateUniqueName('flow-1234', visualEntities);

    expect(result.status).toEqual(ValidationStatus.Error);
    expect(result.errMessages).toEqual(['Name must be unique']);
  });

  it('should return an error if the name is not a valid URI', () => {
    const resource = new CamelRouteResource([camelRouteJson]);
    const visualEntities = resource.getVisualEntities();
    jest.spyOn(visualEntities[0], 'getId').mockReturnValue('flow-1234');

    const result = RouteIdValidator.validateUniqueName('The amazing Route', visualEntities);

    expect(result.status).toEqual(ValidationStatus.Error);
    expect(result.errMessages).toEqual(['Name should only contain lowercase letters, numbers, and dashes']);
  });

  it('should return an error if the name is not unique neither a valid URI', () => {
    const resource = new CamelRouteResource([camelRouteJson]);
    const visualEntities = resource.getVisualEntities();
    jest.spyOn(visualEntities[0], 'getId').mockReturnValue('The amazing Route');

    const result = RouteIdValidator.validateUniqueName('The amazing Route', visualEntities);

    expect(result.status).toEqual(ValidationStatus.Error);
    expect(result.errMessages).toEqual([
      'Name should only contain lowercase letters, numbers, and dashes',
      'Name must be unique',
    ]);
  });
});
