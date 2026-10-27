import { KaotoResource } from '../../../../../../../models/kaoto-resource';
import { getTestVariableSuggestionProvider } from './test-variable.suggestions';

describe('Test Variable Suggestions', () => {
  it.each([
    { propertyName: '#.validate.0.value', schema: { type: 'string' }, expected: true },
    { propertyName: '#.validate.0.jsonPath.0.value', schema: { type: 'string' }, expected: true },
    { propertyName: '#.validate.0.xpath.0.value', schema: { type: 'string' }, expected: true },
    { propertyName: '#.ignore.0.path', schema: { type: 'string' }, expected: true },
    { propertyName: '#.message.body.data', schema: { type: 'string' }, expected: true },
    { propertyName: '#.message.headers.0.value', schema: { type: 'string' }, expected: true },
    { propertyName: '#.response.body.data', schema: { type: 'string' }, expected: true },
    { propertyName: '#.response.headers.0.value', schema: { type: 'string' }, expected: true },
    { propertyName: '#.variables.0.value', schema: { type: 'string' }, expected: true },
    { propertyName: '#.message.expression.0.path', schema: { type: 'string' }, expected: true },
    { propertyName: '#.message.expression.0.value', schema: { type: 'string' }, expected: true },
    { propertyName: '#.extract.body.0.path', schema: { type: 'string' }, expected: true },
    { propertyName: '#.extract.header.0.name', schema: { type: 'string' }, expected: true },
    { propertyName: 'test', schema: { type: 'string' }, expected: false },
    { propertyName: '#.validate.0.value', schema: { type: 'number' }, expected: false },
  ] as const)(
    'should apply to $propertyName with type=$schema.type => $expected',
    ({ propertyName, schema, expected }) => {
      expect(getTestVariableSuggestionProvider(undefined).appliesTo(propertyName, schema)).toBe(expected);
    },
  );

  it('should suggest a default variable reference when word is empty', async () => {
    const suggestions = await getTestVariableSuggestionProvider(undefined).getSuggestions('', {
      inputValue: '',
      cursorPosition: 0,
      propertyName: '#.message.body.data',
    });

    expect(suggestions).toEqual([
      {
        value: '${var_name}',
        description: "Reference the 'var_name' variable",
        group: 'Test variables',
      },
    ]);
  });

  it('should extract raw variable name from ${...} expression', async () => {
    const suggestions = await getTestVariableSuggestionProvider(undefined).getSuggestions('${myVar}', {
      inputValue: '${myVar}',
      cursorPosition: 0,
      propertyName: '#.message.body.data',
    });

    expect(suggestions).toEqual([
      {
        value: '${myVar}',
        description: "Reference the 'myVar' variable",
        group: 'Test variables',
      },
    ]);
  });

  it('should use var_name for citrus function expressions', async () => {
    const suggestions = await getTestVariableSuggestionProvider(undefined).getSuggestions('citrus:randomNumber(1,10)', {
      inputValue: '',
      cursorPosition: 0,
      propertyName: '#.message.body.data',
    });

    expect(suggestions[0].value).toBe('${var_name}');
  });

  it('should use var_name for validation matcher expressions', async () => {
    const suggestions = await getTestVariableSuggestionProvider(undefined).getSuggestions('@isNumber()@', {
      inputValue: '',
      cursorPosition: 0,
      propertyName: '#.message.body.data',
    });

    expect(suggestions[0].value).toBe('${var_name}');
  });

  it('should include variables from the test resource', async () => {
    const mockResource = {
      getVariables: vi.fn().mockReturnValue(['user', 'password', 'host']),
    } as unknown as KaotoResource;

    const suggestions = await getTestVariableSuggestionProvider(mockResource).getSuggestions('', {
      inputValue: '',
      cursorPosition: 0,
      propertyName: '#.message.body.data',
    });

    expect(suggestions).toEqual([
      {
        value: '${var_name}',
        description: "Reference the 'var_name' variable",
        group: 'Test variables',
      },
      {
        value: '${user}',
        description: "Reference the 'user' variable",
        group: 'Test variables',
      },
      {
        value: '${password}',
        description: "Reference the 'password' variable",
        group: 'Test variables',
      },
      {
        value: '${host}',
        description: "Reference the 'host' variable",
        group: 'Test variables',
      },
    ]);
  });

  it('should not duplicate the current word in variable suggestions', async () => {
    const mockResource = {
      getVariables: vi.fn().mockReturnValue(['user', 'password']),
    } as unknown as KaotoResource;

    const suggestions = await getTestVariableSuggestionProvider(mockResource).getSuggestions('${user}', {
      inputValue: '${user}',
      cursorPosition: 0,
      propertyName: '#.message.body.data',
    });

    expect(suggestions).toEqual([
      {
        value: '${user}',
        description: "Reference the 'user' variable",
        group: 'Test variables',
      },
      {
        value: '${password}',
        description: "Reference the 'password' variable",
        group: 'Test variables',
      },
    ]);
  });
});
