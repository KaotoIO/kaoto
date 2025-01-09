import { getUserUpdatedProperties } from './get-user-updated-properties';
import { inputModelForTestSchema, testSchema } from '../stubs/test-schema';

describe('getUserUpdatedProperties()', () => {
  it('should return only the properties which are user Modified', () => {
    const processedSchema = getUserUpdatedProperties(testSchema['properties'], inputModelForTestSchema, testSchema);
    expect(processedSchema).toMatchSnapshot();
  });

  it('should return {}', () => {
    const processedSchema = getUserUpdatedProperties(testSchema['properties'], {}, testSchema);
    expect(processedSchema).toMatchObject({});
  });
});
