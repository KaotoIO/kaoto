import { EntityType } from '../../camel-entities/base-entity';
import { CamelRoute } from './route';

describe('Camel Route', () => {
  let camelEntity: CamelRoute;

  beforeEach(() => {
    camelEntity = new CamelRoute();
  });

  it('should have an uuid', () => {
    expect(camelEntity.id).toBeDefined();
    expect(typeof camelEntity.id).toBe('string');
  });

  it('should have a type', () => {
    expect(camelEntity.type).toEqual(EntityType.Route);
  });

  it('should return the steps', () => {
    expect(camelEntity.getSteps()).toEqual([]);
  });
});
