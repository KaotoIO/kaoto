import { ChannelType } from '@kie-tools-core/editor/dist/api';
import { render } from '@testing-library/react';
import { KaotoBridge } from './KaotoBridge';

describe('KaotoBridge', () => {
  const mockOnReady = jest.fn();
  const mockOnStateControlCommandUpdate = jest.fn();
  const mockSetNotifications = jest.fn();
  const mockGetMetadata = jest.fn();
  const mockSetMetadata = jest.fn();
  const mockGetResourceContent = jest.fn();
  const mockSaveResourceContent = jest.fn();
  const mockDeleteResource = jest.fn();
  const mockAskUserForFileSelection = jest.fn();
  const mockGetSuggestions = jest.fn();

  const defaultProps = {
    onReady: mockOnReady,
    onStateControlCommandUpdate: mockOnStateControlCommandUpdate,
    setNotifications: mockSetNotifications,
    getMetadata: mockGetMetadata,
    setMetadata: mockSetMetadata,
    getResourceContent: mockGetResourceContent,
    saveResourceContent: mockSaveResourceContent,
    deleteResource: mockDeleteResource,
    askUserForFileSelection: mockAskUserForFileSelection,
    getSuggestions: mockGetSuggestions,
    shouldSaveSchema: false,
    channelType: ChannelType.VSCODE_DESKTOP,
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
});
