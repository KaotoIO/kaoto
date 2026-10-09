import { CatalogKind, StepUpdateAction } from '@kaoto/editor-api';
import { act, render, screen } from '@testing-library/react';
import { useContext } from 'react';

import {
  SCHEMA_FILE_ACCEPT_PATTERN,
  SCHEMA_FILE_ACCEPT_PATTERN_XML,
  SCHEMA_FILE_NAME_PATTERN,
  SCHEMA_FILE_NAME_PATTERN_XML,
} from '../models/datamapper';
import { IMetadataApi, MetadataContext } from '../providers';
import { BrowserFilePickerMetadataProvider } from './BrowserFilePickerMetadataProvider';
import { createFile } from './read-file-as-string';

/** A real `File` whose `text()` (used by `readFileAsString`) is observable; JSDOM's `File` lacks `text()`. */
const createSpiedFile = (content: string, name: string) => {
  const file = createFile(content, name);
  const textSpy = vi.spyOn(file, 'text');
  return { file, textSpy };
};

describe('BrowserFilePickerMetadataProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    it('should set accept pattern for SCHEMA_FILE_NAME_PATTERN_SOURCE_BODY', async () => {
      const { api, fileInput } = renderWithProvider();

      const selectionPromise = api.askUserForFileSelection(SCHEMA_FILE_NAME_PATTERN_XML);

      expect(fileInput.accept).toBe(SCHEMA_FILE_ACCEPT_PATTERN_XML);

      void selectionPromise;
    });

    it('should set accept pattern for SCHEMA_FILE_NAME_PATTERN', async () => {
      const { api, fileInput } = renderWithProvider();

      const selectionPromise = api.askUserForFileSelection(SCHEMA_FILE_NAME_PATTERN);

      expect(fileInput.accept).toBe(SCHEMA_FILE_ACCEPT_PATTERN);

      void selectionPromise;
    });

    it('should trigger file input click', async () => {
      const { api, fileInput } = renderWithProvider();
      const clickSpy = vi.fn();
      fileInput.click = clickSpy;

      const selectionPromise = api.askUserForFileSelection(SCHEMA_FILE_NAME_PATTERN);

      expect(clickSpy).toHaveBeenCalledTimes(1);

      void selectionPromise;
    });

    it('should resolve with file names when files are selected', async () => {
      const { file: mockFile1, textSpy: textSpy1 } = createSpiedFile('content1', 'test1.json');
      const { file: mockFile2, textSpy: textSpy2 } = createSpiedFile('content2', 'test2.xml');

      const { api, fileInput } = renderWithProvider();

      const filesPromise = api.askUserForFileSelection(SCHEMA_FILE_NAME_PATTERN);

      await triggerFileSelect(fileInput, [mockFile1, mockFile2]);

      await expect(filesPromise).resolves.toEqual(['test1.json', 'test2.xml']);
      expect(textSpy1).toHaveBeenCalledTimes(1);
      expect(textSpy2).toHaveBeenCalledTimes(1);
    });
  });

  describe('onImport', () => {
    it('should handle file input change and read files', async () => {
      const { file: mockFile, textSpy } = createSpiedFile('test content', 'test.json');

      const { fileInput } = renderWithProvider();

      await triggerFileSelect(fileInput, [mockFile]);

      expect(textSpy).toHaveBeenCalledTimes(1);
    });

    it('should reset input value after import', async () => {
      const mockFile = createFile('content', 'test.json');

      const { fileInput } = renderWithProvider();

      await act(async () => {
        Object.defineProperty(fileInput, 'files', { value: [mockFile], writable: false });
        Object.defineProperty(fileInput, 'value', { value: 'test.json', writable: true });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      expect(fileInput.value).toBe('');
    });

    it('should do nothing when no files are selected', async () => {
      const { api, fileInput } = renderWithProvider();
      const onSelected = vi.fn();
      void api.askUserForFileSelection(SCHEMA_FILE_NAME_PATTERN).then(onSelected);

      await act(async () => {
        Object.defineProperty(fileInput, 'files', { value: null, writable: false });
        Object.defineProperty(fileInput, 'value', { value: 'test.json', writable: true });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      expect(onSelected).not.toHaveBeenCalled();
      expect(fileInput.value).toBe('test.json');
    });
  });

  describe('getResourceContent', () => {
    it('should return undefined for non-existent resource', async () => {
      const { api } = renderWithProvider();

      const content = await api.getResourceContent('non-existent.json');

      expect(content).toBeUndefined();
    });

    it('should return content after files are imported', async () => {
      const mockFile = createFile('test content', 'test.json');

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

  describe('isResourceExist', () => {
    it('should return false for non-existent resource', async () => {
      const { api } = renderWithProvider();

      const exists = await api.isResourceExist('non-existent.json');

      expect(exists).toBe(false);
    });

    it('should return true after files are imported', async () => {
      const mockFile = createFile('test content', 'test.json');

      const { api, fileInput } = renderWithProvider();

      // Select files
      const filesPromise = api.askUserForFileSelection(SCHEMA_FILE_NAME_PATTERN);
      await triggerFileSelect(fileInput, [mockFile]);
      await filesPromise;

      // Check if resource exists
      const exists = await api.isResourceExist('test.json');

      expect(exists).toBe(true);
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
