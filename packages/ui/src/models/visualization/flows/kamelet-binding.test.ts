import { EntityType } from '../../camel-entities/base-entity';
import { KameletBinding } from './kamelet-binding';

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
