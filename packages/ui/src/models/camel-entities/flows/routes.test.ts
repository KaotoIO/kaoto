import { EntityType } from '../base-entity';
import { CamelRoute, KameletBinding } from './routes';

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

describe('Kamelet Binding', () => {
  let kameletBinding: KameletBinding;

  beforeEach(() => {
    kameletBinding = new KameletBinding();
  });

  it('should have an uuid', () => {
    expect(kameletBinding.id).toBeDefined();
    expect(typeof kameletBinding.id).toBe('string');
  });

  it('should have a type', () => {
    expect(kameletBinding.type).toEqual(EntityType.KameletBinding);
  });

  it('should return the steps', () => {
    expect(kameletBinding.getSteps()).toEqual([]);
  });
});
