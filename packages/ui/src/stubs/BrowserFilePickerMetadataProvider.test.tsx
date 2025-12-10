import { act, render, screen } from '@testing-library/react';
import { useContext } from 'react';

import { CatalogKind, StepUpdateAction } from '../models';
import {
  SCHEMA_FILE_ACCEPT_PATTERN,
  SCHEMA_FILE_ACCEPT_PATTERN_SOURCE_BODY,
  SCHEMA_FILE_NAME_PATTERN,
  SCHEMA_FILE_NAME_PATTERN_SOURCE_BODY,
} from '../models/datamapper';
import { IMetadataApi, MetadataContext } from '../providers';
import { BrowserFilePickerMetadataProvider } from './BrowserFilePickerMetadataProvider';
import { readFileAsString } from './read-file-as-string';

jest.mock('./read-file-as-string');

const mockReadFileAsString = readFileAsString as jest.MockedFunction<typeof readFileAsString>;

describe('BrowserFilePickerMetadataProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProvider = () => {
    let api: IMetadataApi | undefined;

    const TestComponent = () => {
      api = useContext(MetadataContext);
      return <div data-testid="test-child">Child</div>;
    };

    render(
      <BrowserFilePickerMetadataProvider>
        <TestComponent />
      </BrowserFilePickerMetadataProvider>,
    );

    return {
      api: api!,
      fileInput: screen.getByTestId('attach-schema-file-input') as HTMLInputElement,
    };
  };

  const triggerFileSelect = async (fileInput: HTMLInputElement, files: File[]) => {
    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: files,
        writable: false,
      });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
  };

  it('should render children and hidden file input', () => {
    render(
      <BrowserFilePickerMetadataProvider>
        <div data-testid="test-child">Test Child</div>
      </BrowserFilePickerMetadataProvider>,
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByTestId('attach-schema-file-input')).toBeInTheDocument();
    expect(screen.getByTestId('attach-schema-file-input')).toHaveStyle({ display: 'none' });
  });

  it('should provide MetadataContext with shouldSaveSchema set to true', () => {
    const { api } = renderWithProvider();

    expect(api).toBeDefined();
    expect(api.shouldSaveSchema).toBe(true);
  });

  describe('askUserForFileSelection', () => {
    it('should set accept pattern for SCHEMA_FILE_NAME_PATTERN_SOURCE_BODY', () => {
      const { api, fileInput } = renderWithProvider();

      act(() => {
        api.askUserForFileSelection(SCHEMA_FILE_NAME_PATTERN_SOURCE_BODY);
      });

      expect(fileInput.accept).toBe(SCHEMA_FILE_ACCEPT_PATTERN_SOURCE_BODY);
    });

    it('should set accept pattern for SCHEMA_FILE_NAME_PATTERN', () => {
      const { api, fileInput } = renderWithProvider();

      act(() => {
        api.askUserForFileSelection(SCHEMA_FILE_NAME_PATTERN);
      });

      expect(fileInput.accept).toBe(SCHEMA_FILE_ACCEPT_PATTERN);
    });

    it('should trigger file input click', () => {
      const { api, fileInput } = renderWithProvider();
      const clickSpy = jest.fn();
      fileInput.click = clickSpy;

      act(() => {
        api.askUserForFileSelection(SCHEMA_FILE_NAME_PATTERN);
      });

      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('should resolve with file names when files are selected', async () => {
      const mockFile1 = new File(['content1'], 'test1.json', { type: 'application/json' });
      const mockFile2 = new File(['content2'], 'test2.xml', { type: 'application/xml' });
      mockReadFileAsString.mockResolvedValueOnce('content1').mockResolvedValueOnce('content2');

      const { api, fileInput } = renderWithProvider();

      let resolvedFiles: string[] | string | undefined;
      act(() => {
        api.askUserForFileSelection(SCHEMA_FILE_NAME_PATTERN).then((files) => {
          resolvedFiles = files;
        });
      });

      await triggerFileSelect(fileInput, [mockFile1, mockFile2]);

      expect(resolvedFiles).toEqual(['test1.json', 'test2.xml']);
      expect(mockReadFileAsString).toHaveBeenCalledTimes(2);
    });
  });

  describe('onImport', () => {
    it('should handle file input change and read files', async () => {
      const mockFile = new File(['test content'], 'test.json', { type: 'application/json' });
      mockReadFileAsString.mockResolvedValue('test content');

      const { fileInput } = renderWithProvider();

      await triggerFileSelect(fileInput, [mockFile]);

      expect(mockReadFileAsString).toHaveBeenCalledWith(mockFile);
    });

    it('should reset input value after import', async () => {
      const mockFile = new File(['content'], 'test.json', { type: 'application/json' });
      mockReadFileAsString.mockResolvedValue('content');

      const { fileInput } = renderWithProvider();

      await act(async () => {
        Object.defineProperty(fileInput, 'files', { value: [mockFile], writable: false });
        Object.defineProperty(fileInput, 'value', { value: 'test.json', writable: true });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      expect(fileInput.value).toBe('');
    });

    it('should do nothing when no files are selected', async () => {
      const { fileInput } = renderWithProvider();

      await act(async () => {
        Object.defineProperty(fileInput, 'files', { value: null, writable: false });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      expect(mockReadFileAsString).not.toHaveBeenCalled();
    });
  });

  describe('getResourceContent', () => {
    it('should return undefined for non-existent resource', async () => {
      const { api } = renderWithProvider();

      const content = await api.getResourceContent('non-existent.json');

      expect(content).toBeUndefined();
    });

    it('should return content after files are imported', async () => {
      const mockFile = new File(['test content'], 'test.json', { type: 'application/json' });
      mockReadFileAsString.mockResolvedValue('test content');

      const { api, fileInput } = renderWithProvider();

      // Select files
      const filesPromise = api.askUserForFileSelection(SCHEMA_FILE_NAME_PATTERN);
      await triggerFileSelect(fileInput, [mockFile]);
      await filesPromise;

      // Get content
      const content = await api.getResourceContent('test.json');

      expect(content).toBe('test content');
    });
  });

  describe('metadata API stub methods', () => {
    it('should provide getMetadata that returns undefined', async () => {
      const { api } = renderWithProvider();

      const result = await api.getMetadata('test-key');

      expect(result).toBeUndefined();
    });

    it('should provide setMetadata that resolves', async () => {
      const { api } = renderWithProvider();

      await expect(api.setMetadata('test-key', { data: 'test' })).resolves.toBeUndefined();
    });

    it('should provide deleteResource that returns true', async () => {
      const { api } = renderWithProvider();

      const result = await api.deleteResource('test-path');

      expect(result).toBe(true);
    });

    it('should provide saveResourceContent that resolves', async () => {
      const { api } = renderWithProvider();

      await expect(api.saveResourceContent('test-path', 'content')).resolves.toBeUndefined();
    });

    it('should provide getSuggestions that returns empty array', async () => {
      const { api } = renderWithProvider();

      const result = await api.getSuggestions('test-topic', 'test-word');

      expect(result).toEqual([]);
    });

    it('should provide onStepUpdated that resolves', async () => {
      const { api } = renderWithProvider();

      await expect(
        api.onStepUpdated(StepUpdateAction.Add, CatalogKind.Component, 'test-step'),
      ).resolves.toBeUndefined();
    });
  });
});
