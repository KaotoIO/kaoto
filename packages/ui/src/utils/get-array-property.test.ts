import { getArrayProperty } from './get-array-property';

describe('getArrayProperty', () => {
  it('should return array if it exists', () => {
    const model = {
      steps: ['step1', 'step2'],
    };

    expect(getArrayProperty(model, 'steps')).toEqual(['step1', 'step2']);
  });

  it('should return empty array if it does not exist', () => {
    const model = {};

    expect(getArrayProperty(model, 'steps')).toEqual([]);
  });

  it('should create array if it does not exist', () => {
    const model = {};

    getArrayProperty(model, 'steps').push('step1');

    expect(model).toEqual({ steps: ['step1'] });
  });
});
