import { getRequiredPropertiesSchema } from './get-required-properties-schema';
import { testSchema } from '../stubs/test-schema';

describe('getRequiredPropertiesSchema()', () => {
  it('should return only the properties which are Required', () => {
    const procesedSchema = getRequiredPropertiesSchema(testSchema, testSchema);
    expect(procesedSchema).toMatchSnapshot();
  });

  it('should return {}', () => {
    const procesedSchema = getRequiredPropertiesSchema({}, testSchema);
    expect(procesedSchema).toMatchObject({});
  });
});
