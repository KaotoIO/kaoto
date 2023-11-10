import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { FlowClipboard } from './FlowClipboard';
import { EntitiesProvider } from '../../../../providers/entities.provider';
import { useEntityContext } from '../../../../hooks/useEntityContext/useEntityContext';
import { act } from 'react-dom/test-utils';

const wrapper = ({ children }: PropsWithChildren) => <EntitiesProvider>{children}</EntitiesProvider>;

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(),
  },
});

describe('FlowClipboard.tsx', () => {
  beforeEach(() => render(<FlowClipboard />, { wrapper }));

  afterEach(() => jest.clearAllMocks());

  it('should be render', () => {
    const clipboardButton = screen.getByTestId('clipboardButton');

    expect(clipboardButton).toBeInTheDocument();
  });

  it('should be called clipboard api', () => {
    const { result } = renderHook(() => useEntityContext(), { wrapper });

    const clipboardButton = screen.getByTestId('clipboardButton');

    act(() => fireEvent.click(clipboardButton));

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(result.current.code);
  });
});
