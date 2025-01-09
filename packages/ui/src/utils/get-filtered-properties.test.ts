import { restSchemaProperties } from '../stubs/rest-schema-properties';
import { getFilteredProperties } from './get-filtered-properties';

describe('getFilteredProperties()', () => {
  it('should return only the filtered properties', () => {
    const filteredSchema = getFilteredProperties(restSchemaProperties, 'des');
    expect(filteredSchema).toMatchSnapshot();
  });

  it('should return only the un-omitted properties', () => {
    const filteredSchema = getFilteredProperties(restSchemaProperties, '', [
      'get',
      'post',
      'put',
      'delete',
      'patch',
      'patch',
    ]);
    expect(filteredSchema).toMatchSnapshot();
  });
});
