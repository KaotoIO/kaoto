import { ChannelType } from '@kie-tools-core/editor/dist/api';
import { render } from '@testing-library/react';
import { ComponentProps } from 'react';
import { vi } from 'vitest';

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
});
