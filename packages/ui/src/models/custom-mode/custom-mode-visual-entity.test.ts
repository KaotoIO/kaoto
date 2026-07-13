import { EntityType } from '../entities';
import { CustomMode } from './custom-mode-types';
import { CustomModeVisualEntity } from './custom-mode-visual-entity';

const sampleMode: CustomMode = {
  slug: 'plan',
  name: 'Plan',
  description: 'Planning mode',
  roleDefinition: 'You plan things.',
  whenToUse: 'When planning.',
  groups: ['read'],
};

describe('CustomModeVisualEntity', () => {
  let entity: CustomModeVisualEntity;

  beforeEach(() => {
    entity = new CustomModeVisualEntity(sampleMode);
  });

  it('has a non-empty id', () => {
    expect(entity.id).toBeTruthy();
  });

  it('has type EntityType.CustomMode', () => {
    expect(entity.type).toBe(EntityType.CustomMode);
  });

  it('toJSON returns the raw CustomMode object', () => {
    expect(entity.toJSON()).toEqual(sampleMode);
  });

  it('getId returns the same id as the id property', () => {
    expect(entity.getId()).toBe(entity.id);
  });

  it('setId updates the id', () => {
    entity.setId('my-id');
    expect(entity.id).toBe('my-id');
    expect(entity.getId()).toBe('my-id');
  });

  it('getRootPath returns "customMode"', () => {
    expect(entity.getRootPath()).toBe('customMode');
  });

  it('getOmitFormFields returns empty array', () => {
    expect(entity.getOmitFormFields()).toEqual([]);
  });

  it('getNodeLabel returns slug', () => {
    expect(entity.getNodeLabel()).toBe('plan');
  });
});
