import { act, renderHook } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';
import { useContext } from 'react';
import { SuggestionContext, SuggestionRegistryProvider, useSuggestionRegistry } from './SuggestionRegistryProvider';

describe('SuggestionRegistryProvider', () => {
  const renderHooks = () =>
    renderHook(
      () => {
        const { registerProvider, unregisterProvider } = useSuggestionRegistry()!;
        const { getProviders } = useContext(SuggestionContext);
        return { registerProvider, unregisterProvider, getProviders };
      },
      {
        wrapper: SuggestionRegistryProvider,
      },
    );

  it('should register and unregister providers', () => {
    const { result } = renderHooks();

    const provider = {
      id: 'testProvider',
      appliesTo: (propertyName: string, schema: JSONSchema4) => true,
      getSuggestions: () => [],
    };

    act(() => {
      result.current.registerProvider(provider);
    });

    const schema: JSONSchema4 = { type: 'string' };
    const providers = result.current.getProviders('testProperty', schema);
    expect(providers).toHaveLength(1);
    expect(providers[0].id).toBe('testProvider');

    act(() => {
      result.current.unregisterProvider('testProvider');
    });

    const providersAfterUnregister = result.current.getProviders('testProperty', schema);
    expect(providersAfterUnregister).toHaveLength(0);
  });

  it('should filter providers based on appliesTo function', () => {
    const { result } = renderHooks();

    const stringProvider = {
      id: 'stringProvider',
      appliesTo: (propertyName: string, schema: JSONSchema4) => schema.type === 'string',
      getSuggestions: () => [],
    };

    const numberProvider = {
      id: 'numberProvider',
      appliesTo: (propertyName: string, schema: JSONSchema4) => schema.type === 'number',
      getSuggestions: () => [],
    };

    act(() => {
      result.current.registerProvider(stringProvider);
      result.current.registerProvider(numberProvider);
    });

    // Test with string schema
    const stringSchema: JSONSchema4 = { type: 'string' };
    const stringProviders = result.current.getProviders('testProperty', stringSchema);
    expect(stringProviders).toHaveLength(1);
    expect(stringProviders[0].id).toBe('stringProvider');

    // Test with number schema
    const numberSchema: JSONSchema4 = { type: 'number' };
    const numberProviders = result.current.getProviders('testProperty', numberSchema);
    expect(numberProviders).toHaveLength(1);
    expect(numberProviders[0].id).toBe('numberProvider');
  });

  it('should not register provider with duplicate id', () => {
    const { result } = renderHooks();

    const provider1 = {
      id: 'duplicateId',
      appliesTo: () => true,
      getSuggestions: () => [{ value: 'suggestion1' }],
    };

    const provider2 = {
      id: 'duplicateId',
      appliesTo: () => true,
      getSuggestions: () => [{ value: 'suggestion2' }],
    };

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    act(() => {
      result.current.registerProvider(provider1);
      result.current.registerProvider(provider2);
    });

    const schema: JSONSchema4 = { type: 'string' };
    const providers = result.current.getProviders('testProperty', schema);

    expect(providers).toHaveLength(1);
    expect(providers[0]).toBe(provider1);
    expect(consoleSpy).toHaveBeenCalledWith('Suggestion provider with ID "duplicateId" already registered.');

    consoleSpy.mockRestore();
  });

  it('should return all providers when schema is falsy', () => {
    const { result } = renderHooks();

    const provider = {
      id: 'testProvider',
      appliesTo: () => true,
      getSuggestions: () => [],
    };

    act(() => {
      result.current.registerProvider(provider);
    });

    const providers = result.current.getProviders('testProperty', null as unknown as JSONSchema4);
    expect(providers).toHaveLength(1);
  });

  it('should throw error when useSuggestionRegistry is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error logs

    expect(() => {
      renderHook(() => useSuggestionRegistry());
    }).toThrow('useSuggestionRegistry must be used within a SuggestionRegistryProvider');

    jest.restoreAllMocks();
  });
});
