import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DynamicCatalogRegistry } from '../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind, ICamelComponentDefinition } from '../../../../models';
import { useCamelHeaders } from './useCamelHeaders';

describe('useCamelHeaders', () => {
  const mockCatalog = {
    getAll: vi.fn(),
    get: vi.fn(),
    clearCache: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    DynamicCatalogRegistry.get().setCatalog(CatalogKind.Component, mockCatalog as never);
  });

  afterEach(() => {
    DynamicCatalogRegistry.get().clearRegistry();
  });

  it('should return empty headers array when catalog has no headers', async () => {
    mockCatalog.getAll.mockResolvedValue({});

    const { result } = renderHook(() => useCamelHeaders());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.headers).toEqual([]);
  });

  it('only suggests primitive types, their wrappers and strings', async () => {
    const supportedTypes = [
      'boolean',
      'byte',
      'short',
      'int',
      'long',
      'float',
      'double',
      'char',
      'Boolean',
      'Byte',
      'Short',
      'Integer',
      'Long',
      'Float',
      'Double',
      'Character',
      'String',
      'java.lang.Boolean',
      'java.lang.Byte',
      'java.lang.Short',
      'java.lang.Integer',
      'java.lang.Long',
      'java.lang.Float',
      'java.lang.Double',
      'java.lang.Character',
      'java.lang.String',
    ];
    const unsupportedTypes = [
      'Object',
      'java.lang.Object',
      'Map<String, String>',
      'java.util.List',
      'List<String>',
      'byte[]',
      'String[]',
      'java.io.InputStream',
      'org.bson.types.ObjectId',
      'com.example.String',
      'void',
      '',
      undefined,
    ];
    mockCatalog.getAll.mockResolvedValue({
      test: {
        headers: Object.fromEntries(
          [...supportedTypes, ...unsupportedTypes].map((javaType, index) => [
            `Header${index}`,
            { javaType, description: 'A header' },
          ]),
        ),
      },
    });

    const { result } = renderHook(() => useCamelHeaders());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.headers).toHaveLength(supportedTypes.length);
    expect(result.current.headers.map((header) => header.javaType).sort()).toEqual([...supportedTypes].sort());
  });

  it('filters complex types before deduplicating same-name headers', async () => {
    mockCatalog.getAll.mockResolvedValue({
      complex: { headers: { SharedHeader: { javaType: 'Object', description: 'An object' } } },
      simple: { headers: { SharedHeader: { javaType: 'String', defaultValue: 'hello' } } },
    });

    const { result } = renderHook(() => useCamelHeaders());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.headers).toEqual([
      expect.objectContaining({ name: 'SharedHeader', javaType: 'String', defaultValue: 'hello' }),
    ]);
  });

  it('should deduplicate headers by name across components', async () => {
    const mockComponents: Record<string, Partial<ICamelComponentDefinition>> = {
      file: {
        headers: {
          CamelFileName: {
            constantName: 'CamelFileName',
            displayName: 'File Name',
            description: 'Name of the file',
            javaType: 'String',
            group: 'common',
            index: 0,
            kind: 'parameter',
            required: false,
            autowired: false,
            deprecated: false,
            secret: false,
          },
          CamelFileLength: {
            constantName: 'CamelFileLength',
            displayName: 'File Length',
            description: 'Size of file in bytes',
            javaType: 'Long',
            group: 'common',
            index: 1,
            kind: 'parameter',
            required: false,
            autowired: false,
            deprecated: false,
            secret: false,
          },
        },
      },
      ftp: {
        headers: {
          CamelFileName: {
            constantName: 'CamelFileName',
            displayName: 'FTP File Name',
            description: 'FTP Remote file name',
            javaType: 'String',
            group: 'common',
            index: 0,
            kind: 'parameter',
            required: false,
            autowired: false,
            deprecated: false,
            secret: false,
          },
        },
      },
      http: {
        headers: {
          CamelHttpResponseCode: {
            constantName: 'CamelHttpResponseCode',
            displayName: 'HTTP Response Code',
            description: 'The HTTP status code',
            javaType: 'Integer',
            defaultValue: 200,
            group: 'common',
            index: 0,
            kind: 'parameter',
            required: false,
            autowired: false,
            deprecated: false,
            secret: false,
          },
        },
      },
    };

    mockCatalog.getAll.mockResolvedValue(mockComponents);

    const { result } = renderHook(() => useCamelHeaders());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.headers).toHaveLength(3);
    expect(result.current.headers.filter((header) => header.name === 'CamelFileName')).toEqual([
      expect.objectContaining({ description: 'Name of the file' }),
    ]);
    const names = result.current.headers.map((h) => h.name);
    expect(names).toContain('CamelFileName');
    expect(names).toContain('CamelFileLength');
    expect(names).toContain('CamelHttpResponseCode');
  });

  it('should return all headers sorted alphabetically regardless of component', async () => {
    const mockComponents: Record<string, Partial<ICamelComponentDefinition>> = {
      file: {
        headers: {
          CamelFileName: {
            constantName: 'CamelFileName',
            displayName: 'File Name',
            description: 'Name of the file',
            javaType: 'String',
            group: 'common',
            index: 0,
            kind: 'parameter',
            required: false,
            autowired: false,
            deprecated: false,
            secret: false,
          },
        },
      },
      http: {
        headers: {
          CamelHttpUri: {
            constantName: 'CamelHttpUri',
            displayName: 'HTTP URI',
            description: 'HTTP target URI',
            javaType: 'String',
            group: 'common',
            index: 0,
            kind: 'parameter',
            required: false,
            autowired: false,
            deprecated: false,
            secret: false,
          },
        },
      },
    };

    mockCatalog.getAll.mockResolvedValue(mockComponents);

    const { result } = renderHook(() => useCamelHeaders());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.headers[0].name).toBe('CamelFileName');
    expect(result.current.headers[1].name).toBe('CamelHttpUri');
  });
});
