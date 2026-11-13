import { render } from '@testing-library/react';
import { ComponentProps } from 'react';

import { EntitiesContext, EntitiesContextResult } from '../../../providers/entities.provider';
import { KaotoBridge } from './KaotoBridge';

describe('KaotoBridge', () => {
  const mockGetMetadata = vi.fn();
  const mockSetMetadata = vi.fn();
  const mockGetResourceContent = vi.fn();
  const mockIsResourceExist = vi.fn();
  const mockSaveResourceContent = vi.fn();
  const mockDeleteResource = vi.fn();
  const mockAskUserForFileSelection = vi.fn();
  const mockGetSuggestions = vi.fn();

  const defaultProps: ComponentProps<typeof KaotoBridge> = {
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
});
