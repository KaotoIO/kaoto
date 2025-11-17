import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { PropsWithChildren, useContext } from 'react';

import { SourceCodeContext, SourceCodeProvider } from '../../../../providers/source-code.provider';
import { defaultTooltipText, FlowClipboard, successTooltipText } from './FlowClipboard';

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

  it('should set data-copied attribute to true', () => {
    const clipboardButton = screen.getByTestId('clipboardButton');

    act(() => fireEvent.click(clipboardButton));

    expect(clipboardButton).toHaveAttribute('data-copied', 'true');
  });

  it('should set data-copied attribute to false after 2 seconds', () => {
    jest.useFakeTimers();

    const clipboardButton = screen.getByTestId('clipboardButton');

    act(() => fireEvent.click(clipboardButton));

    expect(clipboardButton).toHaveAttribute('data-copied', 'true');

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(clipboardButton).toHaveAttribute('data-copied', 'false');

    jest.useRealTimers();
  });

  it('should have default tooltip text', () => {
    const clipboardButton = screen.getByTestId('clipboardButton');

    expect(clipboardButton).toHaveAttribute('title', defaultTooltipText);
  });

  it('should have success tooltip text', () => {
    const clipboardButton = screen.getByTestId('clipboardButton');

    act(() => fireEvent.click(clipboardButton));

    expect(clipboardButton).toHaveAttribute('title', successTooltipText);
  });

  it('should restore tooltip text after 2 seconds', () => {
    jest.useFakeTimers();

    const clipboardButton = screen.getByTestId('clipboardButton');

    act(() => fireEvent.click(clipboardButton));

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(clipboardButton).toHaveAttribute('title', 'Copy to clipboard');

    jest.useRealTimers();
  });
});
