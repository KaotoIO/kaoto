import { act, fireEvent, render, screen } from '@testing-library/react';

import { useSourceCodeStore } from '../../../../store';
import { defaultTooltipText, FlowClipboard, successTooltipText } from './FlowClipboard';

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(),
  },
});

describe('FlowClipboard.tsx', () => {
  beforeEach(() => {
    useSourceCodeStore.setState({ sourceCode: 'my source code' });
    render(<FlowClipboard />);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be render', () => {
    const clipboardButton = screen.getByTestId('clipboardButton');

    expect(clipboardButton).toBeInTheDocument();
  });

  it('should be called clipboard api', () => {
    const clipboardButton = screen.getByTestId('clipboardButton');

    act(() => fireEvent.click(clipboardButton));

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('my source code');
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
