import { DynamicCatalogRegistry } from '../../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind, ICitrusComponentDefinition } from '../../../../../../../models';
import { testFunctionSuggestionProvider } from './test-function.suggestions';

describe('Test Function Suggestions', () => {
  it.each([
    { propertyName: '#.message.body.data', schema: { type: 'string' }, expected: true },
    { propertyName: '#.message.headers.0.value', schema: { type: 'string' }, expected: true },
    { propertyName: '#.response.body.0.data', schema: { type: 'string' }, expected: true },
    { propertyName: '#.response.headers.0.value', schema: { type: 'string' }, expected: true },
    { propertyName: '#.message.expression.0.value', schema: { type: 'string' }, expected: true },
    { propertyName: '#.extract.body.0.path', schema: { type: 'string' }, expected: true },
    { propertyName: 'test', schema: { type: 'string' }, expected: false },
    { propertyName: '#.message.body.data', schema: { type: 'number' }, expected: false },
  ] as const)(
    'should apply to $propertyName with type=$schema.type => $expected',
    ({ propertyName, schema, expected }) => {
      expect(testFunctionSuggestionProvider.appliesTo(propertyName, schema)).toBe(expected);
    },
  );

  it('should return suggestions from the catalog', async () => {
    const mockCatalog: Record<string, ICitrusComponentDefinition> = {
      randomNumber: {
        kind: CatalogKind.TestFunction,
        name: 'randomNumber',
        description: 'Generate a random number',
        propertiesSchema: {
          properties: {
            min: { type: 'integer' },
            max: { type: 'integer' },
          },
          required: ['min', 'max'],
        },
      },
      currentDate: {
        kind: CatalogKind.TestFunction,
        name: 'currentDate',
        description: 'Get the current date',
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

    const suggestions = await testFunctionSuggestionProvider.getSuggestions('', {
      inputValue: '',
      cursorPosition: 0,
      propertyName: '#.message.body.data',
    });

    expect(suggestions).toEqual([
      {
        value: 'citrus:randomNumber(min,max)',
        description: 'Generate a random number',
        group: 'Functions',
      },
      {
        value: 'citrus:currentDate(pattern)',
        description: 'Get the current date',
        group: 'Functions',
      },
    ]);
  });

  it('should mark optional parameters with ?', async () => {
    const mockCatalog: Record<string, ICitrusComponentDefinition> = {
      randomString: {
        kind: CatalogKind.TestFunction,
        name: 'randomString',
        description: 'Generate a random string',
        propertiesSchema: {
          properties: {
            length: { type: 'integer' },
            charset: { type: 'string' },
          },
          required: ['length'],
        },
      },
    };

    vi.spyOn(DynamicCatalogRegistry.get(), 'getCatalog').mockReturnValue({
      getAll: vi.fn().mockResolvedValue(mockCatalog),
      get: vi.fn(),
      clearCache: vi.fn(),
    });

    const suggestions = await testFunctionSuggestionProvider.getSuggestions('', {
      inputValue: '',
      cursorPosition: 0,
      propertyName: '#.message.body.data',
    });

    expect(suggestions).toEqual([
      {
        value: 'citrus:randomString(length,charset?)',
        description: 'Generate a random string',
        group: 'Functions',
      },
    ]);
  });

  it('should return empty suggestions when catalog is not available', async () => {
    vi.spyOn(DynamicCatalogRegistry.get(), 'getCatalog').mockReturnValue(undefined);

    const suggestions = await testFunctionSuggestionProvider.getSuggestions('', {
      inputValue: '',
      cursorPosition: 0,
      propertyName: '#.message.body.data',
    });

    expect(suggestions).toEqual([]);
  });
});
