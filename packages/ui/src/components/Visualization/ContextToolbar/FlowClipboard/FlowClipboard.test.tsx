import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { PropsWithChildren, useContext } from 'react';
import { SourceCodeContext, SourceCodeProvider } from '../../../../providers/source-code.provider';
import { FlowClipboard } from './FlowClipboard';

const wrapper = ({ children }: PropsWithChildren) => <SourceCodeProvider>{children}</SourceCodeProvider>;

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
    const { result } = renderHook(() => useContext(SourceCodeContext), { wrapper });

    const clipboardButton = screen.getByTestId('clipboardButton');

    act(() => fireEvent.click(clipboardButton));

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(result.current);
  });
});
