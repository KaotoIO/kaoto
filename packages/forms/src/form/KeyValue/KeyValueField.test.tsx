import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { ReactNode, useState } from 'react';
import { SuggestionContext } from '../providers/SuggestionRegistryProvider';
import { KeyValueField } from './KeyValueField';

const StatefulSuggestionProvider = ({ children, getProviders }: { children: ReactNode; getProviders: jest.Mock }) => {
  const [currentOpenMenu, setCurrentOpenMenu] = useState<string | null>(null);
  return (
    <SuggestionContext.Provider value={{ getProviders, currentOpenMenu, setCurrentOpenMenu }}>
      {children}
    </SuggestionContext.Provider>
  );
};

describe('KeyValueField', () => {
  const mockSuggestionProvider = {
    id: 'test-provider',
    appliesTo: jest.fn().mockReturnValue(true),
    getSuggestions: jest.fn().mockResolvedValue([
      { value: 'test-suggestion-1', description: 'First test suggestion' },
      { value: 'test-suggestion-2', description: 'Second test suggestion' },
    ]),
  };

  const getProvidersMock = jest.fn().mockReturnValue([mockSuggestionProvider]);

  const defaultProps = {
    id: 'test-id',
    name: 'test-name',
    'data-testid': 'keyvalue-input',
    placeholder: 'Enter value',
    value: 'initial',
    onChange: jest.fn(),
    onFocus: jest.fn(),
    onBlur: jest.fn(),
  };

  const renderWithSuggestions = (children: React.ReactNode) => {
    return render(<StatefulSuggestionProvider getProviders={getProvidersMock}>{children}</StatefulSuggestionProvider>);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct props', () => {
    const { getByTestId } = render(<KeyValueField {...defaultProps} />);
    const input = getByTestId('keyvalue-input');

    expect(input).toBeInTheDocument();
    expect(input).toMatchSnapshot();
  });

  it('calls onChange when value changes', () => {
    const onChange = jest.fn();
    const { getByRole } = render(<KeyValueField {...defaultProps} onChange={onChange} />);
    const input = getByRole('textbox');

    act(() => {
      fireEvent.change(input, { target: { value: 'new value' } });
    });

    expect(onChange).toHaveBeenCalledWith('new value');
  });

  it('should not fail if onChange was not provided', () => {
    const { getByRole } = render(<KeyValueField {...defaultProps} onChange={undefined} />);
    const input = getByRole('textbox');

    act(() => {
      expect(() => {
        fireEvent.change(input, { target: { value: 'new value' } });
      }).not.toThrow();
    });
  });

  it('calls onFocus and onBlur', async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();

    const { getByRole } = render(<KeyValueField {...defaultProps} onFocus={onFocus} onBlur={onBlur} />);
    const input = getByRole('textbox');

    await act(async () => {
      fireEvent.focus(input);
      fireEvent.blur(input);
    });

    await waitFor(() => {
      expect(onFocus).toHaveBeenCalled();
      expect(onBlur).toHaveBeenCalled();
    });
  });

  it('shows suggestions when Ctrl+Space is pressed', async () => {
    const { getByTestId, getByRole } = renderWithSuggestions(<KeyValueField {...defaultProps} />);
    const input = getByTestId('keyvalue-input');

    await act(async () => {
      input.focus();
      fireEvent.keyDown(input, { code: 'Space', ctrlKey: true });
    });

    await waitFor(() => {
      expect(getByTestId('suggestions-menu')).toBeInTheDocument();
    });

    expect(getByRole('menuitem', { name: 'test-suggestion-1' })).toBeInTheDocument();
    expect(getByRole('menuitem', { name: 'test-suggestion-2' })).toBeInTheDocument();
  });
});
