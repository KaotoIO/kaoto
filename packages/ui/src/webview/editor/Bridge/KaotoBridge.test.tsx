import { render, waitFor } from '@testing-library/react';
import { ComponentProps } from 'react';

import { SourceSchemaType } from '../../../models/camel';
import { TestReportEntry } from '../../../models/citrus/entities/TestResult';
import { BaseVisualEntity } from '../../../models/visualization/base-visual-entity';
import { CitrusTestVisualEntity } from '../../../models/visualization/flows';
import { EntitiesContext, EntitiesContextResult } from '../../../providers/entities.provider';
import { KaotoBridge } from './KaotoBridge';

describe('KaotoBridge', () => {
  const mockOnReady = vi.fn();
  const mockGetMetadata = vi.fn();
  const mockSetMetadata = vi.fn();
  const mockGetResourceContent = vi.fn();
  const mockIsResourceExist = vi.fn();
  const mockSaveResourceContent = vi.fn();
  const mockDeleteResource = vi.fn();
  const mockAskUserForFileSelection = vi.fn();
  const mockGetSuggestions = vi.fn();

  const defaultProps: ComponentProps<typeof KaotoBridge> = {
    onReady: mockOnReady,
    getMetadata: mockGetMetadata,
    setMetadata: mockSetMetadata,
    getResourceContent: mockGetResourceContent,
    isResourceExist: mockIsResourceExist,
    saveResourceContent: mockSaveResourceContent,
    deleteResource: mockDeleteResource,
    askUserForFileSelection: mockAskUserForFileSelection,
    getSuggestions: mockGetSuggestions,
    shouldSaveSchema: false,
    onStepUpdated: vi.fn(),
    getTestReport: vi.fn().mockResolvedValue(undefined),
  };

  const entitiesContext = {
    entities: [],
    visualEntities: [],
    updateEntitiesFromCamelResource: vi.fn(),
  } as unknown as EntitiesContextResult;

  const renderBridge = () =>
    render(
      <EntitiesContext.Provider value={entitiesContext}>
        <KaotoBridge {...defaultProps}>
          <div>Test Child</div>
        </KaotoBridge>
      </EntitiesContext.Provider>,
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children components', () => {
    const { getByText } = renderBridge();
    expect(getByText('Test Child')).toBeInTheDocument();
  });

  it('should call onReady on mount', () => {
    renderBridge();
    expect(mockOnReady).toHaveBeenCalledTimes(1);
  });

  describe('test report loading', () => {
    const mockReport: TestReportEntry = {
      name: 'test-1',
      result: { name: 'test-1', result: 'SUCCESS', success: true },
      actions: [],
    };

    const createEntitiesContext = (visualEntities: BaseVisualEntity[]): EntitiesContextResult => ({
      entities: [],
      currentSchemaType: SourceSchemaType.Test,
      visualEntities,
      camelResource: {} as EntitiesContextResult['camelResource'],
      updateSourceCodeFromEntities: vi.fn(),
      updateEntitiesFromCamelResource: vi.fn(),
      refreshVisualEntities: vi.fn(),
    });

    it('should call applyTestReport when getTestReport resolves with a report', async () => {
      const entity = new CitrusTestVisualEntity({ name: 'test-1', actions: [] });
      const applyTestReportSpy = vi.spyOn(entity, 'applyTestReport');
      const mockGetTestReport = vi.fn().mockResolvedValue(mockReport);

      render(
        <EntitiesContext.Provider value={createEntitiesContext([entity])}>
          <KaotoBridge {...defaultProps} getTestReport={mockGetTestReport}>
            <div>Test Child</div>
          </KaotoBridge>
        </EntitiesContext.Provider>,
      );

      await waitFor(() => {
        expect(mockGetTestReport).toHaveBeenCalledWith('test-1');
        expect(applyTestReportSpy).toHaveBeenCalledWith(mockReport);
      });
    });

    it('should not call getTestReport when there are no CitrusTestVisualEntity instances', () => {
      const mockGetTestReport = vi.fn().mockResolvedValue(mockReport);

      render(
        <EntitiesContext.Provider value={createEntitiesContext([])}>
          <KaotoBridge {...defaultProps} getTestReport={mockGetTestReport}>
            <div>Test Child</div>
          </KaotoBridge>
        </EntitiesContext.Provider>,
      );

      expect(mockGetTestReport).not.toHaveBeenCalled();
    });

    it('should skip loading reports when entities exist but none are CitrusTestVisualEntity', async () => {
      const nonCitrusEntity = { id: 'route-1' } as unknown as BaseVisualEntity;
      const mockGetTestReport = vi.fn().mockResolvedValue(mockReport);

      render(
        <EntitiesContext.Provider value={createEntitiesContext([nonCitrusEntity])}>
          <KaotoBridge {...defaultProps} getTestReport={mockGetTestReport}>
            <div>Test Child</div>
          </KaotoBridge>
        </EntitiesContext.Provider>,
      );

      await new Promise((r) => setTimeout(r, 50));
      expect(mockGetTestReport).not.toHaveBeenCalled();
    });

    it('should call clearTestReport when getTestReport returns undefined', async () => {
      const entity = new CitrusTestVisualEntity({ name: 'test-1', actions: [] });
      const applyTestReportSpy = vi.spyOn(entity, 'applyTestReport');
      const clearTestReportSpy = vi.spyOn(entity, 'clearTestReport');
      const mockGetTestReport = vi.fn().mockResolvedValue(undefined);

      render(
        <EntitiesContext.Provider value={createEntitiesContext([entity])}>
          <KaotoBridge {...defaultProps} getTestReport={mockGetTestReport}>
            <div>Test Child</div>
          </KaotoBridge>
        </EntitiesContext.Provider>,
      );

      await waitFor(() => {
        expect(mockGetTestReport).toHaveBeenCalledWith('test-1');
        expect(clearTestReportSpy).toHaveBeenCalled();
      });

      expect(applyTestReportSpy).not.toHaveBeenCalled();
    });

    it('should clear test reports when kaoto__testRunStarted message is received', async () => {
      const entity = new CitrusTestVisualEntity({ name: 'test-1', actions: [] });
      const mockReport: TestReportEntry = {
        name: 'test-1',
        result: { name: 'test-1', result: 'SUCCESS', success: true },
        actions: [],
      };
      const mockGetTestReport = vi.fn().mockResolvedValue(mockReport);
      const mockRefreshVisualEntities = vi.fn();

      const context = createEntitiesContext([entity]);
      context.refreshVisualEntities = mockRefreshVisualEntities;

      render(
        <EntitiesContext.Provider value={context}>
          <KaotoBridge {...defaultProps} getTestReport={mockGetTestReport}>
            <div>Test Child</div>
          </KaotoBridge>
        </EntitiesContext.Provider>,
      );

      await waitFor(() => {
        expect(mockGetTestReport).toHaveBeenCalledWith('test-1');
      });

      expect(entity['report']).toBeDefined();

      const clearTestReportSpy = vi.spyOn(entity, 'clearTestReport');

      window.dispatchEvent(new MessageEvent('message', { data: { type: 'kaoto__testRunStarted' } }));

      await waitFor(() => {
        expect(clearTestReportSpy).toHaveBeenCalled();
      });

      expect(entity['report']).toBeUndefined();
    });

    it('should ignore messages from a different source', async () => {
      const entity = new CitrusTestVisualEntity({ name: 'test-1', actions: [] });
      const mockGetTestReport = vi.fn().mockResolvedValue(mockReport);

      render(
        <EntitiesContext.Provider value={createEntitiesContext([entity])}>
          <KaotoBridge {...defaultProps} getTestReport={mockGetTestReport}>
            <div>Test Child</div>
          </KaotoBridge>
        </EntitiesContext.Provider>,
      );

      await waitFor(() => {
        expect(mockGetTestReport).toHaveBeenCalledTimes(1);
      });

      mockGetTestReport.mockClear();
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      window.dispatchEvent(
        new MessageEvent('message', { data: { type: 'kaoto__testReportReady' }, source: iframe.contentWindow }),
      );

      await new Promise((r) => setTimeout(r, 50));
      expect(mockGetTestReport).not.toHaveBeenCalled();
      document.body.removeChild(iframe);
    });

    it('should not load reports when getTestReport is not provided', async () => {
      const entity = new CitrusTestVisualEntity({ name: 'test-1', actions: [] });
      const applyTestReportSpy = vi.spyOn(entity, 'applyTestReport');

      render(
        <EntitiesContext.Provider value={createEntitiesContext([entity])}>
          <KaotoBridge {...defaultProps} getTestReport={undefined}>
            <div>Test Child</div>
          </KaotoBridge>
        </EntitiesContext.Provider>,
      );

      await new Promise((r) => setTimeout(r, 50));
      expect(applyTestReportSpy).not.toHaveBeenCalled();
    });

    it('should handle clearTestReports safely when EntitiesContext is null', async () => {
      render(
        <EntitiesContext.Provider value={null}>
          <KaotoBridge {...defaultProps}>
            <div>Test Child</div>
          </KaotoBridge>
        </EntitiesContext.Provider>,
      );

      window.dispatchEvent(new MessageEvent('message', { data: { type: 'kaoto__testRunStarted' } }));

      await new Promise((r) => setTimeout(r, 50));
    });

    it('should re-fetch test reports when kaoto__testReportReady message is received', async () => {
      const entity = new CitrusTestVisualEntity({ name: 'test-1', actions: [] });
      const mockGetTestReport = vi.fn().mockResolvedValue(undefined);

      render(
        <EntitiesContext.Provider value={createEntitiesContext([entity])}>
          <KaotoBridge {...defaultProps} getTestReport={mockGetTestReport}>
            <div>Test Child</div>
          </KaotoBridge>
        </EntitiesContext.Provider>,
      );

      await waitFor(() => {
        expect(mockGetTestReport).toHaveBeenCalledTimes(1);
      });

      mockGetTestReport.mockResolvedValue(mockReport);
      const applyTestReportSpy = vi.spyOn(entity, 'applyTestReport');

      window.dispatchEvent(new MessageEvent('message', { data: { type: 'kaoto__testReportReady' } }));

      await waitFor(() => {
        expect(mockGetTestReport).toHaveBeenCalledTimes(2);
        expect(applyTestReportSpy).toHaveBeenCalledWith(mockReport);
      });
    });
  });
});
