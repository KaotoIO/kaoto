import { normalizeOneOfChoices } from './normalize-oneof-choices';

describe('normalizeOneOfChoices', () => {
  it('should not throw on primitives or null', () => {
    expect(normalizeOneOfChoices(null)).toBeNull();
    expect(normalizeOneOfChoices(undefined)).toBeUndefined();
    expect(normalizeOneOfChoices('string')).toBe('string');
  });

  it('should normalize oneOf choices missing properties or type', () => {
    const schema = {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          title: 'Data',
        },
        resource: {
          type: 'string',
          title: 'Resource',
        },
      },
      anyOf: [
        {
          oneOf: [
            { required: ['data'] },
            {
              type: 'object',
              properties: {
                resource: {
                  type: 'object',
                },
              },
            },
          ],
        },
      ],
    };

    const normalized = normalizeOneOfChoices(schema);

    // The first oneOf choice should have type 'object' and inherited properties
    const choice1 = normalized.anyOf[0].oneOf[0];
    expect(choice1.type).toBe('object');
    expect(choice1.properties).toBeDefined();
    expect(choice1.properties.data).toBeDefined();
    expect(choice1.properties.data.type).toBe('string');
    expect(choice1.properties.data.title).toBe('Data');
    expect(choice1.title).toBe('Data'); // Inherited title

    // The second choice should remain untouched
    const choice2 = normalized.anyOf[0].oneOf[1];
    expect(choice2.type).toBe('object');
    expect(choice2.properties.resource.type).toBe('object');
  });
});
