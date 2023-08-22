import { CamelRoute, EntityType, Step } from './camel-entities';

describe('Step', () => {
  let step: Step;

  beforeEach(() => {
    step = new Step();
  });

  it('should not have an id by default', () => {
    expect(step.id).toBe('');
  });

  it('should not have a name by default', () => {
    expect(step.name).toBe('');
  });

  it('should not have steps by default', () => {
    expect(step.steps).toEqual([]);
  });

  it('should return its steps', () => {
    step.steps = [new Step(), new Step()];

    expect(step._getSteps()).toHaveLength(2);
  });
});

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
    expect(camelEntity._type).toEqual(EntityType.Route);
  });

  it('should return the steps', () => {
    expect(camelEntity._getSteps()).toEqual([]);
  });
});
