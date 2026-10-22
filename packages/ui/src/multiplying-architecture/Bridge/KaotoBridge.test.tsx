import { ChannelType } from '@kie-tools-core/editor/dist/api';
import { render, waitFor } from '@testing-library/react';
import { ComponentProps } from 'react';

import { SourceSchemaType } from '../../models/camel';
import { TestReportEntry } from '../../models/citrus/entities/TestResult';
import { CitrusTestVisualEntity } from '../../models/visualization/flows';
import { EntitiesContext, EntitiesContextResult } from '../../providers/entities.provider';
import { KaotoBridge } from './KaotoBridge';

describe('KaotoBridge', () => {
  const mockOnReady = vi.fn();
  const mockOnStateControlCommandUpdate = vi.fn();
  const mockSetNotifications = vi.fn();
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
    onStateControlCommandUpdate: mockOnStateControlCommandUpdate,
    setNotifications: mockSetNotifications,
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
    channelType: ChannelType.VSCODE_DESKTOP,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children components', () => {
    const { getByText } = render(
      <KaotoBridge {...defaultProps}>
        <div>Test Child</div>
      </KaotoBridge>,
    );
    expect(getByText('Test Child')).toBeInTheDocument();
  });

  it('should call onReady on mount', () => {
    render(
      <KaotoBridge {...defaultProps}>
        <div>Test Child</div>
      </KaotoBridge>,
    );
    expect(mockOnReady).toHaveBeenCalledTimes(1);
  });

  describe('test report loading', () => {
    const mockReport: TestReportEntry = {
      name: 'test-1',
      result: { name: 'test-1', result: 'SUCCESS', success: true },
      actions: [],
    };

    const createEntitiesContext = (visualEntities: CitrusTestVisualEntity[]): EntitiesContextResult => ({
      entities: [],
      currentSchemaType: SourceSchemaType.Test,
      visualEntities,
      camelResource: {} as EntitiesContextResult['camelResource'],
      updateSourceCodeFromEntities: vi.fn(),
      updateEntitiesFromCamelResource: vi.fn(),
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

    it('should not call applyTestReport when getTestReport returns undefined', async () => {
      const entity = new CitrusTestVisualEntity({ name: 'test-1', actions: [] });
      const applyTestReportSpy = vi.spyOn(entity, 'applyTestReport');
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
      });

      expect(applyTestReportSpy).not.toHaveBeenCalled();
    });
  });
});
