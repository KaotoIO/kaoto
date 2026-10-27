import { DynamicCatalogRegistry } from '../../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind, ICitrusComponentDefinition } from '../../../../../../../models';
import { testValidationMatcherSuggestionProvider } from './test-validation-matcher.suggestions';

describe('Test Validation Matcher Suggestions', () => {
  it.each([
    { propertyName: '#.validate.0.value', schema: { type: 'string' }, expected: true },
    { propertyName: '#.validate.0.jsonPath.0.value', schema: { type: 'string' }, expected: true },
    { propertyName: '#.validate.0.xpath.0.value', schema: { type: 'string' }, expected: true },
    { propertyName: '#.message.body.data', schema: { type: 'string' }, expected: true },
    { propertyName: '#.message.headers.0.value', schema: { type: 'string' }, expected: true },
    { propertyName: '#.response.body.data', schema: { type: 'string' }, expected: true },
    { propertyName: '#.response.headers.0.value', schema: { type: 'string' }, expected: true },
    { propertyName: '#.message.expression.0.path', schema: { type: 'string' }, expected: true },
    { propertyName: '#.message.expression.0.value', schema: { type: 'string' }, expected: true },
    { propertyName: '#.extract.body.0.path', schema: { type: 'string' }, expected: true },
    { propertyName: '#.extract.header.0.name', schema: { type: 'string' }, expected: true },
    { propertyName: 'test', schema: { type: 'string' }, expected: false },
    { propertyName: '#.validate.0.value', schema: { type: 'number' }, expected: false },
  ] as const)(
    'should apply to $propertyName with type=$schema.type => $expected',
    ({ propertyName, schema, expected }) => {
      expect(testValidationMatcherSuggestionProvider.appliesTo(propertyName, schema)).toBe(expected);
    },
  );

  it('should return suggestions from the catalog', async () => {
    const mockCatalog: Record<string, ICitrusComponentDefinition> = {
      isNumber: {
        kind: CatalogKind.TestValidationMatcher,
        name: 'isNumber',
        description: 'Validate that the value is a number',
        propertiesSchema: {
          properties: {},
        },
      },
      matches: {
        kind: CatalogKind.TestValidationMatcher,
        name: 'matches',
        description: 'Validate with regex pattern',
        propertiesSchema: {
          properties: {
            pattern: { type: 'string' },
          },
          required: ['pattern'],
        },
      },
    };

    vi.spyOn(DynamicCatalogRegistry.get(), 'getCatalog').mockReturnValue({
      getAll: vi.fn().mockResolvedValue(mockCatalog),
      get: vi.fn(),
      clearCache: vi.fn(),
    });

    const suggestions = await testValidationMatcherSuggestionProvider.getSuggestions('', {
      inputValue: '',
      cursorPosition: 0,
      propertyName: '#.validate.0.value',
    });

    expect(suggestions).toEqual([
      {
        value: '@isNumber()@',
        description: 'Validate that the value is a number',
        group: 'Validation Matcher',
      },
      {
        value: '@matches(pattern)@',
        description: 'Validate with regex pattern',
        group: 'Validation Matcher',
      },
    ]);
  });

  it('should mark optional parameters with ?', async () => {
    const mockCatalog: Record<string, ICitrusComponentDefinition> = {
      contains: {
        kind: CatalogKind.TestValidationMatcher,
        name: 'contains',
        description: 'Check if value contains text',
        propertiesSchema: {
          properties: {
            value: { type: 'string' },
            ignoreCase: { type: 'boolean' },
          },
          required: ['value'],
        },
      },
    };

    vi.spyOn(DynamicCatalogRegistry.get(), 'getCatalog').mockReturnValue({
      getAll: vi.fn().mockResolvedValue(mockCatalog),
      get: vi.fn(),
      clearCache: vi.fn(),
    });

    const suggestions = await testValidationMatcherSuggestionProvider.getSuggestions('', {
      inputValue: '',
      cursorPosition: 0,
      propertyName: '#.validate.0.value',
    });

    expect(suggestions).toEqual([
      {
        value: '@contains(value,ignoreCase?)@',
        description: 'Check if value contains text',
        group: 'Validation Matcher',
      },
    ]);
  });

  it('should return empty suggestions when catalog is not available', async () => {
    vi.spyOn(DynamicCatalogRegistry.get(), 'getCatalog').mockReturnValue(undefined);

    const suggestions = await testValidationMatcherSuggestionProvider.getSuggestions('', {
      inputValue: '',
      cursorPosition: 0,
      propertyName: '#.validate.0.value',
    });

    expect(suggestions).toEqual([]);
  });
});
